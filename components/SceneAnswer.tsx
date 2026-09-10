// SCENE 03 — THE ANSWER
//
// Four things you could tell the client, and then one question about how sure
// you are.
//
// Committing to an answer is what turns "I stopped looking" into "I decided I
// knew enough". Without it the participant has merely run out of curiosity;
// with it they have made a claim to another person, which is what the ladder
// two scenes later takes apart.
//
// THE FOURTH OPTION IS NOT A COP-OUT and is not styled as one. I NEED TO
// VALIDATE FIRST sits in the same box, in the same weight, in the same order
// it was written. Chosen after five sources it is a different sentence from
// the same words chosen after one, and the mirror can say so — but the app
// does not rank it, and it is emphatically not the right answer wearing a
// modest hat.
//
// CONFIDENCE IS NOT A SCORE. It exists so the room can hold certainty next to
// how much was actually opened, in aggregate, once. It is never shown back to
// this participant as a judgement, never combined with the source count into a
// number, and never named as anything other than what they said.

import { motion } from 'motion/react';
import React, { useEffect, useState } from 'react';
import { COPY, type Lang } from '../i18n';
import type { AnswerId, Confidence } from '../types';
import { hush, narrate } from '../utils/narration';
import { buzz, tap as tapSound } from '../utils/sound';
import { Beat, Continue, Eyebrow, Stage, cue } from './atoms';

interface Props {
  lang: Lang;
  /** The clock ran out rather than the participant pressing the button. */
  timedOut: boolean;
  onDone: (answer: AnswerId, confidence: Confidence) => void;
}

const ANSWERS: AnswerId[] = ['reserved', 'sold', 'in-process', 'validate-first'];
const LEVELS: Confidence[] = ['low', 'medium', 'high'];

const SceneAnswer: React.FC<Props> = ({ lang, timedOut, onDone }) => {
  const c = COPY[lang].answer;
  const [answer, setAnswer] = useState<AnswerId | null>(null);
  const [confidence, setConfidence] = useState<Confidence | null>(null);

  useEffect(() => {
    narrate('answer', cue(600));
    return () => hush();
  }, []);

  const pick = (a: AnswerId) => {
    setAnswer(a);
    buzz(18);
    tapSound();
  };

  return (
    <Stage glow className="!justify-start pt-20">
      {timedOut && (
        <Beat show>
          <p className="mb-8 text-[12px] leading-relaxed text-gray-500">{c.timeUp}</p>
        </Beat>
      )}

      <p className="font-display text-[21px] leading-[1.5] text-[#EDE7DA]">{c.title}</p>

      <div className="mt-9 space-y-2.5">
        {ANSWERS.map(a => (
          <motion.button
            key={a}
            whileTap={{ scale: 0.985 }}
            onClick={() => pick(a)}
            className={`w-full rounded-2xl border px-5 py-4 text-[12px] font-semibold tracking-[0.2em] transition-colors duration-400 ${
              answer === a
                ? 'border-[#EDE7DA]/70 bg-[#EDE7DA]/[0.07] text-[#EDE7DA]'
                : 'border-white/[0.08] text-gray-400 hover:border-white/25'
            }`}
          >
            {c.options[a]}
          </motion.button>
        ))}
      </div>

      {/* Only after a claim has been made. Asking how sure someone is before
          they have said anything makes confidence the subject; asking after
          makes it a property of what they just said. */}
      <motion.div
        initial={false}
        animate={{ opacity: answer ? 1 : 0, y: answer ? 0 : 10 }}
        transition={{ duration: 0.9, ease: [0.22, 0.61, 0.36, 1] }}
        style={{ pointerEvents: answer ? 'auto' : 'none' }}
        className="mt-12"
      >
        <Eyebrow>{c.confidence}</Eyebrow>
        <div className="mt-4 flex gap-2.5">
          {LEVELS.map(l => (
            <button
              key={l}
              onClick={() => {
                setConfidence(l);
                buzz(14);
                tapSound();
              }}
              className={`flex-1 rounded-full border px-3 py-3 text-[10px] font-semibold tracking-[0.2em] transition-colors duration-400 ${
                confidence === l
                  ? 'border-[#EDE7DA]/70 text-[#EDE7DA]'
                  : 'border-white/[0.08] text-gray-500 hover:border-white/25'
              }`}
            >
              {c.levels[l]}
            </button>
          ))}
        </div>
      </motion.div>

      <div className="pb-16">
        <Continue
          show={!!answer && !!confidence}
          label={c.cta}
          tone="solid"
          onClick={() => onDone(answer!, confidence!)}
        />
      </div>
    </Stage>
  );
};

export default SceneAnswer;
