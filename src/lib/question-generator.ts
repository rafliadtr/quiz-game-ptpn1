/**
 * lib/question-generator.ts
 *
 * Generator soal kuis organisasi.
 * Fungsi ini "murni": tidak menyentuh database. Data organisasi dimuat sekali
 * (misalnya lewat Prisma) lalu dioper ke generateQuestions(). Dengan begitu
 * logikanya mudah diuji di terminal tanpa menjalankan Next.js.
 */

// ---------------------------------------------------------------------------
// Tipe data
// ---------------------------------------------------------------------------

export type Division = { id: number; kode: string; kepanjangan: string };
export type SubDivision = { id: number; nama: string; divisionId: number };
export type Position = {
  id: number;
  namaJabatan: string;
  level: number; // makin kecil makin tinggi, dipakai untuk distractor setara
  divisionId: number;
  subDivisionId: number | null;
};
export type Official = { id: number; nama: string; positionId: number };

export type OrgData = {
  divisions: Division[];
  subDivisions: SubDivision[];
  positions: Position[];
  officials: Official[];
};

export type QuestionType =
  | "kepanjangan"
  | "subdiv_member"
  | "subdiv_not_member"
  | "official_of_position"
  | "position_of_official"
  | "true_false"
  | "trick_swapped_name"
  | "trick_wrong_level";

export type Question = {
  key: string; // identitas unik untuk mencegah soal duplikat dalam satu sesi
  /** jabatan yang dibahas; satu jabatan hanya muncul di satu soal "siapa yang menjabat" per sesi */
  topic?: string;
  type: QuestionType;
  divisionId: number;
  prompt: string;
  options: string[];
  answerIndex: number; // RAHASIA, hanya disimpan di server
  explanation: string; // ditampilkan di halaman review setelah game selesai
};

/** Versi soal yang aman dikirim ke browser (tanpa kunci jawaban). */
export type PublicQuestion = {
  no: number;
  type: QuestionType;
  prompt: string;
  options: string[];
};

export type GenerateOptions = {
  divisionId: number;
  count?: number; // default 10
  mode?: "own" | "mixed"; // own = hanya divisi sendiri, mixed = campur divisi lain
  ownRatio?: number; // porsi soal divisi sendiri pada mode mixed, default 0.6
  rng?: Rng; // isi dengan mulberry32(seed) untuk hasil yang bisa diulang
};

// ---------------------------------------------------------------------------
// Random utilities
// ---------------------------------------------------------------------------

export type Rng = () => number;

/** RNG dengan seed. Seed sama = urutan soal sama (berguna untuk Daily Challenge & testing). */
export function mulberry32(seed: number): Rng {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const pick = <T>(arr: T[], rng: Rng): T => arr[Math.floor(rng() * arr.length)];

function shuffle<T>(arr: T[], rng: Rng): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const norm = (s: string) => s.trim().toLowerCase();

/** Opsi khusus soal jebakan. Selalu diletakkan di posisi terakhir. */
export const NONE_OPTION = "Tidak ada";

/** Peluang "Tidak ada" muncul sebagai opsi SALAH di soal "Siapa yang menjabat" biasa. */
const NONE_AS_DISTRACTOR_CHANCE = 0.3;

/**
 * Membalik urutan nama berbentuk "X dan Y" atau "X & Y".
 * "Pengembangan SDM dan Manajemen Kinerja" → "Manajemen Kinerja dan Pengembangan SDM".
 * Mengembalikan null jika nama tidak bisa dibalik dengan wajar: tanpa kata sambung,
 * lebih dari satu kata sambung, ada koma, atau berakhiran nomor ("Afiliasi I").
 */
export function swapName(nama: string): string | null {
  const t = nama.trim();
  if (t.includes(",") || /\s(I|II|III|IV|V|\d+)$/.test(t)) return null;
  const parts = t.split(/\s+(dan|&)\s+/i); // [X, kata sambung, Y]
  if (parts.length !== 3) return null;
  const [x, joiner, y] = parts;
  if (norm(x) === norm(y)) return null;
  return `${y} ${joiner} ${x}`;
}

// ---------------------------------------------------------------------------
// Pembuat pilihan ganda
// ---------------------------------------------------------------------------

/**
 * Menyusun 1 jawaban benar + `n` distractor, lalu mengacak urutannya.
 * - `exclude`  : nilai yang juga benar dan TIDAK boleh muncul sebagai distractor
 * - `fallback` : pool cadangan jika pool utama (distractor setara) kurang
 * Mengembalikan null jika distractor tidak cukup, sehingga template dilewati.
 */
function makeChoices(
  correct: string,
  pool: string[],
  rng: Rng,
  opts: { exclude?: string[]; fallback?: string[]; n?: number } = {},
): { options: string[]; answerIndex: number } | null {
  const n = opts.n ?? 3;
  const blocked = new Set([norm(correct), ...(opts.exclude ?? []).map(norm)]);
  const distractors: string[] = [];

  for (const source of [
    shuffle(pool, rng),
    shuffle(opts.fallback ?? [], rng),
  ]) {
    for (const v of source) {
      if (distractors.length >= n) break;
      if (blocked.has(norm(v))) continue;
      blocked.add(norm(v));
      distractors.push(v);
    }
  }
  if (distractors.length < n) return null;

  const options = shuffle([correct, ...distractors], rng);
  return { options, answerIndex: options.indexOf(correct) };
}

// ---------------------------------------------------------------------------
// Index untuk lookup cepat
// ---------------------------------------------------------------------------

type Index = ReturnType<typeof buildIndex>;

function groupBy<T, K>(arr: T[], key: (x: T) => K): Map<K, T[]> {
  const m = new Map<K, T[]>();
  for (const x of arr) {
    const k = key(x);
    if (!m.has(k)) m.set(k, []);
    m.get(k)!.push(x);
  }
  return m;
}

function buildIndex(data: OrgData) {
  const divById = new Map(data.divisions.map((d) => [d.id, d]));
  const subById = new Map(data.subDivisions.map((s) => [s.id, s]));
  const posById = new Map(data.positions.map((p) => [p.id, p]));
  const subsByDiv = groupBy(data.subDivisions, (s) => s.divisionId);
  const posByDiv = groupBy(data.positions, (p) => p.divisionId);
  const officialsByPos = groupBy(data.officials, (o) => o.positionId);

  /**
   * - Punya sub divisi  → "Kepala Sub Divisi Anggaran"
   * - Kepala Divisi     → "Kepala Divisi DPSB"
   * - Jabatan lain      → namaJabatan apa adanya, sudah ditulis lengkap ("Head of PMO Human Capital")
   */
  const labelPosition = (p: Position) => {
    const sub = p.subDivisionId ? subById.get(p.subDivisionId) : undefined;
    if (sub) return `${p.namaJabatan} ${sub.nama}`;
    if (p.namaJabatan === "Kepala Divisi")
      return `Kepala Divisi ${divById.get(p.divisionId)?.kode ?? ""}`.trim();
    return p.namaJabatan;
  };

  return {
    divById,
    subById,
    posById,
    subsByDiv,
    posByDiv,
    officialsByPos,
    labelPosition,
  };
}

// ---------------------------------------------------------------------------
// Template soal
// ---------------------------------------------------------------------------

type Ctx = { data: OrgData; idx: Index; division: Division; rng: Rng };
type Template = {
  type: QuestionType;
  weight: number;
  /** batas per sesi untuk tipe ini; default memakai batas umum per tipe */
  max?: number;
  build: (ctx: Ctx) => Question | null;
};

/** Jabatan Kepala Sub Divisi (atau setara) di divisi ini yang sudah ada pejabatnya. */
function filledSubPositions(idx: Index, division: Division) {
  return (idx.posByDiv.get(division.id) ?? []).filter(
    (p) => p.subDivisionId && idx.officialsByPos.get(p.id)?.length,
  );
}

/** Nama-nama unik, tanpa nama yang dikecualikan. */
function uniqueNames(names: string[], exclude: string[] = []) {
  const seen = new Set(exclude.map(norm));
  return names.filter((n) => !seen.has(norm(n)) && (seen.add(norm(n)), true));
}

/**
 * Opsi soal jebakan: `first` (pengecoh paling meyakinkan, selalu ikut) + pengecoh lain
 * diacak, lalu "Tidak ada" sebagai jawaban benar di posisi terakhir.
 */
function trickChoices(first: string[], pool: string[], rng: Rng) {
  const picked = uniqueNames(first).slice(0, 3);
  for (const n of uniqueNames(shuffle(pool, rng), picked)) {
    if (picked.length >= 3) break;
    picked.push(n);
  }
  if (picked.length < 3) return null;
  const options = [...shuffle(picked, rng), NONE_OPTION];
  return { options, answerIndex: options.length - 1 };
}

const TEMPLATES: Template[] = [
  // 1. Apa kepanjangan dari SDM?
  {
    type: "kepanjangan",
    weight: 1,
    build: ({ data, division, rng }) => {
      const pool = data.divisions
        .filter((d) => d.id !== division.id)
        .map((d) => d.kepanjangan);
      const mc = makeChoices(division.kepanjangan, pool, rng);
      if (!mc) return null;
      return {
        key: `kepanjangan:${division.id}`,
        type: "kepanjangan",
        divisionId: division.id,
        prompt: `Apa kepanjangan dari ${division.kode}?`,
        ...mc,
        explanation: `${division.kode} adalah singkatan dari ${division.kepanjangan}.`,
      };
    },
  },

  // 2. Manakah yang termasuk sub divisi X?
  {
    type: "subdiv_member",
    weight: 2,
    build: ({ data, idx, division, rng }) => {
      const own = idx.subsByDiv.get(division.id) ?? [];
      if (!own.length) return null;
      const target = pick(own, rng);
      const pool = data.subDivisions
        .filter((s) => s.divisionId !== division.id)
        .map((s) => s.nama);
      // sub divisi milik sendiri lainnya juga benar, jadi tidak boleh jadi distractor
      const mc = makeChoices(target.nama, pool, rng, {
        exclude: own.map((s) => s.nama),
      });
      if (!mc) return null;
      return {
        key: `subdiv_member:${division.id}:${target.id}`,
        type: "subdiv_member",
        divisionId: division.id,
        prompt: `Manakah yang termasuk sub divisi dari ${division.kode}?`,
        ...mc,
        explanation: `${target.nama} berada di bawah divisi ${division.kode}.`,
      };
    },
  },

  // 3. Manakah yang BUKAN sub divisi X?
  {
    type: "subdiv_not_member",
    weight: 2,
    build: ({ data, idx, division, rng }) => {
      const own = idx.subsByDiv.get(division.id) ?? [];
      if (own.length < 3) return null;
      const outsiders = data.subDivisions.filter(
        (s) =>
          s.divisionId !== division.id &&
          !own.some((o) => norm(o.nama) === norm(s.nama)),
      );
      if (!outsiders.length) return null;
      const correct = pick(outsiders, rng);
      const distractors = shuffle(own, rng)
        .slice(0, 3)
        .map((s) => s.nama);
      const options = shuffle([correct.nama, ...distractors], rng);
      const owner = idx.divById.get(correct.divisionId);
      return {
        key: `subdiv_not:${division.id}:${correct.id}`,
        type: "subdiv_not_member",
        divisionId: division.id,
        prompt: `Manakah yang BUKAN sub divisi dari ${division.kode}?`,
        options,
        answerIndex: options.indexOf(correct.nama),
        explanation: `${correct.nama} berada di bawah divisi ${owner?.kode ?? "lain"}, bukan ${division.kode}.`,
      };
    },
  },

  // 4. Siapa yang menjabat sebagai Kepala Bagian Rekrutmen?
  {
    type: "official_of_position",
    weight: 3,
    build: ({ data, idx, division, rng }) => {
      const filled = (idx.posByDiv.get(division.id) ?? []).filter(
        (p) => idx.officialsByPos.get(p.id)?.length,
      );
      if (!filled.length) return null;
      const pos = pick(filled, rng);
      const holders = idx.officialsByPos.get(pos.id)!;
      const correct = pick(holders, rng);

      // distractor utama: pejabat lain dengan level jabatan yang sama
      const sameLevel = data.positions
        .filter((p) => p.id !== pos.id && p.level === pos.level)
        .flatMap((p) => idx.officialsByPos.get(p.id) ?? [])
        .map((o) => o.nama);
      const anyOther = data.officials
        .filter((o) => o.positionId !== pos.id)
        .map((o) => o.nama);

      // sesekali "Tidak ada" ikut sebagai opsi salah, supaya opsi itu tidak selalu berarti jawaban benar
      const withNone = rng() < NONE_AS_DISTRACTOR_CHANCE;
      const mc = makeChoices(correct.nama, sameLevel, rng, {
        exclude: holders.map((h) => h.nama),
        fallback: anyOther,
        n: withNone ? 2 : 3,
      });
      if (!mc) return null;
      if (withNone) mc.options.push(NONE_OPTION);
      const label = idx.labelPosition(pos);
      return {
        key: `official_of:${pos.id}`,
        topic: `pos:${pos.id}`,
        type: "official_of_position",
        divisionId: division.id,
        prompt: `Siapa yang menjabat sebagai ${label}?`,
        ...mc,
        explanation: `${label} saat ini dijabat oleh ${correct.nama}.`,
      };
    },
  },

  // 5. Budi menjabat sebagai apa?
  {
    type: "position_of_official",
    weight: 3,
    build: ({ data, idx, division, rng }) => {
      const officials = (idx.posByDiv.get(division.id) ?? []).flatMap(
        (p) => idx.officialsByPos.get(p.id) ?? [],
      );
      if (!officials.length) return null;
      const official = pick(officials, rng);
      const pos = idx.posById.get(official.positionId)!;
      const correct = idx.labelPosition(pos);

      // orang yang sama bisa merangkap jabatan, semua jabatannya dianggap benar
      const allLabelsOfPerson = data.officials
        .filter((o) => norm(o.nama) === norm(official.nama))
        .map((o) => idx.labelPosition(idx.posById.get(o.positionId)!));
      const sameLevel = data.positions
        .filter((p) => p.id !== pos.id && p.level === pos.level)
        .map(idx.labelPosition);
      const anyOther = data.positions
        .filter((p) => p.id !== pos.id)
        .map(idx.labelPosition);

      const mc = makeChoices(correct, sameLevel, rng, {
        exclude: allLabelsOfPerson,
        fallback: anyOther,
      });
      if (!mc) return null;
      return {
        key: `position_of:${official.id}`,
        type: "position_of_official",
        divisionId: division.id,
        prompt: `${official.nama} menjabat sebagai apa?`,
        ...mc,
        explanation: `${official.nama} menjabat sebagai ${correct}.`,
      };
    },
  },

  // 6. Benar atau salah: "Rekrutmen" adalah sub divisi dari SDM.
  {
    type: "true_false",
    weight: 1,
    build: ({ data, idx, division, rng }) => {
      const own = idx.subsByDiv.get(division.id) ?? [];
      const isTrue = rng() < 0.5;
      const pool = isTrue
        ? own
        : data.subDivisions.filter(
            (s) =>
              s.divisionId !== division.id &&
              !own.some((o) => norm(o.nama) === norm(s.nama)),
          );
      if (!pool.length) return null;
      const sub = pick(pool, rng);
      const owner = idx.divById.get(sub.divisionId);
      return {
        key: `tf:${division.id}:${sub.id}`,
        type: "true_false",
        divisionId: division.id,
        prompt: `Benar atau salah: "${sub.nama}" adalah sub divisi dari ${division.kode}.`,
        options: ["Benar", "Salah"],
        answerIndex: isTrue ? 0 : 1,
        explanation: isTrue
          ? `Benar, ${sub.nama} berada di bawah ${division.kode}.`
          : `Salah, ${sub.nama} berada di bawah ${owner?.kode ?? "divisi lain"}.`,
      };
    },
  },

  // 7. Jebakan nama dibalik:
  //    "Siapa yang menjabat sebagai Kepala Sub Divisi Manajemen Kinerja dan Pengembangan SDM?"
  //    Nama aslinya "Pengembangan SDM dan Manajemen Kinerja", jadi jawabannya "Tidak ada".
  {
    type: "trick_swapped_name",
    weight: 1,
    max: 1,
    build: ({ data, idx, division, rng }) => {
      const realNames = new Set(data.subDivisions.map((s) => norm(s.nama)));
      const candidates = filledSubPositions(idx, division).filter((p) => {
        const swapped = swapName(idx.subById.get(p.subDivisionId!)!.nama);
        // hasil balikan tidak boleh kebetulan sama dengan sub divisi yang memang ada
        return swapped && !realNames.has(norm(swapped));
      });
      if (!candidates.length) return null;
      const pos = pick(candidates, rng);
      const sub = idx.subById.get(pos.subDivisionId!)!;
      const swapped = swapName(sub.nama)!;
      const holder = pick(idx.officialsByPos.get(pos.id)!, rng);

      // pengecoh: pejabat aslinya + pejabat lain yang selevel
      const sameLevel = data.positions
        .filter((p) => p.id !== pos.id && p.level === pos.level)
        .flatMap((p) => idx.officialsByPos.get(p.id) ?? [])
        .map((o) => o.nama);
      const pool = sameLevel.length >= 2 ? sameLevel : data.officials.map((o) => o.nama);
      const mc = trickChoices([holder.nama], pool, rng);
      if (!mc) return null;
      return {
        key: `trick_swap:${pos.id}`,
        topic: `pos:${pos.id}`,
        type: "trick_swapped_name",
        divisionId: division.id,
        prompt: `Siapa yang menjabat sebagai ${pos.namaJabatan} ${swapped}?`,
        ...mc,
        explanation: `Tidak ada jabatan bernama "${pos.namaJabatan} ${swapped}", urutannya terbalik. Yang benar ${pos.namaJabatan} ${sub.nama}, dijabat ${holder.nama}.`,
      };
    },
  },

  // 8. Jebakan level jabatan:
  //    "Siapa yang menjabat sebagai Kepala Divisi Pengembangan SDM dan Manajemen Kinerja?"
  //    Itu sub divisi, jadi tidak ada Kepala Divisi-nya. Jawabannya "Tidak ada".
  {
    type: "trick_wrong_level",
    weight: 1,
    max: 1,
    build: ({ data, idx, division, rng }) => {
      const divisionNames = new Set(data.divisions.map((d) => norm(d.kepanjangan)));
      const candidates = filledSubPositions(idx, division).filter((p) => {
        const sub = idx.subById.get(p.subDivisionId!)!;
        // lewati jika "Divisi <nama sub>" ternyata memang nama sebuah divisi
        return (
          p.namaJabatan === "Kepala Sub Divisi" &&
          !divisionNames.has(norm(`Divisi ${sub.nama}`))
        );
      });
      if (!candidates.length) return null;
      const pos = pick(candidates, rng);
      const sub = idx.subById.get(pos.subDivisionId!)!;
      const holder = pick(idx.officialsByPos.get(pos.id)!, rng);

      // pengecoh: Kepala Sub Divisi aslinya, Kepala Divisi induknya, lalu Kepala Divisi lain
      const headsOf = (filter: (p: Position) => boolean) =>
        data.positions
          .filter((p) => p.namaJabatan === "Kepala Divisi" && filter(p))
          .flatMap((p) => idx.officialsByPos.get(p.id) ?? [])
          .map((o) => o.nama);
      const ownHead = headsOf((p) => p.divisionId === division.id).slice(0, 1);
      const otherHeads = headsOf((p) => p.divisionId !== division.id);

      const mc = trickChoices([holder.nama, ...ownHead], otherHeads, rng);
      if (!mc) return null;
      return {
        key: `trick_level:${pos.id}`,
        topic: `pos:${pos.id}`,
        type: "trick_wrong_level",
        divisionId: division.id,
        prompt: `Siapa yang menjabat sebagai Kepala Divisi ${sub.nama}?`,
        ...mc,
        explanation: `Tidak ada jabatan "Kepala Divisi ${sub.nama}". ${sub.nama} adalah sub divisi di bawah ${division.kode}, dipimpin Kepala Sub Divisi ${holder.nama}.`,
      };
    },
  },
];

/**
 * Memilih template berdasarkan bobot, dengan batas maksimal per tipe
 * supaya satu sesi tidak didominasi satu jenis soal.
 */
function pickTemplate(
  rng: Rng,
  typeCount: Map<QuestionType, number>,
  maxPerType: number,
): Template {
  let candidates = TEMPLATES.filter(
    (t) => (typeCount.get(t.type) ?? 0) < (t.max ?? maxPerType),
  );
  // semua tipe sudah penuh: lanjut pakai tipe biasa, tipe dengan batas khusus (jebakan) tetap dijaga
  if (!candidates.length)
    candidates = TEMPLATES.filter(
      (t) => t.max === undefined || (typeCount.get(t.type) ?? 0) < t.max,
    );
  const total = candidates.reduce((sum, t) => sum + t.weight, 0);
  let roll = rng() * total;
  for (const t of candidates) {
    roll -= t.weight;
    if (roll <= 0) return t;
  }
  return candidates[candidates.length - 1];
}

// ---------------------------------------------------------------------------
// Fungsi utama
// ---------------------------------------------------------------------------

export function generateQuestions(
  data: OrgData,
  opts: GenerateOptions,
): Question[] {
  const rng = opts.rng ?? Math.random;
  const count = opts.count ?? 10;
  const ownRatio = opts.ownRatio ?? 0.6;
  const maxPerType = Math.ceil(count * 0.4);

  const idx = buildIndex(data);
  const home = idx.divById.get(opts.divisionId);
  if (!home)
    throw new Error(`Divisi dengan id ${opts.divisionId} tidak ditemukan`);
  const others = data.divisions.filter((d) => d.id !== home.id);

  const used = new Set<string>();
  const typeCount = new Map<QuestionType, number>();
  const result: Question[] = [];

  // batas percobaan mencegah infinite loop jika data terlalu sedikit
  for (
    let attempt = 0;
    attempt < count * 25 && result.length < count;
    attempt++
  ) {
    const division =
      opts.mode === "mixed" && others.length && rng() >= ownRatio
        ? pick(others, rng)
        : home;
    const template = pickTemplate(rng, typeCount, maxPerType);
    const q = template.build({ data, idx, division, rng });
    if (!q || used.has(q.key) || (q.topic && used.has(q.topic))) continue;

    used.add(q.key);
    if (q.topic) used.add(q.topic);
    typeCount.set(q.type, (typeCount.get(q.type) ?? 0) + 1);
    result.push(q);
  }

  return result; // bisa kurang dari `count` jika data belum cukup, tangani di UI
}

/** Hapus kunci jawaban sebelum dikirim ke client. */
export const toPublic = (questions: Question[]): PublicQuestion[] =>
  questions.map((q, i) => ({
    no: i + 1,
    type: q.type,
    prompt: q.prompt,
    options: q.options,
  }));
