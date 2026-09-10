// PULSE 02 — TRUTH
//
// One client question, six places to look, and no instruction about how many
// of them to open. Every participant is given the same six records; what moves
// between participants is where they decide they have enough.
//
// The design rule underneath the data, and it is the whole Pulse: nothing here
// is false. Each record is an accurate description of a different part of the
// same reality, taken from a different position in the process and a different
// moment in time. There is no wrong source to trust, so there is no correct
// number of sources to open, so there is nothing here to score.

export type SourceId =
  | 'sales'
  | 'finance'
  | 'registry'
  | 'client'
  | 'legal'
  | 'masterplan';

/** What the participant tells the client. None of these is marked correct. */
export type AnswerId = 'reserved' | 'sold' | 'in-process' | 'validate-first';

/** Self-reported, and only ever read at room level against how much was
 *  opened. It is not a personality measure and it is never shown back to the
 *  participant as one. */
export type Confidence = 'low' | 'medium' | 'high';

/**
 * A record on the workspace floor.
 *
 * Closed, a card shows only `system` and `updated` — a name and a date, the
 * two things a real system gives you before you open it. The stale one is
 * stale on the face of the card and carries no warning of any kind: noticing
 * that the Registry was last validated three weeks before the Sales tracker is
 * the participant's job, and an OUTDATED badge would do that job for them.
 */
export interface Source {
  id: SourceId;
  /** Day and month, as the source itself would print it. */
  updated: string;
  /** Sort key for the date, so the app can talk about age without parsing. */
  day: number;
  /** The small mark on the card. Flat, monochrome, never a status colour. */
  glyph: string;
}

export type SceneId =
  | 'enter'
  | 'workspace'
  | 'answer'
  | 'reveal'
  | 'unchecked'
  | 'mirror'
  | 'ladder'
  | 'end';

/** The three steps of the consequence ladder, in the order they are asked. */
export type LadderStep = 'internal' | 'client' | 'commitment';

/** Everything the session remembers. Local only — no login, no identity. */
export interface Session {
  lang: 'en' | 'id';
  /** In the order they were opened. Order matters to nobody but the room. */
  opened: SourceId[];
  answer: AnswerId | null;
  confidence: Confidence | null;
  /** Seconds left on the clock at the moment of answering. */
  secondsRemaining: number;
  ladder: Partial<Record<LadderStep, boolean>>;
}
