// Tiny Web-Audio sound kit — no external assets, works offline.

let audioCtx: AudioContext | null = null;

/** One shared context for blips, the focus bed, everything. */
export const audioContext = (): AudioContext | null => ctx();

const ctx = (): AudioContext | null => {
  try {
    if (!audioCtx) {
      audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (audioCtx.state === 'suspended') {
      audioCtx.resume().catch(() => {});
    }
    return audioCtx;
  } catch {
    return null;
  }
};

const tone = (freq: number, duration: number, volume = 0.2, type: OscillatorType = 'sine', when = 0) => {
  const ac = ctx();
  if (!ac) return;
  try {
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.connect(gain);
    gain.connect(ac.destination);
    osc.type = type;
    osc.frequency.value = freq;
    const t = ac.currentTime + when;
    gain.gain.setValueAtTime(volume, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + duration);
    osc.start(t);
    osc.stop(t + duration);
  } catch {
    // audio is decorative — never break the experience
  }
};

/**
 * A struck bell rather than a beep.
 *
 * Real notification sounds are inharmonic: a fundamental, a partial a little
 * over an octave above it that decays faster, and a very short bright top that
 * is gone before you can name it. A single sine reads as a hearing test and a
 * square wave reads as a quiz app — neither belongs in a workplace morning,
 * and both make the participant feel like they are playing a game.
 */
const bell = (root: number, duration: number, volume: number, when = 0) => {
  tone(root, duration, volume, 'sine', when);
  tone(root * 2.76, duration * 0.55, volume * 0.4, 'sine', when);
  tone(root * 5.4, duration * 0.22, volume * 0.14, 'sine', when);
};

/** Ordinary situation arriving: present, easy to talk over. */
export const ping = () => bell(784, 0.5, 0.1);

/**
 * A loud situation arriving. Two strikes, a fifth apart, the second a shade
 * quieter — the shape every phone uses to say "this one is for you". It is not
 * louder than the ordinary ping so much as harder to leave alone.
 */
export const pingLoud = () => {
  bell(1046, 0.42, 0.17);
  bell(1568, 0.55, 0.13, 0.13);
};

/** Selection tap — short, wooden, no pitch to speak of. */
export const tap = () => {
  tone(420, 0.05, 0.16, 'triangle');
  tone(1180, 0.03, 0.07, 'sine');
};

/** Heavy LOCK thunk */
export const lockThunk = () => {
  tone(110, 0.5, 0.35, 'sawtooth');
  tone(55, 0.7, 0.3, 'sine', 0.05);
};

/** Rising reveal shimmer */
export const shimmer = () => {
  tone(520, 0.3, 0.12);
  tone(780, 0.3, 0.12, 'sine', 0.12);
  tone(1040, 0.45, 0.12, 'sine', 0.24);
};

/** Deep gravity drone */
export const drone = () => tone(70, 1.8, 0.25, 'sawtooth');

/** Final pulseback confirmation */
export const pulseConfirm = () => {
  tone(392, 0.25, 0.15);
  tone(523, 0.25, 0.15, 'sine', 0.18);
  tone(784, 0.6, 0.18, 'sine', 0.36);
};

/**
 * Open the Web Audio context while a gesture is still in hand.
 *
 * Mobile browsers create the context in a suspended state and only release it
 * inside a real user gesture. Without this, the very first thing that tries to
 * make a sound is a notification arriving on its own timer — which is not a
 * gesture — so the whole of Round 1 would run silent on iOS, and Round 1 is
 * the half of the experience that depends on being heard.
 *
 * The zero-length silent buffer is the part iOS actually accepts as consent;
 * resume() alone is not always enough.
 */
export const unlockWebAudio = (): void => {
  const ac = ctx();
  if (!ac) return;
  try {
    ac.resume().catch(() => {});
    const source = ac.createBufferSource();
    source.buffer = ac.createBuffer(1, 1, 22050);
    source.connect(ac.destination);
    source.start(0);
  } catch {
    // Audio is part of the experience, never a precondition for it.
  }
};

/** Haptic nudge — silently ignored where unsupported */
export const buzz = (pattern: number | number[] = 30) => {
  try {
    navigator.vibrate?.(pattern);
  } catch {
    // ignore
  }
};
