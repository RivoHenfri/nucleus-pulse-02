// NUCLEUS PULSE 02 — the room.
//
// A phone finishes a run and posts what happened. A facilitator's screen asks
// for the room and gets the shape of everyone in it. That is the whole API.
//
// What it will never hold: a name, an email, a device id, an IP. A response is
// a list of which of six records were opened, one answer, one confidence, how
// much of the clock was left, and three yes/no answers about consequence —
// tagged with a room code and nothing else. The facilitator view aggregates;
// nothing individual is ever returned, enforced by there being no endpoint
// that could.
//
// AND ONE GUARDRAIL SPECIFIC TO PULSE 02. How many sources a person opened
// looks like a diligence metric and is not one. There is no endpoint that
// returns a row, no endpoint that returns an ordering of people, and the
// stopping point is only ever served as a histogram of the whole room. That is
// deliberate: attached to a name, this number becomes a performance review.
//
// Bun + bun:sqlite: one process, one file on disk, no native modules to build.

import { Database } from 'bun:sqlite';

const PORT = Number(process.env.PORT ?? 3000);
const DB_PATH = process.env.DB_PATH ?? '/data/nucleus-02.sqlite';

/** Origins allowed to post responses. The app lives on GitHub Pages. */
const ORIGINS = new Set([
  'https://rivohenfri.github.io',
  'http://localhost:3001',
  'http://localhost:3002',
  'http://localhost:4173',
]);

const SOURCES = new Set(['sales', 'finance', 'registry', 'client', 'legal', 'masterplan']);
const ANSWERS = new Set(['reserved', 'sold', 'in-process', 'validate-first']);
const CONFIDENCE = new Set(['low', 'medium', 'high']);
const LADDER = ['internal', 'client', 'commitment'] as const;

// ---------------------------------------------------------------------------
// storage
// ---------------------------------------------------------------------------

const db = new Database(DB_PATH, { create: true });
db.exec('PRAGMA journal_mode = WAL');
db.exec(`
  CREATE TABLE IF NOT EXISTS rooms (
    code        TEXT PRIMARY KEY,
    key         TEXT NOT NULL,
    title       TEXT,
    created_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
  );
  CREATE TABLE IF NOT EXISTS responses (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    room        TEXT NOT NULL REFERENCES rooms(code),
    lang        TEXT NOT NULL,
    opened      TEXT NOT NULL,   -- JSON array of source ids, in order opened
    stopped_at  INTEGER NOT NULL,-- how many that was, denormalised for the histogram
    answer      TEXT NOT NULL,
    confidence  TEXT NOT NULL,
    seconds_left INTEGER NOT NULL,
    ladder      TEXT NOT NULL,   -- JSON object of three booleans
    created_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
  );
  CREATE INDEX IF NOT EXISTS responses_room ON responses(room);
  -- A phone that opened the room, whether or not it ever finishes. One row
  -- per join; nothing about who. This is what the facilitator watches while
  -- waiting to start, so it has to move the moment someone scans.
  CREATE TABLE IF NOT EXISTS joins (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    room        TEXT NOT NULL REFERENCES rooms(code),
    created_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
  );
  CREATE INDEX IF NOT EXISTS joins_room ON joins(room);
`);

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------

/** Room codes avoid the letters people misread across a room. */
const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const randomCode = (n = 4) =>
  Array.from(crypto.getRandomValues(new Uint8Array(n)), b => CODE_ALPHABET[b % CODE_ALPHABET.length]).join('');
const randomKey = () => crypto.randomUUID().replace(/-/g, '');

const json = (body: unknown, status = 200, origin = '') =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', ...cors(origin) },
  });

const cors = (origin: string) =>
  ORIGINS.has(origin)
    ? {
        'access-control-allow-origin': origin,
        'access-control-allow-methods': 'GET,POST,OPTIONS',
        'access-control-allow-headers': 'content-type,x-facilitator-key',
        'access-control-max-age': '86400',
        vary: 'origin',
      }
    : {};

const ids = (v: unknown, allowed: Set<string>, max: number): string[] | null => {
  if (!Array.isArray(v) || v.length > max) return null;
  const out = v.filter((x): x is string => typeof x === 'string' && allowed.has(x));
  return out.length === v.length ? Array.from(new Set(out)) : null;
};

/**
 * A little back-pressure per address, in memory. A room of forty people posts
 * forty times in an evening; anything pounding the endpoint is not a room.
 */
const buckets = new Map<string, { n: number; at: number }>();
const allow = (ip: string, limit = 30, windowMs = 60_000) => {
  const now = Date.now();
  const b = buckets.get(ip);
  if (!b || now - b.at > windowMs) {
    buckets.set(ip, { n: 1, at: now });
    return true;
  }
  b.n += 1;
  return b.n <= limit;
};

// ---------------------------------------------------------------------------
// aggregation — the only thing a facilitator ever sees
// ---------------------------------------------------------------------------

const summarise = (code: string) => {
  const rows = db
    .query<
      {
        lang: string;
        opened: string;
        stopped_at: number;
        answer: string;
        confidence: string;
        seconds_left: number;
        ladder: string;
      },
      [string]
    >(
      'SELECT lang, opened, stopped_at, answer, confidence, seconds_left, ladder FROM responses WHERE room = ?',
    )
    .all(code);

  const count = (k: Iterable<string>) => {
    const m: Record<string, number> = {};
    for (const x of k) m[x] = (m[x] ?? 0) + 1;
    return m;
  };

  /** Where did we stop? The headline of the facilitator's screen. */
  const stops = count(rows.map(r => String(r.stopped_at)));
  const answers = count(rows.map(r => r.answer));
  const confidence = count(rows.map(r => r.confidence));
  const langs = count(rows.map(r => r.lang));

  /** Which records went unopened most often. Named, because the room reads
   *  the masterplan line out loud and needs the number to be true. */
  const unopened: Record<string, number> = {};
  for (const id of SOURCES) unopened[id] = 0;
  for (const r of rows) {
    const seen = new Set(JSON.parse(r.opened) as string[]);
    for (const id of SOURCES) if (!seen.has(id)) unopened[id] += 1;
  }

  /** How many said yes at each rung. The shape of this — high, lower,
   *  lowest — is the room's own argument, made with its own numbers. */
  const ladder: Record<string, number> = {};
  for (const step of LADDER) ladder[step] = 0;
  for (const r of rows) {
    const l = JSON.parse(r.ladder) as Record<string, boolean>;
    for (const step of LADDER) if (l[step]) ladder[step] += 1;
  }

  /**
   * Certainty against how much was actually opened, as a grid rather than as
   * a correlation. A coefficient would be a claim about people; a grid is a
   * count of what the room did, and the facilitator can read it or not.
   */
  const certainty: Record<string, number> = {};
  for (const r of rows) {
    const k = `${r.stopped_at}:${r.confidence}`;
    certainty[k] = (certainty[k] ?? 0) + 1;
  }

  const joined =
    db.query<{ c: number }, [string]>('SELECT COUNT(*) AS c FROM joins WHERE room = ?').get(code)?.c ?? 0;

  return { n: rows.length, joined, stops, answers, confidence, unopened, ladder, certainty, langs };
};

// ---------------------------------------------------------------------------
// routes
// ---------------------------------------------------------------------------

Bun.serve({
  port: PORT,
  async fetch(req, server) {
    const url = new URL(req.url);
    const origin = req.headers.get('origin') ?? '';
    const ip =
      req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || server.requestIP(req)?.address || '?';

    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors(origin) });

    if (url.pathname === '/health') return json({ ok: true, pulse: 2, at: new Date().toISOString() }, 200, origin);

    // -- a facilitator opens a room --------------------------------------
    if (url.pathname === '/rooms' && req.method === 'POST') {
      if (!allow(ip, 10)) return json({ error: 'slow down' }, 429, origin);
      const body = (await req.json().catch(() => ({}))) as { title?: unknown };
      const title = typeof body.title === 'string' ? body.title.slice(0, 80) : null;
      let code = randomCode();
      while (db.query('SELECT 1 FROM rooms WHERE code = ?').get(code)) code = randomCode();
      const key = randomKey();
      db.query('INSERT INTO rooms (code, key, title) VALUES (?, ?, ?)').run(code, key, title);
      return json({ code, key, title }, 201, origin);
    }

    // -- a phone opens the room --------------------------------------------
    const j = url.pathname.match(/^\/rooms\/([A-Z0-9]{4,8})\/join$/i);
    if (j && req.method === 'POST') {
      if (!allow(ip)) return json({ error: 'slow down' }, 429, origin);
      const code = j[1].toUpperCase();
      if (!db.query('SELECT 1 FROM rooms WHERE code = ?').get(code)) {
        return json({ error: 'no such room' }, 404, origin);
      }
      db.query('INSERT INTO joins (room) VALUES (?)').run(code);
      return json({ ok: true }, 201, origin);
    }

    // -- a phone finishes a run --------------------------------------------
    if (url.pathname === '/responses' && req.method === 'POST') {
      if (!allow(ip)) return json({ error: 'slow down' }, 429, origin);
      const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
      if (!body) return json({ error: 'bad json' }, 400, origin);

      const room = typeof body.room === 'string' ? body.room.toUpperCase().trim() : '';
      if (!db.query('SELECT 1 FROM rooms WHERE code = ?').get(room)) {
        return json({ error: 'no such room' }, 404, origin);
      }

      const lang = body.lang === 'id' ? 'id' : 'en';
      const opened = ids(body.opened, SOURCES, SOURCES.size);
      const answer = typeof body.answer === 'string' && ANSWERS.has(body.answer) ? body.answer : null;
      const confidence =
        typeof body.confidence === 'string' && CONFIDENCE.has(body.confidence) ? body.confidence : null;
      const secondsLeft =
        typeof body.secondsRemaining === 'number' && Number.isFinite(body.secondsRemaining)
          ? Math.max(0, Math.min(600, Math.round(body.secondsRemaining)))
          : null;
      if (!opened || !answer || !confidence || secondsLeft === null) {
        return json({ error: 'bad payload' }, 400, origin);
      }

      const raw = (body.ladder ?? {}) as Record<string, unknown>;
      const ladder: Record<string, boolean> = {};
      for (const step of LADDER) if (typeof raw[step] === 'boolean') ladder[step] = raw[step] as boolean;

      db.query(
        `INSERT INTO responses (room, lang, opened, stopped_at, answer, confidence, seconds_left, ladder)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      ).run(
        room,
        lang,
        JSON.stringify(opened),
        opened.length,
        answer,
        confidence,
        secondsLeft,
        JSON.stringify(ladder),
      );
      return json({ ok: true }, 201, origin);
    }

    // -- the facilitator's screen asks for the room -------------------------
    const m = url.pathname.match(/^\/rooms\/([A-Z0-9]{4,8})\/summary$/i);
    if (m && req.method === 'GET') {
      const code = m[1].toUpperCase();
      const room = db
        .query<{ key: string; title: string | null; created_at: string }, [string]>(
          'SELECT key, title, created_at FROM rooms WHERE code = ?',
        )
        .get(code);
      if (!room) return json({ error: 'no such room' }, 404, origin);
      if (req.headers.get('x-facilitator-key') !== room.key) return json({ error: 'not yours' }, 403, origin);
      return json({ code, title: room.title, created_at: room.created_at, ...summarise(code) }, 200, origin);
    }

    // -- the AI reads the room ---------------------------------------------
    //
    // Facilitator-only, aggregate-only. The model sees counts, never a row,
    // and it is briefed to notice rather than to judge. Cached per
    // (room, n, lang) so the screen can poll without paying twice.
    const r = url.pathname.match(/^\/rooms\/([A-Z0-9]{4,8})\/reading$/i);
    if (r && req.method === 'GET') {
      const code = r[1].toUpperCase();
      const room = db.query<{ key: string }, [string]>('SELECT key FROM rooms WHERE code = ?').get(code);
      if (!room) return json({ error: 'no such room' }, 404, origin);
      if (req.headers.get('x-facilitator-key') !== room.key) return json({ error: 'not yours' }, 403, origin);
      const lang = url.searchParams.get('lang') === 'en' ? 'en' : 'id';
      const summary = summarise(code);
      if (summary.n === 0) return json({ text: null }, 200, origin);
      const cacheKey = `${code}:${summary.n}:${lang}`;
      const hit = readings.get(cacheKey);
      if (hit) return json({ text: hit }, 200, origin);
      const text = await readRoom(summary, lang);
      if (text) readings.set(cacheKey, text);
      return json({ text }, 200, origin);
    }

    return json({ error: 'not found' }, 404, origin);
  },
});

// ---------------------------------------------------------------------------
// the reading
// ---------------------------------------------------------------------------

const readings = new Map<string, string>();
const OPENROUTER_KEY = process.env.OPENROUTER_API_KEY ?? '';
const READING_MODEL = process.env.READING_MODEL ?? 'anthropic/claude-sonnet-4.5';

const NAMES: Record<string, string> = {
  sales: 'Sales Tracker (RESERVED, updated 03 Sep)',
  finance: 'Finance (deposit received, 05 Sep)',
  registry: 'Plot Registry (SOLD, last validated 19 Aug — the oldest record)',
  client: 'Client File (Jonathan Reed, 28 Aug)',
  legal: 'Legal (SPA prepared for Jonathan Reid, execution pending, 06 Sep)',
  masterplan: 'Latest Masterplan (08 Sep — renumbers A17 to A18)',
};

const ANSWER_NAMES: Record<string, string> = {
  reserved: 'Reserved',
  sold: 'Sold',
  'in-process': 'Contracted / in process',
  'validate-first': 'I need to validate first',
};

const LADDER_NAMES: Record<string, string> = {
  internal: 'enough to reply internally',
  client: 'enough to tell the client the plot is confirmed sold',
  commitment: 'enough when a payment or legal commitment depends on it',
};

/**
 * The brief is the facilitator's own framing, given to the model as the lens
 * it must read through. One short paragraph and three lessons, in the room's
 * language, and a list of the things it may not do.
 */
const BRIEF = `You are writing a short, mindful reading of a workplace experiment called NUCLEUS PULSE 02 — TRUTH, for a facilitator to show a room of colleagues.

What happened: a client asked one question — "what is the current status of Plot A17?" — and everyone had seventy-five seconds and six places they could check. Nobody was told how many to open. They stopped wherever they decided they knew enough, answered the client, and said how confident they were. Afterwards they were asked the same question three times with the consequence rising: enough to reply internally, enough to tell the client it is confirmed sold, enough when a payment or a legal commitment depends on it.

The six records, and this is the heart of it: none of them is false. Sales said RESERVED. Finance showed a deposit received. The Plot Registry said SOLD and was three weeks older than either. The Client File named Jonathan Reed; Legal named Jonathan Reid and showed the sale agreement prepared but not executed. And the masterplan issued two days before the question renumbered A17 to A18 — which does not answer the question so much as change it.

The framing you must read through:
- Nobody in the room was told when they knew enough. Each person decided that themselves, and that decision is what the numbers describe.
- The sources did not have to be wrong for the room to have a problem. They were describing different parts of the same reality, from different places and different moments in time.
- Truth asks whether something describes reality. Trust asks whether we are prepared to rely on it. They are not the same question, and the ladder is where the difference becomes physical.
- The amount of certainty a person needs changes with the consequence of being wrong. This is why "always check more sources" is not the lesson and must never be written as one.
- Sometimes the missing information is not the answer. It is the information that changes the question.

Rules you must follow:
- You are given aggregate counts only. Never invent individuals, quotes, names, departments, or percentages that are not derivable from the numbers.
- Do not say anyone was right, wrong, correct, careless, thorough, or biased. There is no correct number of sources and no correct answer to give the client. Someone who opened one record and answered is not worse than someone who opened six.
- Never suggest the room should have checked more. Never treat the masterplan as a gotcha or the people who missed it as having failed.
- Do not manufacture a contradiction. If the room's confidence and the room's stopping points line up, say that they line up.
- Notice, do not lecture. Warm, plain, unhurried. No jargon.
- No aphorisms. Nothing that would still be true if this room had never played, and nothing shaped like a poster line. Every sentence must be about what these people did, with their own numbers in it.
- Do not name Kant, epistemology, or philosophy. The room gets that separately, and later.
- Output exactly this shape, nothing else:
  One paragraph of 60–90 words reading what this particular room did.
  A blank line.
  Three lines, each starting with "• ", each one lesson this room can take from its own numbers, at most 18 words each.`;

const readRoom = async (s: ReturnType<typeof summarise>, lang: 'en' | 'id'): Promise<string | null> => {
  if (!OPENROUTER_KEY) return null;

  const pct = (n: number) => (s.n ? `${Math.round((n / s.n) * 100)}%` : '0%');

  const stops = Array.from({ length: 7 }, (_, i) => i)
    .map(i => [String(i), s.stops[String(i)] ?? 0] as const)
    .filter(([, v]) => v > 0)
    .map(([k, v]) => `${k} source${k === '1' ? '' : 's'}: ${v} (${pct(v)})`)
    .join('\n');

  const answers = Object.entries(s.answers)
    .sort((a, b) => b[1] - a[1])
    .map(([k, v]) => `${ANSWER_NAMES[k] ?? k}: ${v} (${pct(v)})`)
    .join('\n');

  const confidence = ['high', 'medium', 'low']
    .map(k => `${k}: ${s.confidence[k] ?? 0} (${pct(s.confidence[k] ?? 0)})`)
    .join('\n');

  const unopened = Object.entries(s.unopened)
    .sort((a, b) => b[1] - a[1])
    .map(([k, v]) => `${NAMES[k] ?? k}: never opened by ${v} of ${s.n}`)
    .join('\n');

  const ladder = LADDER.map(k => `${LADDER_NAMES[k]}: ${s.ladder[k] ?? 0} said yes (${pct(s.ladder[k] ?? 0)})`).join(
    '\n',
  );

  const data = `Room size: ${s.n} people.

Where did we stop?
${stops || '(none)'}

What we told the client:
${answers || '(none)'}

How confident we said we were:
${confidence}

Which records went unopened:
${unopened}

The consequence ladder — the same knowledge, three different stakes:
${ladder}

Write in ${lang === 'id' ? 'Bahasa Indonesia, conversational and warm, the way a thoughtful colleague speaks — not formal register' : 'English'}.`;

  try {
    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        authorization: `Bearer ${OPENROUTER_KEY}`,
        'content-type': 'application/json',
        'http-referer': 'https://rivohenfri.github.io/nucleus-pulse-02/',
        'x-title': 'Nucleus Pulse 02 room reading',
      },
      body: JSON.stringify({
        model: READING_MODEL,
        temperature: 0.6,
        max_tokens: 500,
        messages: [
          { role: 'system', content: BRIEF },
          { role: 'user', content: data },
        ],
      }),
    });
    if (!res.ok) {
      console.error('reading failed', res.status, await res.text().catch(() => ''));
      return null;
    }
    const body = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    const text = body.choices?.[0]?.message?.content?.trim();
    return text || null;
  } catch (e) {
    console.error('reading error', e);
    return null;
  }
};

console.log(`nucleus pulse 02 room api on :${PORT}, db at ${DB_PATH}`);
