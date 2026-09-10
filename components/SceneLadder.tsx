// SCENE 07 — THE CONSEQUENCE LADDER
//
// Three questions, one at a time, answered with exactly what the participant
// already knows. No new record is opened, nothing is revealed between the
// steps, and the participant is told as much by the eyebrow standing over all
// three: THE SAME THING YOU KNOW RIGHT NOW.
//
// This is the scene that stops PULSE 02 from teaching "always check more
// sources" — a lesson as useless as its opposite, and one an experience about
// stopping would otherwise slide into by accident. Nothing changes across the
// three steps except what happens if you are wrong, and almost everyone
// answers yes, then hesitates, then no. Feeling their own answer move while
// their knowledge stands still is the argument; no line of copy has to make it.
//
// ONE AT A TIME, AND EACH ONE LOCKS. Shown as a list of three, the participant
// reads all of them, calibrates a consistent-looking set of answers, and
// answers as a person being observed. Revealed one at a time with the previous
// answer already committed, they answer as a person deciding — and the third
// question arrives after the second has already been paid for.

import { AnimatePresence, motion } from 'motion/react';
import React, { useEffect, useState } from 'react';
import { LADDER } from '../data';
import { COPY, type Lang } from '../i18n';
import type { LadderStep } from '../types';
import { hush, narrate } from '../utils/narration';
import { buzz, tap as tapSound } from '../utils/sound';
import { Beat, Continue, Eyebrow, Stage, cue } from './atoms';

interface Props {
  lang: Lang;
  onContinue: (answers: Partial<Record<LadderStep, boolean>>) => void;
}

const SceneLadder: React.FC<Props> = ({ lang, onContinue }) => {
  const c = COPY[lang].ladder;
  const [at, setAt] = useState(0);
  const [answers, setAnswers] = useState<Partial<Record<LadderStep, boolean>>>({});
  const done = at >= LADDER.length;

  useEffect(() => {
    narrate('ladder', cue(700));
    return () => hush();
  }, []);

  const answer = (step: LadderStep, yes: boolean) => {
    buzz(yes ? 18 : 26);
    tapSound();
    setAnswers(prev => ({ ...prev, [step]: yes }));
    // A short hold before the next step so the answer just given is allowed to
    // be an answer rather than a keystroke on the way to the next question.
    setTimeout(() => setAt(i => i + 1), cue(900));
  };

  const step = done ? null : LADDER[at];

  return (
    <Stage glow>
      <Eyebrow>{c.eyebrow}</Eyebrow>

      <div className="mt-12 min-h-[15rem]">
        <AnimatePresence mode="wait">
          {step && (
            <motion.div
              key={step}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.75, ease: [0.22, 0.61, 0.36, 1] }}
            >
              <p className="text-[16px] leading-relaxed text-gray-400">{c.steps[step].setup}</p>

              {c.steps[step].quote && (
                <p className="font-display mt-5 text-[20px] leading-[1.5] text-[#EDE7DA]">
                  {c.steps[step].quote}
                </p>
              )}

              <p className="mt-9 text-[17px] text-gray-300">{c.steps[step].ask}</p>

              <div className="mt-8 flex justify-center gap-3">
                {[true, false].map(yes => (
                  <button
                    key={String(yes)}
                    onClick={() => answer(step, yes)}
                    className="w-28 rounded-full border border-white/12 px-6 py-3.5 text-[11px] font-semibold tracking-[0.26em] text-gray-400 transition-colors duration-400 hover:border-white/35 hover:text-[#EDE7DA]"
                  >
                    {yes ? c.yes : c.no}
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {/* No summary of the three answers, and no reading of them. The
              participant felt the ladder; being shown a table of what they
              said would turn it back into a result — and a line telling them
              what their own answers meant would take the recognition off them
              and hand it to the app. So the third answer is followed by
              nothing, and the way on appears in the quiet. */}
          {done && <motion.div key="landed" className="h-4" />}
        </AnimatePresence>
      </div>

      <Beat show={done}>
        <Continue show={done} label={c.cta} onClick={() => onContinue(answers)} />
      </Beat>
    </Stage>
  );
};

export default SceneLadder;
