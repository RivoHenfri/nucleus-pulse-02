"""
Render the Pulse's narration to audio, once, at build time.

Every spoken line in PULSE 01 is fixed, so there is no reason to pay for it or
wait on it at runtime. This writes public/narration/<lang>/<id>.wav; the app
plays those files and only falls back to the browser's speech engine if one is
missing.

The model behind this is a chat model wearing a TTS hat, and it is not
deterministic. Left alone it will introduce itself, answer an Indonesian
question instead of reading it, drift into a different register, or return a
take padded with several seconds of dead air. So this script does not "call a
TTS API" — it auditions takes:

    render one  ->  score it  ->  keep it or try again

A take is accepted only when the transcript matches the script word for word,
the pace sits inside a believable speaking range, the level is healthy, and
there is no long silence buried in the middle of it. Accepted audio is then
trimmed of leading/trailing dead air, given a short fade at both ends, and
normalised so no line arrives louder than its neighbour. That last part is what
makes the narration feel like one person in one room rather than 36 separate
API calls.

Usage (from the project root):
    python narration/generate.py                  # only missing files
    python narration/generate.py --force          # re-render everything
    python narration/generate.py --lang id        # one language
    python narration/generate.py --only enter-1 morning
    python narration/generate.py --voice sage
    python narration/generate.py --attempts 8     # audition harder
    python narration/generate.py --level-only     # just re-level what exists

The OpenRouter key comes from the environment (so `bws run -- python
narration/generate.py` works), falling back to narration/.env, which is
gitignored. Never hardcoded, never committed.
"""

import array
import base64
import json
import math
import os
import pathlib
import re
import struct
import sys
import unicodedata
import urllib.request

ROOT = pathlib.Path(__file__).resolve().parent.parent
MANIFEST = ROOT / "narration" / "lines.json"
OUT_DIR = ROOT / "public" / "narration"
MODEL = "openai/gpt-audio-mini"
SAMPLE_RATE = 24_000

# Characters per second of comfortable speech, per language. Used only to judge
# whether a take is rushed or padded — not to speed anything up.
# Measured against real takes from this voice, not guessed: at 14 c/s the
# verifier rejected clean reads as "rushed" and burned five takes a line.
# Indonesian words are longer but spoken faster: measured at ~20 c/s against
# ~16.5 for English. Guessing them equal made the verifier reject clean
# Indonesian reads as "rushed" six takes in a row.
# Raised from 16.5/20.0 for PULSE 02, which is deliberately quicker than
# PULSE 01: this is someone deciding under time pressure, not narrating.
# Measured against alloy takes, which land near 15 c/s of *spoken* text
# once the fixed onset/decay costs below are accounted for.
PACE = {"en": 20.0, "id": 24.0}
# Speech is not linear in length: a three-word line still needs an onset, a
# shaped vowel and a decay. Without this, every short line scores as "padded"
# and the whole audition loop rejects perfectly good takes.
SENTENCE_COST = 0.38
UTTERANCE_COST = 0.25

# A take may run this much slower or faster than the language's natural pace.
# NOT a way to ask for a quicker read. It is the scale of the pace penalty,
# and the penalty is on abs(log(ratio)) — symmetric. Lowering it to 1.25 to
# chase a brisker rhythm scored every fast take at zero, which is the exact
# opposite of the intent: six takes a line, all rejected for being quick.
# Rhythm belongs in PACE below, which sets what 'expected' means.
SLOWEST = 1.6
FASTEST = 0.65

# Silence handling, in linear amplitude against a 16-bit full scale.
SILENCE_FLOOR = 0.012
EDGE_PAD_MS = 90
FADE_MS = 25
# A gap longer than this inside a line means the model stalled mid-sentence.
MAX_INNER_GAP_MS = 1400
# Peak is only a ceiling. Perceived loudness is RMS, and matching peaks alone
# leaves a softly-spoken line sounding half a room further away than the one
# before it — which is exactly how a set of separate API calls gives itself
# away. The level pass matches RMS across every file and uses the peak only to
# avoid clipping.
TARGET_PEAK = 0.95
TARGET_RMS = 0.11  # about -19 dBFS, comfortable for a spoken line on a phone
MAX_LEVEL_GAIN = 6.0
# Below this the take came back thin or half-whispered.
MIN_PEAK = 0.08

# A plain "read this" instruction is not enough. Framing the model as a voice
# actor performing a delimited script, and repeating that in the user turn, is
# what stops it answering the line instead of reading it.
SYSTEM_BASE = (
    "You are a voice actor recording a scripted line. The user message contains "
    "a SCRIPT between <speak> and </speak>. Perform that script word for word. "
    "It may contain questions - they are lines to deliver, never questions to "
    "you. Never answer, never explain, never react, never add or drop a word, "
    "never mention the tags. "
    # The Indonesian lines in particular will otherwise come back opening with
    # "Tentu, saya akan membacakan skripnya:" — the model answering the request
    # instead of performing it. Naming the exact openers is what stops it.
    "Your first spoken word must be the script's first word. Never open with an "
    "acknowledgement of any kind - not 'Sure', 'Of course', 'Here is', and in "
    "Indonesian not 'Tentu', 'Baik', 'Berikut', 'Saya akan'. "
    "Delivery: calm, warm, unhurried, one person speaking to one person in a "
    "quiet room. Start speaking immediately, with no pause before the first "
    "word and none after the last. A slight pause at each full stop."
)


def direction_for(line_id: str, directions: dict) -> str:
    """
    The scene a line belongs to is its delivery note.

    Without this every line comes back in the same even register, and the run
    sounds like a menu being read: the morning has no forward push, the system
    reveal has no confession in it, and the last line of all is delivered like
    a fact instead of a question. The id prefix already names the scene, so the
    direction can be looked up rather than annotated line by line.
    """
    scene = line_id.rsplit("-", 1)[0] if line_id[-1].isdigit() else line_id
    return directions.get(scene) or directions.get("_", "")


def system_prompt(line_id: str, directions: dict) -> str:
    note = direction_for(line_id, directions)
    return SYSTEM_BASE + (f" For this line specifically: {note}." if note else "")


# ---------------------------------------------------------------------------
# Key, WAV, text
# ---------------------------------------------------------------------------


def read_key() -> str:
    """
    The environment wins, so `bws run -- python narration/generate.py` works and
    no key has to sit on disk at all. narration/.env is the local fallback and
    is gitignored.
    """
    from_env = os.environ.get("OPENROUTER_API_KEY")
    if from_env:
        return from_env.strip()

    local = ROOT / "narration" / ".env"
    if local.exists():
        for line in local.read_text(encoding="utf-8").splitlines():
            if line.startswith("OPENROUTER_API_KEY="):
                return line.split("=", 1)[1].strip()
    sys.exit(
        "No OPENROUTER_API_KEY. Either run under `bws run`, or put it in "
        f"{local}."
    )


def wav(pcm: bytes) -> bytes:
    """Wrap raw PCM16 mono in a WAV header. Streaming only ever returns pcm16."""
    return (
        b"RIFF"
        + struct.pack("<I", 36 + len(pcm))
        + b"WAVEfmt "
        + struct.pack("<IHHIIHH", 16, 1, 1, SAMPLE_RATE, SAMPLE_RATE * 2, 2, 16)
        + b"data"
        + struct.pack("<I", len(pcm))
        + pcm
    )


def normalise_text(text: str) -> str:
    """
    Compare what was said to what was written, ignoring anything a listener
    cannot hear: case, accents, punctuation — and word boundaries.

    Spaces have to go too. An initialism is written "A I." to force the model
    to say the letters, and it then transcribes them back as "AI"; comparing
    word by word, that is a mismatch, and the line can never pass however many
    takes it is given. Nobody can hear the gap between two letters, so the
    verifier should not be able to either.
    """
    folded = unicodedata.normalize("NFKD", text.lower())
    folded = "".join(c for c in folded if not unicodedata.combining(c))
    return re.sub(r"[^a-z0-9]", "", folded)


# ---------------------------------------------------------------------------
# Audio inspection and repair
# ---------------------------------------------------------------------------


def samples(pcm: bytes) -> array.array:
    buf = array.array("h")
    buf.frombytes(pcm[: len(pcm) // 2 * 2])
    if sys.byteorder == "big":
        buf.byteswap()
    return buf


def to_pcm(buf: array.array) -> bytes:
    out = array.array("h", buf)
    if sys.byteorder == "big":
        out.byteswap()
    return out.tobytes()


def envelope(buf: array.array, window: int) -> list[float]:
    """Peak amplitude per window, 0..1 — enough to find speech and silence."""
    return [
        max((abs(v) for v in buf[i : i + window]), default=0) / 32768.0
        for i in range(0, len(buf), window)
    ]


def seconds(buf: array.array) -> float:
    return len(buf) / SAMPLE_RATE


def longest_inner_gap_ms(buf: array.array) -> float:
    """The longest stretch of silence between the first and last spoken word.
    Long internal gaps are the model losing its place, and they are audible."""
    window = SAMPLE_RATE // 100  # 10 ms
    env = envelope(buf, window)
    loud = [i for i, v in enumerate(env) if v >= SILENCE_FLOOR]
    if len(loud) < 2:
        return 0.0
    longest = run = 0
    for i in range(loud[0], loud[-1] + 1):
        run = run + 1 if env[i] < SILENCE_FLOOR else 0
        longest = max(longest, run)
    return longest * 10.0


def rms(buf: array.array) -> float:
    """Perceived loudness of the spoken part, ignoring the silence around it."""
    voiced = [v for v in buf if abs(v) / 32768.0 >= SILENCE_FLOOR]
    if not voiced:
        return 0.0
    return math.sqrt(sum((v / 32768.0) ** 2 for v in voiced) / len(voiced))


def apply_gain(buf: array.array, gain: float) -> array.array:
    out = array.array("h", buf)
    for i, v in enumerate(out):
        out[i] = max(-32768, min(32767, int(v * gain)))
    return out


def level(buf: array.array) -> array.array:
    """Bring one line to the set's loudness, without letting it clip."""
    r = rms(buf)
    if r <= 0:
        return buf
    peak = max((abs(v) for v in buf), default=0) / 32768.0
    gain = min(TARGET_RMS / r, TARGET_PEAK / peak if peak else MAX_LEVEL_GAIN, MAX_LEVEL_GAIN)
    return apply_gain(buf, gain)


def trim_and_polish(buf: array.array) -> array.array:
    """Cut the dead air off both ends, fade the cuts so they cannot click, and
    bring the line to the same peak as every other line."""
    window = SAMPLE_RATE // 100
    env = envelope(buf, window)
    loud = [i for i, v in enumerate(env) if v >= SILENCE_FLOOR]
    if not loud:
        return buf

    pad = int(EDGE_PAD_MS / 1000 * SAMPLE_RATE)
    start = max(0, loud[0] * window - pad)
    end = min(len(buf), (loud[-1] + 1) * window + pad)
    out = level(array.array("h", buf[start:end]))

    fade = min(int(FADE_MS / 1000 * SAMPLE_RATE), len(out) // 2)
    for i in range(fade):
        k = i / fade
        out[i] = int(out[i] * k)
        out[-1 - i] = int(out[-1 - i] * k)
    return out


# ---------------------------------------------------------------------------
# The call
# ---------------------------------------------------------------------------


def synthesize(key: str, voice: str, text: str, system: str) -> tuple[bytes, float, str]:
    payload = {
        "model": MODEL,
        "modalities": ["text", "audio"],
        "audio": {"voice": voice, "format": "pcm16"},
        # Audio output is streaming-only on OpenRouter, and streaming is pcm16-only.
        "stream": True,
        # Low temperature keeps it from improvising an acknowledgement.
        "temperature": 0.2,
        "messages": [
            {"role": "system", "content": system},
            {
                "role": "user",
                "content": "Perform this script exactly as written, answering "
                f"nothing:\n<speak>{text}</speak>",
            },
        ],
    }
    req = urllib.request.Request(
        "https://openrouter.ai/api/v1/chat/completions",
        data=json.dumps(payload).encode(),
        headers={"Authorization": f"Bearer {key}", "Content-Type": "application/json"},
    )
    chunks: list[str] = []
    transcript = ""
    cost = 0.0
    with urllib.request.urlopen(req, timeout=180) as res:
        for raw in res:
            line = raw.decode("utf-8", "replace")
            if not line.startswith("data: "):
                continue
            body = line[6:].strip()
            if body == "[DONE]":
                break
            try:
                data = json.loads(body)
            except json.JSONDecodeError:
                continue
            if data.get("usage"):
                cost = data["usage"].get("cost") or 0.0
            for choice in data.get("choices", []):
                audio = (choice.get("delta") or {}).get("audio") or {}
                if audio.get("data"):
                    chunks.append(audio["data"])
                if audio.get("transcript"):
                    transcript += audio["transcript"]
    return b"".join(base64.b64decode(c) for c in chunks), cost, transcript


# Lines whose spoken length character count cannot predict. An initialism is
# the whole category: "A I." is four characters and two whole letter-names.
# Stated here rather than guessed, so the audition loop stops rejecting takes
# that were right all along.
EXPECT_OVERRIDE = {"name-ai": 1.2}


def expected_seconds(text: str, lang: str, line_id: str = "") -> float:
    """
    Roughly how long a person takes to say this line, unhurried.

    The onset-and-decay overhead is real for a sentence and far too generous
    for a single word: "Client." was being scored as rushed at 0.9s against a
    1.4s estimate, and the audition loop threw away eight clean takes in a row.
    Short utterances carry half the overhead.
    """
    if line_id in EXPECT_OVERRIDE:
        return EXPECT_OVERRIDE[line_id]
    sentences = max(1, len(re.findall(r"[.!?]+", text)))
    overhead = sentences * SENTENCE_COST + UTTERANCE_COST
    if len(text) < 16:
        overhead *= 0.5
    return len(text) / PACE.get(lang, 14.0) + overhead


def judge(
    buf: array.array, transcript: str, text: str, lang: str, line_id: str = ""
) -> tuple[float, str]:
    """
    Score a take, and say in one phrase what is wrong with it.

    Zero means unusable. Anything above ACCEPT is good enough to ship; between
    the two, it is the best fallback if nothing better turns up.
    """
    if len(buf) == 0:
        return 0.0, "no audio"
    if normalise_text(transcript) != normalise_text(text):
        return 0.0, f"said something else: {transcript.strip()[:60]!r}"

    peak = max(abs(v) for v in buf) / 32768.0
    if peak < MIN_PEAK:
        return 0.0, f"too quiet (peak {peak:.2f})"

    gap = longest_inner_gap_ms(buf)
    if gap > MAX_INNER_GAP_MS:
        return 0.0, f"{gap / 1000:.1f}s stall mid-line"

    spoken = seconds(trim_and_polish(buf))
    expected = expected_seconds(text, lang, line_id)
    ratio = spoken / expected if expected else 1.0
    # Character count stops predicting anything below a handful of characters:
    # "A I." is four characters and two whole letter-names, and every clean
    # take of it scores as padded. Judge the very short lines on whether they
    # are audible and unbroken, not on their length.
    slowest = SLOWEST if len(text) >= 8 else 4.0
    if ratio > slowest:
        return 0.0, f"padded — {spoken:.1f}s for a {expected:.1f}s line"
    if ratio < FASTEST:
        return 0.0, f"rushed — {spoken:.1f}s for a {expected:.1f}s line"

    # Closest to the natural pace wins, with a small bonus for a clean inside.
    pace_score = 1.0 - min(1.0, abs(math.log(ratio)) / math.log(slowest))
    calm_score = 1.0 - min(1.0, gap / MAX_INNER_GAP_MS)
    return 0.75 * pace_score + 0.25 * calm_score, f"{spoken:.1f}s vs {expected:.1f}s"


ACCEPT = 0.62


def audition(
    key: str, voice: str, text: str, lang: str, attempts: int, system: str, line_id: str
):
    """Keep taking the line until one is right, then stop. Returns the best
    take seen, the money spent, and how many attempts it took."""
    spent = 0.0
    best: tuple[float, array.array, str] | None = None
    for attempt in range(1, attempts + 1):
        pcm, cost, transcript = synthesize(key, voice, text, system)
        spent += cost
        buf = samples(pcm)
        score, why = judge(buf, transcript, text, lang, line_id)
        if best is None or score > best[0]:
            best = (score, buf, why)
        if score >= ACCEPT:
            return best, spent, attempt
        print(f"           take {attempt}/{attempts} rejected — {why} (score {score:.2f})")
    return best, spent, attempts


# ---------------------------------------------------------------------------


def read_wav(path: pathlib.Path) -> array.array:
    raw = path.read_bytes()
    at = raw.find(b"data")
    return samples(raw[at + 8 :] if at >= 0 else raw[44:])


def level_pass() -> None:
    """
    Re-level every rendered line against the set.

    Run after any partial re-render: a line re-recorded on its own is levelled
    against its own take, and the point of this pass is that all of them are
    levelled against each other.
    """
    files = sorted(OUT_DIR.glob("*/*.wav"))
    if not files:
        sys.exit("Nothing rendered yet.")
    print(f"levelling {len(files)} files to RMS {TARGET_RMS:.3f}")
    for f in files:
        buf = read_wav(f)
        before = rms(buf)
        out = level(buf)
        f.write_bytes(wav(to_pcm(out)))
        print(f"  {f.parent.name}/{f.stem:14s} {before:.3f} -> {rms(out):.3f}")


def main() -> None:
    args = sys.argv[1:]
    if "--level-only" in args:
        level_pass()
        return
    force = "--force" in args
    manifest = json.loads(MANIFEST.read_text(encoding="utf-8"))

    voice = manifest.get("voice", "ballad")
    if "--voice" in args:
        voice = args[args.index("--voice") + 1]

    attempts = 6
    if "--attempts" in args:
        attempts = int(args[args.index("--attempts") + 1])

    directions = manifest.get("direction", {})
    languages = manifest["languages"]
    if "--lang" in args:
        wanted = args[args.index("--lang") + 1]
        languages = {wanted: languages[wanted]}

    only: set[str] = set()
    if "--only" in args:
        for value in args[args.index("--only") + 1 :]:
            if value.startswith("--"):
                break
            only.add(value)

    key = read_key()
    total_cost = 0.0
    failures: list[str] = []

    for lang, lines in languages.items():
        out_dir = OUT_DIR / lang
        out_dir.mkdir(parents=True, exist_ok=True)
        print(f"\n[{lang}]  voice={voice}")
        for line_id, text in lines.items():
            if only and line_id not in only:
                continue
            target = out_dir / f"{line_id}.wav"
            if target.exists() and not force:
                print(f"  skip   {line_id}")
                continue

            best, cost, took = audition(
                key, voice, text, lang, attempts, system_prompt(line_id, directions), line_id
            )
            total_cost += cost
            if best is None or best[0] <= 0:
                reason = best[2] if best else "no audio"
                print(f"  FAILED {line_id} — {reason}")
                failures.append(f"{lang}/{line_id}: {reason}")
                continue

            score, buf, _ = best
            polished = trim_and_polish(buf)
            target.write_bytes(wav(to_pcm(polished)))
            flag = " (best of a bad run)" if score < ACCEPT else ""
            print(
                f"  wrote  {line_id:14s} {seconds(polished):4.1f}s  "
                f"score {score:.2f}  take {took}{flag}"
            )
            if score < ACCEPT:
                failures.append(f"{lang}/{line_id}: nothing clean in {attempts} takes")

    # Whatever was re-recorded, the set has to end up level with itself: a line
    # recorded on its own is levelled against its own take, and the point is
    # that all of them are levelled against each other.
    level_pass()

    print(f"\ncost this run: ${total_cost:.4f}")
    if failures:
        print("\nneeds another pass:")
        for f in failures:
            print(f"  - {f}")
        print("\n  python narration/generate.py --force --attempts 10 --only " + " ".join(
            f.split("/")[1].split(":")[0] for f in failures
        ))


if __name__ == "__main__":
    main()
