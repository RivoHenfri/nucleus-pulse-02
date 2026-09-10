// SCENE 01 — OPENING
//
// Black. The mark ignites. Then a language, a clock, four sentences, and a way
// in. The app never says the word experiment, never says truth is the subject,
// and never mentions that anything is being observed.
//
// The four lines are the spec's, in order, and the last one is the only
// instruction the participant is ever given:
//
//   Answer when you think you know enough.
//
// It has to arrive as help — the way a colleague would say it — because in
// ninety seconds it becomes the thing the whole Pulse turns on, and a
// participant who reads it as a rule will spend the workspace looking for the
// rule's threshold instead of finding their own.
//
// The language choice is also the gesture that buys the right to play audio on
// mobile, so it is spent there deliberately.

import { AnimatePresence, motion } from 'motion/react';
import React, { useEffect, useState } from 'react';
import { COPY, LANGUAGES, type Lang } from '../i18n';
import { hush, narrate, setNarrationLang, unlockAudio, whenQuiet } from '../utils/narration';
import { buzz, unlockWebAudio } from '../utils/sound';
import { roomCode } from '../utils/room';
import { Beat, Continue, Stage, beats, cue, useBeats } from './atoms';
import NucleusLogo from './NucleusLogo';

interface Props {
  lang: Lang;
  onChooseLang: (lang: Lang) => void;
  onEnter: () => void;
}

/** The mark takes this long to light before anything is asked of anyone. */
const IGNITION_MS = cue(4200);

// clock · client · question · places · instruction · button
const GAPS = beats(1200, 1900, 2100, 1900, 2000, 1400);

const SceneEnter: React.FC<Props> = ({ lang, onChooseLang, onEnter }) => {
  const c = COPY[lang].enter;
  const [lit, setLit] = useState(false);
  const room = roomCode();
  const [started, setStarted] = useState(false);
  const shown = useBeats(started ? GAPS : []);

  useEffect(() => {
    const t = setTimeout(() => setLit(true), IGNITION_MS);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => () => hush(), []);

  const choose = (next: Lang) => {
    // One gesture, three unlocks: the audio element, the Web Audio context,
    // and the run itself.
    unlockAudio();
    unlockWebAudio();
    buzz(18);
    onChooseLang(next);
    setNarrationLang(next);
    setStarted(true);
    narrate('enter-1', cue(1200));
    narrate('enter-2', cue(3100));
    narrate('enter-3', cue(5200));
    narrate('enter-4', cue(7100));
  };

  /** The button waits for the last line to finish being spoken. */
  const [spoken, setSpoken] = useState(false);
  useEffect(() => {
    if (shown < GAPS.length - 1) return;
    let gone = false;
    whenQuiet(() => !gone && setSpoken(true));
    return () => {
      gone = true;
    };
  }, [shown]);

  return (
    <Stage glow>
      <NucleusLogo size={240} ignite delay={0} />

      <AnimatePresence mode="wait">
        {!started ? (
          <motion.div
            key="pick"
            initial={{ opacity: 0 }}
            animate={{ opacity: lit ? 1 : 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.4 }}
            className="mt-12"
          >
            <p className="text-[10px] font-semibold tracking-[0.34em] text-gray-500">
              {c.brand}
            </p>
            <p className="font-display mt-2 text-[13px] tracking-[0.26em] text-gray-400">
              {c.pulse}
            </p>

            {/* Said before the choice, not after: this run is carried by a
                voice, and someone who finds that out on the second screen has
                already missed the first one. */}
            <p className="mb-4 mt-8 px-6 text-[12px] leading-relaxed text-gray-600">
              {COPY[lang].common.soundHint}
            </p>

            {/* The room this phone is in, when a facilitator's link put it in
                one. Small, and only so the person holding the phone can see
                they scanned the right code — it is not a thing to act on. */}
            {room && (
              <p className="mx-auto mb-5 w-fit rounded-full border border-white/10 px-3 py-1 text-[10px] tracking-[0.3em] text-gray-500">
                {room}
              </p>
            )}

            <div className="flex flex-col items-center gap-3">
              {LANGUAGES.map(l => (
                <button
                  key={l.code}
                  onClick={() => choose(l.code)}
                  disabled={!lit}
                  className="w-56 rounded-full border border-white/12 py-3.5 text-[12px] tracking-[0.24em] text-gray-400 transition-colors duration-500 hover:border-white/35 hover:text-[#EDE7DA]"
                >
                  {l.label}
                </button>
              ))}
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="brief"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1.2 }}
            className="mt-12"
          >
            {/* A clock, because a morning has one. Not a countdown — that
                arrives on the next screen and is a different kind of clock. */}
            <Beat show={shown >= 1}>
              <p className="font-record text-[11px] tracking-[0.2em] text-gray-500">{c.clock}</p>
            </Beat>

            <Beat show={shown >= 2} className="mt-8">
              <p className="text-[17px] leading-relaxed text-gray-300">{c.lines[0]}</p>
            </Beat>

            <Beat show={shown >= 3} className="mt-6">
              <p className="font-display text-[20px] leading-[1.5] text-[#EDE7DA]">
                {c.lines[1]}
              </p>
            </Beat>

            <Beat show={shown >= 4} className="mt-8">
              <p className="text-[16px] leading-relaxed text-gray-400">{c.lines[2]}</p>
            </Beat>

            <Beat show={shown >= 5} className="mt-3">
              <p className="text-[16px] leading-relaxed text-gray-400">{c.lines[3]}</p>
            </Beat>

            <Continue show={shown >= GAPS.length && spoken} label={c.cta} onClick={onEnter} tone="solid" />
          </motion.div>
        )}
      </AnimatePresence>
    </Stage>
  );
};

export default SceneEnter;
