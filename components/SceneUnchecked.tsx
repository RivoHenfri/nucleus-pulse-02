// SCENE 05 — SEE WHAT I DIDN'T CHECK
//
// All six, open, in the order they sat on the floor. Each one marked with
// whether this participant had opened it — stated, never scored: no tick, no
// cross, no red, and the "you didn't open this" mark is warmer than the other
// one rather than more alarming.
//
// The scene has to hold two opposite reactions without taking a side:
//
//   "Oh — there was a masterplan."
//   "I already saw that, and I still wouldn't answer before Legal confirms."
//
// Both are the experiment working. The first is someone meeting information
// that changes the question; the second is someone whose judgement was already
// where the information would have taken them. An app that celebrated the
// first would be telling the second they had wasted their care.
//
// So there is no commentary. The cards open, the participant reads, and the
// only voice on the screen is the six systems speaking for themselves.

import { motion } from 'motion/react';
import React, { useEffect, useState } from 'react';
import { SOURCES } from '../data';
import { COPY, type Lang } from '../i18n';
import type { SourceId } from '../types';
import { hush, narrate } from '../utils/narration';
import { ping } from '../utils/sound';
import { Continue, Eyebrow, cue } from './atoms';
import SourceCard from './SourceCard';

interface Props {
  lang: Lang;
  opened: SourceId[];
  onContinue: () => void;
}

const FIRST_PEEL = cue(1200);
const PEEL_GAP = cue(850);

const SceneUnchecked: React.FC<Props> = ({ lang, opened, onContinue }) => {
  const c = COPY[lang].unchecked;
  const [shown, setShown] = useState(0);

  useEffect(() => {
    narrate('unchecked', cue(700));
    const timers = SOURCES.map((_, i) =>
      setTimeout(() => {
        setShown(i + 1);
        ping();
      }, FIRST_PEEL + i * PEEL_GAP),
    );
    return () => {
      timers.forEach(clearTimeout);
      hush();
    };
  }, []);

  const allOpen = shown >= SOURCES.length;

  return (
    <div className="min-h-[100dvh] px-4 pb-16 pt-14">
      <div className="mx-auto w-full max-w-md">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.4 }}
          className="text-center"
        >
          <Eyebrow>{c.eyebrow}</Eyebrow>
          <p className="mt-4 text-[16px] leading-relaxed text-gray-300">{c.title}</p>
        </motion.div>

        <div className="mt-10 space-y-2.5">
          {SOURCES.map((s, i) => (
            <motion.div
              key={s.id}
              layout
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.2 + i * 0.1 }}
            >
              <SourceCard
                source={s}
                lang={lang}
                open={i < shown}
                wasOpened={opened.includes(s.id)}
              />
            </motion.div>
          ))}
        </div>

        <div className="text-center">
          <Continue show={allOpen} label={c.cta} onClick={onContinue} />
        </div>
      </div>
    </div>
  );
};

export default SceneUnchecked;
