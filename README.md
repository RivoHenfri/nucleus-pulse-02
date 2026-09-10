# ⚛️ NUCLEUS — PULSE 02: TRUTH

> What do you trust?

A three-to-four minute, mobile-first workplace experience. A client asks one
question, six systems can answer it, and nobody tells you how many to open.

The hidden experiment, never named on screen:

**When do you decide that what you know is enough for what you're about to do?**

It is not a test of who is most thorough, and it has no correct answer. The
behaviour it is built to observe is where a person chooses to stop verifying —
which is why the app never says how many sources there are to open, never
counts them for you, and never marks one of the four answers as right.

## The arc

    routine → request → search → sufficiency → stop →
    recognition → consequence → judgment

The reaction it is built for is **"Nobody told me when I knew enough. I decided
that myself."** — never "I got it wrong."

## The scenes

| # | Scene | What happens |
|---|-------|--------------|
| 01 | OPENING | The mark ignites. A language, 09:42, and a client waiting. *Answer when you think you know enough.* |
| 02 | WORKSPACE | PLOT A17, status unknown, six records, seventy-five seconds. ANSWER NOW is there from the first second. |
| 03 | ANSWER | Four things you could tell the client, then how sure you are. |
| 04 | FIRST REVEAL | How many you opened, how many were left. A pause. *You didn't have the whole picture. But you decided you knew enough to answer.* ◉ TRUTH |
| 05 | WHAT I DIDN'T CHECK | All six, open, each marked opened or not. No commentary. |
| 06 | PERSONAL MIRROR | Four facts, quoted not interpreted, then: *Nobody told you when you knew enough. You decided that yourself.* |
| 07 | THE LADDER | The same knowledge, three rising stakes: reply internally, tell the client, carry a payment. One at a time, each locking. |
| 08 | FINAL REVEAL | *At some point, you stop. Not because you know everything.* ◉ TRUTH |

PULSE 01 named its experiment on its last screen. This one does not: the reveal
already happened at Scene 06, in the participant's own behaviour, and an app
that followed it with "this was an experiment" would take the recognition off
the person who had it.

## The six records

Sales Tracker · Finance · Plot Registry · Client File · Legal · Latest Masterplan.

**Not one of them is false.** Each describes a different part of the same
reality, from a different position in the process and a different moment in
time — which is the whole Pulse, built into data rather than said out loud.

    Sales      03 Sep   A17 — RESERVED
    Finance    05 Sep   deposit RECEIVED
    Registry   19 Aug   A17 — SOLD              ← three weeks older, unflagged
    Client     28 Aug   Jonathan Reed
    Legal      06 Sep   Jonathan Reid, SPA pending
    Masterplan 08 Sep   A17 → A18

The reality underneath: A17 was reserved, the deposit was paid, the SPA is
drafted and unsigned, nobody told the Registry to stop saying SOLD, the buyer's
surname is spelled two ways, and eight days ago the plot was renumbered.

The masterplan is the largest twist and it does not answer the question — it
changes it. *Which plot are we actually talking about?* Sometimes the missing
information isn't the answer; it's the information that changes the question.

## What it will not do

No score. No thoroughness rating. No "you missed the important one". No
Correct/Incorrect, and never `Correct answer: A18` — the moment the app grades
the answer, the participant stops thinking about their own stopping point and
starts reacting to a mark.

No progress bar, no source counter, no "3 of 6" anywhere before the reveal: a
counter invents a denominator, a denominator invents a target, and a person
working towards a target is completing a form rather than deciding when they
know enough.

No OUTDATED badge on the stale Registry, no highlight when Sales and the
Registry disagree, and no colour ranking on any card. Noticing is the
participant's job.

No "always check more sources" — that lesson is as bad as its opposite, which
is what Scene 07 exists to prevent. And no aphorisms: nothing on screen may be
a sentence that would still be true if this room had never played.

## One variable

Everyone gets the same six records, in the same order, on the same clock. The
only thing that differs between two runs is where the person stopped.

## The clock

Seventy-five seconds. It does not flash, turn red, or accelerate — a clock that
panics is a clock telling the participant when to stop. If it runs out the
answer screen opens by itself and says so plainly; nobody is punished for it.

## Animation

Inherited from PULSE 01, and the tempo dial with it.

- **Motion for React** — scene changes, card arrival, the records opening, the
  ladder stepping.
- **CSS keyframes** — the ⚛️ breath, the ring, the clock, the record drawer.
- **Web Audio** — a soft tone per record opened, the focus bed under the
  workspace.
- **Vibration API** — a short haptic on every tap, where supported.

### Tempo

Every pause is written at its natural length and multiplied by `PACE` in
`components/atoms.tsx`. One number moves the whole run. Change that, not the
individual numbers — the ratios are what make the rhythm work.

## The voice

Both languages are spoken, pre-rendered by `openai/gpt-audio-mini` into
`public/narration/<lang>/<id>.wav` via the same audition loop as PULSE 01:
render one, score it, keep it or try again.

One rule specific to this Pulse: **nothing built from a participant's own run is
spoken.** Counts, remainders, clock readings and their own two words are on
screen and left unvoiced — a voice reading someone their own numbers back turns
a mirror into a report. The narration only ever says the lines that are the same
for everybody.

```bash
python narration/generate.py                  # only what is missing
python narration/generate.py --force          # everything
python narration/generate.py --lang id        # one language
python narration/generate.py --level-only     # just re-level what exists
```

Re-level after any partial re-render. The key comes from the environment, so
`bws run -- python narration/generate.py` works.

## The room

`dashboard.html` is the facilitator's screen and the source of the infographic
WhatsApp step 6 puts up: where we stopped, what we told the client, how
confident we said we were, which records went unopened, and the ladder.

It renders nothing below five completed runs — in a room of three, a histogram
is a list of people with the names taken off.

The API (`server/`) holds no name, no email, no device id, and has no endpoint
that returns an individual response. How many sources a person opened never
leaves the aggregate: attached to a name it becomes a performance review, which
is the one thing this experience must never become.

## Run it

```bash
npm install
npm run dev      # http://localhost:3002
npm run build    # dist/, base /nucleus-pulse-02/ for GitHub Pages
npm run preview
```

`VITE_ROOM_API=http://localhost:3000 npm run dev` points the app at a laptop
running `bun server/index.ts`, for driving the facilitator screen with real
data during a build week.

In dev only, `?scene=mirror` opens straight into a scene with stand-in answers,
for re-timing without playing the whole run. Gated on `import.meta.env.DEV`, so
it does nothing on a production build — a participant who found it could
otherwise skip the workspace, and there is nothing left of this without the
workspace.

## Tech

React 19 · TypeScript · Vite · Motion for React · Tailwind (CDN) · Web Audio.

No login, no identity, no analytics, no leaderboard. Session state is
`localStorage`; the only thing that leaves the phone is one aggregate row, once,
and only if the facilitator opened a room.
