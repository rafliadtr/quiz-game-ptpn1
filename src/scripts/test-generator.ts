import {
  generateQuestions,
  mulberry32,
  type OrgData,
} from "@/lib/question-generator";

const data: OrgData = {
  divisions: [
    {
      id: 1,
      kode: "DPSB",
      kepanjangan: "Divisi Pengembangan SDM dan Budaya Perusahaan",
    },
    {
      id: 2,
      kode: "DOSG",
      kepanjangan: "Divisi Operasional SDM dan General Affair",
    },
    {
      id: 3,
      kode: "DPTI",
      kepanjangan: "Divisi Pengadaan dan Teknologi Informasi",
    },
  ],
  subDivisions: [
    {
      id: 1,
      nama: "Pengembangan Organisasi dan Budaya Perusahaan",
      divisionId: 1,
    },
    { id: 2, nama: "Pengembangan SDM dan Manajemen Kinerja", divisionId: 1 },
    {
      id: 3,
      nama: "Manajemen Talenta dan Perencanaan Tenaga Kerja",
      divisionId: 1,
    },
    { id: 4, nama: "Personalia dan Remurisasi", divisionId: 2 },
    { id: 5, nama: "Umum", divisionId: 2 },
    { id: 6, nama: "Pengadaan", divisionId: 3 },
    { id: 7, nama: "Tata Kelola dan Pengembangan TI", divisionId: 3 },
    { id: 8, nama: "Operasional TI dan ERP", divisionId: 3 },
    { id: 9, nama: "Pemetaan dan GIS", divisionId: 3 },
  ],
  positions: [
    {
      id: 1,
      namaJabatan: "Kepala Divisi",
      level: 1,
      divisionId: 1,
      subDivisionId: null,
    },
    {
      id: 2,
      namaJabatan: "Kepala Divisi",
      level: 1,
      divisionId: 2,
      subDivisionId: null,
    },
    {
      id: 3,
      namaJabatan: "Kepala Divisi",
      level: 1,
      divisionId: 3,
      subDivisionId: null,
    },
    {
      id: 4,
      namaJabatan: "Kepala Sub Divisi",
      level: 2,
      divisionId: 1,
      subDivisionId: 1,
    },
    {
      id: 5,
      namaJabatan: "Kepala Sub Divisi",
      level: 2,
      divisionId: 1,
      subDivisionId: 2,
    },
    {
      id: 6,
      namaJabatan: "Kepala Sub Divisi",
      level: 2,
      divisionId: 1,
      subDivisionId: 3,
    },
    {
      id: 7,
      namaJabatan: "Kepala Sub Divisi",
      level: 2,
      divisionId: 2,
      subDivisionId: 4,
    },
    {
      id: 8,
      namaJabatan: "Kepala Sub Divisi",
      level: 2,
      divisionId: 2,
      subDivisionId: 5,
    },
    {
      id: 9,
      namaJabatan: "Kepala Sub Divisi",
      level: 2,
      divisionId: 3,
      subDivisionId: 6,
    },
    {
      id: 10,
      namaJabatan: "Kepala Sub Divisi",
      level: 2,
      divisionId: 3,
      subDivisionId: 7,
    },
    {
      id: 11,
      namaJabatan: "Kepala Sub Divisi",
      level: 2,
      divisionId: 3,
      subDivisionId: 8,
    },
    {
      id: 12,
      namaJabatan: "Kepala Sub Divisi",
      level: 2,
      divisionId: 3,
      subDivisionId: 9,
    },
  ],
  officials: [
    { id: 1, nama: "Hidayat", positionId: 1 },
    { id: 1, nama: "Henny Mailena Siregar", positionId: 2 },
    { id: 1, nama: "Ivan Gusmawan", positionId: 3 },
    { id: 4, nama: "Dewi Anggraini", positionId: 4 },
    { id: 5, nama: "Eko Saputra", positionId: 5 },
    { id: 6, nama: "Fitri Handayani", positionId: 6 },
    { id: 7, nama: "Gilang Ramadhan", positionId: 7 },
    { id: 8, nama: "Hana Wulandari", positionId: 8 },
    { id: 9, nama: "Irfan Hakim", positionId: 9 },
    { id: 10, nama: "Joko Susilo", positionId: 10 },
  ],
};

const divisionId = Number(process.argv[2] ?? 1);
const mode = (process.argv[3] ?? "own") as "own" | "mixed";

const questions = generateQuestions(data, {
  divisionId,
  mode,
  count: 10,
  rng: mulberry32(42),
});

console.log(`\nDivisi ${divisionId}, mode ${mode}: ${questions.length} soal\n`);
questions.forEach((q, i) => {
  console.log(`${i + 1}. [${q.type}] ${q.prompt}`);
  q.options.forEach((opt, j) =>
    console.log(
      `   ${j === q.answerIndex ? "✔" : " "} ${String.fromCharCode(65 + j)}. ${opt}`,
    ),
  );
  console.log(`   → ${q.explanation}\n`);
});
