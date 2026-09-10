// THE ROOM — the facilitator's screen.
//
// Forty phones each answer the same client privately. This is the moment the
// room finds out it did not answer as one: the same six records, the same
// seventy-five seconds, and people stopped looking in completely different
// places. Shown in stages, on a big screen, by someone who decides when the
// next stage appears.
//
// It is the source of the infographic WhatsApp step 6 puts up, and it is the
// only screen in PULSE 02 that shows more than one person.
//
//   ?room=RRX7&key=…&lang=id     the screen for a room you opened
//   (nothing)                    opens a new room and shows its code
//
// FOUR RULES IT ENFORCES, not by convention but by construction:
//
//   1. Nothing individual. The API has no endpoint that returns a row, so
//      there is no view here that could show one. The spec's guardrail is a
//      property of the data, not a promise of the UI.
//
//   2. Nothing until five. Below five completed runs the screen shows the code
//      and the joined count and refuses the charts — in a room of three, a
//      histogram is a list of people with the names taken off, and everyone
//      present can do the arithmetic.
//
//   3. No score, no ranking, no correct answer. The stopping histogram is one
//      colour with no good end. The four answers are not marked, because none
//      of them is right. Nobody who opened one record is behind anybody.
//
//   4. The room's own numbers. The example figures in the spec are layout
//      examples and appear nowhere in this file.
//
// And the binding moderator note from the playbook, repeated here because this
// screen is where it would be broken: use the actual data, and do not
// manufacture a contradiction. If the room's confidence and the room's
// stopping points line up, that is the finding.

import { AnimatePresence, motion } from 'motion/react';
import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom/client';
import { LADDER, SOURCE_IDS } from './data';
import { COPY, type Lang } from './i18n';
import type { AnswerId, Confidence, LadderStep, SourceId } from './types';
import { fetchReading, fetchSummary, openRoom, type RoomSummary } from './utils/room';
import WhatsAppMark from './components/WhatsAppMark';

/** Bone, for everything the room did. One colour, no good end of the axis. */
const NEUTRAL = '#EDE7DA';
/** The ladder, and only the ladder — the one series where the shape is the
 *  argument, so it is allowed to look like a series. Same blue PULSE 01 used
 *  for its with-context look, so the two Pulses read as one family. */
const RUNG = '#3987e5';
/** What nobody opened. Deliberately the quietest thing on the screen. */
const UNSEEN = '#8a7f6d';

/** Below this the charts do not render. */
const FLOOR = 5;

const ANSWER_IDS: AnswerId[] = ['reserved', 'sold', 'in-process', 'validate-first'];
const CONF_IDS: Confidence[] = ['high', 'medium', 'low'];

const T = {
  en: {
    waiting: 'Scan, or open',
    joined: (j: number, n: number) => `${j} joined · ${n} finished`,
    people: 'people',
    stage: [
      '',
      'WHERE WE STOPPED',
      'WHAT WE TOLD THE CLIENT',
      'HOW SURE WE SAID WE WERE',
      'WHAT WE NEVER OPENED',
      'THE SAME KNOWLEDGE, THREE DIFFERENT STAKES',
      '',
      'SO, WHAT DOES THAT MEAN',
    ],
    sources: (n: number) => (n === 1 ? '1 source' : `${n} sources`),
    // The room's screen needs its own names for the three rungs. The app asks
    // the participant "Enough?" twice in a row, which is right on a phone in
    // the middle of the ladder and useless as a chart label.
    rung: {
      internal: 'Enough to reply internally',
      client: 'Enough to tell the client it’s confirmed sold',
      commitment: 'Enough when a payment or a commitment depends on it',
    } as Record<LadderStep, string>,
    reading: [
      '',
      'Same six records. Same seventy-five seconds. We did not stop in the same place.',
      'Nobody was told what to say. Four answers, all of them defensible from what that person had open.',
      'Certainty did not track how much we had looked at. It rarely does.',
      'Every one of these was there the whole time, and there was always one more we could have checked.',
      'Nothing new was given between these three. Only what happens if we are wrong.',
      '',
      '',
    ],
    close: 'Nobody told us when we knew enough.',
    closeB: 'We decided that ourselves.',
    conclusion: [
      'The sources did not have to be wrong for us to have a problem.',
      'Sales said reserved. Finance showed a deposit received. The Registry said sold, and was three weeks older than either. Legal had the agreement prepared and unsigned, under a name spelled differently in the client file. And the latest masterplan changed the plot reference altogether.',
      'They were describing different parts of the same reality, from different places and different moments in time. This goes deeper than "check your sources".',
      'Truth asks whether something describes reality. Trust asks whether we are prepared to rely on it. We can trust something and still be wrong, and we can keep checking forever and still not have the whole thing.',
      'So the question underneath the decision is not "do I know everything?" It is "for what I am about to do, is this enough?"',
    ],
    heroA: (a: number, c: number) =>
      `${a}% of us had enough to reply internally. ${c}% still had enough when a payment depended on it.`,
    heroB: (spread: number, n: number) =>
      `Same six records. ${n} of us, and we stopped in ${spread} different places.`,
    aiTitle: 'A READING OF THIS ROOM',
    aiWait: 'Reading the room…',
    share: 'Share the conclusion',
    shareText: (n: number, mode: string, top: string, pct: number) =>
      `*NUCLEUS PULSE 02 — TRUTH*\n\n${n} of us. One client question. Six places to check. 75 seconds.\n\n🛑 Most of us stopped at *${mode}*\n💬 Most common answer → *${top}*\n⚖️ ${pct}% still said "enough" when a payment depended on it\n\nNobody told us when we knew enough.\n\nTry it:`,
    next: 'next  →',
    open: 'Open a room',
    opening: 'Opening…',
    unreachable: 'The room server cannot be reached.',
    unreachableWhy:
      'nucleus-02-api.rivohenfri.cloud is not answering — check that the PULSE 02 API is deployed and that ports 80/443 are open on the VPS.',
    tooFew: (n: number) =>
      `${n} finished. The charts open at ${FLOOR} — below that a histogram is a list of people with the names taken off.`,
  },

  id: {
    waiting: 'Scan QR-nya, atau buka link ini',
    joined: (j: number, n: number) => `${j} sudah masuk · ${n} sudah selesai`,
    people: 'orang sudah masuk',
    stage: [
      '',
      'KITA BERHENTI DI MANA',
      'YANG KITA SAMPAIKAN KE KLIEN',
      'SEBERAPA YAKIN KITA WAKTU MENJAWAB',
      'YANG TIDAK PERNAH KITA BUKA',
      'PENGETAHUAN YANG SAMA, TIGA TARUHAN BERBEDA',
      '',
      'JADI, APA ARTINYA',
    ],
    sources: (n: number) => (n === 1 ? '1 sumber' : `${n} sumber`),
    rung: {
      internal: 'Cukup untuk membalas internal',
      client: 'Cukup untuk bilang ke klien sudah terjual',
      commitment: 'Cukup saat ada pembayaran atau komitmen',
    } as Record<LadderStep, string>,
    reading: [
      '',
      'Enam catatan yang sama. Tujuh puluh lima detik yang sama. Kita tidak berhenti di tempat yang sama.',
      'Tidak ada yang diberi tahu harus menjawab apa. Empat jawaban, dan semuanya masuk akal dari apa yang orang itu buka.',
      'Keyakinan tidak selalu mengikuti seberapa banyak yang sudah dilihat. Memang jarang begitu.',
      'Semuanya ada di sana dari awal, dan selalu ada satu lagi yang sebenarnya bisa dicek.',
      'Tidak ada informasi baru di antara ketiganya. Yang berubah cuma akibatnya kalau kita keliru.',
      '',
      '',
    ],
    close: 'Tidak ada yang memberi tahu kita kapan kita sudah cukup tahu.',
    closeB: 'Kita sendiri yang memutuskan.',
    conclusion: [
      'Sumbernya tidak harus salah untuk membuat kita bermasalah.',
      'Sales bilang reserved. Finance menunjukkan deposit sudah masuk. Registry bilang sold, dan umurnya tiga minggu lebih tua dari keduanya. Legal punya SPA yang sudah disiapkan tapi belum diteken, atas nama yang ejaannya beda dengan di client file. Dan masterplan terbaru mengubah nomor plot-nya.',
      'Mereka menggambarkan bagian yang berbeda dari kenyataan yang sama, dari posisi dan waktu yang berbeda. Ini jauh lebih dalam daripada sekadar "cek sumbermu".',
      'Truth bertanya apakah sesuatu menggambarkan kenyataan. Trust bertanya apakah kita siap bersandar padanya. Kita bisa percaya dan tetap keliru, dan kita bisa mengecek terus-menerus dan tetap tidak memiliki keseluruhannya.',
      'Jadi pertanyaan di bawah keputusan itu bukan "apa saya sudah tahu semuanya?" Tapi "untuk yang akan saya lakukan ini, apakah segini cukup?"',
    ],
    heroA: (a: number, c: number) =>
      `${a}% dari kita merasa cukup untuk membalas internal. ${c}% masih merasa cukup saat ada pembayaran yang bergantung padanya.`,
    heroB: (spread: number, n: number) =>
      `Enam catatan yang sama. ${n} orang, dan kita berhenti di ${spread} titik yang berbeda.`,
    aiTitle: 'APA KATA AI SOAL RUANGAN INI',
    aiWait: 'Sebentar, sedang membaca ruangan…',
    share: 'Bagikan ke grup',
    shareText: (n: number, mode: string, top: string, pct: number) =>
      `*NUCLEUS PULSE 02 — TRUTH*\n\n${n} orang. Satu pertanyaan klien. Enam tempat untuk dicek. 75 detik.\n\n🛑 Paling banyak berhenti di *${mode}*\n💬 Jawaban terbanyak → *${top}*\n⚖️ ${pct}% tetap bilang "cukup" waktu ada pembayaran yang bergantung padanya\n\nTidak ada yang memberi tahu kita kapan kita sudah cukup tahu.\n\nCoba sendiri:`,
    next: 'lanjut  →',
    open: 'Buka ruang',
    opening: 'Membuka…',
    unreachable: 'Server ruangan tidak bisa dihubungi.',
    unreachableWhy:
      'nucleus-02-api.rivohenfri.cloud tidak menjawab — pastikan API PULSE 02 sudah dideploy dan port 80/443 VPS terbuka.',
    tooFew: (n: number) =>
      `${n} sudah selesai. Grafiknya terbuka di ${FLOOR} — di bawah itu, histogram cuma daftar orang yang namanya dilepas.`,
  },
};

const APP_URL = `${window.location.origin}${window.location.pathname.replace(/dashboard\.html$/, '')}`;

// ---------------------------------------------------------------------------
// marks
// ---------------------------------------------------------------------------

/** One thin horizontal bar with a direct label. */
const Bar: React.FC<{
  label: string;
  value: number;
  max: number;
  color: string;
  dim?: boolean;
  total?: number;
}> = ({ label, value, max, color, dim, total }) => (
  <div className="group flex items-center gap-4" title={`${label}: ${value}`}>
    <span
      className={`w-44 shrink-0 text-right text-[13px] ${dim ? 'text-gray-600' : 'text-gray-300'}`}
    >
      {label}
    </span>
    <div className="relative h-3 flex-1 rounded-[4px] bg-white/[0.04]">
      <motion.div
        className="absolute left-0 top-0 h-3 rounded-[4px] group-hover:brightness-125"
        style={{ background: color }}
        initial={{ width: 0 }}
        animate={{ width: `${max ? (value / max) * 100 : 0}%` }}
        transition={{ duration: 0.9, ease: [0.22, 0.61, 0.36, 1] }}
      />
    </div>
    <span className="w-16 text-[13px] tabular-nums text-gray-400">
      {value || ''}
      {value && total ? (
        <span className="ml-1.5 text-[11px] text-gray-600">{Math.round((value / total) * 100)}%</span>
      ) : null}
    </span>
  </div>
);

const Tile: React.FC<{ n: number; label: string; total: number; accent?: string }> = ({
  n,
  label,
  total,
  accent,
}) => (
  <div className="rounded-2xl border border-white/10 px-6 py-6 text-center">
    <p className="font-display text-[44px] leading-none" style={{ color: accent ?? '#EDE7DA' }}>
      {total ? Math.round((n / total) * 100) : 0}
      <span className="text-[20px] text-gray-500">%</span>
    </p>
    <p className="mt-2 text-[12px] leading-snug text-gray-500">{label}</p>
    <p className="text-[11px] text-gray-600">
      {n} / {total}
    </p>
  </div>
);

// ---------------------------------------------------------------------------
// the screen
// ---------------------------------------------------------------------------

const LAST_STAGE = 7;

const Room: React.FC = () => {
  const q = new URLSearchParams(window.location.search);
  const [lang, setLang] = useState<Lang>(q.get('lang') === 'en' ? 'en' : 'id');
  const t = T[lang];
  const c = COPY[lang];

  const switchLang = (next: Lang) => {
    setLang(next);
    const u = new URL(window.location.href);
    u.searchParams.set('lang', next);
    window.history.replaceState(null, '', u.toString());
  };

  // A facilitator at the front of a room should not have to edit a URL.
  const LangToggle = (
    <span className="flex gap-1 text-[11px] tracking-[0.2em]">
      {(['en', 'id'] as Lang[]).map(l => (
        <button
          key={l}
          onClick={() => switchLang(l)}
          className={`rounded-full px-2.5 py-1 ${
            lang === l ? 'bg-[#EDE7DA] text-[#07090C]' : 'text-gray-500 hover:text-gray-300'
          }`}
        >
          {l.toUpperCase()}
        </button>
      ))}
    </span>
  );

  const [code, setCode] = useState(q.get('room')?.toUpperCase() ?? '');
  const [key, setKey] = useState(q.get('key') ?? '');
  const [s, setS] = useState<RoomSummary | null>(null);
  const [stage, setStage] = useState(0);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  // The AI's reading, asked for once when the conclusion is reached. It sees
  // the aggregate and nothing else, and it is briefed to notice rather than to
  // judge: there was no correct number of sources and no correct answer.
  const [ai, setAi] = useState<string | null>(null);
  useEffect(() => {
    if (stage !== LAST_STAGE || ai || !code || !key) return;
    let live = true;
    void fetchReading(code, key, lang).then(r => {
      if (live && r) setAi(r);
    });
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage, lang]);

  // Polled, not pushed: forty phones over an evening is nothing, and a screen
  // that refreshes every few seconds is one fewer thing to break.
  useEffect(() => {
    if (!code || !key) return;
    let live = true;
    const tick = async () => {
      const next = await fetchSummary(code, key);
      if (live && next) setS(next);
    };
    void tick();
    const id = setInterval(tick, 3000);
    return () => {
      live = false;
      clearInterval(id);
    };
  }, [code, key]);

  // Arrow keys and space move the reveal, so the facilitator can hold a
  // clicker and never touch the laptop.
  useEffect(() => {
    const on = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === ' ') setStage(v => Math.min(LAST_STAGE, v + 1));
      if (e.key === 'ArrowLeft') setStage(v => Math.max(0, v - 1));
    };
    window.addEventListener('keydown', on);
    return () => window.removeEventListener('keydown', on);
  }, []);

  const open = async () => {
    setBusy(true);
    setFailed(false);
    const r = await openRoom('PULSE 02 — TRUTH');
    setBusy(false);
    // A button that does nothing is the worst kind of failure — the person at
    // the front of a room needs to know *why* nothing happened.
    if (!r) {
      setFailed(true);
      return;
    }
    setCode(r.code);
    setKey(r.key);
    const u = new URL(window.location.href);
    u.searchParams.set('room', r.code);
    u.searchParams.set('key', r.key);
    window.history.replaceState(null, '', u.toString());
  };

  if (!code || !key) {
    return (
      <main className="grid min-h-[100dvh] place-items-center px-8 text-center">
        <div>
          <div className="mb-8 flex justify-center">{LangToggle}</div>
          <button
            onClick={open}
            disabled={busy}
            className="rounded-full bg-[#EDE7DA] px-10 py-4 text-[12px] font-bold tracking-[0.28em] text-[#07090C] disabled:opacity-50"
          >
            {busy ? t.opening : t.open}
          </button>
          {failed && (
            <div className="mx-auto mt-8 max-w-md rounded-xl border border-amber-300/25 bg-[#12171d] px-5 py-4 text-left">
              <p className="text-[14px] text-amber-100">{t.unreachable}</p>
              <p className="mt-2 text-[12px] leading-relaxed text-gray-400">{t.unreachableWhy}</p>
            </div>
          )}
        </div>
      </main>
    );
  }

  const link = `${APP_URL}?room=${code}`;
  const n = s?.n ?? 0;
  const ready = n >= FLOOR;

  const stops = (i: number) => s?.stops[String(i)] ?? 0;
  const rung = (k: LadderStep) => s?.ladder[k] ?? 0;
  const pct = (v: number) => (n ? Math.round((v / n) * 100) : 0);

  /** The most common stopping point, and how many distinct ones there were. */
  const stopCounts = Array.from({ length: SOURCE_IDS.length + 1 }, (_, i) => i);
  const modeStop = stopCounts.reduce((a, b) => (stops(b) > stops(a) ? b : a), 0);
  const spread = stopCounts.filter(i => stops(i) > 0).length;

  const topAnswer = ANSWER_IDS.reduce(
    (a, b) => ((s?.answers[b] ?? 0) > (s?.answers[a] ?? 0) ? b : a),
    ANSWER_IDS[0],
  );

  const shareBody = t.shareText(
    n,
    t.sources(modeStop),
    c.answer.options[topAnswer],
    pct(rung('commitment')),
  );
  const shareHref = `https://wa.me/?text=${encodeURIComponent(shareBody + '\n' + link)}`;

  const Reading: React.FC<{ i: number }> = ({ i }) =>
    t.reading[i] ? (
      <p className="mt-10 border-l-2 border-white/10 pl-5 text-[16px] leading-relaxed text-gray-400">
        {t.reading[i]}
      </p>
    ) : null;

  /** Every chart stage refuses to draw under five. */
  const Gate: React.FC<{ children: React.ReactNode }> = ({ children }) =>
    ready ? (
      <>{children}</>
    ) : (
      <p className="mx-auto max-w-lg text-center text-[15px] leading-relaxed text-gray-500">
        {t.tooFew(n)}
      </p>
    );

  return (
    <main className="mx-auto flex min-h-[100dvh] max-w-4xl flex-col px-10 py-12">
      <header className="flex items-baseline justify-between">
        <span className="font-display text-[18px] tracking-[0.2em] text-[#EDE7DA]">
          NUCLEUS PULSE 02
        </span>
        <span className="flex items-center gap-6 text-[12px] tracking-[0.3em] text-gray-500">
          {code} · {t.joined(s?.joined ?? 0, n)}
          {LangToggle}
        </span>
      </header>

      <section className="flex flex-1 flex-col justify-center py-10">
        <AnimatePresence mode="wait">
          <motion.div
            key={stage}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6 }}
          >
            {stage === 0 && (
              <div className="text-center">
                <p className="text-[12px] tracking-[0.3em] text-gray-500">{t.waiting}</p>
                <p className="font-display mt-6 text-[120px] leading-none tracking-[0.2em] text-[#EDE7DA]">
                  {code}
                </p>
                <p className="mt-8 text-[14px] text-gray-400">{link}</p>
                <img
                  alt="QR"
                  className="mx-auto mt-6 h-44 w-44 rounded-xl bg-white p-2"
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=352x352&data=${encodeURIComponent(link)}`}
                />
                <p className="font-display mt-10 text-[40px] text-[#EDE7DA]">
                  {s?.joined ?? 0} <span className="text-[18px] text-gray-500">{t.people}</span>
                </p>
              </div>
            )}

            {/* 1 — the headline. One colour, and neither end of the axis is
                the good end. */}
            {stage === 1 && (
              <>
                <p className="mb-8 text-[12px] tracking-[0.3em] text-gray-500">{t.stage[1]}</p>
                <Gate>
                  <div className="space-y-3">
                    {stopCounts.map(i => (
                      <Bar
                        key={i}
                        label={t.sources(i)}
                        value={stops(i)}
                        max={Math.max(1, ...stopCounts.map(stops))}
                        color={NEUTRAL}
                        total={n}
                      />
                    ))}
                  </div>
                  <Reading i={1} />
                </Gate>
              </>
            )}

            {/* 2 — four answers, none of them marked. */}
            {stage === 2 && (
              <>
                <p className="mb-8 text-[12px] tracking-[0.3em] text-gray-500">{t.stage[2]}</p>
                <Gate>
                  <div className="space-y-3">
                    {ANSWER_IDS.map(id => (
                      <Bar
                        key={id}
                        label={c.answer.options[id]}
                        value={s?.answers[id] ?? 0}
                        max={Math.max(1, ...ANSWER_IDS.map(x => s?.answers[x] ?? 0))}
                        color={NEUTRAL}
                        total={n}
                      />
                    ))}
                  </div>
                  <Reading i={2} />
                </Gate>
              </>
            )}

            {/* 3 — certainty. Shown next to the stopping points, never
                combined with them into a number about a person. */}
            {stage === 3 && (
              <>
                <p className="mb-8 text-[12px] tracking-[0.3em] text-gray-500">{t.stage[3]}</p>
                <Gate>
                  <div className="space-y-3">
                    {CONF_IDS.map(id => (
                      <Bar
                        key={id}
                        label={c.answer.levels[id]}
                        value={s?.confidence[id] ?? 0}
                        max={Math.max(1, ...CONF_IDS.map(x => s?.confidence[x] ?? 0))}
                        color={NEUTRAL}
                        total={n}
                      />
                    ))}
                  </div>
                  <Reading i={3} />
                </Gate>
              </>
            )}

            {/* 4 — what nobody opened. Read out as a fact, never as an
                accusation: the masterplan usually leads this list, and that is
                not a failing of the people who did not open it. */}
            {stage === 4 && (
              <>
                <p className="mb-8 text-[12px] tracking-[0.3em] text-gray-500">{t.stage[4]}</p>
                <Gate>
                  <div className="space-y-3">
                    {[...SOURCE_IDS]
                      .sort((a, b) => (s?.unopened[b] ?? 0) - (s?.unopened[a] ?? 0))
                      .map((id: SourceId) => (
                        <Bar
                          key={id}
                          label={c.sources[id].system}
                          value={s?.unopened[id] ?? 0}
                          max={Math.max(1, ...SOURCE_IDS.map(x => s?.unopened[x] ?? 0))}
                          color={UNSEEN}
                          total={n}
                        />
                      ))}
                  </div>
                  <Reading i={4} />
                </Gate>
              </>
            )}

            {/* 5 — the room's own argument, in the room's own numbers. The
                yeses fall away as the stakes rise, and nothing was added
                between the three questions. */}
            {stage === 5 && (
              <>
                <p className="mb-8 text-[12px] tracking-[0.3em] text-gray-500">{t.stage[5]}</p>
                <Gate>
                  {/* Three tiles and nothing else. A bar row underneath was
                      the same three numbers a second time, and the fall from
                      the first tile to the third is the entire point — saying
                      it twice made it quieter, not louder. */}
                  <div className="grid grid-cols-3 gap-4">
                    {LADDER.map((step, i) => (
                      <Tile
                        key={step}
                        n={rung(step)}
                        label={t.rung[step]}
                        total={n}
                        accent={i === LADDER.length - 1 ? RUNG : undefined}
                      />
                    ))}
                  </div>
                  <Reading i={5} />
                </Gate>
              </>
            )}

            {/* 6 — the line the whole Pulse is for, alone on a screen. */}
            {stage === 6 && (
              <div className="text-center">
                <p className="font-display text-[40px] leading-tight text-[#EDE7DA]">{t.close}</p>
                <p className="mt-4 text-[18px] text-gray-500">{t.closeB}</p>
              </div>
            )}

            {stage === 7 && (
              <div className="mx-auto max-w-2xl">
                <p className="mb-8 text-[12px] tracking-[0.3em] text-gray-500">{t.stage[7]}</p>
                <div className="space-y-5">
                  <p className="font-display text-[30px] leading-tight text-[#EDE7DA]">
                    {t.conclusion[0]}
                  </p>
                  <p className="text-[16px] leading-relaxed text-gray-400">{t.conclusion[1]}</p>
                  <p className="text-[16px] leading-relaxed text-gray-400">{t.conclusion[2]}</p>
                  <p className="text-[16px] leading-relaxed text-gray-300">{t.conclusion[3]}</p>
                  <p className="text-[16px] leading-relaxed text-gray-300">{t.conclusion[4]}</p>
                </div>

                {ready && (
                  <div className="mt-10 space-y-2">
                    <p className="font-display text-[26px] leading-snug text-[#EDE7DA]">
                      {t.heroA(pct(rung('internal')), pct(rung('commitment')))}
                    </p>
                    <p className="font-display text-[26px] leading-snug text-[#EDE7DA]">
                      {t.heroB(spread, n)}
                    </p>
                  </div>
                )}

                <div className="mt-12 rounded-2xl border border-sky-300/15 bg-sky-400/[0.03] px-6 py-5">
                  <p className="text-[10px] tracking-[0.3em] text-sky-200/70">✦ {t.aiTitle}</p>
                  {/* One paragraph, then three lessons on their own lines. */}
                  {ai ? (
                    <div className="mt-3 space-y-3 text-[15px] leading-relaxed text-gray-300">
                      {ai
                        .split(/\n+/)
                        .map(l => l.trim())
                        .filter(Boolean)
                        .map((l, i) =>
                          l.startsWith('•') ? (
                            <p key={i} className="flex gap-3 text-gray-200">
                              <span className="text-sky-200/70">•</span>
                              <span>{l.replace(/^•\s*/, '')}</span>
                            </p>
                          ) : (
                            <p key={i}>{l}</p>
                          ),
                        )}
                    </div>
                  ) : (
                    <p className="mt-3 text-[15px] text-gray-500">{t.aiWait}</p>
                  )}
                </div>

                {ready && (
                  <a
                    href={shareHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-10 inline-flex items-center gap-2 rounded-full bg-[#25D366]/90 px-7 py-3.5 text-[12px] font-bold tracking-[0.2em] text-[#062b15]"
                  >
                    <WhatsAppMark size={17} />
                    {t.share}
                  </a>
                )}
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </section>

      <footer className="flex justify-between text-[11px] tracking-[0.24em] text-gray-600">
        <span>
          {stage} / {LAST_STAGE}
        </span>
        <button
          onClick={() => setStage(v => Math.min(LAST_STAGE, v + 1))}
          className="hover:text-gray-300"
        >
          {t.next}
        </button>
      </footer>
    </main>
  );
};

ReactDOM.createRoot(document.getElementById('root')!).render(<Room />);
