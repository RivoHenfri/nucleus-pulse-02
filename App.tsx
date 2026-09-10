// NUCLEUS — PULSE 02: TRUTH
//
// One participant, one client question, eight screens.
//
// The arc the scenes are cut to:
//   routine → request → search → sufficiency → stop → recognition →
//   consequence → judgment
//
// Everything the run remembers lives in this component and, for a refresh, in
// localStorage: which of six records were opened, what the participant told
// the client, how sure they said they were, how much of the clock was left,
// and three yes/no answers about consequence. There is no login and no
// identity; the only thing that ever leaves the phone is that object, once, to
// a room the facilitator opened.

import { AnimatePresence, motion } from 'motion/react';
import React, { useEffect, useState } from 'react';
import { COPY, type Lang } from './i18n';
import type { AnswerId, Confidence, LadderStep, SceneId, SourceId } from './types';
import { setAmbienceEnabled, startCalmBed, stopCalmBed, stopFocusBed } from './utils/ambience';
import { hush, onAudioTrouble, setNarrationEnabled, setNarrationLang } from './utils/narration';
import { joinRoom, submitToRoom } from './utils/room';
import { unlockWebAudio } from './utils/sound';
import { setVoiceEnabled, silence } from './utils/voice';

import SceneAnswer from './components/SceneAnswer';
import SceneEnd from './components/SceneEnd';
import SceneEnter from './components/SceneEnter';
import SceneLadder from './components/SceneLadder';
import SceneMirror from './components/SceneMirror';
import SceneReveal from './components/SceneReveal';
import SceneUnchecked from './components/SceneUnchecked';
import SceneWorkspace from './components/SceneWorkspace';

const STORE_KEY = 'nucleus.pulse02';

interface Saved {
  lang: Lang;
  opened: SourceId[];
  answer: AnswerId | null;
  confidence: Confidence | null;
  secondsRemaining: number;
  ladder: Partial<Record<LadderStep, boolean>>;
}

const load = (): Partial<Saved> => {
  try {
    return JSON.parse(localStorage.getItem(STORE_KEY) ?? '{}');
  } catch {
    return {};
  }
};

const save = (state: Saved) => {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(state));
  } catch {
    // A private window is not a reason to lose the experience.
  }
};

/**
 * Rehearsal only: `?scene=mirror` opens straight into a scene with stand-in
 * answers, so a scene can be re-timed without playing the whole run to reach
 * it. Gated on import.meta.env.DEV, a compile-time false in a production
 * build — a participant who found this could otherwise skip the workspace,
 * and there is nothing left of this experience without the workspace.
 */
const dev = (import.meta as unknown as { env?: { DEV?: boolean } }).env?.DEV ?? false;
const rehearsal = (): { scene?: SceneId } => {
  if (!dev) return {};
  const wanted = new URLSearchParams(window.location.search).get('scene');
  return wanted ? { scene: wanted as SceneId } : {};
};

const App: React.FC = () => {
  const rehearse = rehearsal();
  const [scene, setScene] = useState<SceneId>(rehearse.scene ?? 'enter');
  const [lang, setLang] = useState<Lang>(() => (load().lang as Lang) ?? 'en');
  const [opened, setOpened] = useState<SourceId[]>(
    rehearse.scene ? ['sales', 'finance', 'registry'] : [],
  );
  const [answer, setAnswer] = useState<AnswerId | null>(rehearse.scene ? 'sold' : null);
  const [confidence, setConfidence] = useState<Confidence | null>(
    rehearse.scene ? 'high' : null,
  );
  const [secondsRemaining, setSecondsRemaining] = useState(rehearse.scene ? 31 : 0);
  const [timedOut, setTimedOut] = useState(false);
  const [ladder, setLadder] = useState<Partial<Record<LadderStep, boolean>>>({});
  const [sound, setSound] = useState(true);
  /**
   * Whether the voice is actually reaching the participant. A run where the
   * audio silently failed is not a quieter version of this experience, it is a
   * broken one — the pauses become dead air. So the app notices and says so.
   */
  const [trouble, setTrouble] = useState<'blocked' | 'silent' | null>(null);

  useEffect(() => {
    onAudioTrouble(why => setTrouble(current => current ?? why));
  }, []);

  useEffect(() => {
    setNarrationLang(lang);
  }, [lang]);

  // If this phone came in through a room link, the room hears it arrived.
  useEffect(() => {
    joinRoom();
  }, []);

  // Every scene begins at the top of itself.
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [scene]);

  /**
   * One room, one sound.
   *
   * The calm bed runs under everything except the workspace, which brings its
   * own: a bed that narrows the room while someone is deciding how much they
   * need to know. Held here rather than inside the scenes so it never restarts
   * between them — the quiet is supposed to be continuous.
   */
  const inRound = scene === 'workspace';
  useEffect(() => {
    if (inRound) stopCalmBed();
    else startCalmBed();
  }, [inRound]);

  useEffect(() => {
    save({ lang, opened, answer, confidence, secondsRemaining, ladder });
  }, [lang, opened, answer, confidence, secondsRemaining, ladder]);

  useEffect(
    () => () => {
      hush();
      silence();
      stopFocusBed();
      stopCalmBed();
    },
    [],
  );

  // One switch for the room: the voice and the bed go together.
  const toggleSound = () => {
    const next = !sound;
    setSound(next);
    setVoiceEnabled(next);
    setNarrationEnabled(next);
    setAmbienceEnabled(next);
    if (next && !inRound) startCalmBed();
  };

  const restart = () => {
    hush();
    silence();
    stopFocusBed();
    stopCalmBed();
    setOpened([]);
    setAnswer(null);
    setConfidence(null);
    setSecondsRemaining(0);
    setTimedOut(false);
    setLadder({});
    setScene('enter');
  };

  const go = (next: SceneId) => () => {
    hush();
    setScene(next);
  };

  /* Everything the run will ever know is known once the ladder is done. If
     this phone is in a room, the room hears about it here — once, in the
     background, with no effect on what the participant sees and no way for a
     failure to reach them. */
  useEffect(() => {
    if (scene !== 'end' || !answer || !confidence) return;
    void submitToRoom({ lang, opened, answer, confidence, secondsRemaining, ladder });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scene]);

  return (
    <main className="min-h-[100dvh] select-none bg-[#06080B] text-gray-200">
      {/* The one control on screen, and it stays out of the way. */}
      <button
        onClick={toggleSound}
        aria-label={sound ? COPY[lang].common.soundOn : COPY[lang].common.soundOff}
        className="fixed right-3 top-3 z-50 grid h-9 w-9 place-items-center rounded-full border border-white/[0.08] bg-black/30 text-[13px] text-gray-600 backdrop-blur transition-colors hover:text-gray-300"
      >
        {sound ? '🔊' : '🔇'}
      </button>

      {trouble && sound && (
        <button
          onClick={() => {
            unlockWebAudio();
            startCalmBed();
            setTrouble(null);
          }}
          className="fixed inset-x-3 top-3 z-40 rounded-xl border border-amber-300/25 bg-[#12171d] px-4 py-3 text-left text-[12px] leading-snug text-amber-100/90 shadow-lg shadow-black/60"
        >
          {trouble === 'blocked'
            ? COPY[lang].common.soundBlocked
            : COPY[lang].common.soundSilent}
        </button>
      )}

      {/* One scene at a time, and the old one is fully gone before the new one
          starts. The gap between them is part of the pacing. */}
      <AnimatePresence mode="wait">
        <motion.div
          key={scene}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.85, ease: [0.4, 0, 0.2, 1] }}
        >
          {scene === 'enter' && (
            <SceneEnter lang={lang} onChooseLang={setLang} onEnter={go('workspace')} />
          )}

          {scene === 'workspace' && (
            <SceneWorkspace
              lang={lang}
              onAnswer={(picked, remaining) => {
                setOpened(picked);
                setSecondsRemaining(remaining);
                setTimedOut(remaining === 0);
                setScene('answer');
              }}
            />
          )}

          {scene === 'answer' && (
            <SceneAnswer
              lang={lang}
              timedOut={timedOut}
              onDone={(a, conf) => {
                setAnswer(a);
                setConfidence(conf);
                setScene('reveal');
              }}
            />
          )}

          {scene === 'reveal' && (
            <SceneReveal
              lang={lang}
              openedCount={opened.length}
              onContinue={go('unchecked')}
            />
          )}

          {scene === 'unchecked' && (
            <SceneUnchecked lang={lang} opened={opened} onContinue={go('mirror')} />
          )}

          {scene === 'mirror' && answer && confidence && (
            <SceneMirror
              lang={lang}
              opened={opened}
              answer={answer}
              confidence={confidence}
              secondsRemaining={secondsRemaining}
              onContinue={go('ladder')}
            />
          )}

          {scene === 'ladder' && (
            <SceneLadder
              lang={lang}
              onContinue={picked => {
                setLadder(picked);
                setScene('end');
              }}
            />
          )}

          {scene === 'end' && <SceneEnd lang={lang} onRestart={restart} />}
        </motion.div>
      </AnimatePresence>
    </main>
  );
};

export default App;
