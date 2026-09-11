// SCENE 08 — FINAL REVEAL
//
// Five lines, the mark, and the question the Pulse opened with.
//
// PULSE 01 named its experiment on the last screen. PULSE 02 does not, and the
// reason is structural rather than stylistic: the reveal already happened two
// scenes ago, in the participant's own behaviour, and an app that followed it
// with "this was an experiment about when you stop verifying" would be taking
// the recognition off the person who had it and claiming it.
//
// Nothing follows the mark except the handoff. No "what do you think?", no
// prompt to reflect, no leadership line. The WhatsApp thread is where the room
// talks, and it will do that better if the app stopped talking first.

import React, { useEffect, useState } from 'react';
import { COPY, type Lang } from '../i18n';
import { hush, narrate } from '../utils/narration';
import { Beat, Continue, Hero, Stage, beats, cue, useBeats } from './atoms';
import NucleusLogo from './NucleusLogo';

interface Props {
  lang: Lang;
  onRestart: () => void;
}

// rarely · another source · you stop · not because · because · mark · question ·
// the handoff. The last gap is the longest in the run: the question has to be
// allowed to sit before anything points at what comes after it.
const GAPS = beats(1600, 2700, 2600, 2400, 2600, 3000, 2400, 3600);

const SceneEnd: React.FC<Props> = ({ lang, onRestart }) => {
  const c = COPY[lang].end;
  const shown = useBeats(GAPS);

  useEffect(() => {
    narrate('end-1', cue(900));
    narrate('end-2', cue(4400));
    narrate('end-3', cue(9200));
    return () => hush();
  }, []);

  /* The restart is for the facilitator's phone between participants, so it
     arrives long after the last line and stays quiet. Nobody should reach the
     end of this and be offered a button. */
  const [ready, setReady] = useState(false);
  useEffect(() => {
    if (shown < GAPS.length) return;
    const t = setTimeout(() => setReady(true), cue(4000));
    return () => clearTimeout(t);
  }, [shown]);

  return (
    <Stage glow>
      <Beat show={shown >= 1}>
        <p className="text-[17px] leading-relaxed text-gray-300">{c.lines[0]}</p>
      </Beat>

      <Beat show={shown >= 2} className="mt-4">
        <p className="text-[17px] leading-relaxed text-gray-400">{c.lines[1]}</p>
      </Beat>

      <Hero show={shown >= 3} className="mt-14">
        {c.lines[2]}
      </Hero>

      <Beat show={shown >= 4} className="mt-8">
        <p className="text-[16px] leading-relaxed text-gray-400">{c.lines[3]}</p>
      </Beat>

      <Beat show={shown >= 5} className="mt-3">
        <p className="text-[16px] leading-relaxed text-[#EDE7DA]">{c.lines[4]}</p>
      </Beat>

      {/* The mark's second and last appearance in the whole run. */}
      <Beat show={shown >= 6} className="mt-16">
        <NucleusLogo size={140} ignite={shown >= 6} breathe />
        <p className="mt-6 text-[12px] font-semibold tracking-[0.36em] text-amber-100/70">
          ◉ {c.mark}
        </p>
      </Beat>

      <Beat show={shown >= 7} className="mt-6">
        <p className="font-display text-[19px] tracking-[0.04em] text-[#EDE7DA]">{c.question}</p>
      </Beat>

      {/* The handoff, the way PULSE 01 handed off to this one — named on the
          way out, long after the last line, so it reads as a door rather than
          a trailer. PULSE 01 could also pose TRUTH's question here because
          TRUTH was already designed; ORBIT is a name and nothing more until
          it has a question of its own. */}
      <Beat show={shown >= 8} className="mt-16">
        <p className="text-[10px] font-semibold tracking-[0.32em] text-gray-600">{c.next}</p>
        <p className="font-display mt-2 text-[15px] tracking-[0.28em] text-gray-400">{c.orbit}</p>
      </Beat>

      <Continue show={ready} label={c.restart} onClick={onRestart} />
    </Stage>
  );
};

export default SceneEnd;
