// SCENE 02 — THE WORKSPACE
//
// Six records, seventy-five seconds, and no instruction about how many to
// open. This is the whole experiment, and almost all of the design work in it
// went into things the screen does NOT do.
//
// WHAT IS ABSENT, AND WHY.
//
//   No progress bar, no "3 of 6", no counter anywhere. A counter invents a
//   denominator, a denominator invents a target, and a participant working
//   towards a target is no longer deciding when they know enough — they are
//   completing a form. The app knows how many were opened; the participant is
//   never shown it until after they have answered.
//
//   No ranking. Same card, same size, same face, same grey for every date. The
//   Registry is three weeks stale and looks exactly like the masterplan issued
//   two days ago.
//
//   No warning on the conflict. When Sales says RESERVED and the Registry says
//   SOLD, nothing highlights, nothing turns amber, nothing offers to reconcile
//   them. The tension is the participant's to feel.
//
//   No reward for opening more. Opening the sixth card produces exactly the
//   same sound and the same animation as opening the first.
//
// ANSWER NOW IS THERE FROM THE FIRST SECOND, at full strength, never greyed,
// never behind a minimum. A participant who reads the client's question and
// answers immediately without opening anything is making the decision this
// Pulse is about, and the app must let them.
//
// THE CLOCK. Seventy-five seconds, counted down quietly. It does not flash, it
// does not turn red, it does not accelerate. Its only job is to make stopping
// a decision that happens in time rather than an afternoon of deliberation —
// and to give the mirror something honest to say about how much of it was
// left. If it runs out, the answer screen opens by itself; nobody is punished
// for it and the copy there says so plainly.

import { motion } from 'motion/react';
import React, { useEffect, useRef, useState } from 'react';
import { ROUND_SECONDS, SOURCES } from '../data';
import { COPY, type Lang } from '../i18n';
import type { SourceId } from '../types';
import { startFocusBed, stopFocusBed } from '../utils/ambience';
import { hush, narrate } from '../utils/narration';
import { buzz, tap as tapSound } from '../utils/sound';
import { cue } from './atoms';
import SourceCard from './SourceCard';

interface Props {
  lang: Lang;
  onAnswer: (opened: SourceId[], secondsRemaining: number) => void;
}

const SceneWorkspace: React.FC<Props> = ({ lang, onAnswer }) => {
  const c = COPY[lang].workspace;
  const [opened, setOpened] = useState<SourceId[]>([]);
  const [left, setLeft] = useState(ROUND_SECONDS);
  /* The handoff must happen exactly once. Both the button and the expiring
     clock can trigger it, and on a slow phone they can land in the same tick. */
  const done = useRef(false);
  /* The clock's interval is created once and closes over the first render, so
     it cannot read `opened` from state — a run that timed out would report
     zero sources opened no matter what the participant did. */
  const openedRef = useRef<SourceId[]>([]);

  useEffect(() => {
    startFocusBed();
    narrate('workspace', cue(700));
    return () => {
      stopFocusBed();
      hush();
    };
  }, []);

  const finish = (remaining: number) => {
    if (done.current) return;
    done.current = true;
    onAnswer(openedRef.current, Math.max(0, remaining));
  };

  useEffect(() => {
    const t = setInterval(() => {
      setLeft(prev => {
        const next = prev - 1;
        if (next <= 0) {
          clearInterval(t);
          finish(0);
          return 0;
        }
        return next;
      });
    }, 1000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const open = (id: SourceId) => {
    if (opened.includes(id)) return;
    openedRef.current = [...openedRef.current, id];
    setOpened(openedRef.current);
    buzz(14);
    tapSound();
  };

  return (
    <div className="min-h-[100dvh] px-4 pb-40 pt-8">
      <div className="mx-auto w-full max-w-md">
        {/* The question, standing over everything, unanswered. */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="font-display text-[19px] tracking-[0.16em] text-[#EDE7DA]">{c.plot}</p>
            <p className="mt-1.5 text-[12px] text-gray-500">
              {c.status}: <span className="font-record text-gray-400">{c.unknown}</span>
            </p>
          </div>
          <p className="font-record animate-secondTick pt-1 text-[13px] tracking-wide text-gray-500">
            {c.seconds(left)}
          </p>
        </div>

        <div className="mt-8 space-y-2.5">
          {SOURCES.map((s, i) => (
            <motion.div
              key={s.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.15 + i * 0.07 }}
            >
              <SourceCard
                source={s}
                lang={lang}
                open={opened.includes(s.id)}
                onOpen={() => open(s.id)}
              />
            </motion.div>
          ))}
        </div>

        {/* Said once, after the first card, so a first tap reads as opening
            something rather than as choosing something. Then it goes away. */}
        <motion.p
          initial={false}
          animate={{ opacity: opened.length === 1 ? 1 : 0 }}
          transition={{ duration: 0.9 }}
          className="mt-6 text-center text-[11px] tracking-wide text-gray-600"
        >
          {c.hint}
        </motion.p>
      </div>

      {/* Both actions, always, from the first second. CHECK ANOTHER SOURCE is
          not a control — there is nothing for it to do that tapping a card
          does not already do — so it is written as the quiet half of the pair
          and simply scrolls the floor back into view. It exists because the
          spec puts the two choices side by side at every moment, and seeing
          them side by side is what makes ANSWER NOW feel like a decision. */}
      <div className="fixed inset-x-0 bottom-0 z-30 bg-gradient-to-t from-[#06080B] via-[#06080B]/95 to-transparent px-4 pb-7 pt-10">
        <div className="mx-auto flex w-full max-w-md flex-col items-center gap-3">
          <button
            onClick={() => {
              tapSound();
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className="text-[10px] font-semibold tracking-[0.26em] text-gray-600 transition-colors duration-500 hover:text-gray-400"
          >
            {c.another}
          </button>
          <motion.button
            whileTap={{ scale: 0.96 }}
            onClick={() => {
              buzz(24);
              tapSound();
              finish(left);
            }}
            className="w-full rounded-full bg-[#EDE7DA] px-10 py-4 text-[12px] font-bold tracking-[0.28em] text-[#07090C]"
          >
            {c.answer}
          </motion.button>
        </div>
      </div>
    </div>
  );
};

export default SceneWorkspace;
