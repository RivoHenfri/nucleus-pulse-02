// ONE RECORD ON THE FLOOR.
//
// Closed, it is a system name and a date. Open, it is whatever that system
// actually holds. Nothing else changes — no colour, no weight, no border that
// says this one matters. Six cards, one visual language, and the only state
// the card carries is whether it has been opened.
//
// THE THING THIS COMPONENT IS NOT ALLOWED TO DO.
//
// The Registry was last validated on 19 August and says SOLD, three weeks
// before the Sales tracker said RESERVED. A UI would normally flag that: an
// amber dot, an "outdated" pill, a relative "3 weeks ago" in a warmer grey.
// All of those are the interface noticing on the participant's behalf, and the
// entire experiment is whether the participant notices. So every date on every
// card is set identically, in the same grey, in the same face, printed the way
// that system prints it — and the newest and the oldest look exactly alike.

import { motion } from 'motion/react';
import React from 'react';
import { COPY, type Lang } from '../i18n';
import type { Source } from '../types';

interface Props {
  source: Source;
  lang: Lang;
  open: boolean;
  onOpen?: () => void;
  /** Scene 05 shows all six and marks which ones the participant had opened.
   *  Elsewhere this is undefined and no such mark is drawn. */
  wasOpened?: boolean;
}

const SourceCard: React.FC<Props> = ({ source, lang, open, onOpen, wasOpened }) => {
  const c = COPY[lang];
  const copy = c.sources[source.id];
  const clickable = !open && !!onOpen;

  return (
    <motion.button
      layout
      type="button"
      disabled={!clickable}
      onClick={onOpen}
      whileTap={clickable ? { scale: 0.985 } : undefined}
      className={`w-full rounded-2xl border px-4 py-3.5 text-left transition-colors duration-500 ${
        open
          ? 'border-white/[0.10] bg-white/[0.035]'
          : 'border-white/[0.07] bg-white/[0.015] hover:border-white/20'
      }`}
    >
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-[11px] font-semibold tracking-[0.22em] text-gray-300">
          <span className="mr-2 text-gray-600">{source.glyph}</span>
          {copy.system}
        </span>
        {/* The bare date from data.ts, in one grey, for all six — never the
            record's own foot line. The masterplan's foot says "supersedes all
            earlier plot references", and printing it on the closed card gave
            away the twist to anyone who merely scrolled past: the one record
            that reframes the question was the one record announcing itself.
            Closed, all six say a system name and a date and nothing else. */}
        <span className="font-record shrink-0 text-[10px] tracking-wide text-gray-500">
          {source.updated}
        </span>
      </div>

      {!open && (
        <p className="mt-2 text-[11px] tracking-wide text-gray-600">{c.workspace.open}</p>
      )}

      {open && (
        <div className="animate-recordIn mt-3 border-t border-white/[0.06] pt-3">
          <dl className="space-y-1.5">
            {copy.rows.map(row => (
              <div key={row.label} className="flex items-baseline justify-between gap-4">
                <dt className="text-[11px] text-gray-500">{row.label}</dt>
                <dd className="font-record text-right text-[13px] text-[#EDE7DA]">{row.value}</dd>
              </div>
            ))}
          </dl>

          {copy.note && (
            <p className="mt-3 text-[12px] leading-relaxed text-gray-400">{copy.note}</p>
          )}

          <p className="font-record mt-3 text-[10px] tracking-wide text-gray-600">{copy.foot}</p>
        </div>
      )}

      {/* Scene 05 only. Stated, not judged: no tick, no cross, no red. */}
      {wasOpened !== undefined && (
        <p
          className={`mt-3 text-[10px] font-semibold uppercase tracking-[0.22em] ${
            wasOpened ? 'text-gray-600' : 'text-amber-200/45'
          }`}
        >
          {wasOpened ? c.unchecked.youOpened : c.unchecked.youDidnt}
        </p>
      )}
    </motion.button>
  );
};

export default SourceCard;
