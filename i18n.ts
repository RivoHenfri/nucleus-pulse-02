// Two languages, chosen on the first screen and honoured everywhere after.
//
// Nucleus terminology stays in English in both: NUCLEUS, PULSE, TRUTH,
// PULSEBACK — and nothing else. SIGNAL and SIGNALFALL belong to PULSE 01 and
// are not reused here.
//
// One rule specific to this Pulse. The six records are output from six
// systems, and Indonesian property teams read RESERVED, SOLD and SPA in
// English every working day. So field *labels* are translated and system
// *values* are not — translating "SOLD" to "TERJUAL" would make the Registry
// card read as something the app wrote rather than something a system printed,
// and the whole workspace depends on those cards being believable.
//
// WHO IS WAITING. A teammate, not the client. The question used to come from a
// client, which reads as coming from outside the building — and the ladder's
// first rung is "suppose you're only replying internally", which has nowhere to
// stand if the person waiting was never internal. The question itself is
// unchanged, word for word; only the person waiting for it moved inside.

import type { AnswerId, Confidence, LadderStep, SourceId } from './types';

export type Lang = 'en' | 'id';

export const LANGUAGES: { code: Lang; label: string }[] = [
  { code: 'en', label: 'English' },
  { code: 'id', label: 'Bahasa Indonesia' },
];

/** One record, as its own system would print it. */
export interface SourceCopy {
  system: string;
  rows: { label: string; value: string }[];
  /** A line of prose the record itself carries, where it has one. */
  note?: string;
  /** The date line at the foot, in the words that system would use. */
  foot: string;
}

const EN = {
  enter: {
    brand: 'NUCLEUS PULSE',
    pulse: '02 — TRUTH',
    clock: '09:42 AM',
    lines: [
      'A teammate is waiting for an answer.',
      '“Can you confirm the current status of Plot A17?”',
      'You have a few places you can check.',
      'Answer when you think you know enough.',
    ],
    cta: 'START',
  },

  workspace: {
    plot: 'PLOT A17',
    status: 'Current status',
    unknown: '?',
    seconds: (n: number) => `${n}s`,
    open: 'Tap to open',
    another: 'CHECK ANOTHER SOURCE',
    answer: 'ANSWER NOW',
    // Shown once, on the first card opened, and never again. Without it the
    // first tap reads as "picked one" rather than "opened one".
    hint: 'Open as many or as few as you want.',
  },

  sources: {
    sales: {
      system: 'SALES TRACKER',
      rows: [
        { label: 'Plot', value: 'A17' },
        { label: 'Status', value: 'RESERVED' },
      ],
      foot: 'Last updated: 03 Sep',
    },
    finance: {
      system: 'FINANCE',
      rows: [
        { label: 'Plot', value: 'A17' },
        { label: 'Reservation deposit', value: 'RECEIVED' },
      ],
      foot: 'Received: 05 Sep',
    },
    registry: {
      system: 'PLOT REGISTRY',
      rows: [
        { label: 'Plot', value: 'A17' },
        { label: 'Status', value: 'SOLD' },
      ],
      foot: 'Last validated: 19 Aug',
    },
    client: {
      system: 'CLIENT FILE',
      rows: [
        { label: 'Client', value: 'Jonathan Reed' },
        { label: 'Plot', value: 'A17' },
      ],
      note: 'Reservation documentation received.',
      foot: 'Updated: 28 Aug',
    },
    legal: {
      system: 'LEGAL',
      rows: [
        { label: 'Document', value: 'SPA prepared' },
        { label: 'Client', value: 'Jonathan Reid' },
        { label: 'Plot', value: 'A17' },
        { label: 'Execution status', value: 'Pending' },
      ],
      foot: 'Updated: 06 Sep',
    },
    masterplan: {
      system: 'LATEST MASTERPLAN',
      rows: [
        { label: 'Revision issued', value: '08 Sep' },
        { label: 'Plot numbering update', value: 'A17 → A18' },
      ],
      note: 'Previous references to A17 may refer to the plot now identified as A18.',
      foot: 'Supersedes all earlier plot references.',
    },
  } as Record<SourceId, SourceCopy>,

  answer: {
    title: 'So — what do you send back?',
    options: {
      reserved: 'RESERVED',
      sold: 'SOLD',
      'in-process': 'CONTRACTED / IN PROCESS',
      'validate-first': 'I NEED TO VALIDATE FIRST',
    } as Record<AnswerId, string>,
    confidence: 'How confident are you?',
    levels: {
      low: 'LOW',
      medium: 'MEDIUM',
      high: 'HIGH',
    } as Record<Confidence, string>,
    cta: 'SEND',
    // The clock ran out before they answered. Said plainly, without alarm.
    timeUp: 'Time is up. Answer with what you have.',
  },

  reveal: {
    checked: (n: number, of: number) => `You answered after checking ${n} of ${of} sources.`,
    checkedOne: (of: number) => `You answered after checking 1 of ${of} sources.`,
    remaining: (n: number) => `There were still ${n} sources available.`,
    remainingOne: 'There was still 1 source available.',
    remainingNone: 'You had opened all of them.',
    incomplete: 'You didn’t have the whole picture.',
    // The version for someone who opened all six. They did not have the whole
    // picture either — the six do not agree — and telling them they did would
    // be the one lie in the experience.
    incompleteAll: 'The six of them still didn’t say the same thing.',
    decided: 'But you decided you knew enough to answer.',
    mark: 'TRUTH',
    cta: 'SEE WHAT I DIDN’T CHECK',
    // For the participant who opened everything: nothing was left, so the
    // button offers the only honest thing it can.
    ctaAll: 'LOOK AGAIN',
  },

  unchecked: {
    eyebrow: 'EVERYTHING THAT WAS THERE',
    title: 'All six, open.',
    youOpened: 'You opened this',
    youDidnt: 'You didn’t open this',
    cta: 'CONTINUE',
  },

  mirror: {
    checked: (n: number, of: number) => `You checked ${n} of ${of} sources.`,
    answered: (s: number) => `You answered with ${s} seconds remaining.`,
    answeredNoTime: 'You answered as the time ran out.',
    yourAnswer: 'Your answer',
    yourConfidence: 'Your confidence',
    more: 'More information was still available when you decided.',
    // For the participant who opened all six, the same beat without the lie.
    moreAll: 'And it still didn’t settle into one answer.',
    hero: ['Nobody told you when you knew enough.', 'You decided that yourself.'],
    cta: 'CONTINUE',
  },

  ladder: {
    eyebrow: 'THE SAME THING YOU KNOW RIGHT NOW',
    steps: {
      internal: {
        setup: 'Suppose you’re only replying internally:',
        quote: '“What’s happening with A17?”',
        ask: 'Would what you know be enough?',
      },
      client: {
        setup: 'Now suppose you’re about to tell the client:',
        quote: '“Your plot is confirmed as sold.”',
        ask: 'Enough?',
      },
      commitment: {
        setup: 'Now suppose a payment or a legal commitment depends on it.',
        quote: '',
        ask: 'Enough?',
      },
    } as Record<LadderStep, { setup: string; quote: string; ask: string }>,
    yes: 'YES',
    no: 'NO',
    cta: 'CONTINUE',
  },

  end: {
    lines: [
      'You will rarely have the whole picture.',
      'And there will almost always be another source you could check.',
      'At some point, you stop.',
      'Not because you know everything.',
      'Because you decide you know enough for what happens next.',
    ],
    mark: 'TRUTH',
    question: 'What do you trust?',
    restart: 'RUN IT AGAIN',
  },

  common: {
    soundHint: 'This experience is carried by sound. Headphones if you have them.',
    soundOn: 'Sound on',
    soundOff: 'Sound off',
    soundBlocked: 'Sound is blocked on this phone. Tap here to turn it on.',
    soundSilent: 'The voice isn’t coming through. Tap here to try again.',
  },
};

const ID: typeof EN = {
  enter: {
    brand: 'NUCLEUS PULSE',
    pulse: '02 — TRUTH',
    clock: '09:42',
    lines: [
      'Rekan setim sedang menunggu jawaban.',
      '“Bisa konfirmasi status Plot A17 sekarang?”',
      'Ada beberapa tempat yang bisa kamu cek.',
      'Jawab ketika kamu merasa sudah cukup tahu.',
    ],
    cta: 'MULAI',
  },

  workspace: {
    plot: 'PLOT A17',
    status: 'Status sekarang',
    unknown: '?',
    seconds: (n: number) => `${n}d`,
    open: 'Ketuk untuk membuka',
    another: 'CEK SUMBER LAIN',
    answer: 'JAWAB SEKARANG',
    hint: 'Buka sebanyak atau sesedikit yang kamu mau.',
  },

  sources: {
    sales: {
      system: 'SALES TRACKER',
      rows: [
        { label: 'Plot', value: 'A17' },
        { label: 'Status', value: 'RESERVED' },
      ],
      foot: 'Terakhir diperbarui: 03 Sep',
    },
    finance: {
      system: 'FINANCE',
      rows: [
        { label: 'Plot', value: 'A17' },
        { label: 'Deposit reservasi', value: 'DITERIMA' },
      ],
      foot: 'Diterima: 05 Sep',
    },
    registry: {
      system: 'PLOT REGISTRY',
      rows: [
        { label: 'Plot', value: 'A17' },
        { label: 'Status', value: 'SOLD' },
      ],
      foot: 'Terakhir divalidasi: 19 Agu',
    },
    client: {
      system: 'CLIENT FILE',
      rows: [
        { label: 'Klien', value: 'Jonathan Reed' },
        { label: 'Plot', value: 'A17' },
      ],
      note: 'Dokumen reservasi sudah diterima.',
      foot: 'Diperbarui: 28 Agu',
    },
    legal: {
      system: 'LEGAL',
      rows: [
        { label: 'Dokumen', value: 'SPA disiapkan' },
        { label: 'Klien', value: 'Jonathan Reid' },
        { label: 'Plot', value: 'A17' },
        { label: 'Status eksekusi', value: 'Pending' },
      ],
      foot: 'Diperbarui: 06 Sep',
    },
    masterplan: {
      system: 'LATEST MASTERPLAN',
      rows: [
        { label: 'Revisi terbit', value: '08 Sep' },
        { label: 'Perubahan penomoran plot', value: 'A17 → A18' },
      ],
      note: 'Referensi A17 sebelumnya mungkin merujuk pada plot yang sekarang bernomor A18.',
      foot: 'Menggantikan seluruh referensi plot sebelumnya.',
    },
  } as Record<SourceId, SourceCopy>,

  answer: {
    title: 'Jadi — apa yang kamu balas?',
    options: {
      reserved: 'RESERVED',
      sold: 'SOLD',
      'in-process': 'DALAM PROSES KONTRAK',
      'validate-first': 'SAYA PERLU VALIDASI DULU',
    } as Record<AnswerId, string>,
    confidence: 'Seberapa yakin kamu?',
    levels: {
      low: 'RENDAH',
      medium: 'SEDANG',
      high: 'TINGGI',
    } as Record<Confidence, string>,
    cta: 'KIRIM',
    timeUp: 'Waktunya habis. Jawab dengan apa yang kamu punya.',
  },

  reveal: {
    checked: (n: number, of: number) => `Kamu menjawab setelah mengecek ${n} dari ${of} sumber.`,
    checkedOne: (of: number) => `Kamu menjawab setelah mengecek 1 dari ${of} sumber.`,
    remaining: (n: number) => `Masih ada ${n} sumber yang tersedia.`,
    remainingOne: 'Masih ada 1 sumber yang tersedia.',
    remainingNone: 'Kamu sudah membuka semuanya.',
    incomplete: 'Kamu belum memiliki gambaran utuhnya.',
    incompleteAll: 'Keenamnya pun tetap tidak mengatakan hal yang sama.',
    decided: 'Tapi kamu memutuskan sudah cukup tahu untuk menjawab.',
    mark: 'TRUTH',
    cta: 'LIHAT YANG TIDAK SAYA CEK',
    ctaAll: 'LIHAT LAGI',
  },

  unchecked: {
    eyebrow: 'SEMUA YANG SEBENARNYA ADA',
    title: 'Keenamnya, terbuka.',
    youOpened: 'Kamu membuka ini',
    youDidnt: 'Kamu tidak membuka ini',
    cta: 'LANJUT',
  },

  mirror: {
    checked: (n: number, of: number) => `Kamu mengecek ${n} dari ${of} sumber.`,
    answered: (s: number) => `Kamu menjawab dengan sisa waktu ${s} detik.`,
    answeredNoTime: 'Kamu menjawab tepat saat waktunya habis.',
    yourAnswer: 'Jawabanmu',
    yourConfidence: 'Keyakinanmu',
    more: 'Masih ada informasi lain saat kamu memutuskan.',
    moreAll: 'Dan tetap tidak mengerucut jadi satu jawaban.',
    hero: [
      'Tidak ada yang memberi tahu kamu kapan kamu sudah cukup tahu.',
      'Kamu sendiri yang memutuskan.',
    ],
    cta: 'LANJUT',
  },

  ladder: {
    eyebrow: 'HAL YANG SAMA YANG KAMU TAHU SEKARANG',
    steps: {
      internal: {
        setup: 'Anggap kamu hanya membalas ke internal:',
        quote: '“A17 gimana statusnya?”',
        ask: 'Apakah yang kamu tahu sudah cukup?',
      },
      client: {
        setup: 'Sekarang anggap kamu akan bilang ke klien:',
        quote: '“Plot Anda sudah dikonfirmasi terjual.”',
        ask: 'Cukup?',
      },
      commitment: {
        setup: 'Sekarang anggap ada pembayaran atau komitmen hukum yang bergantung padanya.',
        quote: '',
        ask: 'Cukup?',
      },
    } as Record<LadderStep, { setup: string; quote: string; ask: string }>,
    yes: 'YA',
    no: 'TIDAK',
    cta: 'LANJUT',
  },

  end: {
    lines: [
      'Kamu jarang akan punya gambaran utuhnya.',
      'Dan hampir selalu ada satu sumber lagi yang bisa dicek.',
      'Pada satu titik, kamu berhenti.',
      'Bukan karena kamu tahu segalanya.',
      'Tapi karena kamu memutuskan kamu cukup tahu untuk apa yang terjadi berikutnya.',
    ],
    mark: 'TRUTH',
    question: 'Apa yang kamu percaya?',
    restart: 'JALANKAN LAGI',
  },

  common: {
    soundHint: 'Pengalaman ini pakai suara. Kalau ada headphone, pakai ya.',
    soundOn: 'Suara nyala',
    soundOff: 'Suara mati',
    soundBlocked: 'Suara diblokir di ponsel ini. Ketuk di sini untuk menyalakan.',
    soundSilent: 'Suaranya tidak terdengar. Ketuk di sini untuk mencoba lagi.',
  },
};

export const COPY: Record<Lang, typeof EN> = { en: EN, id: ID };
