/**
 * lib/question-generator.ts
 *
 * Generator soal kuis organisasi.
 * Fungsi ini "murni": tidak menyentuh database. Data organisasi dimuat sekali
 * (misalnya lewat Prisma) lalu dioper ke generateQuestions(). Dengan begitu
 * logikanya mudah diuji di terminal tanpa menjalankan Next.js.
 *
 * Dua aturan utama:
 * 1. Soal tidak saling membocorkan. Setiap soal mencatat "fakta" yang ditanyakan
 *    atau disebut di penjelasannya (orang, jabatan, sub divisi, kode divisi).
 *    Soal lain yang menyentuh fakta yang sama tidak dipakai di sesi yang sama.
 *    Contoh: setelah "Siapa Kepala Divisi DPSB?" tidak akan muncul "Hidayat menjabat sebagai apa?".
 * 2. Pengecoh dibuat mirip: kode divisi yang mirip (DKKT/DKAT/DKTK), karyawan dari divisi
 *    yang sama, nama sub divisi yang mirip, nama gabungan palsu, atau urutan nama dibalik.
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
  | "kode"
  | "subdiv_member"
  | "subdiv_not_member"
  | "subdiv_owner"
  | "official_of_position"
  | "position_of_official"
  | "official_division"
  | "not_official_of_division"
  | "true_false"
  | "subdiv_count"
  | "boss_of"
  | "colleague"
  | "blank_kepanjangan"
  | "blank_subdiv"
  | "not_division_head"
  | "division_of_subs"
  | "statement_true"
  | "statement_false"
  // soal jebakan
  | "trick_swapped_name"
  | "trick_wrong_level"
  | "trick_wrong_division"
  | "trick_fake_division"
  | "trick_fake_code_head"
  | "trick_fake_code_kepanjangan"
  | "trick_hybrid_subdiv"
  | "trick_number_overflow"
  | "trick_spot_fake_subdiv"
  // soal rahasia DPSB, hanya untuk nama pemain tertentu
  | "easter_egg";

export type Question = {
  key: string; // identitas unik untuk mencegah soal duplikat dalam satu sesi
  /** fakta yang ditanyakan atau dibocorkan soal ini; satu fakta hanya dipakai satu soal per sesi */
  facts: string[];
  type: QuestionType;
  divisionId: number;
  prompt: string;
  options: string[];
  answerIndex: number; // RAHASIA, hanya disimpan di server
  explanation: string; // ditampilkan setelah menjawab dan di halaman review
  /** semua opsi dianggap benar (soal easter egg) */
  allCorrect?: boolean;
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
  /** sisipkan soal easter egg DPSB; aktif jika nama pemain cocok, lihat isEasterEggName() */
  easterEgg?: boolean;
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

/** Urutkan dari skor tertinggi. Skor yang sama atau berdekatan diacak supaya soal tidak monoton. */
function rankBy<T>(arr: T[], score: (x: T) => number, rng: Rng): T[] {
  return arr
    .map((x) => ({ x, s: score(x) + rng() }))
    .sort((a, b) => b.s - a.s)
    .map((e) => e.x);
}

/** Selang-seling beberapa daftar: [a1, b1, a2, b2, ...]. */
function interleave<T>(...lists: T[][]): T[] {
  const out: T[] = [];
  for (let i = 0; i < Math.max(...lists.map((l) => l.length)); i++)
    for (const l of lists) if (i < l.length) out.push(l[i]);
  return out;
}

const norm = (s: string) => s.trim().toLowerCase();

/** Nama-nama unik, tanpa nama yang dikecualikan. */
function uniqueNames(names: string[], exclude: string[] = []) {
  const seen = new Set(exclude.map(norm));
  return names.filter((n) => !seen.has(norm(n)) && (seen.add(norm(n)), true));
}

// ---------------------------------------------------------------------------
// Kemiripan teks, untuk memilih pengecoh yang meyakinkan
// ---------------------------------------------------------------------------

const IGNORED_WORDS = new Set(["dan", "divisi", "sub", "pmo", "of", "head", "co", "ii", "iii", "iv"]);

function words(text: string): Set<string> {
  return new Set(
    norm(text)
      .split(/[^a-z0-9]+/)
      .filter((w) => w.length > 1 && !IGNORED_WORDS.has(w)),
  );
}

function overlap(a: Set<string>, b: Set<string>) {
  let n = 0;
  for (const w of a) if (b.has(w)) n++;
  return n;
}

/** Makin besar makin mirip. DKKT paling mirip dengan DKAT dan DKTK. */
function codeSimilarity(a: string, b: string) {
  let prefix = 0;
  while (prefix < Math.min(a.length, b.length) && a[prefix] === b[prefix]) prefix++;
  let samePlace = 0;
  for (let i = 0; i < Math.min(a.length, b.length); i++) if (a[i] === b[i]) samePlace++;
  const shared = [...new Set(a)].filter((c) => b.includes(c)).length;
  return prefix * 2 + samePlace + shared - Math.abs(a.length - b.length);
}

// ---------------------------------------------------------------------------
// Nama palsu yang mirip aslinya
// ---------------------------------------------------------------------------

type Compound = { prefix: string; a: string; joiner: string; b: string };

/**
 * Memecah nama berbentuk "[Divisi|PMO] X dan Y" atau "X & Y".
 * Mengembalikan null jika tidak bisa dipecah dengan wajar: tanpa kata sambung,
 * lebih dari satu kata sambung, ada koma, atau berakhiran nomor ("Afiliasi I").
 */
function splitCompound(nama: string): Compound | null {
  const t = nama.trim();
  if (t.includes(",") || /\s(I|II|III|IV|V|\d+)$/.test(t)) return null;
  const m = /^((?:Divisi|PMO)\s+)?(.*)$/i.exec(t)!;
  const parts = m[2].split(/\s+(dan|&)\s+/i); // [X, kata sambung, Y]
  if (parts.length !== 3) return null;
  const [a, joiner, b] = parts;
  if (!a || !b || norm(a) === norm(b)) return null;
  return { prefix: m[1] ?? "", a, joiner, b };
}

/**
 * Membalik urutan nama: "Pengembangan SDM dan Manajemen Kinerja" → "Manajemen Kinerja dan Pengembangan SDM".
 * Awalan "Divisi"/"PMO" tetap di depan.
 */
export function swapName(nama: string): string | null {
  const c = splitCompound(nama);
  return c ? `${c.prefix}${c.b} ${c.joiner} ${c.a}` : null;
}

type Fake<T> = { nama: string; partner: T | null };

/**
 * Nama palsu dari `nama`: urutan dibalik ("Y dan X"), atau gabungan setengah nama ini
 * dengan setengah nama partner ("X dan B", "A dan Y"). Nama yang ternyata ada di `real` dibuang.
 * Contoh: DKAT "Komoditi Kopi dan Aneka Tanaman" + DKTK "Komoditi Teh dan Kemitraan"
 *         → "Komoditi Teh dan Aneka Tanaman".
 */
function fakeNames<T>(
  nama: string,
  partners: { nama: string; ref: T }[],
  real: Set<string>,
): Fake<T>[] {
  const own = splitCompound(nama);
  if (!own) return [];
  const out: Fake<T>[] = [];
  const seen = new Set([norm(nama)]);
  const add = (a: string, b: string, partner: T | null) => {
    const n = `${own.prefix}${a} ${own.joiner} ${b}`;
    if (norm(a) === norm(b) || seen.has(norm(n)) || real.has(norm(n))) return;
    seen.add(norm(n));
    out.push({ nama: n, partner });
  };
  add(own.b, own.a, null);
  for (const p of partners) {
    const c = splitCompound(p.nama);
    if (!c || norm(c.prefix) !== norm(own.prefix)) continue;
    add(own.a, c.b, p.ref);
    add(c.a, own.b, p.ref);
  }
  return out;
}

// ---------------------------------------------------------------------------
// Pembuat pilihan ganda
// ---------------------------------------------------------------------------

/** Opsi "Tidak ada". Selalu diletakkan di posisi terakhir. */
export const NONE_OPTION = "Tidak ada";

/**
 * Peluang "Tidak ada" ikut sebagai opsi SALAH di soal biasa. Tanpa ini pemain cepat belajar
 * bahwa "Tidak ada" selalu benar, karena opsi itu juga jawaban semua soal jebakan.
 */
const NONE_AS_DISTRACTOR = { official: 0.8, kode: 0.6, position: 0.4, division: 0.4 };

/**
 * Menyusun 1 jawaban benar + `n` distractor, lalu mengacak urutannya.
 * - `pool`    : calon distractor, URUT dari yang paling diutamakan (caller yang mengacak bila perlu)
 * - `exclude` : nilai yang juga benar dan TIDAK boleh muncul sebagai distractor
 * - `none`    : tambahkan "Tidak ada" di posisi terakhir sebagai opsi salah
 * Mengembalikan null jika distractor tidak cukup, sehingga template dilewati.
 */
function makeChoices(
  correct: string,
  pool: string[],
  rng: Rng,
  opts: { exclude?: string[]; n?: number; none?: boolean } = {},
): { options: string[]; answerIndex: number } | null {
  const n = opts.n ?? (opts.none ? 2 : 3);
  const blocked = new Set([norm(correct), norm(NONE_OPTION), ...(opts.exclude ?? []).map(norm)]);
  const distractors: string[] = [];
  for (const v of pool) {
    if (distractors.length >= n) break;
    if (blocked.has(norm(v))) continue;
    blocked.add(norm(v));
    distractors.push(v);
  }
  if (distractors.length < n) return null;

  const options = shuffle([correct, ...distractors], rng);
  if (opts.none) options.push(NONE_OPTION);
  return { options, answerIndex: options.indexOf(correct) };
}

/**
 * Opsi soal jebakan: `first` (pengecoh paling meyakinkan, selalu ikut) + pengecoh dari `pool`
 * sesuai urutan, lalu "Tidak ada" sebagai jawaban benar di posisi terakhir.
 */
function trickChoices(first: string[], pool: string[], rng: Rng) {
  const picked = uniqueNames(first).slice(0, 3);
  for (const n of uniqueNames(pool, [...picked, NONE_OPTION])) {
    if (picked.length >= 3) break;
    picked.push(n);
  }
  if (picked.length < 3) return null;
  const options = [...shuffle(picked, rng), NONE_OPTION];
  return { options, answerIndex: options.length - 1 };
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
  const officialsByDiv = groupBy(
    data.officials.filter((o) => posById.has(o.positionId)),
    (o) => posById.get(o.positionId)!.divisionId,
  );
  /** Semua jabatan seseorang (orang yang sama bisa merangkap). */
  const posOfPerson = new Map<string, Position[]>();
  for (const o of data.officials) {
    const p = posById.get(o.positionId);
    if (!p) continue;
    const k = norm(o.nama);
    posOfPerson.set(k, [...(posOfPerson.get(k) ?? []), p]);
  }

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
  /** Label + kode divisi bila label belum menyebutnya: "Kepala Sub Divisi Anggaran (DPAK)". */
  const labelWithDivision = (p: Position) => {
    const label = labelPosition(p);
    const kode = divById.get(p.divisionId)?.kode ?? "";
    return label.includes(kode) ? label : `${label} (${kode})`;
  };

  const divWords = new Map(
    data.divisions.map((d) => [
      d.id,
      words([d.kepanjangan, ...(subsByDiv.get(d.id) ?? []).map((s) => s.nama)].join(" ")),
    ]),
  );
  /** Nama yang benar-benar ada; nama palsu tidak boleh sama dengan salah satunya. */
  const real = {
    subs: new Set(data.subDivisions.map((s) => norm(s.nama))),
    divs: new Set(data.divisions.map((d) => norm(d.kepanjangan))),
    labels: new Set(data.positions.map((p) => norm(labelPosition(p)))),
  };

  const otherDivs = (d: Division) => data.divisions.filter((x) => x.id !== d.id);
  /** Divisi lain, dari yang kodenya paling mirip. */
  const similarByCode = (d: Division, rng: Rng) =>
    rankBy(otherDivs(d), (x) => codeSimilarity(d.kode, x.kode), rng);
  /** Divisi lain, dari yang nama dan sub divisinya paling mirip dengan `text`. */
  const similarByWords = (text: string, d: Division, rng: Rng) => {
    const w = words(text);
    return rankBy(
      otherDivs(d),
      (x) => overlap(w, divWords.get(x.id)!) * 2 + codeSimilarity(d.kode, x.kode) / 4,
      rng,
    );
  };
  /** Sub divisi milik divisi lain (dan namanya tidak kembar dengan milik `d`), dari yang paling mirip dengan `text`. */
  const similarSubs = (text: string, d: Division, rng: Rng) => {
    const w = words(text);
    const ownNames = new Set((subsByDiv.get(d.id) ?? []).map((s) => norm(s.nama)));
    return rankBy(
      data.subDivisions.filter((s) => s.divisionId !== d.id && !ownNames.has(norm(s.nama))),
      (s) => overlap(w, words(s.nama)) * 2 + overlap(w, divWords.get(s.divisionId)!),
      rng,
    );
  };

  const peopleOfDiv = (divisionId: number) =>
    uniqueNames((officialsByDiv.get(divisionId) ?? []).map((o) => o.nama));
  const divisionsOf = (nama: string) =>
    new Set((posOfPerson.get(norm(nama)) ?? []).map((p) => p.divisionId));

  return {
    divById,
    subById,
    posById,
    subsByDiv,
    posByDiv,
    officialsByPos,
    officialsByDiv,
    posOfPerson,
    labelPosition,
    labelWithDivision,
    divWords,
    real,
    similarByCode,
    similarByWords,
    similarSubs,
    peopleOfDiv,
    divisionsOf,
  };
}

// ---------------------------------------------------------------------------
// Fakta (untuk mencegah soal saling membocorkan)
// ---------------------------------------------------------------------------

const F = {
  kode: (d: Division) => `kode:${d.id}`, // pasangan kode ↔ kepanjangan
  sub: (s: SubDivision) => `sub:${s.id}`, // sub divisi ini milik divisi mana
  pos: (p: Position) => `pos:${p.id}`, // jabatan ini dijabat siapa
  person: (nama: string) => `person:${norm(nama)}`, // orang ini menjabat apa / di mana
};

const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * Mencari nama sub divisi, karyawan, label jabatan, dan kepanjangan divisi yang disebut
 * di sebuah teks, sebagai fakta. Contoh: setelah "Kepala Sub Divisi Anggaran dijabat
 * Nugraha Akbar" tampil, Anggaran tidak boleh lagi jadi jawaban "Manakah sub divisi DPAK?",
 * dan "Head of PMO Human Capital" membuka kepanjangan PMOHC.
 * Pencocokan per kata utuh, jadi "Aset I" tidak cocok dengan "Aset II"
 * dan "Ketua Tim Audit" tidak cocok dengan "Ketua Tim Audit II".
 */
function mentionFinder(data: OrgData, idx: Index) {
  const entries = [
    ...data.subDivisions.map((s) => ({ nama: s.nama, fact: F.sub(s) })),
    ...uniqueNames(data.officials.map((o) => o.nama)).map((nama) => ({ nama, fact: F.person(nama) })),
    ...data.positions.map((p) => ({ nama: idx.labelPosition(p), fact: F.pos(p) })),
    ...data.divisions.map((d) => ({ nama: d.kepanjangan, fact: F.kode(d) })),
  ]
    // nama terpanjang dicocokkan dulu lalu dihapus dari teks, supaya "Hidayat" tidak ikut
    // cocok di dalam "Puji Rahmat Hidayat"
    .sort((a, b) => b.nama.length - a.nama.length)
    .map((e) => ({
      ...e,
      re: new RegExp(
        `(^|[^\\p{L}\\p{N}])${escapeRegex(e.nama)}(?![\\p{L}\\p{N}])(?!\\s+(?:I|II|III|IV|V|\\d+)(?![\\p{L}\\p{N}]))`,
        "giu",
      ),
    }));
  return (text: string) => {
    const facts: string[] = [];
    for (const e of entries) {
      e.re.lastIndex = 0;
      if (!e.re.test(text)) continue;
      facts.push(e.fact);
      // jabatan menyebut nama sub divisinya; yang dihapus hanya nama orang
      if (e.fact.startsWith("person:")) text = text.replace(e.re, "$1 ");
    }
    return facts;
  };
}

/** mentionFinder dengan cache per teks; dipakai ulang selama objek data yang sama. */
const mentionCaches = new WeakMap<OrgData, (text: string) => string[]>();
function cachedMentions(data: OrgData, idx: Index) {
  let fn = mentionCaches.get(data);
  if (!fn) {
    const find = mentionFinder(data, idx);
    const cache = new Map<string, string[]>();
    fn = (text) => {
      if (!cache.has(text)) cache.set(text, find(text));
      return cache.get(text)!;
    };
    mentionCaches.set(data, fn);
  }
  return fn;
}

/** Fakta tentang seseorang: dirinya dan semua jabatannya. */
const personFacts = (idx: Index, nama: string) => [
  F.person(nama),
  ...(idx.posOfPerson.get(norm(nama)) ?? []).map(F.pos),
];

// ---------------------------------------------------------------------------
// Calon pengecoh
// ---------------------------------------------------------------------------

type Ctx = {
  data: OrgData;
  idx: Index;
  division: Division;
  rng: Rng;
  /** true jika teks menyebut orang/jabatan/sub divisi yang sudah terungkap di soal sebelumnya */
  stale: (text: string) => boolean;
};

/**
 * Pengecoh yang sudah terungkap mudah dicoret (misalnya Kepala Divisi yang baru saja
 * jadi jawaban soal lain), jadi taruh di belakang. Urutan sisanya tetap.
 */
const freshFirst = (list: string[], stale: Ctx["stale"]) => [
  ...list.filter((s) => !stale(s)),
  ...list.filter((s) => stale(s)),
];

/** Kepanjangan menyebut kodenya sendiri ("Project Manager PMN"), soal kode/kepanjangan jadi terlalu mudah. */
const mentionsCode = (d: Division) => words(d.kepanjangan).has(norm(d.kode));

/** Jabatan Kepala Sub Divisi (atau setara) di divisi ini yang sudah ada karyawannya. */
function filledSubPositions(idx: Index, division: Division) {
  return (idx.posByDiv.get(division.id) ?? []).filter(
    (p) => p.subDivisionId && idx.officialsByPos.get(p.id)?.length,
  );
}

/**
 * Pengecoh untuk "siapa pemegang jabatan `pos`": dua rekan satu divisi (atasan/rekan selevel),
 * lalu karyawan selevel di divisi yang kodenya mirip, lalu siapa saja.
 */
function peoplePool({ data, idx, rng, stale }: Ctx, pos: Position, exclude: string[]) {
  const division = idx.divById.get(pos.divisionId)!;
  const sameDiv = shuffle(uniqueNames(idx.peopleOfDiv(division.id), exclude), rng)
    .filter((n) => !stale(n))
    .slice(0, 2);
  const divRank = new Map(idx.similarByCode(division, rng).map((d, i) => [d.id, i]));
  const sameLevel = data.positions
    .filter((p) => p.divisionId !== pos.divisionId && p.level === pos.level)
    .sort((a, b) => divRank.get(a.divisionId)! - divRank.get(b.divisionId)!)
    .flatMap((p) => idx.officialsByPos.get(p.id) ?? [])
    .map((o) => o.nama);
  const any = shuffle(data.officials.map((o) => o.nama), rng);
  return freshFirst([...sameDiv, ...sameLevel, ...any], stale);
}

/** Label jabatan palsu dengan nama sub divisi dibalik, atau null. */
function swappedLabel(idx: Index, pos: Position) {
  const sub = pos.subDivisionId ? idx.subById.get(pos.subDivisionId) : undefined;
  const swapped = sub && swapName(sub.nama);
  if (!swapped || idx.real.subs.has(norm(swapped))) return null;
  return `${pos.namaJabatan} ${swapped}`;
}

/**
 * Pengecoh untuk "X menjabat sebagai apa": kadang label palsu (nama dibalik),
 * jabatan lain di divisi yang sama, lalu jabatan selevel di divisi yang kodenya mirip.
 */
function labelPool({ data, idx, rng, stale }: Ctx, pos: Position) {
  const division = idx.divById.get(pos.divisionId)!;
  const fake = rng() < 0.5 ? swappedLabel(idx, pos) : null;
  const sameDiv = shuffle(
    (idx.posByDiv.get(division.id) ?? []).filter((p) => p.id !== pos.id),
    rng,
  )
    .map(idx.labelPosition)
    .filter((l) => !stale(l))
    .slice(0, 2);
  const divRank = new Map(idx.similarByCode(division, rng).map((d, i) => [d.id, i]));
  const sameLevel = data.positions
    .filter((p) => p.divisionId !== pos.divisionId && p.level === pos.level)
    .sort((a, b) => divRank.get(a.divisionId)! - divRank.get(b.divisionId)!)
    .map(idx.labelPosition);
  const any = shuffle(data.positions.map(idx.labelPosition), rng);
  return { fake, pool: [...(fake ? [fake] : []), ...freshFirst([...sameDiv, ...sameLevel, ...any], stale)] };
}

// ---------------------------------------------------------------------------
// Template soal
// ---------------------------------------------------------------------------

type Template = {
  type: QuestionType;
  weight: number;
  /** soal jebakan (jawabannya "Tidak ada"); jumlahnya per sesi dibatasi bersama */
  trap?: boolean;
  /** batas per sesi untuk tipe ini; default memakai batas umum per tipe */
  max?: number;
  build: (ctx: Ctx) => Question | null;
};

const TEMPLATES: Template[] = [
  // Apa kepanjangan dari DKAT?  (pengecoh: nama gabungan palsu + kepanjangan divisi berkode mirip)
  {
    type: "kepanjangan",
    weight: 1,
    build: ({ idx, division: d, rng, stale }) => {
      if (mentionsCode(d)) return null;
      const similar = idx.similarByCode(d, rng);
      const fakes = shuffle(
        fakeNames(
          d.kepanjangan,
          similar.slice(0, 6).map((x) => ({ nama: x.kepanjangan, ref: x })),
          idx.real.divs,
        ),
        rng,
      )
        .slice(0, rng() < 0.5 ? 1 : 2)
        .map((f) => f.nama);
      const mc = makeChoices(d.kepanjangan, [...fakes, ...freshFirst(similar.map((x) => x.kepanjangan), stale)], rng, {
        none: rng() < NONE_AS_DISTRACTOR.kode,
      });
      if (!mc) return null;
      return {
        key: `kepanjangan:${d.id}`,
        facts: [F.kode(d)],
        type: "kepanjangan",
        divisionId: d.id,
        prompt: `Apa kepanjangan dari ${d.kode}?`,
        ...mc,
        explanation: `${d.kode} adalah singkatan dari ${d.kepanjangan}.`,
      };
    },
  },

  // Apa singkatan dari "Divisi Komoditi Kopi dan Aneka Tanaman"?  (pengecoh: DKKT, DKTK)
  {
    type: "kode",
    weight: 1,
    build: ({ idx, division: d, rng }) => {
      if (mentionsCode(d)) return null;
      const none = rng() < NONE_AS_DISTRACTOR.kode;
      const mc = makeChoices(d.kode, idx.similarByCode(d, rng).map((x) => x.kode), rng, { none });
      if (!mc) return null;
      return {
        key: `kode:${d.id}`,
        facts: [F.kode(d)],
        type: "kode",
        divisionId: d.id,
        prompt: `Apa singkatan dari "${d.kepanjangan}"?`,
        ...mc,
        explanation: `"${d.kepanjangan}" disingkat ${d.kode}.`,
      };
    },
  },

  // Manakah yang termasuk sub divisi DPSB?  (pengecoh: sub divisi lain yang namanya mirip)
  {
    type: "subdiv_member",
    weight: 1.5,
    build: ({ idx, division: d, rng, stale }) => {
      const own = idx.subsByDiv.get(d.id) ?? [];
      if (!own.length) return null;
      const target = pick(own, rng);
      // sesekali satu nama palsu dari sub divisi sendiri yang dibalik/digabung
      const fake =
        rng() < 0.5
          ? pick(
              own
                .filter((s) => s.id !== target.id && !stale(s.nama))
                .flatMap((s) =>
                  fakeNames(
                    s.nama,
                    own.filter((o) => o.id !== s.id).map((o) => ({ nama: o.nama, ref: o })),
                    idx.real.subs,
                  ),
                ),
              rng,
            )
          : undefined;
      const similar = idx.similarSubs(`${d.kepanjangan} ${target.nama}`, d, rng);
      const mc = makeChoices(
        target.nama,
        [...(fake ? [fake.nama] : []), ...freshFirst(similar.map((s) => s.nama), stale)],
        rng,
        { exclude: own.map((s) => s.nama) },
      );
      if (!mc) return null;

      // sub divisi yang tampil sebagai opsi salah sudah "terbuka" bukan milik divisi ini
      const facts = [
        F.sub(target),
        ...similar.filter((s) => mc.options.includes(s.nama)).map(F.sub),
      ];
      // penjelasan menyebut pengecoh paling menjebak
      let note = "";
      if (fake && mc.options.includes(fake.nama)) {
        note = ` "${fake.nama}" tidak ada, itu nama sub divisi ${d.kode} yang diubah.`;
      } else {
        const near = similar.find((s) => mc.options.includes(s.nama))!;
        note = ` ${near.nama} milik ${idx.divById.get(near.divisionId)!.kode}.`;
      }
      return {
        key: `subdiv_member:${d.id}:${target.id}`,
        facts,
        type: "subdiv_member",
        divisionId: d.id,
        prompt: `Manakah yang termasuk sub divisi dari ${d.kode}?`,
        ...mc,
        explanation: `${target.nama} berada di bawah ${d.kode}.${note}`,
      };
    },
  },

  // Manakah yang BUKAN sub divisi DPSB?  (jawaban: sub divisi lain yang namanya paling mirip)
  {
    type: "subdiv_not_member",
    weight: 1.5,
    build: ({ idx, division: d, rng }) => {
      const own = idx.subsByDiv.get(d.id) ?? [];
      if (own.length < 3) return null;
      const outsiders = idx.similarSubs(
        [d.kepanjangan, ...own.map((s) => s.nama)].join(" "),
        d,
        rng,
      );
      if (!outsiders.length) return null;
      const correct = pick(outsiders.slice(0, 3), rng);
      const insiders = shuffle(own, rng).slice(0, 3);
      const options = shuffle([correct.nama, ...insiders.map((s) => s.nama)], rng);
      return {
        key: `subdiv_not:${d.id}:${correct.id}`,
        facts: [F.sub(correct), ...insiders.map(F.sub)],
        type: "subdiv_not_member",
        divisionId: d.id,
        prompt: `Manakah yang BUKAN sub divisi dari ${d.kode}?`,
        options,
        answerIndex: options.indexOf(correct.nama),
        explanation: `${correct.nama} berada di bawah ${idx.divById.get(correct.divisionId)!.kode}, bukan ${d.kode}.`,
      };
    },
  },

  // Sub divisi "Manajemen Kinerja Korporasi" berada di bawah divisi apa?
  {
    type: "subdiv_owner",
    weight: 1.5,
    build: ({ data, idx, division: d, rng }) => {
      const own = idx.subsByDiv.get(d.id) ?? [];
      if (!own.length) return null;
      const target = pick(own, rng);
      // nama kembar di divisi lain membuat jawabannya ganda
      if (data.subDivisions.some((s) => s.divisionId !== d.id && norm(s.nama) === norm(target.nama)))
        return null;
      const pool = interleave(
        idx.similarByWords(target.nama, d, rng).map((x) => x.kode),
        idx.similarByCode(d, rng).map((x) => x.kode),
      );
      const mc = makeChoices(d.kode, pool, rng, { none: rng() < NONE_AS_DISTRACTOR.division });
      if (!mc) return null;
      return {
        key: `subdiv_owner:${target.id}`,
        facts: [F.sub(target)],
        type: "subdiv_owner",
        divisionId: d.id,
        prompt: `Sub divisi "${target.nama}" berada di bawah divisi apa?`,
        ...mc,
        explanation: `${target.nama} berada di bawah ${d.kode}.`,
      };
    },
  },

  // Siapa yang menjabat sebagai Kepala Sub Divisi Anggaran?
  // (pengecoh: atasan & rekan satu divisi, karyawan selevel di divisi berkode mirip, kadang "Tidak ada")
  {
    type: "official_of_position",
    weight: 3,
    build: (ctx) => {
      const { idx, division: d, rng } = ctx;
      const filled = (idx.posByDiv.get(d.id) ?? []).filter(
        (p) => idx.officialsByPos.get(p.id)?.length,
      );
      if (!filled.length) return null;
      const pos = pick(filled, rng);
      const holders = idx.officialsByPos.get(pos.id)!.map((o) => o.nama);
      const correct = pick(holders, rng);
      const none = rng() < NONE_AS_DISTRACTOR.official;
      const mc = makeChoices(correct, peoplePool(ctx, pos, holders), rng, {
        exclude: holders,
        none,
      });
      if (!mc) return null;

      // sesekali kode divisi ikut disebut, supaya format "... di XXXX" tidak selalu berarti jebakan
      const sub = pos.subDivisionId ? idx.subById.get(pos.subDivisionId) : undefined;
      const withDivision = !!sub && rng() < 0.4;
      const label = idx.labelPosition(pos);
      return {
        key: `official_of:${pos.id}`,
        facts: [F.pos(pos), ...holders.map(F.person), ...(withDivision ? [F.sub(sub)] : [])],
        type: "official_of_position",
        divisionId: d.id,
        prompt: `Siapa yang menjabat sebagai ${label}${withDivision ? ` di ${d.kode}` : ""}?`,
        ...mc,
        explanation: `${label} saat ini dijabat oleh ${correct}.`,
      };
    },
  },

  // Yunanto Nurhascaryo menjabat sebagai apa?
  // (pengecoh: nama sub divisi dibalik, jabatan lain di divisi yang sama, jabatan selevel)
  {
    type: "position_of_official",
    weight: 2,
    build: (ctx) => {
      const { idx, division: d, rng } = ctx;
      const officials = idx.officialsByDiv.get(d.id) ?? [];
      if (!officials.length) return null;
      const official = pick(officials, rng);
      const pos = idx.posById.get(official.positionId)!;
      const correct = idx.labelPosition(pos);
      const allLabels = (idx.posOfPerson.get(norm(official.nama)) ?? []).map(idx.labelPosition);
      const { fake, pool } = labelPool(ctx, pos);
      const none = rng() < NONE_AS_DISTRACTOR.position;
      const mc = makeChoices(correct, pool, rng, { exclude: allLabels, none });
      if (!mc) return null;
      const note =
        fake && mc.options.includes(fake) ? ` Hati-hati, "${fake}" urutan namanya terbalik.` : "";
      return {
        key: `position_of:${official.id}`,
        facts: personFacts(idx, official.nama),
        type: "position_of_official",
        divisionId: d.id,
        prompt: `${official.nama} menjabat sebagai apa?`,
        ...mc,
        explanation: `${official.nama} menjabat sebagai ${allLabels.join(" dan ")}.${note}`,
      };
    },
  },

  // Hendra Putra bertugas di divisi mana?  (pengecoh: kode yang mirip)
  {
    type: "official_division",
    weight: 1.5,
    build: ({ data, idx, division: d, rng }) => {
      const people = idx.peopleOfDiv(d.id);
      if (!people.length) return null;
      const nama = pick(people, rng);
      const divs = idx.divisionsOf(nama);
      const pool = interleave(
        idx.similarByCode(d, rng).map((x) => x.kode),
        shuffle(data.divisions, rng).map((x) => x.kode),
      );
      const mc = makeChoices(d.kode, pool, rng, {
        exclude: [...divs].map((id) => idx.divById.get(id)!.kode),
        none: rng() < NONE_AS_DISTRACTOR.division,
      });
      if (!mc) return null;
      const positions = idx.posOfPerson.get(norm(nama)) ?? [];
      return {
        key: `official_division:${norm(nama)}`,
        facts: personFacts(idx, nama),
        type: "official_division",
        divisionId: d.id,
        prompt: `${nama} bertugas di divisi mana?`,
        ...mc,
        explanation: `${nama} menjabat sebagai ${positions.map(idx.labelWithDivision).join(" dan ")}.`,
      };
    },
  },

  // Siapa yang BUKAN karyawan di DKKT?  (jawaban: karyawan divisi berkode mirip)
  {
    type: "not_official_of_division",
    weight: 1,
    build: ({ idx, division: d, rng }) => {
      const insiders = shuffle(idx.peopleOfDiv(d.id), rng).slice(0, 3);
      if (insiders.length < 3) return null;
      const candidates = idx
        .similarByCode(d, rng)
        .slice(0, 4)
        .flatMap((x) => idx.peopleOfDiv(x.id))
        .filter((n) => !idx.divisionsOf(n).has(d.id));
      if (!candidates.length) return null;
      const outsider = pick(candidates, rng);
      const options = shuffle([outsider, ...insiders], rng);
      const outPositions = idx.posOfPerson.get(norm(outsider))!;
      return {
        key: `not_official:${d.id}:${norm(outsider)}`,
        facts: [...personFacts(idx, outsider), ...insiders.map(F.person)],
        type: "not_official_of_division",
        divisionId: d.id,
        prompt: `Siapa yang BUKAN karyawan di ${d.kode}?`,
        options,
        answerIndex: options.indexOf(outsider),
        explanation: `${outsider} menjabat sebagai ${outPositions.map(idx.labelWithDivision).join(" dan ")}. Tiga lainnya karyawan ${d.kode}.`,
      };
    },
  },

  // Benar atau salah: ... (sub divisi, jabatan seseorang, atau kepanjangan; versi salahnya dibuat mirip)
  {
    type: "true_false",
    weight: 1.2,
    build: (ctx) => {
      const { idx, division: d, rng } = ctx;
      const isTrue = rng() < 0.5;
      const tf = (q: Omit<Question, "type" | "divisionId" | "options" | "answerIndex">): Question => ({
        ...q,
        type: "true_false",
        divisionId: d.id,
        options: ["Benar", "Salah"],
        answerIndex: isTrue ? 0 : 1,
      });

      const variants: (() => Question | null)[] = [
        // "Kemitraan Strategis" adalah sub divisi dari DKKT.
        () => {
          const own = idx.subsByDiv.get(d.id) ?? [];
          if (!own.length) return null;
          const sub = isTrue
            ? pick(own, rng)
            : pick(
                idx.similarSubs([d.kepanjangan, ...own.map((s) => s.nama)].join(" "), d, rng).slice(0, 3),
                rng,
              );
          if (!sub) return null;
          return tf({
            key: `tf_sub:${d.id}:${sub.id}`,
            facts: [F.sub(sub)],
            prompt: `Benar atau salah: "${sub.nama}" adalah sub divisi dari ${d.kode}.`,
            explanation: isTrue
              ? `Benar, ${sub.nama} berada di bawah ${d.kode}.`
              : `Salah, ${sub.nama} berada di bawah ${idx.divById.get(sub.divisionId)!.kode}.`,
          });
        },
        // Nugraha Akbar adalah Kepala Divisi DPAK.
        () => {
          const officials = idx.officialsByDiv.get(d.id) ?? [];
          if (!officials.length) return null;
          const official = pick(officials, rng);
          const pos = idx.posById.get(official.positionId)!;
          const allLabels = (idx.posOfPerson.get(norm(official.nama)) ?? []).map(idx.labelPosition);
          const stated = isTrue
            ? idx.labelPosition(pos)
            : uniqueNames(labelPool(ctx, pos).pool, allLabels)[0];
          if (!stated) return null;
          return tf({
            key: `tf_person:${official.id}:${norm(stated)}`,
            facts: personFacts(idx, official.nama),
            prompt: `Benar atau salah: ${official.nama} adalah ${stated}.`,
            explanation: `${isTrue ? "Benar" : "Salah"}, ${official.nama} menjabat sebagai ${allLabels.join(" dan ")}.`,
          });
        },
        // DKAT adalah singkatan dari Divisi Komoditi Teh dan Aneka Tanaman.
        () => {
          if (mentionsCode(d)) return null;
          const similar = idx.similarByCode(d, rng);
          const wrong = [
            ...fakeNames(
              d.kepanjangan,
              similar.slice(0, 4).map((x) => ({ nama: x.kepanjangan, ref: x })),
              idx.real.divs,
            ).map((f) => ({ nama: f.nama, owner: null as Division | null })),
            ...similar.slice(0, 2).map((x) => ({ nama: x.kepanjangan, owner: x as Division | null })),
          ];
          const stated = isTrue ? { nama: d.kepanjangan, owner: null } : pick(wrong, rng);
          const owner = stated.owner;
          return tf({
            key: `tf_kode:${d.id}:${norm(stated.nama)}`,
            facts: [F.kode(d), ...(owner ? [F.kode(owner)] : [])],
            prompt: `Benar atau salah: ${d.kode} adalah singkatan dari ${stated.nama}.`,
            explanation: isTrue
              ? `Benar, ${d.kode} adalah singkatan dari ${d.kepanjangan}.`
              : `Salah, ${d.kode} adalah singkatan dari ${d.kepanjangan}.${owner ? ` ${owner.kepanjangan} disingkat ${owner.kode}.` : ""}`,
          });
        },
      ];
      for (const v of shuffle(variants, rng)) {
        const q = v();
        if (q) return q;
      }
      return null;
    },
  },

  // ---------------- Soal jebakan: jawabannya "Tidak ada" ----------------

  // Siapa yang menjabat sebagai Kepala Sub Divisi Manajemen Kinerja dan Pengembangan SDM?
  // Nama aslinya "Pengembangan SDM dan Manajemen Kinerja", urutannya dibalik.
  {
    type: "trick_swapped_name",
    weight: 1,
    max: 1,
    trap: true,
    build: (ctx) => {
      const { idx, division: d, rng } = ctx;
      const candidates = filledSubPositions(idx, d).filter((p) => swappedLabel(idx, p));
      if (!candidates.length) return null;
      const pos = pick(candidates, rng);
      const sub = idx.subById.get(pos.subDivisionId!)!;
      const holders = idx.officialsByPos.get(pos.id)!.map((o) => o.nama);
      const holder = pick(holders, rng);
      const mc = trickChoices([holder], peoplePool(ctx, pos, holders), rng);
      if (!mc) return null;
      return {
        key: `trick_swap:${pos.id}`,
        facts: [F.pos(pos), ...holders.map(F.person)],
        type: "trick_swapped_name",
        divisionId: d.id,
        prompt: `Siapa yang menjabat sebagai ${swappedLabel(idx, pos)}?`,
        ...mc,
        explanation: `Tidak ada jabatan bernama "${swappedLabel(idx, pos)}", urutannya terbalik. Yang benar ${pos.namaJabatan} ${sub.nama}, dijabat ${holder}.`,
      };
    },
  },

  // Siapa yang menjabat sebagai Kepala Divisi Pengembangan SDM dan Manajemen Kinerja?
  // Itu sub divisi, jadi tidak ada Kepala Divisi-nya.
  {
    type: "trick_wrong_level",
    weight: 1,
    max: 1,
    trap: true,
    build: ({ data, idx, division: d, rng, stale }) => {
      const candidates = filledSubPositions(idx, d).filter((p) => {
        const sub = idx.subById.get(p.subDivisionId!)!;
        // lewati jika "Divisi <nama sub>" ternyata memang nama sebuah divisi
        return p.namaJabatan === "Kepala Sub Divisi" && !idx.real.divs.has(norm(`Divisi ${sub.nama}`));
      });
      if (!candidates.length) return null;
      const pos = pick(candidates, rng);
      const sub = idx.subById.get(pos.subDivisionId!)!;
      const holders = idx.officialsByPos.get(pos.id)!.map((o) => o.nama);
      const holder = pick(holders, rng);

      // pengecoh: Kepala Sub Divisi aslinya, Kepala Divisi induknya, lalu Kepala Divisi lain yang kodenya mirip
      const headsOf = (divs: Division[]) =>
        divs.flatMap((x) =>
          (idx.posByDiv.get(x.id) ?? [])
            .filter((p) => p.namaJabatan === "Kepala Divisi")
            .flatMap((p) => idx.officialsByPos.get(p.id) ?? [])
            .map((o) => o.nama),
        );
      const mc = trickChoices(
        [holder, ...headsOf([d]).filter((n) => !stale(n))],
        freshFirst([...headsOf(idx.similarByCode(d, rng)), ...data.officials.map((o) => o.nama)], stale),
        rng,
      );
      if (!mc) return null;
      return {
        key: `trick_level:${pos.id}`,
        facts: [F.pos(pos), ...holders.map(F.person)],
        type: "trick_wrong_level",
        divisionId: d.id,
        prompt: `Siapa yang menjabat sebagai Kepala Divisi ${sub.nama}?`,
        ...mc,
        explanation: `Tidak ada jabatan "Kepala Divisi ${sub.nama}". ${sub.nama} adalah sub divisi di bawah ${d.kode}, dipimpin Kepala Sub Divisi ${holder}.`,
      };
    },
  },

  // Siapa yang menjabat sebagai Kepala Sub Divisi Anggaran di DAPJ?
  // Anggaran ada di DPAK, bukan DAPJ.
  {
    type: "trick_wrong_division",
    weight: 0.8,
    max: 1,
    trap: true,
    build: ({ data, idx, division: d, rng, stale }) => {
      const hasSub = (div: Division, nama: string) =>
        (idx.subsByDiv.get(div.id) ?? []).some((s) => norm(s.nama) === norm(nama));
      const isSubHead = (p: Position) =>
        p.namaJabatan === "Kepala Sub Divisi" && !!p.subDivisionId && !!idx.officialsByPos.get(p.id)?.length;

      const variants: (() => { pos: Position; decoy: Division } | null)[] = [
        // sub divisi milik divisi ini, ditanyakan di divisi lain yang kodenya mirip
        () => {
          const own = (idx.posByDiv.get(d.id) ?? []).filter(isSubHead);
          if (!own.length) return null;
          const pos = pick(own, rng);
          const sub = idx.subById.get(pos.subDivisionId!)!;
          const decoys = idx.similarByCode(d, rng).slice(0, 3).filter((x) => !hasSub(x, sub.nama));
          return decoys.length ? { pos, decoy: pick(decoys, rng) } : null;
        },
        // sub divisi milik divisi lain yang namanya mirip, ditanyakan di divisi ini
        () => {
          const foreign = rankBy(
            data.positions.filter((p) => p.divisionId !== d.id && isSubHead(p)),
            (p) => overlap(words(idx.subById.get(p.subDivisionId!)!.nama), idx.divWords.get(d.id)!) * 2,
            rng,
          )
            .slice(0, 3)
            .filter((p) => !hasSub(d, idx.subById.get(p.subDivisionId!)!.nama));
          return foreign.length ? { pos: pick(foreign, rng), decoy: d } : null;
        },
      ];

      for (const v of shuffle(variants, rng)) {
        const found = v();
        if (!found) continue;
        const { pos, decoy } = found;
        const sub = idx.subById.get(pos.subDivisionId!)!;
        const owner = idx.divById.get(pos.divisionId)!;
        const holders = idx.officialsByPos.get(pos.id)!.map((o) => o.nama);
        const holder = pick(holders, rng);
        // karyawan divisi umpan membuat pertanyaannya terasa wajar
        const pool = [
          ...shuffle(idx.peopleOfDiv(decoy.id), rng),
          ...data.officials.map((o) => o.nama),
        ];
        const mc = trickChoices([holder], freshFirst(pool, stale), rng);
        if (!mc) continue;
        return {
          key: `trick_div:${pos.id}:${decoy.id}`,
          facts: [F.pos(pos), F.sub(sub), ...holders.map(F.person)],
          type: "trick_wrong_division",
          divisionId: d.id,
          prompt: `Siapa yang menjabat sebagai Kepala Sub Divisi ${sub.nama} di ${decoy.kode}?`,
          ...mc,
          explanation: `Tidak ada. ${sub.nama} bukan sub divisi ${decoy.kode}, melainkan ${owner.kode}, dipimpin ${holder}.`,
        };
      }
      return null;
    },
  },

  // Apa singkatan dari "Divisi Komoditi Teh dan Aneka Tanaman"?
  // Nama itu gabungan DKAT dan DKTK, divisinya tidak ada.
  {
    type: "trick_fake_division",
    weight: 1,
    max: 1,
    trap: true,
    build: ({ idx, division: d, rng }) => {
      if (mentionsCode(d)) return null;
      const similar = idx.similarByCode(d, rng);
      const fakes = fakeNames(
        d.kepanjangan,
        similar.slice(0, 6).map((x) => ({ nama: x.kepanjangan, ref: x })),
        idx.real.divs,
      );
      if (!fakes.length) return null;
      const fake = pick(fakes, rng);
      const p = fake.partner;
      const mc = trickChoices(
        [d.kode, ...(p ? [p.kode] : [])],
        similar.map((x) => x.kode),
        rng,
      );
      if (!mc) return null;
      return {
        key: `trick_fake_div:${norm(fake.nama)}`,
        facts: [F.kode(d), ...(p ? [F.kode(p)] : [])],
        type: "trick_fake_division",
        divisionId: d.id,
        prompt: `Apa singkatan dari "${fake.nama}"?`,
        ...mc,
        explanation: p
          ? `Tidak ada divisi bernama "${fake.nama}". Nama itu gabungan dari ${d.kode} (${d.kepanjangan}) dan ${p.kode} (${p.kepanjangan}).`
          : `Tidak ada divisi bernama "${fake.nama}", urutannya terbalik. Yang benar "${d.kepanjangan}" (${d.kode}).`,
      };
    },
  },
];

// ---------------------------------------------------------------------------
// Pola tambahan: bantuan
// ---------------------------------------------------------------------------

const ROMAN = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII"];

/** ["A", "B", "C"] → "A, B dan C" */
const listJoin = (items: string[]) =>
  items.length < 2 ? items.join("") : `${items.slice(0, -1).join(", ")} dan ${items[items.length - 1]}`;

/** "Pengelolaan Aset II" → { base: "Pengelolaan Aset", n: 2 }. Tanpa nomor dianggap nomor 1. */
function splitNumber(nama: string) {
  const m = /^(.*\S)\s+(I|II|III|IV|V|VI|VII)$/.exec(nama.trim());
  return m ? { base: m[1], n: ROMAN.indexOf(m[2]) + 1 } : { base: nama.trim(), n: 1 };
}

/**
 * Kode palsu yang mirip kode asli: satu huruf diganti huruf yang lazim di posisi itu
 * (DKKT → DKAT sudah ada, jadi misalnya DKPT), atau dua huruf bersebelahan ditukar.
 */
function fakeCodes(d: Division, data: OrgData, rng: Rng): string[] {
  const real = new Set(data.divisions.map((x) => x.kode));
  const k = d.kode;
  const out = new Set<string>();
  for (let i = 1; i < k.length; i++) {
    for (const x of data.divisions) {
      const c = x.kode[i];
      if (c && c !== k[i]) out.add(k.slice(0, i) + c + k.slice(i + 1));
    }
    if (i < k.length - 1 && k[i] !== k[i + 1])
      out.add(k.slice(0, i) + k[i + 1] + k[i] + k.slice(i + 2));
  }
  return shuffle([...out].filter((c) => !real.has(c)), rng);
}

/** Karyawan yang memegang jabatan `p`. */
const holdersOf = (idx: Index, p: Position | undefined) =>
  p ? (idx.officialsByPos.get(p.id) ?? []).map((o) => o.nama) : [];

/** Jabatan pimpinan unit (level 1): Kepala Divisi, Head of PMO, Project Manager. */
const leaderPos = (idx: Index, divisionId: number) =>
  (idx.posByDiv.get(divisionId) ?? []).find((p) => p.level === 1);

const leadersOf = (idx: Index, divisionId: number) => holdersOf(idx, leaderPos(idx, divisionId));

/** Kepala Divisi saja (unit PMO memakai jabatan "Head of ..."). */
const kepalaDivisiOf = (idx: Index, divisionId: number) => {
  const p = leaderPos(idx, divisionId);
  return p?.namaJabatan === "Kepala Divisi" ? holdersOf(idx, p) : [];
};

const MASK = "___";
const MASK_SKIP = new Set(["dan", "divisi", "pmo", "sub", "head", "of", "co"]);
const isMaskable = (w: string) => /^[A-Za-z]{3,}$/.test(w) && !MASK_SKIP.has(norm(w));
/** Akronim (SDM, GCG) hanya diadu dengan akronim, kata biasa dengan kata biasa. */
const shapeOf = (w: string) => (/^[A-Z]+$/.test(w) ? "akronim" : "kata");
const tokensOf = (texts: string[]) => texts.flatMap((t) => t.split(/\s+/));

/**
 * Soal isian: satu kata dihilangkan ("Divisi Komoditi ___ dan Aneka Tanaman").
 * Pengecoh diambil dari `pool` sesuai urutan: kata berbentuk sama yang belum ada di nama itu
 * dan tidak membentuk nama lain yang benar-benar ada.
 */
function blankChoices(nama: string, pool: string[], real: Set<string>, rng: Rng) {
  const tokens = nama.split(/\s+/);
  const slots = tokens
    .map((_, i) => i)
    .filter(
      (i) =>
        isMaskable(tokens[i]) && tokens.filter((t) => norm(t) === norm(tokens[i])).length === 1,
    );
  if (!slots.length) return null;
  const i = pick(slots, rng);
  const word = tokens[i];
  const fill = (w: string) => tokens.map((t, j) => (j === i ? w : t)).join(" ");
  const present = new Set(tokens.map(norm));
  const candidates = pool.filter(
    (w) =>
      isMaskable(w) &&
      shapeOf(w) === shapeOf(word) &&
      !present.has(norm(w)) &&
      !real.has(norm(fill(w))),
  );
  const mc = makeChoices(word, candidates, rng);
  return mc ? { ...mc, masked: fill(MASK) } : null;
}

type Statement = { text: string; facts: string[]; note: string };

/**
 * Pernyataan benar dan salah tentang divisi `d`. Versi salahnya dibuat mirip:
 * jabatan tetangga, sub divisi divisi lain yang namanya mirip, kepanjangan gabungan palsu.
 */
function statements(ctx: Ctx) {
  const { idx, division: d, rng } = ctx;
  const trues: Statement[][] = [[], [], []];
  const falses: Statement[][] = [[], [], []];

  for (const nama of shuffle(idx.peopleOfDiv(d.id), rng)) {
    const positions = idx.posOfPerson.get(norm(nama))!;
    const own = positions.find((p) => p.divisionId === d.id)!;
    const labels = positions.map(idx.labelPosition);
    const facts = personFacts(idx, nama);
    trues[0].push({ text: `${nama} adalah ${idx.labelPosition(own)}`, facts, note: "" });
    const wrong = uniqueNames(labelPool(ctx, own).pool, labels)[0];
    if (wrong)
      falses[0].push({
        text: `${nama} adalah ${wrong}`,
        facts,
        note: `${nama} sebenarnya ${labels.join(" dan ")}.`,
      });
  }

  const own = idx.subsByDiv.get(d.id) ?? [];
  for (const s of shuffle(own, rng))
    trues[1].push({ text: `${s.nama} adalah sub divisi ${d.kode}`, facts: [F.sub(s)], note: "" });
  for (const s of idx.similarSubs([d.kepanjangan, ...own.map((x) => x.nama)].join(" "), d, rng).slice(0, 4))
    falses[1].push({
      text: `${s.nama} adalah sub divisi ${d.kode}`,
      facts: [F.sub(s)],
      note: `${s.nama} milik ${idx.divById.get(s.divisionId)!.kode}.`,
    });

  if (!mentionsCode(d)) {
    trues[2].push({
      text: `${d.kode} adalah singkatan dari ${d.kepanjangan}`,
      facts: [F.kode(d)],
      note: "",
    });
    const fakes = fakeNames(
      d.kepanjangan,
      idx.similarByCode(d, rng).slice(0, 4).map((x) => ({ nama: x.kepanjangan, ref: x })),
      idx.real.divs,
    );
    if (fakes.length)
      falses[2].push({
        text: `${d.kode} adalah singkatan dari ${pick(fakes, rng).nama}`,
        facts: [F.kode(d)],
        note: `${d.kode} adalah singkatan dari ${d.kepanjangan}.`,
      });
  }
  // selang-seling jenis pernyataan supaya opsi tidak semuanya tentang orang
  return { trues: interleave(...shuffle(trues, rng)), falses: interleave(...shuffle(falses, rng)) };
}

/** Ambil `n` pernyataan yang faktanya tidak saling tumpang tindih (satu orang tidak dibahas dua kali). */
function pickStatements(list: Statement[], n: number, taken: Set<string>) {
  const out: Statement[] = [];
  for (const s of list) {
    if (out.length >= n) break;
    if (s.facts.some((f) => taken.has(f))) continue;
    s.facts.forEach((f) => taken.add(f));
    out.push(s);
  }
  return out.length === n ? out : null;
}

// ---------------------------------------------------------------------------
// Pola tambahan: soal biasa
// ---------------------------------------------------------------------------

const MORE_TEMPLATES: Template[] = [
  // Ada berapa sub divisi di bawah DPSB?
  {
    type: "subdiv_count",
    // faktanya cuma satu per divisi, jadi dibuat jarang supaya tidak muncul di setiap sesi
    weight: 0.35,
    build: ({ idx, division: d, rng }) => {
      const n = (idx.subsByDiv.get(d.id) ?? []).length;
      if (n < 1) return null;
      // empat angka berurutan, posisi jawaban benar diacak (misalnya 2-3-4-5 atau 3-4-5-6)
      const start = Math.max(1, n - Math.floor(rng() * 4));
      const options = [0, 1, 2, 3].map((i) => `${start + i} sub divisi`);
      return {
        key: `subdiv_count:${d.id}`,
        facts: [`subcount:${d.id}`],
        type: "subdiv_count",
        divisionId: d.id,
        prompt: `Ada berapa sub divisi di bawah ${d.kode}?`,
        options,
        answerIndex: options.indexOf(`${n} sub divisi`),
        explanation: `${d.kode} membawahi ${n} sub divisi.`,
      };
    },
  },

  // Siapa atasan langsung Yunanto Nurhascaryo?  (pengecoh: rekan selevel, pimpinan divisi berkode mirip)
  {
    type: "boss_of",
    weight: 1,
    build: ({ idx, division: d, rng, stale }) => {
      const bosses = leadersOf(idx, d.id);
      if (!bosses.length) return null;
      const staff = uniqueNames(
        (idx.posByDiv.get(d.id) ?? [])
          .filter((p) => p.level === 2)
          .flatMap((p) => holdersOf(idx, p)),
      );
      if (!staff.length) return null;
      const person = pick(staff, rng);
      const boss = pick(bosses, rng);
      // orang yang merangkap punya lebih dari satu atasan; semuanya tidak boleh jadi pengecoh
      const allBosses = [...idx.divisionsOf(person)].flatMap((id) => leadersOf(idx, id));
      const peers = shuffle(staff.filter((n) => n !== person), rng).slice(0, 1);
      const otherLeaders = idx.similarByCode(d, rng).flatMap((x) => leadersOf(idx, x.id));
      const none = rng() < 0.35;
      const mc = makeChoices(boss, freshFirst([...peers, ...otherLeaders], stale), rng, {
        exclude: [...allBosses, person],
        none,
      });
      if (!mc) return null;
      const personPos = idx.posOfPerson.get(norm(person))!.find((p) => p.divisionId === d.id)!;
      return {
        key: `boss_of:${norm(person)}`,
        facts: [...personFacts(idx, person), ...personFacts(idx, boss)],
        type: "boss_of",
        divisionId: d.id,
        prompt: `Siapa atasan langsung ${person}?`,
        ...mc,
        explanation: `${person} adalah ${idx.labelWithDivision(personPos)}. Atasannya ${idx.labelWithDivision(leaderPos(idx, d.id)!)}, ${boss}.`,
      };
    },
  },

  // Siapa yang satu divisi dengan Farhan?  (pengecoh: karyawan divisi berkode mirip)
  {
    type: "colleague",
    weight: 1,
    build: ({ idx, division: d, rng, stale }) => {
      const people = shuffle(idx.peopleOfDiv(d.id), rng);
      if (people.length < 2) return null;
      const [a, b] = people;
      const aDivs = idx.divisionsOf(a);
      const pool = idx
        .similarByCode(d, rng)
        .flatMap((x) => shuffle(idx.peopleOfDiv(x.id), rng))
        .filter((n) => ![...idx.divisionsOf(n)].some((id) => aDivs.has(id)));
      const mc = makeChoices(b, freshFirst(pool, stale), rng, { exclude: [a] });
      if (!mc) return null;
      return {
        key: `colleague:${norm(a)}:${norm(b)}`,
        facts: [...personFacts(idx, a), ...personFacts(idx, b)],
        type: "colleague",
        divisionId: d.id,
        prompt: `Siapa yang satu divisi dengan ${a}?`,
        ...mc,
        explanation: `${a} dan ${b} sama-sama karyawan ${d.kode}.`,
      };
    },
  },

  // Lengkapi kepanjangan DKAT: "Divisi Komoditi ___ dan Aneka Tanaman"
  {
    type: "blank_kepanjangan",
    weight: 1,
    build: ({ data, idx, division: d, rng }) => {
      if (mentionsCode(d)) return null;
      const pool = [
        ...tokensOf(idx.similarByCode(d, rng).map((x) => x.kepanjangan)),
        ...shuffle(tokensOf(data.subDivisions.map((s) => s.nama)), rng),
      ];
      const mc = blankChoices(d.kepanjangan, pool, idx.real.divs, rng);
      if (!mc) return null;
      const { masked, ...choices } = mc;
      return {
        key: `blank_kep:${d.id}`,
        facts: [F.kode(d)],
        type: "blank_kepanjangan",
        divisionId: d.id,
        prompt: `Lengkapi kepanjangan ${d.kode}: "${masked}"`,
        ...choices,
        explanation: `${d.kode} adalah singkatan dari ${d.kepanjangan}.`,
      };
    },
  },

  // Lengkapi nama sub divisi di DPSB: "Manajemen Talenta dan ___ Tenaga Kerja"
  {
    type: "blank_subdiv",
    weight: 1,
    build: ({ idx, division: d, rng }) => {
      const own = (idx.subsByDiv.get(d.id) ?? []).filter((s) => s.nama.split(/\s+/).length >= 2);
      if (!own.length) return null;
      const target = pick(own, rng);
      const pool = [
        ...tokensOf(shuffle(own.filter((s) => s.id !== target.id), rng).map((s) => s.nama)),
        ...tokensOf(idx.similarSubs(target.nama, d, rng).slice(0, 8).map((s) => s.nama)),
        ...tokensOf([d.kepanjangan]),
      ];
      const mc = blankChoices(target.nama, pool, idx.real.subs, rng);
      if (!mc) return null;
      const { masked, ...choices } = mc;
      return {
        key: `blank_sub:${target.id}`,
        facts: [F.sub(target)],
        type: "blank_subdiv",
        divisionId: d.id,
        prompt: `Lengkapi nama sub divisi di ${d.kode}: "${masked}"`,
        ...choices,
        explanation: `Nama lengkapnya "${target.nama}".`,
      };
    },
  },

  // Manakah yang BUKAN seorang Kepala Divisi?  (jawaban: Kepala Sub Divisi; pengecoh: Kepala Divisi berkode mirip)
  {
    type: "not_division_head",
    weight: 1,
    build: ({ idx, division: d, rng, stale }) => {
      const isKepalaDivisi = (nama: string) =>
        (idx.posOfPerson.get(norm(nama)) ?? []).some((p) => p.namaJabatan === "Kepala Divisi");
      const candidates = idx.peopleOfDiv(d.id).filter((n) => !isKepalaDivisi(n));
      if (!candidates.length) return null;
      const odd = pick(candidates, rng);
      const heads = freshFirst(
        uniqueNames([
          ...kepalaDivisiOf(idx, d.id),
          ...idx.similarByCode(d, rng).flatMap((x) => kepalaDivisiOf(idx, x.id)),
        ]),
        stale,
      ).slice(0, 3);
      if (heads.length < 3) return null;
      const options = shuffle([odd, ...heads], rng);
      return {
        key: `not_head:${norm(odd)}`,
        facts: [...personFacts(idx, odd), ...heads.flatMap((h) => personFacts(idx, h))],
        type: "not_division_head",
        divisionId: d.id,
        prompt: "Manakah yang BUKAN seorang Kepala Divisi?",
        options,
        answerIndex: options.indexOf(odd),
        explanation: `${odd} menjabat sebagai ${idx.posOfPerson.get(norm(odd))!.map(idx.labelWithDivision).join(" dan ")}. Tiga lainnya Kepala Divisi.`,
      };
    },
  },

  // Divisi mana yang membawahi sub divisi "Anggaran" dan "Perbendaharaan, Kas dan Bank"?
  {
    type: "division_of_subs",
    weight: 1,
    build: ({ idx, division: d, rng, stale }) => {
      const own = shuffle(idx.subsByDiv.get(d.id) ?? [], rng);
      if (own.length < 2) return null;
      const [x, y] = own;
      const text = `${x.nama} ${y.nama}`;
      const fake =
        rng() < 0.4
          ? fakeNames(
              d.kepanjangan,
              idx.similarByCode(d, rng).slice(0, 4).map((v) => ({ nama: v.kepanjangan, ref: v })),
              idx.real.divs,
            )[0]?.nama
          : undefined;
      const pool = interleave(
        idx.similarByWords(text, d, rng).map((v) => v.kepanjangan),
        idx.similarByCode(d, rng).map((v) => v.kepanjangan),
      );
      const mc = makeChoices(
        d.kepanjangan,
        [...(fake ? [fake] : []), ...freshFirst(pool, stale)],
        rng,
      );
      if (!mc) return null;
      return {
        key: `division_of_subs:${d.id}`,
        facts: [F.sub(x), F.sub(y), F.kode(d)],
        type: "division_of_subs",
        divisionId: d.id,
        prompt: `Divisi mana yang membawahi sub divisi "${x.nama}" dan "${y.nama}"?`,
        ...mc,
        explanation: `${x.nama} dan ${y.nama} berada di bawah ${d.kepanjangan} (${d.kode}).`,
      };
    },
  },

  // Pernyataan mana yang BENAR tentang DPSB?  (1 benar, 3 salah yang mirip)
  {
    type: "statement_true",
    weight: 1,
    build: (ctx) => {
      const d = ctx.division;
      const { trues, falses } = statements(ctx);
      const taken = new Set<string>();
      const t = pickStatements(trues, 1, taken);
      const f = t && pickStatements(falses, 3, taken);
      if (!t || !f) return null;
      const options = shuffle([t[0].text, ...f.map((s) => s.text)], ctx.rng);
      return {
        key: `stmt_true:${d.id}:${norm(t[0].text)}`,
        facts: [...taken],
        type: "statement_true",
        divisionId: d.id,
        prompt: `Pernyataan mana yang BENAR tentang ${d.kode}?`,
        options,
        answerIndex: options.indexOf(t[0].text),
        explanation: `Yang benar: ${t[0].text}. ${f.map((s) => s.note).join(" ")}`,
      };
    },
  },

  // Pernyataan mana yang SALAH tentang DPSB?  (3 benar, 1 salah yang mirip)
  {
    type: "statement_false",
    weight: 1,
    build: (ctx) => {
      const d = ctx.division;
      const { trues, falses } = statements(ctx);
      const taken = new Set<string>();
      const f = pickStatements(falses, 1, taken);
      const t = f && pickStatements(trues, 3, taken);
      if (!t || !f) return null;
      const options = shuffle([f[0].text, ...t.map((s) => s.text)], ctx.rng);
      return {
        key: `stmt_false:${d.id}:${norm(f[0].text)}`,
        facts: [...taken],
        type: "statement_false",
        divisionId: d.id,
        prompt: `Pernyataan mana yang SALAH tentang ${d.kode}?`,
        options,
        answerIndex: options.indexOf(f[0].text),
        explanation: `Yang salah: ${f[0].text}. ${f[0].note}`,
      };
    },
  },

  // ---------------- Jebakan tambahan ----------------

  // Siapa yang menjabat sebagai Kepala Divisi DKPT?  Kodenya palsu (mirip DKKT).
  {
    type: "trick_fake_code_head",
    weight: 0.8,
    trap: true,
    build: ({ data, idx, division: d, rng, stale }) => {
      const head = leaderPos(idx, d.id);
      const holders = holdersOf(idx, head);
      if (head?.namaJabatan !== "Kepala Divisi" || !holders.length) return null;
      const fake = fakeCodes(d, data, rng)[0];
      if (!fake) return null;
      const holder = pick(holders, rng);
      const lookalikes = rankBy(
        data.divisions.filter((x) => x.id !== d.id),
        (x) => codeSimilarity(fake, x.kode),
        rng,
      );
      const mc = trickChoices(
        [holder],
        freshFirst(lookalikes.flatMap((x) => kepalaDivisiOf(idx, x.id)), stale),
        rng,
      );
      if (!mc) return null;
      return {
        key: `trick_code_head:${d.id}`,
        facts: [F.pos(head), ...holders.map(F.person)],
        type: "trick_fake_code_head",
        divisionId: d.id,
        prompt: `Siapa yang menjabat sebagai Kepala Divisi ${fake}?`,
        ...mc,
        explanation: `Tidak ada divisi berkode ${fake}. Yang mirip ${d.kode}, dipimpin ${holder}.`,
      };
    },
  },

  // Apa kepanjangan dari DPKS?  Kodenya palsu (mirip DPKK).
  {
    type: "trick_fake_code_kepanjangan",
    weight: 0.8,
    trap: true,
    build: ({ data, division: d, rng, stale }) => {
      if (mentionsCode(d)) return null;
      const fake = fakeCodes(d, data, rng)[0];
      if (!fake) return null;
      const lookalikes = rankBy(
        data.divisions.filter((x) => x.id !== d.id && !mentionsCode(x)),
        (x) => codeSimilarity(fake, x.kode),
        rng,
      );
      const mc = trickChoices(
        [d.kepanjangan],
        freshFirst(lookalikes.map((x) => x.kepanjangan), stale),
        rng,
      );
      if (!mc) return null;
      return {
        key: `trick_code_kep:${d.id}`,
        facts: [F.kode(d)],
        type: "trick_fake_code_kepanjangan",
        divisionId: d.id,
        prompt: `Apa kepanjangan dari ${fake}?`,
        ...mc,
        explanation: `Tidak ada divisi berkode ${fake}. Yang mirip ${d.kode}, singkatan dari ${d.kepanjangan}.`,
      };
    },
  },

  // Siapa yang menjabat sebagai Kepala Sub Divisi Pengembangan SDM dan Perencanaan Tenaga Kerja?
  // Nama itu gabungan dua sub divisi, jadi tidak ada.
  {
    type: "trick_hybrid_subdiv",
    weight: 0.8,
    trap: true,
    build: (ctx) => {
      const { data, idx, division: d, rng } = ctx;
      const candidates = filledSubPositions(idx, d).filter((p) => p.namaJabatan === "Kepala Sub Divisi");
      if (!candidates.length) return null;
      const pos = pick(candidates, rng);
      const sub = idx.subById.get(pos.subDivisionId!)!;
      const partners = [
        ...shuffle((idx.subsByDiv.get(d.id) ?? []).filter((s) => s.id !== sub.id), rng),
        ...idx.similarSubs(sub.nama, d, rng).slice(0, 6),
      ];
      const hybrids = fakeNames(
        sub.nama,
        partners.map((s) => ({ nama: s.nama, ref: s })),
        idx.real.subs,
      ).filter((f) => f.partner);
      if (!hybrids.length) return null;
      const fake = pick(hybrids.slice(0, 3), rng);
      const partner = fake.partner!;
      const partnerPos = data.positions.find((p) => p.subDivisionId === partner.id);
      const holders = holdersOf(idx, pos);
      const partnerHolders = holdersOf(idx, partnerPos);
      const mc = trickChoices(
        [pick(holders, rng), ...partnerHolders.slice(0, 1)],
        peoplePool(ctx, pos, [...holders, ...partnerHolders]),
        rng,
      );
      if (!mc) return null;
      return {
        key: `trick_hybrid:${norm(fake.nama)}`,
        facts: [
          F.pos(pos),
          F.sub(sub),
          F.sub(partner),
          ...(partnerPos ? [F.pos(partnerPos)] : []),
          ...[...holders, ...partnerHolders].map(F.person),
        ],
        type: "trick_hybrid_subdiv",
        divisionId: d.id,
        prompt: `Siapa yang menjabat sebagai Kepala Sub Divisi ${fake.nama}?`,
        ...mc,
        explanation: `Tidak ada sub divisi "${fake.nama}". Nama itu gabungan ${sub.nama} (${d.kode}) dan ${partner.nama} (${idx.divById.get(partner.divisionId)!.kode}).`,
      };
    },
  },

  // Siapa yang menjabat sebagai Kepala Sub Divisi Pengelolaan Aset III?  Hanya ada I dan II.
  {
    type: "trick_number_overflow",
    weight: 0.8,
    trap: true,
    build: ({ data, idx, division: d, rng, stale }) => {
      type Item = { nama: string; base: string; n: number; holders: string[]; fact: string; isSub: boolean };
      const items: Item[] = [
        ...(idx.subsByDiv.get(d.id) ?? []).map((s) => ({
          nama: s.nama,
          ...splitNumber(s.nama),
          holders: holdersOf(idx, data.positions.find((p) => p.subDivisionId === s.id)),
          fact: F.sub(s),
          isSub: true,
        })),
        ...(idx.posByDiv.get(d.id) ?? [])
          .filter((p) => !p.subDivisionId && p.level > 1)
          .map((p) => ({
            nama: p.namaJabatan,
            ...splitNumber(p.namaJabatan),
            holders: holdersOf(idx, p),
            fact: F.pos(p),
            isSub: false,
          })),
      ];
      const groups = [...groupBy(items, (i) => `${i.isSub}:${norm(i.base)}`).values()].filter(
        (g) => g.length >= 2 && g.some((i) => i.n >= 2),
      );
      if (!groups.length) return null;
      const group = [...pick(groups, rng)].sort((a, b) => a.n - b.n);
      const fakeName = `${group[0].base} ${ROMAN[Math.max(...group.map((i) => i.n))]}`;
      const label = group[0].isSub ? `Kepala Sub Divisi ${fakeName}` : fakeName;
      if (idx.real.subs.has(norm(fakeName)) || idx.real.labels.has(norm(label))) return null;
      const holders = uniqueNames(group.flatMap((i) => i.holders));
      const mc = trickChoices(
        shuffle(holders, rng),
        freshFirst([...shuffle(idx.peopleOfDiv(d.id), rng), ...data.officials.map((o) => o.nama)], stale),
        rng,
      );
      if (!mc) return null;
      return {
        key: `trick_number:${d.id}:${norm(fakeName)}`,
        facts: [...group.map((i) => i.fact), ...holders.map(F.person)],
        type: "trick_number_overflow",
        divisionId: d.id,
        prompt: `Siapa yang menjabat sebagai ${label}?`,
        ...mc,
        explanation: `Tidak ada. Di ${d.kode} hanya ada ${listJoin(group.map((i) => i.nama))}.`,
      };
    },
  },

  // Salah satu nama sub divisi DPSB di bawah ini keliru. Yang mana?  (jawabannya nama palsu, bukan "Tidak ada")
  {
    type: "trick_spot_fake_subdiv",
    weight: 0.8,
    trap: true,
    build: ({ idx, division: d, rng }) => {
      const own = idx.subsByDiv.get(d.id) ?? [];
      if (own.length < 3) return null;
      const found = shuffle(own, rng)
        .map((s) => ({
          target: s,
          fakes: fakeNames(
            s.nama,
            own.filter((o) => o.id !== s.id).map((o) => ({ nama: o.nama, ref: o })),
            idx.real.subs,
          ),
        }))
        .find((x) => x.fakes.length);
      if (!found) return null;
      const { target } = found;
      const fake = pick(found.fakes, rng);
      const reals = shuffle(own.filter((o) => o.id !== target.id), rng).slice(0, 3);
      const options = shuffle([fake.nama, ...reals.map((r) => r.nama)], rng);
      return {
        key: `trick_spot:${target.id}`,
        facts: [F.sub(target), ...reals.map(F.sub), ...(fake.partner ? [F.sub(fake.partner)] : [])],
        type: "trick_spot_fake_subdiv",
        divisionId: d.id,
        prompt: `Salah satu nama sub divisi ${d.kode} di bawah ini keliru. Yang mana?`,
        options,
        answerIndex: options.indexOf(fake.nama),
        explanation: fake.partner
          ? `"${fake.nama}" keliru, itu gabungan ${target.nama} dan ${fake.partner.nama}. Sisanya benar.`
          : `"${fake.nama}" keliru, urutannya terbalik. Yang benar "${target.nama}". Sisanya benar.`,
      };
    },
  },
];

const ALL_TEMPLATES = [...TEMPLATES, ...MORE_TEMPLATES];

/**
 * Memilih template berdasarkan bobot, dengan batas per tipe dan batas soal jebakan.
 * Normalnya setiap tipe hanya sekali per sesi, jadi 10 soal = 10 pola berbeda dari 28 pola.
 */
function pickTemplate(
  rng: Rng,
  typeCount: Map<QuestionType, number>,
  trapCount: number,
  limits: { perType: number; traps: number },
): Template {
  const allowed = (t: Template) =>
    (typeCount.get(t.type) ?? 0) < Math.min(t.max ?? limits.perType, limits.perType) &&
    (!t.trap || trapCount < limits.traps);
  let candidates = ALL_TEMPLATES.filter(allowed);
  // semua tipe sudah penuh: lanjut pakai tipe biasa, soal jebakan tetap dibatasi
  if (!candidates.length) candidates = ALL_TEMPLATES.filter((t) => !t.trap);
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

export function generateQuestions(data: OrgData, opts: GenerateOptions): Question[] {
  const rng = opts.rng ?? Math.random;
  const count = opts.count ?? 10;
  const ownRatio = opts.ownRatio ?? 0.6;
  // satu pola hanya sekali per sesi; maksimal 30% soal jebakan
  const limits = { perType: 1, traps: Math.round(count * 0.3) };

  const idx = buildIndex(data);
  const home = idx.divById.get(opts.divisionId);
  if (!home) throw new Error(`Divisi dengan id ${opts.divisionId} tidak ditemukan`);
  const others = data.divisions.filter((d) => d.id !== home.id);

  // soal easter egg menggantikan sebagian soal biasa, jumlah total tetap `count`
  const dpsb = data.divisions.find((d) => d.kode === "DPSB") ?? home;
  const eggs = opts.easterEgg ? easterEggQuestions(dpsb.id).slice(0, count) : [];
  const target = count - eggs.length;

  const used = new Set<string>(); // key soal + fakta yang sudah dipakai
  const typeCount = new Map<QuestionType, number>();
  let trapCount = 0;
  const main: Question[] = [];
  const extra: Question[] = []; // pelengkap dari divisi lain
  const total = () => main.length + extra.length;
  const mentions = cachedMentions(data, idx);
  const stale = (text: string) => mentions(text).some((f) => used.has(f));

  const tryAdd = (division: Division, result: Question[]) => {
    const template = pickTemplate(rng, typeCount, trapCount, limits);
    const q = template.build({ data, idx, division, rng, stale });
    if (!q) return;
    // nama sub divisi/karyawan yang tersebut di soal atau penjelasan juga dianggap sudah terbuka
    q.facts = [...new Set([...q.facts, ...mentions(`${q.prompt}\n${q.explanation}`)])];
    if (used.has(q.key) || q.facts.some((f) => used.has(f))) return;
    used.add(q.key);
    q.facts.forEach((f) => used.add(f));
    typeCount.set(q.type, (typeCount.get(q.type) ?? 0) + 1);
    if (template.trap) trapCount++;
    result.push(q);
  };

  // batas percobaan mencegah infinite loop jika data terlalu sedikit
  for (let attempt = 0; attempt < count * 30 && total() < target; attempt++) {
    tryAdd(opts.mode === "mixed" && others.length && rng() >= ownRatio ? pick(others, rng) : home, main);
  }
  // fakta divisi sendiri sudah habis (divisi kecil): lengkapi dengan divisi lain
  // daripada mengulang fakta yang sama dengan bentuk soal berbeda
  for (let attempt = 0; attempt < count * 30 && total() < target && others.length; attempt++) {
    tryAdd(pick(others, rng), extra);
  }
  // cadangan jika data sangat sedikit: izinkan satu pola dipakai dua kali
  limits.perType = 2;
  for (let attempt = 0; attempt < count * 30 && total() < target; attempt++) {
    tryAdd(others.length && rng() < 0.5 ? pick(others, rng) : home, extra);
  }

  // urutan tampil = urutan dibuat (pengecoh dipilih berdasarkan apa yang sudah terungkap
  // sebelumnya), soal pelengkap disisipkan di posisi acak yang aman
  const result = insertSafely(main, extra, rng, mentions); // bisa kurang dari `count`, tangani di UI
  for (const egg of eggs) result.splice(Math.floor(rng() * (result.length + 1)), 0, egg);
  return result;
}

// ---------------------------------------------------------------------------
// Easter egg DPSB
// ---------------------------------------------------------------------------

/** Nama pemain yang membuka soal rahasia (huruf besar/kecil tidak berpengaruh). */
const EASTER_EGG_NAMES = new Set(["dpsbsb", "keong", "atmin"]);

export const isEasterEggName = (nama: string | null | undefined) =>
  !!nama && EASTER_EGG_NAMES.has(norm(nama));

/** Soal rahasia: pilih opsi mana pun, jawabannya selalu benar. */
function easterEggQuestions(divisionId: number): Question[] {
  const egg = (key: string, prompt: string, options: string[]): Question => ({
    key: `easter_egg:${key}`,
    facts: [],
    type: "easter_egg",
    divisionId,
    prompt,
    options,
    answerIndex: options.length - 1, // "Semua benar"; dipakai bila waktu habis
    allCorrect: true,
    explanation: "Soal rahasia DPSB: pilih yang mana pun, semuanya benar.",
  });
  return [
    egg("kaku", "Siapa orang yang paling kaku di DPSB?", [
      "Teuku Novika Yunanda",
      "Tenov",
      "Pak Tenov",
      "Semua benar",
    ]),
    egg("jomblo", "Siapakah yang jomblo di DPSB?", ["Safira", "Febri", "Safira & Febri", "Semua benar"]),
  ];
}

/**
 * Menyisipkan `extra` ke `list` di posisi acak, tetapi tidak sebelum soal yang memakai
 * fakta soal sisipan sebagai pengecoh (pengecoh itu akan jadi mudah dicoret).
 */
function insertSafely(
  list: Question[],
  extra: Question[],
  rng: Rng,
  mentions: (text: string) => string[],
) {
  const result = [...list];
  for (const q of extra) {
    const revealed = new Set(q.facts);
    let earliest = result.length;
    for (let i = result.length - 1; i >= 0; i--) {
      const r = result[i];
      const usesRevealed = r.options.some(
        (o, k) => k !== r.answerIndex && mentions(o).some((f) => revealed.has(f)),
      );
      if (usesRevealed) break;
      earliest = i;
    }
    result.splice(earliest + Math.floor(rng() * (result.length - earliest + 1)), 0, q);
  }
  return result;
}

/** Hapus kunci jawaban sebelum dikirim ke client. */
export const toPublic = (questions: Question[]): PublicQuestion[] =>
  questions.map((q, i) => ({
    no: i + 1,
    type: q.type,
    prompt: q.prompt,
    options: q.options,
  }));
