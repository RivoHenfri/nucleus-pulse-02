// THE FOCUS BED — the sound under the two choosing rounds.
//
// A low drone, a pair of oscillators detuned into a slow beat, filtered room
// noise, and a heartbeat that quickens as the timer drains. It is a mood
// device, not a medical one: it narrows the room and raises the stakes, which
// is exactly what Signal vs Noise needs while someone is deciding.
//
// Built live with Web Audio — no files, no loading, works offline.

import { audioContext } from './sound';

interface Bed {
  master: GainNode;
  nodes: { stop: () => void }[];
  heartbeat: ReturnType<typeof setInterval> | null;
  urgency: number;
}

let bed: Bed | null = null;
let enabled = true;

const BASE_VOLUME = 0.16;

/** Brown-ish noise: softer and rounder than white, reads as "room". */
const noiseBuffer = (ac: AudioContext): AudioBuffer => {
  const len = ac.sampleRate * 2;
  const buf = ac.createBuffer(1, len, ac.sampleRate);
  const data = buf.getChannelData(0);
  let last = 0;
  for (let i = 0; i < len; i++) {
    const white = Math.random() * 2 - 1;
    last = (last + 0.02 * white) / 1.02;
    data[i] = last * 3.5;
  }
  return buf;
};

const thump = (ac: AudioContext, out: GainNode, at: number, strength: number) => {
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(64, at);
  osc.frequency.exponentialRampToValueAtTime(38, at + 0.16);
  gain.gain.setValueAtTime(0.0001, at);
  gain.gain.exponentialRampToValueAtTime(strength, at + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.28);
  osc.connect(gain);
  gain.connect(out);
  osc.start(at);
  osc.stop(at + 0.32);
};

/** Start the bed. Safe to call twice — the second call is ignored. */
export const startFocusBed = (): void => {
  if (bed || !enabled) return;
  const ac = audioContext();
  if (!ac) return;

  try {
    const master = ac.createGain();
    master.gain.setValueAtTime(0.0001, ac.currentTime);
    master.gain.exponentialRampToValueAtTime(BASE_VOLUME, ac.currentTime + 2.5);
    master.connect(ac.destination);

    const nodes: { stop: () => void }[] = [];

    // Sub drone — felt more than heard.
    const sub = ac.createOscillator();
    const subGain = ac.createGain();
    sub.type = 'sine';
    sub.frequency.value = 42;
    subGain.gain.value = 0.5;
    sub.connect(subGain).connect(master);
    sub.start();
    nodes.push({ stop: () => sub.stop() });

    // Two tones, eight cycles apart. The ear hears one tone that breathes.
    const pair: [number, number][] = [[104, -1], [112, 1]];
    pair.forEach(([freq, pan]) => {
      const osc = ac.createOscillator();
      const gain = ac.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.value = 0.16;
      if (typeof ac.createStereoPanner === 'function') {
        const panner = ac.createStereoPanner();
        panner.pan.value = pan;
        osc.connect(gain).connect(panner).connect(master);
      } else {
        osc.connect(gain).connect(master);
      }
      osc.start();
      nodes.push({ stop: () => osc.stop() });
    });

    // Room tone, rolled right off so it never hisses.
    const noise = ac.createBufferSource();
    noise.buffer = noiseBuffer(ac);
    noise.loop = true;
    const filter = ac.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 420;
    const noiseGain = ac.createGain();
    noiseGain.gain.value = 0.35;
    noise.connect(filter).connect(noiseGain).connect(master);
    noise.start();
    nodes.push({ stop: () => noise.stop() });

    bed = { master, nodes, heartbeat: null, urgency: 0 };

    // Heartbeat — 52 bpm at rest, 108 bpm when the clock is nearly out.
    const beat = () => {
      const b = bed;
      if (!b) return;
      const ctxNow = ac.currentTime;
      const strength = 0.22 + b.urgency * 0.5;
      thump(ac, b.master, ctxNow, strength);
      thump(ac, b.master, ctxNow + 0.19, strength * 0.55);
    };
    const schedule = () => {
      const b = bed;
      if (!b) return;
      const bpm = 52 + b.urgency * 56;
      b.heartbeat = setTimeout(() => {
        beat();
        schedule();
      }, (60 / bpm) * 1000) as unknown as ReturnType<typeof setInterval>;
    };
    beat();
    schedule();
  } catch {
    bed = null;
  }
};

/** 0 = calm, 1 = the clock is about to run out. */
export const setUrgency = (value: number): void => {
  if (!bed) return;
  bed.urgency = Math.max(0, Math.min(1, value));
  const ac = audioContext();
  if (!ac) return;
  try {
    // The room closes in a little as time runs out.
    bed.master.gain.linearRampToValueAtTime(BASE_VOLUME * (1 + bed.urgency * 0.5), ac.currentTime + 0.6);
  } catch {
    // ignore
  }
};

/** Fade out and tear down. Safe to call when nothing is playing. */
export const stopFocusBed = (): void => {
  const b = bed;
  if (!b) return;
  bed = null;
  const ac = audioContext();
  try {
    if (b.heartbeat) clearTimeout(b.heartbeat as unknown as ReturnType<typeof setTimeout>);
    if (ac) {
      b.master.gain.cancelScheduledValues(ac.currentTime);
      b.master.gain.setValueAtTime(Math.max(b.master.gain.value, 0.0001), ac.currentTime);
      b.master.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + 1.2);
    }
    setTimeout(() => {
      b.nodes.forEach(n => {
        try {
          n.stop();
        } catch {
          // already stopped
        }
      });
      try {
        b.master.disconnect();
      } catch {
        // ignore
      }
    }, 1400);
  } catch {
    // ignore
  }
};

export const setAmbienceEnabled = (on: boolean): void => {
  if (!on) stopCalmBed();
  enabled = on;
  if (!on) stopFocusBed();
};

// ---------------------------------------------------------------------------
// THE CALM BED — the sound under everything that is not a choosing round.
// ---------------------------------------------------------------------------
//
// The focus bed above narrows the room while someone decides. This one does
// the opposite job, and it runs almost everywhere else: it holds the quiet
// open so the silences read as space to think rather than as the app having
// stopped, and it makes the reflective screens feel like one continuous place
// instead of seventeen separate ones.
//
// What is in it, and why:
//
//   * A 55 Hz root with a fifth above it. Low, consonant, no melody — nothing
//     to follow, so it never asks for attention of its own.
//   * Two oscillators at 110 and 114 Hz. The 4 Hz difference between them
//     beats slowly in the air; that rate sits in the theta band people
//     associate with a settled, receptive state. This is a mood device, not a
//     medical one, and it is doing openly what a film score does.
//   * Room noise under a low-pass, barely there — silence with no floor at
//     all reads as a dropped connection.
//   * The whole thing swells and falls once every ten seconds: six cycles a
//     minute, the rate used to pace slow breathing. People tend to fall in
//     with it without noticing, which is most of the effect.
//
// It sits at a third of the focus bed's level so it never competes with the
// narration, and the participant is told about it: the sound is one of the
// fragments replayed in Scene 13, where the screen admits what it was doing.

interface Calm {
  master: GainNode;
  nodes: { stop: () => void }[];
}

let calm: Calm | null = null;

const CALM_VOLUME = 0.055;
/** Six swells a minute — the pace used to slow breathing down. */
const BREATH_HZ = 0.1;
/**
 * The gap between the two carriers, in hertz.
 *
 * This was 4 Hz, which is the textbook theta rate and audibly a buzz: two
 * tones a fourth of a second apart do not read as atmosphere, they read as a
 * fault in the speaker. At 0.7 Hz the same two tones drift through each other
 * about once every second and a half — slow enough to be movement rather than
 * a tone, which is what the bed was supposed to be doing in the first place.
 */
const BEAT_HZ = 0.7;
/** How far the bed drops while the Pulse is speaking. */
const DUCK = 0.42;

export const startCalmBed = (): void => {
  if (calm || !enabled) return;
  const ac = audioContext();
  if (!ac) return;

  try {
    const master = ac.createGain();
    master.gain.setValueAtTime(0.0001, ac.currentTime);
    // A long fade in, so it is never audible as a thing that started.
    master.gain.exponentialRampToValueAtTime(CALM_VOLUME, ac.currentTime + 6);
    master.connect(ac.destination);

    const nodes: { stop: () => void }[] = [];

    const drone = (freq: number, level: number, type: OscillatorType = 'sine') => {
      const osc = ac.createOscillator();
      const gain = ac.createGain();
      osc.type = type;
      osc.frequency.value = freq;
      gain.gain.value = level;
      osc.connect(gain);
      gain.connect(master);
      osc.start();
      nodes.push({ stop: () => osc.stop() });
    };

    drone(55, 0.42);             // root
    drone(82.5, 0.18);           // a fifth above it
    drone(110, 0.13);            // carrier
    drone(110 + BEAT_HZ, 0.13);  // and its slow drift
    // A quiet partial two octaves up. Without it the bed is all bottom end,
    // which on a phone speaker is the muddiest thing it could be; this is what
    // makes it read as air rather than as rumble.
    drone(330, 0.05);

    // Room tone, filtered down to almost nothing.
    const noise = ac.createBufferSource();
    noise.buffer = noiseBuffer(ac);
    noise.loop = true;
    const filter = ac.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 520;
    const noiseGain = ac.createGain();
    noiseGain.gain.value = 0.03;
    noise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(master);
    noise.start();
    nodes.push({ stop: () => noise.stop() });

    // The breath: one slow swell every ten seconds, across the whole bed.
    const lfo = ac.createOscillator();
    const lfoDepth = ac.createGain();
    lfo.frequency.value = BREATH_HZ;
    lfoDepth.gain.value = CALM_VOLUME * 0.45;
    lfo.connect(lfoDepth);
    lfoDepth.connect(master.gain);
    lfo.start();
    nodes.push({ stop: () => lfo.stop() });

    calm = { master, nodes };
  } catch {
    // Sound is part of the experience, never a precondition for it.
  }
};

/**
 * Pull the bed back under the voice, and let it rise again in the silence.
 *
 * Without this the bed and the narration are two things happening at once in
 * the same room. Ducking puts them in a relationship: the words step forward
 * and the room recedes to make space, then the room comes back — slowly, over
 * a second and a half — into the pause after the sentence.
 *
 * The asymmetry is the whole trick. Ducking fast is a technical necessity;
 * releasing slowly is what makes a silence feel like it was left on purpose
 * rather than like nothing is happening. The swell arrives just as the
 * participant finishes taking the line in.
 */
export const duckCalmBed = (under: boolean): void => {
  if (!calm) return;
  const ac = audioContext();
  if (!ac) return;
  try {
    const g = calm.master.gain;
    const target = under ? CALM_VOLUME * DUCK : CALM_VOLUME;
    g.cancelScheduledValues(ac.currentTime);
    g.setValueAtTime(Math.max(g.value, 0.0001), ac.currentTime);
    // Down quickly so the first word is never fought; back up slowly so the
    // return is felt rather than heard.
    g.exponentialRampToValueAtTime(target, ac.currentTime + (under ? 0.35 : 1.5));
  } catch {
    // ignore
  }
};

export const stopCalmBed = (): void => {
  if (!calm) return;
  const ac = audioContext();
  const { master, nodes } = calm;
  calm = null;
  try {
    if (ac) {
      master.gain.cancelScheduledValues(ac.currentTime);
      master.gain.setValueAtTime(Math.max(master.gain.value, 0.0001), ac.currentTime);
      master.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + 1.6);
    }
    setTimeout(() => nodes.forEach(n => {
      try {
        n.stop();
      } catch {
        // already stopped
      }
    }), 1800);
  } catch {
    // ignore
  }
};
