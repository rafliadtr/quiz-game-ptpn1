/**
 * Uji generator soal dengan data asli (prisma/org-data.ts), tanpa database.
 *
 *   npx tsx src/scripts/test-generator.ts DPSB own 42   → contoh satu sesi (kode divisi, mode, seed)
 *   npx tsx src/scripts/test-generator.ts --check       → cek ribuan sesi: bocoran, opsi ganda, statistik
 */
import {
  generateQuestions,
  mulberry32,
  NONE_OPTION,
  type Question,
} from "@/lib/question-generator";
import { buildOrgData } from "../../prisma/org-data";

const data = buildOrgData();
const norm = (s: string) => s.trim().toLowerCase();

function printSession(questions: Question[]) {
  questions.forEach((q, i) => {
    console.log(`${i + 1}. [${q.type}] ${q.prompt}`);
    q.options.forEach((opt, j) =>
      console.log(`   ${j === q.answerIndex ? "✔" : " "} ${String.fromCharCode(65 + j)}. ${opt}`),
    );
    console.log(`   → ${q.explanation}\n`);
  });
}

const codes = new Set(data.divisions.map((d) => norm(d.kode)));
/** Kode divisi, Benar/Salah dan "Tidak ada" memang muncul di mana-mana. */
const isGeneric = (s: string) => codes.has(norm(s)) || ["benar", "salah", norm(NONE_OPTION)].includes(norm(s));

const knownNames = [
  ...data.officials.map((o) => o.nama),
  ...data.subDivisions.map((s) => s.nama),
  ...data.divisions.map((d) => d.kepanjangan),
];
const wordRe = (s: string, flags = "iu") =>
  new RegExp(
    `(^|[^\\p{L}\\p{N}])${s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?![\\p{L}\\p{N}])(?!\\s+(?:I|II|III|IV|V|\\d+)(?![\\p{L}\\p{N}]))`,
    flags,
  );
/** Apakah `name` disebut di `text` sebagai kata utuh, bukan bagian dari nama lain yang lebih panjang. */
function mentioned(text: string, name: string) {
  for (const longer of knownNames)
    if (longer.length > name.length && norm(longer).includes(norm(name)))
      text = text.replace(wordRe(longer, "giu"), "$1 ");
  return wordRe(name).test(text);
}

/** Jawaban soal belakangan yang sudah tersebut di soal/penjelasan sebelumnya. */
function findLeaks(questions: Question[]) {
  const leaks: string[] = [];
  questions.forEach((later, j) => {
    let answer = later.options[later.answerIndex];
    // soal isian: yang bocor adalah nama lengkapnya, bukan satu kata yang umum
    if (later.type.startsWith("blank_"))
      answer = /"(.*)"/.exec(later.prompt)![1].replace("___", answer);
    if (isGeneric(answer)) return;
    for (const earlier of questions.slice(0, j)) {
      if (mentioned(`${earlier.prompt}\n${earlier.explanation}`, answer))
        leaks.push(`"${answer}"\n   sebelumnya: ${earlier.prompt} → ${earlier.explanation}\n   kemudian : ${later.prompt}`);
    }
  });
  return leaks;
}

/** Opsi salah yang sudah terungkap jawabannya di soal sebelumnya (mudah dicoret). */
function findStaleDistractors(questions: Question[]) {
  const found: string[] = [];
  questions.forEach((later, j) => {
    if (later.type.startsWith("blank_")) return; // opsinya satu kata umum
    const seen = questions.slice(0, j).map((e) => e.explanation).join("\n");
    later.options.forEach((opt, i) => {
      if (i !== later.answerIndex && !isGeneric(opt) && mentioned(seen, opt))
        found.push(`"${opt}" di: ${later.prompt}`);
    });
  });
  return found;
}

/** jumlah sesi per divisi per mode; atur dengan SEEDS=500 untuk cek lebih menyeluruh */
const SEEDS = Number(process.env.SEEDS ?? 40);

function check() {
  const stale: string[] = [];
  const errors: string[] = [];
  const leaks: string[] = [];
  const typeCount = new Map<string, number>();
  let sessions = 0, total = 0, traps = 0, noneCorrect = 0, noneWrong = 0, shortSessions = 0, repeatSessions = 0;
  const sessionPatterns = new Set<string>();

  for (const d of data.divisions) {
    for (const mode of ["own", "mixed"] as const) {
      for (let seed = 1; seed <= SEEDS; seed++) {
        const qs = generateQuestions(data, { divisionId: d.id, mode, count: 10, rng: mulberry32(seed) });
        sessions++;
        if (qs.length < 10) shortSessions++;
        if (new Set(qs.map((q) => q.type)).size < qs.length) repeatSessions++;
        sessionPatterns.add(qs.map((q) => q.type).sort().join(","));
        const facts = new Set<string>();
        for (const q of qs) {
          total++;
          typeCount.set(q.type, (typeCount.get(q.type) ?? 0) + 1);
          if (q.type.startsWith("trick_")) traps++;
          const where = `${d.kode}/${mode}/${seed}: ${q.prompt}`;
          if (q.options.length < 2) errors.push(`opsi kurang dari 2 — ${where}`);
          if (q.answerIndex < 0 || q.answerIndex >= q.options.length) errors.push(`kunci di luar opsi — ${where}`);
          if (new Set(q.options.map(norm)).size !== q.options.length) errors.push(`opsi kembar — ${where}`);
          const noneAt = q.options.indexOf(NONE_OPTION);
          if (noneAt >= 0 && noneAt !== q.options.length - 1) errors.push(`"Tidak ada" bukan di akhir — ${where}`);
          if (noneAt >= 0 && noneAt === q.answerIndex) noneCorrect++;
          else if (noneAt >= 0) noneWrong++;
          for (const f of q.facts) {
            if (facts.has(f)) errors.push(`fakta ${f} dipakai dua kali — ${where}`);
            facts.add(f);
          }
        }
        stale.push(...findStaleDistractors(qs).map((s) => `${d.kode}/${mode}/${seed}: ${s}`));
        leaks.push(...findLeaks(qs).map((l) => `${d.kode}/${mode}/${seed}: ${l}`));
      }
    }
  }

  // easter egg: 2 soal rahasia ikut di dalam 10 soal, hanya jika diminta
  for (const d of data.divisions) {
    const withEgg = generateQuestions(data, { divisionId: d.id, count: 10, easterEgg: true, rng: mulberry32(d.id) });
    const withoutEgg = generateQuestions(data, { divisionId: d.id, count: 10, rng: mulberry32(d.id) });
    const eggs = withEgg.filter((q) => q.type === "easter_egg");
    if (withEgg.length !== 10 || eggs.length !== 2 || !eggs.every((q) => q.allCorrect))
      errors.push(`easter egg tidak lengkap — ${d.kode}`);
    if (withoutEgg.some((q) => q.type === "easter_egg")) errors.push(`easter egg muncul tanpa diminta — ${d.kode}`);
  }

  console.log(`${sessions} sesi, ${total} soal, ${shortSessions} sesi kurang dari 10 soal`);
  console.log(`${typeCount.size} pola terpakai; ${repeatSessions} sesi memakai satu pola dua kali; ${sessionPatterns.size} kombinasi pola berbeda`);
  console.log(`jebakan: rata-rata ${(traps / sessions).toFixed(2)} per sesi`);
  console.log(`"Tidak ada": ${noneCorrect}× jawaban benar, ${noneWrong}× pengecoh`);
  console.log(`pengecoh yang sudah terungkap di penjelasan sebelumnya: ${stale.length} (${(stale.length / sessions).toFixed(2)} per sesi)`);
  stale.slice(0, 5).forEach((s) => console.log(" - " + s));
  console.log("sebaran tipe:");
  for (const [t, n] of [...typeCount].sort((a, b) => b[1] - a[1]))
    console.log(`  ${t.padEnd(26)} ${((n / total) * 100).toFixed(1)}%`);
  console.log(`\nkemungkinan bocoran: ${leaks.length}`);
  leaks.slice(0, 8).forEach((l) => console.log(" - " + l));
  console.log(`\nerror: ${errors.length}`);
  errors.slice(0, 20).forEach((e) => console.log(" - " + e));
  if (errors.length) process.exit(1);
}

if (process.argv[2] === "--check") {
  check();
} else {
  const kode = (process.argv[2] ?? "DPSB").toUpperCase();
  const mode = (process.argv[3] ?? "own") as "own" | "mixed";
  const seed = Number(process.argv[4] ?? 42);
  const division = data.divisions.find((d) => d.kode === kode);
  if (!division) throw new Error(`Kode ${kode} tidak ada`);
  const questions = generateQuestions(data, { divisionId: division.id, mode, count: 10, rng: mulberry32(seed) });
  console.log(`\n${kode}, mode ${mode}, seed ${seed}: ${questions.length} soal\n`);
  printSession(questions);
}
