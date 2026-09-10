// THE PULSE SPEAKS — narration through the browser's own speech engine.
// No audio files, no TTS bill, works offline.
//
// The voice is a calm human reading you a line, not a horror trailer: natural
// pitch, just under conversational speed. Modern browsers ship neural voices
// ("Natural", "Neural", the Google ones) that sound like a person — we hunt for
// those first and only fall back to the old robotic system voices.

let enabled = true;
let cachedVoices: SpeechSynthesisVoice[] = [];

const synth = (): SpeechSynthesis | null => {
  try {
    return typeof window !== 'undefined' && 'speechSynthesis' in window ? window.speechSynthesis : null;
  } catch {
    return null;
  }
};

// Voices load asynchronously in most browsers — warm the list up early.
const warm = () => {
  const s = synth();
  if (!s) return;
  const load = () => {
    cachedVoices = s.getVoices();
  };
  load();
  s.addEventListener?.('voiceschanged', load);
};
warm();

/** Rough language guess so an Indonesian answer is not read with an English mouth. */
export const guessLang = (text: string): 'id-ID' | 'en-US' => {
  const t = ` ${text.toLowerCase()} `;
  const markers = [
    ' yang ', ' tidak ', ' saya ', ' kamu ', ' dan ', ' untuk ', ' dengan ', ' karena ',
    ' sudah ', ' belum ', ' bukan ', ' apa ', ' ini ', ' itu ', ' kerja', ' waktu ',
    ' nggak ', ' gak ', ' bikin ', ' harus ', ' sekarang ', ' besok ', ' jangan ',
  ];
  return markers.some(m => t.includes(m)) ? 'id-ID' : 'en-US';
};

/**
 * Best available voice for a language, ranked by how human it sounds.
 * The old offline system voices (David, Zira, Microsoft SAPI) are last resort —
 * they are the ones that make narration sound like a haunted GPS.
 */
const NATURAL_PATTERNS = [
  /natural/i,        // "Microsoft Aria Online (Natural)"
  /neural/i,         // Edge/Chrome neural voices
  /google/i,         // "Google US English", "Google Bahasa Indonesia"
  /online/i,         // cloud voices, generally the good ones
  /siri|samantha|karen|moira|daniel \(enhanced\)/i, // Apple's better voices
];

const ROBOTIC = /david|zira|mark|hazel|sapi|espeak|microsoft (david|zira|mark)/i;

const voiceFor = (lang: string): SpeechSynthesisVoice | null => {
  const s = synth();
  if (!s) return null;
  if (cachedVoices.length === 0) cachedVoices = s.getVoices();

  const prefix = lang.slice(0, 2).toLowerCase();
  const forLang = cachedVoices.filter(v => v.lang?.toLowerCase().startsWith(prefix));
  const pool = forLang.length ? forLang : cachedVoices;

  for (const pattern of NATURAL_PATTERNS) {
    const hit = pool.find(v => pattern.test(v.name) && !ROBOTIC.test(v.name));
    if (hit) return hit;
  }
  // Anything at all, as long as it is not a known robotic one.
  return pool.find(v => !ROBOTIC.test(v.name)) ?? pool[0] ?? null;
};

export interface SpeakOptions {
  /** Stop whatever is being said first. Default true — scenes should not overlap. */
  interrupt?: boolean;
  /** Just under conversational pace. Default 0.95. */
  rate?: number;
  /** Natural. Default 1. Do not go below ~0.9 — that is where it turns creepy. */
  pitch?: number;
  /** Override the language guess. */
  lang?: string;
  /** Wait this many ms before speaking, so the line lands with its animation. */
  delay?: number;
}

let pending: ReturnType<typeof setTimeout>[] = [];

/** Say one line in the Pulse's voice. Silently does nothing where unsupported. */
export const speak = (text: string, opts: SpeakOptions = {}): void => {
  const s = synth();
  if (!s || !enabled || !text.trim()) return;

  const run = () => {
    try {
      if (opts.interrupt !== false) s.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = opts.lang ?? guessLang(text);
      const v = voiceFor(u.lang);
      if (v) u.voice = v;
      u.rate = opts.rate ?? 0.95;
      u.pitch = opts.pitch ?? 1;
      u.volume = 1;
      s.speak(u);
    } catch {
      // narration is decorative — never break the experience
    }
  };

  if (opts.delay) {
    pending.push(setTimeout(run, opts.delay));
  } else {
    run();
  }
};

/** Speak several lines in sequence, each after its own delay. */
export const speakSequence = (lines: { text: string; delay: number }[]): void => {
  lines.forEach(({ text, delay }, i) => speak(text, { delay, interrupt: i === 0 }));
};

/** Cut the voice off — call when leaving a scene. */
export const silence = (): void => {
  pending.forEach(clearTimeout);
  pending = [];
  try {
    synth()?.cancel();
  } catch {
    // ignore
  }
};

export const setVoiceEnabled = (on: boolean): void => {
  enabled = on;
  if (!on) silence();
};

export const isVoiceSupported = (): boolean => synth() !== null;
