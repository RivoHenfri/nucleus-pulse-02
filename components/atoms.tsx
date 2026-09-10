// The furniture every scene is built from.
//
// Division of labour, deliberately:
//   Motion for React  — anything whose timing follows the participant: scene
//                       changes, card arrival, the freeze, the peel, the replay.
//   CSS keyframes     — anything that just breathes on its own: ⚛️, the ring,
//                       the countdown flicker. No JS needs to own those.
//
// The whole experience is one room with the lights low: a line appears, it is
// allowed to sit there, then the next one arrives. Nothing bounces, nothing
// glows for attention — except in Round 1, where that is the point.

import { motion } from 'motion/react';
import React, { useEffect, useState } from 'react';
import { whenQuiet } from '../utils/narration';
import { buzz, tap as tapSound } from '../utils/sound';

/**
 * Full-height, centred, mobile-first stage.
 *
 * `glow` puts a very slow warm swell behind the content — twelve seconds a
 * cycle, barely above the black, never resolving into a shape. On the
 * reflective screens it gives the eye something to settle on so the silence
 * reads as space rather than as the app having stopped, and the long period
 * pulls the breath down with it. Off by default: under the two rounds it would
 * be one more thing competing for attention, which is the opposite of the job.
 */
export const Stage: React.FC<{
  children: React.ReactNode;
  className?: string;
  glow?: boolean;
}> = ({ children, className = '', glow }) => (
  <div
    className={`relative min-h-[100dvh] flex flex-col items-center justify-center px-6 py-16 text-center ${className}`}
  >
    {glow && (
      <motion.div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background:
            'radial-gradient(60% 45% at 50% 42%, rgba(237,231,218,0.05), transparent 70%)',
        }}
        animate={{ opacity: [0.35, 1, 0.35], scale: [0.94, 1.06, 0.94] }}
        transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
      />
    )}
    <div className="w-full max-w-md">{children}</div>
  </div>
);

/**
 * Reveal a run of beats on a timeline.
 *
 * Pass the gap before each beat in milliseconds; get back how many have landed.
 * Silence between beats is deliberate — it is most of the pacing in this app.
 */
export const useBeats = (gaps: number[]): number => {
  const [shown, setShown] = useState(0);
  // Keyed on the shape of the timeline, not on identity: a scene that passes a
  // fresh array literal every render must not restart its own beats, but a
  // scene that swaps in a real timeline later must pick it up.
  const signature = gaps.join(',');
  useEffect(() => {
    if (!gaps.length) return;
    setShown(0);
    const timers: ReturnType<typeof setTimeout>[] = [];
    let at = 0;
    gaps.forEach((gap, i) => {
      at += gap;
      timers.push(setTimeout(() => setShown(i + 1), at));
    });
    return () => timers.forEach(clearTimeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature]);
  return shown;
};

/**
 * Carry a scene on by itself once its last beat has landed.
 *
 * A tap on every one of seventeen screens turns an experience into a form.
 * Screens that only make a statement now flow on their own, the way a film
 * cuts; the button is kept for the screens where the participant has produced
 * something and deserves to sit with it for as long as they like.
 *
 * It waits for the voice as well as for the beats. Beat timings are scaled by
 * PACE and the narration is not, so at a tight tempo a screen's visuals finish
 * long before its last sentence has been said — and a scene that left on the
 * visuals alone talked over itself and lost the line. Waiting for the voice
 * makes the pause adapt to how much there actually is to say, which is the
 * only version that stays right when the tempo changes again.
 *
 * `hold` is how long the finished screen stands after the last word.
 */
export const useAutoAdvance = (ready: boolean, hold: number, onDone: () => void): void => {
  useEffect(() => {
    if (!ready) return;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let gone = false;
    whenQuiet(() => {
      if (!gone) timer = setTimeout(onDone, hold);
    });
    return () => {
      gone = true;
      if (timer) clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, hold]);
};

/** The sum of a beat timeline — where the continue button belongs. */
export const totalOf = (gaps: number[]): number => gaps.reduce((a, b) => a + b, 0);

interface BeatProps {
  show: boolean;
  children: React.ReactNode;
  className?: string;
  /** Rise as it fades in. Off for hero lines, which should simply be there. */
  lift?: boolean;
}

export const Beat: React.FC<BeatProps> = ({ show, children, className = '', lift = true }) => (
  <motion.div
    initial={false}
    animate={{ opacity: show ? 1 : 0, y: show ? 0 : lift ? 12 : 0 }}
    transition={{ duration: lift ? 1.3 : 1.7, ease: [0.22, 0.61, 0.36, 1] }}
    className={className}
  >
    {children}
  </motion.div>
);

/** Ordinary spoken-weight line. */
export const Line: React.FC<{ show: boolean; children: React.ReactNode; className?: string }> = ({
  show,
  children,
  className = '',
}) => (
  <Beat show={show}>
    <p className={`text-[17px] leading-relaxed text-gray-300 ${className}`}>{children}</p>
  </Beat>
);

/**
 * The lines that carry the scene. Set in caps, wide, quiet — and breathing.
 *
 * Once it has arrived a hero line drifts by about one percent over eight
 * seconds. It is too small to catch as motion and too slow to read as an
 * animation; what it does is stop the line from going dead on the screen while
 * the participant sits with it, which is exactly when these lines are supposed
 * to be doing their work.
 */
export const Hero: React.FC<{ show: boolean; children: React.ReactNode; className?: string }> = ({
  show,
  children,
  className = '',
}) => (
  <Beat show={show} lift={false}>
    <motion.h2
      animate={show ? { scale: [1, 1.012, 1], opacity: [0.92, 1, 0.92] } : {}}
      transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
      className={`font-display uppercase tracking-[0.18em] leading-[1.45] text-[22px] text-[#EDE7DA] ${className}`}
    >
      {children}
    </motion.h2>
  </Beat>
);

/** Small caps label above a block. */
export const Eyebrow: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className = '',
}) => (
  <p className={`text-[10px] font-semibold tracking-[0.32em] text-gray-500 uppercase ${className}`}>
    {children}
  </p>
);

/**
 * The one way forward. Never rushed onto the screen.
 *
 * It arrives rather than appears — a short rise under the fade, so the eye
 * catches that something became available without being poked about it.
 *
 * And it answers the finger. Every other tap in the experience returns a
 * haptic; this was the one button that did not, which made the most-pressed
 * control in the app the only dead one. A tick that is felt and not really
 * heard, so it confirms without announcing.
 */
export const Continue: React.FC<{
  show: boolean;
  label: string;
  onClick: () => void;
  tone?: 'quiet' | 'solid';
}> = ({ show, label, onClick, tone = 'quiet' }) => (
  <motion.div
    initial={false}
    animate={{ opacity: show ? 1 : 0, y: show ? 0 : 8 }}
    transition={{ duration: 1, ease: [0.22, 0.61, 0.36, 1] }}
    style={{ pointerEvents: show ? 'auto' : 'none' }}
  >
    <motion.button
      whileTap={{ scale: 0.96 }}
      onClick={() => {
        buzz(tone === 'solid' ? 24 : 14);
        tapSound();
        onClick();
      }}
      className={
        tone === 'solid'
          ? 'mt-14 px-12 py-4 rounded-full bg-[#EDE7DA] text-[#07090C] text-[12px] font-bold tracking-[0.28em]'
          : 'mt-14 px-9 py-3.5 rounded-full border border-white/15 text-[11px] font-semibold tracking-[0.28em] text-gray-400 hover:text-[#EDE7DA] hover:border-white/35 transition-colors duration-500'
      }
    >
      {label}
    </motion.button>
  </motion.div>
);

/**
 * ⚛️ — the Nucleus, breathing. Pure CSS: it has no business knowing what the
 * participant is doing.
 *
 * Deliberately small and almost unlit. The first version was a bright amber
 * disc with a wide bloom, and it read as a loading spinner in a game — exactly
 * the register this experience has to avoid.
 */
export const NucleusMark: React.FC<{ size?: number; dim?: boolean }> = ({ size = 44, dim }) => (
  <div className="relative mx-auto" style={{ width: size, height: size }}>
    <div
      className="absolute inset-0 rounded-full border border-amber-200/15 animate-ping-ring"
      style={{ animationDuration: '4.2s' }}
    />
    <div className="absolute inset-[30%] rounded-full bg-amber-100/70 animate-nucleusBreath" />
    <div
      className={`absolute inset-[18%] rounded-full ${dim ? 'bg-amber-200/[0.06]' : 'bg-amber-200/10'}`}
    />
  </div>
);

/** The crossfade between one scene and the next. */
export const SCENE_TRANSITION = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
  transition: { duration: 0.85, ease: [0.4, 0, 0.2, 1] as const },
};

/**
 * THE TEMPO OF THE WHOLE RUN.
 *
 * Every pause in every scene, and every narration cue that has to land with
 * one, is written at its natural length and then multiplied by this. One
 * number moves the entire experience: 1 is the pace the scenes were written
 * at, lower is tighter, higher gives a room more silence.
 *
 * Written out longhand the run lands near five minutes. 0.8 brought it to
 * 3:56, and in the room that still read as slow — the reveals lost their
 * snap because the pause before each one had time to go slack. 0.62 keeps
 * every beat and every silence, just tighter, and lands around 3:05.
 *
 * Change this, not the individual numbers — they are already balanced against
 * each other, and the ratios are what make the rhythm work.
 */
export const PACE = 0.62;

/** A scene's beat timeline, at the run's tempo. */
export const beats = (...gaps: number[]): number[] => gaps.map(g => Math.round(g * PACE));

/** A narration delay, at the run's tempo, so the voice keeps landing with the
 *  line it belongs to however the tempo is set. */
export const cue = (ms: number): number => Math.round(ms * PACE);
