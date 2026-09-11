// THE ROOM — the one thing that leaves the phone.
//
// A facilitator opens a room and hands out a link with `?room=RRX7` on it (a
// QR code on the screen, in practice). When a run finishes, the phone posts
// what happened — which of six records were opened, one answer, one
// confidence, the clock, three yes/no answers — and that is all. No name, no
// email, no device id: there is nothing in the payload that could point back
// at a person, and the API has no endpoint that returns an individual response.
//
// Nothing here is allowed to affect the experience. If there is no room, or
// the network is down, or the server is gone, the run is exactly the same run
// — the submission just quietly does not happen.

import type { AnswerId, Confidence, LadderStep, SourceId } from '../types';

/**
 * Where the room lives.
 *
 * PULSE 02 shares PULSE 01's hostname and certificate, under /p2. A hostname
 * of its own would need a DNS record before Let's Encrypt would issue for it;
 * a path needs nothing. Caddy strips the prefix, so the server sees /rooms and
 * /responses exactly as it would on a host of its own and knows nothing about
 * the path it is reached by.
 *
 * Overridable at build time so a laptop running `bun server/index.ts` can be
 * driven by the real app during a build week — `VITE_ROOM_API=http://localhost:3000
 * npm run dev`. Without the override it is the deployed API, which is what
 * every production build gets.
 */
export const ROOM_API =
  (import.meta as unknown as { env?: { VITE_ROOM_API?: string } }).env?.VITE_ROOM_API ??
  'https://nucleus-api.rivohenfri.cloud/p2';

const KEY = 'nucleus.room02';

/**
 * The room this phone is in, if any.
 *
 * Read from the URL first, so a link from the facilitator wins; then from
 * storage, so a participant who reloads mid-run stays in the same room.
 *
 * Stored under its own key rather than PULSE 01's: both Pulses are run in the
 * same building, from the same phones, sometimes in the same week, and a
 * leftover PULSE 01 room code silently posting TRUTH responses into a SIGNAL
 * room would corrupt a facilitator's screen with no visible cause.
 */
export const roomCode = (): string | null => {
  try {
    const fromUrl = new URLSearchParams(window.location.search).get('room');
    if (fromUrl && /^[A-Za-z0-9]{4,8}$/.test(fromUrl)) {
      const code = fromUrl.toUpperCase();
      localStorage.setItem(KEY, code);
      return code;
    }
    return localStorage.getItem(KEY);
  } catch {
    return null;
  }
};

/**
 * Tell the room this phone has arrived. Once per room per device — the
 * facilitator is counting heads, not page loads. Fire-and-forget.
 */
export const joinRoom = (): void => {
  const room = roomCode();
  if (!room) return;
  try {
    const seen = localStorage.getItem(`${KEY}.joined`);
    if (seen === room) return;
    localStorage.setItem(`${KEY}.joined`, room);
    void fetch(`${ROOM_API}/rooms/${encodeURIComponent(room)}/join`, {
      method: 'POST',
      keepalive: true,
    });
  } catch {
    // never the participant's problem
  }
};

export interface RoomResponse {
  lang: 'en' | 'id';
  opened: SourceId[];
  answer: AnswerId;
  confidence: Confidence;
  secondsRemaining: number;
  ladder: Partial<Record<LadderStep, boolean>>;
}

/** Post one finished run to the room. Never throws, never blocks. */
export const submitToRoom = async (r: RoomResponse): Promise<boolean> => {
  const room = roomCode();
  if (!room) return false;
  try {
    const res = await fetch(`${ROOM_API}/responses`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ room, ...r }),
      keepalive: true,
    });
    return res.ok;
  } catch {
    return false;
  }
};

export interface RoomSummary {
  code: string;
  title: string | null;
  n: number;
  joined: number;
  /** How many people stopped after opening n records, keyed by n. */
  stops: Record<string, number>;
  answers: Record<string, number>;
  confidence: Record<string, number>;
  /** How many people never opened each record. */
  unopened: Record<string, number>;
  /** How many said yes at each rung of the ladder. */
  ladder: Record<string, number>;
  /** `${stoppedAt}:${confidence}` → count. A grid, never a coefficient. */
  certainty: Record<string, number>;
  langs: Record<string, number>;
}

/** The facilitator's view. Needs the key that came back when the room opened. */
export const fetchSummary = async (code: string, key: string): Promise<RoomSummary | null> => {
  try {
    const res = await fetch(`${ROOM_API}/rooms/${encodeURIComponent(code)}/summary`, {
      headers: { 'x-facilitator-key': key },
    });
    return res.ok ? ((await res.json()) as RoomSummary) : null;
  } catch {
    return null;
  }
};

export const openRoom = async (title?: string): Promise<{ code: string; key: string } | null> => {
  try {
    const res = await fetch(`${ROOM_API}/rooms`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ title }),
    });
    return res.ok ? ((await res.json()) as { code: string; key: string }) : null;
  } catch {
    return null;
  }
};

/**
 * The AI's reading of a room: a short, mindful paragraph and three lessons,
 * written from the aggregate and nothing else. Generated on the server, where
 * the model key lives; the browser only ever sees the text. Null if the room
 * is empty or the model is unavailable, and the screen copes with either.
 */
export const fetchReading = async (
  code: string,
  key: string,
  lang: 'en' | 'id',
): Promise<string | null> => {
  try {
    const res = await fetch(`${ROOM_API}/rooms/${encodeURIComponent(code)}/reading?lang=${lang}`, {
      headers: { 'x-facilitator-key': key },
    });
    if (!res.ok) return null;
    const body = (await res.json()) as { text?: string };
    return body.text ?? null;
  } catch {
    return null;
  }
};
