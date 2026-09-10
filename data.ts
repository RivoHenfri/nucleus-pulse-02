// THE SIX SOURCES.
//
// Structure only. Everything anyone reads lives in i18n.ts, because all six of
// these are real workplace records and a record that reads like a translation
// stops being a record.
//
// The reality underneath, which is never shown to the participant as a summary
// and never resolved by the app:
//
//   A17 was reserved and a deposit was paid. The SPA is drafted and unsigned.
//   Nobody has told the Registry to stop saying SOLD, the Client File and Legal
//   spell the buyer's surname differently, and eight days ago the masterplan
//   renumbered the plot. Every one of those statements is true.
//
// ORDER IS FIXED, AND THAT IS DELIBERATE.
//
// PULSE 01 shuffled arrival because a morning does not queue politely. This is
// not a morning — it is a set of systems a person opens in whatever order they
// think of them, and the room's aggregate is only readable if everyone was
// looking at the same shelf. The order below is the order the workspace shows,
// and it is not a ranking: Sales is first because it is the obvious first
// place to look, and the masterplan is last because eight days ago nobody had
// a reason to think about it.

import type { Source, SourceId } from './types';

export const SOURCES: Source[] = [
  { id: 'sales',      updated: '03 Sep', day: 3,  glyph: '▤' },
  { id: 'finance',    updated: '05 Sep', day: 5,  glyph: '▦' },
  { id: 'registry',   updated: '19 Aug', day: -12, glyph: '▣' },
  { id: 'client',     updated: '28 Aug', day: -3, glyph: '▥' },
  { id: 'legal',      updated: '06 Sep', day: 6,  glyph: '▧' },
  { id: 'masterplan', updated: '08 Sep', day: 8,  glyph: '▨' },
];

export const SOURCE_IDS: SourceId[] = SOURCES.map(s => s.id);

export const sourceById = (id: SourceId): Source =>
  SOURCES.find(s => s.id === id)!;

/** How long the workspace runs. The spec's number, and the only clock in the
 *  experience. Long enough to open all six unhurried; short enough that
 *  stopping is a decision rather than a shrug. */
export const ROUND_SECONDS = 75;

/** The three steps of the ladder, in the order the consequence escalates. */
export const LADDER: ('internal' | 'client' | 'commitment')[] = [
  'internal',
  'client',
  'commitment',
];
