// SCENE 06 — PERSONAL MIRROR
//
// Four facts about this run, read back flat, and then the two sentences the
// whole Pulse exists to arrive at.
//
// The facts are quoted, not interpreted. "You checked 3 of 6 sources" is a
// count. "You answered with 31 seconds remaining" is a clock reading. "Your
// answer: SOLD" is their own word. "Your confidence: HIGH" is their own word.
// Nothing on this screen is a sentence the app inferred about a person.
//
// WHAT IS BANNED HERE, permanently:
//
//   ✗ You trust too quickly.
//   ✗ You have confirmation bias.
//   ✗ Your truth score: 63%.
//
// Every one of those is the app claiming to know something about someone from
// four data points gathered in ninety seconds, and every one of them turns a
// mirror into a verdict. The count is a reading of how much certainty one
// person needed for one hypothetical client message on one Wednesday morning.
// Attached to a judgement it becomes a performance review, which is the one
// thing this experience must never become.
//
// So it says the count, and then it says who decided:
//
//   Nobody told you when you knew enough.
//   You decided that yourself.
//
// And then it stops.

import React, { useEffect, useState } from 'react';
import { SOURCES } from '../data';
import { COPY, type Lang } from '../i18n';
import type { AnswerId, Confidence, SourceId } from '../types';
import { hush, narrate } from '../utils/narration';
import { Beat, Continue, Hero, Stage, beats, cue, useBeats } from './atoms';

interface Props {
  lang: Lang;
  opened: SourceId[];
  answer: AnswerId;
  confidence: Confidence;
  secondsRemaining: number;
  onContinue: () => void;
}

// checked · answered · answer+confidence · more · [pause] · hero 1 · hero 2
const GAPS = beats(1300, 1700, 1900, 2600, 3200, 2800, 2600);

const SceneMirror: React.FC<Props> = ({
  lang,
  opened,
  answer,
  confidence,
  secondsRemaining,
  onContinue,
}) => {
  const c = COPY[lang].mirror;
  const a = COPY[lang].answer;
  const total = SOURCES.length;
  const all = opened.length === total;
  const shown = useBeats(GAPS);

  /* Four facts about this run, all of them built from this run's numbers, so
     the voice says none of them. It arrives for the two lines that are the
     same for everybody — which is exactly the moment the scene stops being
     about this participant's count and becomes about who decided. */
  useEffect(() => {
    narrate('mirror-1', cue(11200));
    narrate('mirror-2', cue(14000));
    return () => hush();
  }, []);

  const [ready, setReady] = useState(false);
  useEffect(() => {
    if (shown < GAPS.length) return;
    const t = setTimeout(() => setReady(true), cue(1400));
    return () => clearTimeout(t);
  }, [shown]);

  return (
    <Stage glow>
      <Beat show={shown >= 1}>
        <p className="text-[17px] leading-relaxed text-gray-300">
          {c.checked(opened.length, total)}
        </p>
      </Beat>

      <Beat show={shown >= 2} className="mt-3">
        <p className="text-[17px] leading-relaxed text-gray-400">
          {secondsRemaining > 0 ? c.answered(secondsRemaining) : c.answeredNoTime}
        </p>
      </Beat>

      {/* Their own two words, set as a record rather than as prose — this is
          the app quoting them, not describing them. */}
      <Beat show={shown >= 3} className="mt-10">
        <div className="mx-auto w-full max-w-[16rem] space-y-2 rounded-2xl border border-white/[0.07] px-5 py-4 text-left">
          <div className="flex items-baseline justify-between gap-4">
            <span className="text-[11px] text-gray-500">{c.yourAnswer}</span>
            <span className="font-record text-right text-[12px] text-[#EDE7DA]">
              {a.options[answer]}
            </span>
          </div>
          <div className="flex items-baseline justify-between gap-4">
            <span className="text-[11px] text-gray-500">{c.yourConfidence}</span>
            <span className="font-record text-right text-[12px] text-[#EDE7DA]">
              {a.levels[confidence]}
            </span>
          </div>
        </div>
      </Beat>

      <Beat show={shown >= 4} className="mt-9">
        <p className="text-[16px] leading-relaxed text-gray-400">{all ? c.moreAll : c.more}</p>
      </Beat>

      {/* Beat 5 is silence. The two lines below are the point of PULSE 02 and
          they do not land if they arrive on the heels of the count. */}

      <Hero show={shown >= 6} className="mt-16">
        {c.hero[0]}
      </Hero>

      <Hero show={shown >= 7} className="mt-5">
        {c.hero[1]}
      </Hero>

      <Continue show={ready} label={c.cta} onClick={onContinue} />
    </Stage>
  );
};

export default SceneMirror;
