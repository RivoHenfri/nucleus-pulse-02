// SCENE 04 — FIRST REVEAL
//
// What must never appear on this screen:
//
//   ✗ Incorrect
//   ✗ Correct answer: A18
//
// Either of those ends the experiment. The moment the app grades the answer,
// the participant stops thinking about their own stopping point and starts
// thinking about the app's opinion of them — and every reflection after it is
// a reaction to a mark rather than to a decision they made.
//
// So the screen only counts, and then pauses, and then says the two things the
// count means:
//
//   You didn't have the whole picture.
//   But you decided you knew enough to answer.
//
// Two sentences, and the pause between them is doing as much work as either.
//
// THE SIX-SOURCE BRANCH. A participant who opened everything did not have the
// whole picture either — the six records do not agree, and the masterplan
// reframes the question rather than answering it. Telling them they had it
// would be the one untrue sentence in the experience, so that branch says what
// is actually the case: the six of them still didn't say the same thing.

import React, { useEffect, useState } from 'react';
import { SOURCES } from '../data';
import { COPY, type Lang } from '../i18n';
import { hush, narrate } from '../utils/narration';
import { Beat, Continue, beats, cue, useBeats } from './atoms';
import { Stage } from './atoms';

interface Props {
  lang: Lang;
  openedCount: number;
  onContinue: () => void;
}

// count · remaining · [long pause] · incomplete · decided · mark · button
const GAPS = beats(1400, 1800, 3400, 2600, 2600, 2200);

const SceneReveal: React.FC<Props> = ({ lang, openedCount, onContinue }) => {
  const c = COPY[lang].reveal;
  const total = SOURCES.length;
  const left = total - openedCount;
  const all = left === 0;
  const shown = useBeats(GAPS);

  /* The first two beats are a count and a remainder — both built from this
     run's numbers, so neither can be a pre-rendered line. The voice stays out
     of them and speaks only the two fixed sentences, which is also where the
     voice is most wanted: the participant is reading numbers about themselves
     and should not be talked over while they do it. */
  useEffect(() => {
    narrate(all ? 'reveal-1-all' : 'reveal-1', cue(5200));
    narrate('reveal-2', cue(7900));
    return () => hush();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [ready, setReady] = useState(false);
  useEffect(() => {
    if (shown < GAPS.length) return;
    const t = setTimeout(() => setReady(true), cue(1200));
    return () => clearTimeout(t);
  }, [shown]);

  return (
    <Stage glow>
      <Beat show={shown >= 1}>
        <p className="text-[17px] leading-relaxed text-gray-300">
          {openedCount === 1 ? c.checkedOne(total) : c.checked(openedCount, total)}
        </p>
      </Beat>

      <Beat show={shown >= 2} className="mt-4">
        <p className="text-[17px] leading-relaxed text-gray-400">
          {left === 0 ? c.remainingNone : left === 1 ? c.remainingOne : c.remaining(left)}
        </p>
      </Beat>

      {/* The pause. Beat 3 has no content of its own — it is the silence the
          two halves of this scene are separated by, and it is deliberate. */}

      <Beat show={shown >= 4} className="mt-16">
        <p className="font-display text-[20px] leading-[1.5] text-[#EDE7DA]">
          {all ? c.incompleteAll : c.incomplete}
        </p>
      </Beat>

      <Beat show={shown >= 5} className="mt-6">
        <p className="font-display text-[20px] leading-[1.5] text-[#EDE7DA]">{c.decided}</p>
      </Beat>

      <Beat show={shown >= 6} className="mt-16">
        <p className="text-[12px] font-semibold tracking-[0.36em] text-amber-100/70">
          ◉ {c.mark}
        </p>
      </Beat>

      <Continue show={ready} label={all ? c.ctaAll : c.cta} onClick={onContinue} />
    </Stage>
  );
};

export default SceneReveal;
