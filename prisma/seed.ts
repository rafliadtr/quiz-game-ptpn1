/**
 * prisma/seed.ts — Struktur Head Office PTPN I
 * Jalankan: npx prisma db seed
 *
 * Sumber:
 * - Kode & kepanjangan divisi: daftar buatan sendiri (tidak diubah, kecuali salah ketik "Pengawan")
 * - Sub divisi: "Organizational Structure & Leadership Profile PTPN I (Persero)", bagian Head Office
 * - Nama pejabat: Data Karyawan Mei 2026 (sheet HO; nama berstatus penugasan dari sheet regional)
 * - Jabatan di atas Kepala Divisi (direksi) tidak dimasukkan.
 *
 * Baris bertanda VERIFIKASI berisi data yang ambigu antar sumber, cek sebelum dipakai.
 * PERINGATAN: seed menghapus semua data lama, termasuk riwayat sesi game.
 */
import "dotenv/config";
import { prisma } from "../src/lib/prisma";

type SubDivisionSeed = { nama: string; kepala?: string[] };
/** Jabatan tanpa sub divisi. namaJabatan ditulis lengkap karena tampil apa adanya di soal. */
type ExtraPositionSeed = {
  namaJabatan: string;
  level: number;
  pejabat: string[];
};
type DivisionSeed = {
  kode: string;
  kepanjangan: string;
  /** Kepala unit. Default jabatan "Kepala Divisi"; unit PMO/PMN memakai jabatan sendiri. */
  kepala: { nama: string; jabatan?: string } | null;
  subDivisions: SubDivisionSeed[];
  extra?: ExtraPositionSeed[];
};

const LEVEL = { KEPALA_DIVISI: 1, KEPALA_SUB_DIVISI: 2, KETUA_TIM: 3 } as const;

const DATA: DivisionSeed[] = [
  // ---------------- Direktorat SDM dan Teknologi Informasi ----------------
  {
    kode: "DPSB",
    kepanjangan: "Divisi Pengembangan SDM dan Budaya Perusahaan",
    kepala: { nama: "Hidayat" },
    subDivisions: [
      {
        nama: "Pengembangan Organisasi dan Budaya Perusahaan",
        kepala: ["Farhan"],
      },
      {
        nama: "Pengembangan SDM dan Manajemen Kinerja",
        kepala: ["Yunanto Nurhascaryo"],
      },
      {
        nama: "Manajemen Talenta dan Perencanaan Tenaga Kerja",
        kepala: ["Teuku Novika Yunanda"],
      },
    ],
  },
  {
    kode: "DOSG",
    kepanjangan: "Divisi Operasional SDM dan General Affair",
    kepala: { nama: "Henny Mailena Siregar" },
    subDivisions: [
      { nama: "Personalia dan Remunerasi", kepala: ["Yudi Wibowo"] },
      { nama: "Umum", kepala: ["Hening Indra Leksana"] },
    ],
  },
  {
    kode: "DPTI",
    kepanjangan: "Divisi Pengadaan dan Teknologi Informasi",
    kepala: { nama: "Ivan Gusmawan" },
    subDivisions: [
      { nama: "Pengadaan", kepala: ["Suyana"] },
      {
        nama: "Tata Kelola dan Pengembangan TI",
        kepala: ["Wisnuaji Gagat Priambada"],
      },
      { nama: "Operasional TI dan ERP", kepala: ["Setyanto"] },
      { nama: "Pemetaan dan GIS" },
    ],
  },

  // ---------------- Direktorat Utama ----------------
  {
    kode: "DSPI",
    kepanjangan: "Divisi Satuan Pengawasan Intern",
    kepala: { nama: "Aviv Ismar" },
    subDivisions: [{ nama: "Manajemen Audit", kepala: ["Widodo"] }],
    extra: [
      // VERIFIKASI: PDF hanya mencantumkan LST Gomo Tumanggor, Excel mencantumkan dua Kepala Audit
      {
        namaJabatan: "Kepala Audit",
        level: LEVEL.KEPALA_SUB_DIVISI,
        pejabat: ["LST Gomo Tumanggor", "Rocky Roy Robinson Situmorang"],
      },
      {
        namaJabatan: "Ketua Tim Audit",
        level: LEVEL.KETUA_TIM,
        pejabat: ["Fuad Nugraha Lubis"],
      },
      {
        namaJabatan: "Ketua Tim Audit II",
        level: LEVEL.KETUA_TIM,
        pejabat: ["Okky Renaldi"],
      },
      {
        namaJabatan: "Ketua Tim Audit III",
        level: LEVEL.KETUA_TIM,
        pejabat: ["Mohamad Dion Tiara"],
      },
      {
        namaJabatan: "Ketua Tim Audit IV",
        level: LEVEL.KETUA_TIM,
        pejabat: ["Enggar Prana Wengrum"],
      },
      {
        namaJabatan: "Ketua Tim Audit V",
        level: LEVEL.KETUA_TIM,
        pejabat: ["Yasir Firmansyah"],
      },
    ],
  },
  {
    kode: "DSPR",
    kepanjangan: "Divisi Sekretariat Perusahaan",
    kepala: { nama: "Aris Handoyo" },
    subDivisions: [
      { nama: "Kesekretariatan dan GCG", kepala: ["Abdurahman Maas"] },
      // VERIFIKASI: Excel mencantumkan dua orang sebagai Kepala Sub Divisi Komunikasi Perusahaan
      {
        nama: "Komunikasi Perusahaan",
        kepala: ["Hendrik Sastrawan", "Siti Rubaidah"],
      },
    ],
  },
  {
    kode: "DSTK",
    kepanjangan: "Divisi Strategi dan Transformasi Korporasi",
    kepala: { nama: "Puji Rahmat Hidayat" },
    subDivisions: [
      { nama: "Strategi Korporasi", kepala: ["Fajar Priyambada"] },
      {
        nama: "Transformasi Korporasi",
        kepala: ["R. Robby Yunanda Atmanegara"],
      },
      // VERIFIKASI: PDF tertulis "Engelmann Bisnis dan Inovasi", Excel "Pengembangan Bisnis da..."
      { nama: "Pengembangan Bisnis dan Inovasi", kepala: ["Dedy Mulyanto"] },
    ],
  },
  {
    kode: "PMN",
    kepanjangan: "Project Manager PMN",
    kepala: { nama: "Bambang Tri Anggono", jabatan: "Project Manager PMN" },
    subDivisions: [],
    extra: [
      {
        namaJabatan: "Deputy Project Manager PMN",
        level: LEVEL.KEPALA_SUB_DIVISI,
        pejabat: [
          "Fitria Yulianto",
          "Iwan Mahendra",
          "Gindo Pati Impola Gultom",
        ],
      },
    ],
  },
  {
    kode: "PMAR",
    kepanjangan: "PMO Audit & Risk",
    kepala: { nama: "Rossiyana Amir", jabatan: "Head of PMO Audit dan Risk" },
    subDivisions: [],
    extra: [
      {
        namaJabatan: "Co Head of PMO Audit dan Risk",
        level: LEVEL.KEPALA_SUB_DIVISI,
        pejabat: ["Febry Hestama Wicaksana"],
      },
    ],
  },

  // ---------------- Direktorat Operasional ----------------
  {
    kode: "DKKT",
    kepanjangan: "Divisi Komoditi Karet",
    kepala: { nama: "Hendra Putra" },
    subDivisions: [
      { nama: "Operasional Komoditi Karet", kepala: ["Ady Setia Kristiawan"] },
      { nama: "Teknik & Pengolahan Komoditi Karet", kepala: ["Pitutur"] },
      { nama: "Pemupukan & Administrasi", kepala: ["M. Firman Noor Siregar"] },
    ],
  },
  {
    kode: "DKAT",
    kepanjangan: "Divisi Komoditi Kopi dan Aneka Tanaman",
    kepala: { nama: "Satria Asmara Kurniawan" },
    subDivisions: [
      // VERIFIKASI: Excel terpotong "Operasional dan Admini...", bisa Kopi atau Aneka Tanaman
      { nama: "Operasional Administrasi Kopi", kepala: ["Hendro Prawiro"] },
      { nama: "Operasional Administrasi Aneka Tanaman" },
      { nama: "Teknik Sipil dan Pengolahan Kopi & Aneka Tanaman" },
    ],
  },
  {
    kode: "DKTK",
    kepanjangan: "Divisi Komoditi Teh dan Kemitraan",
    // VERIFIKASI: Excel → Moehamad Irwan Maulana; PDF → Rocky Roy Robinson Situmorang
    kepala: { nama: "Moehamad Irwan Maulana" },
    subDivisions: [
      { nama: "Operasional Tanaman Komoditi Teh" },
      {
        nama: "Operasional Tekpol Komoditi Teh",
        kepala: ["Nurul Rizka Esbahtiar"],
      },
      { nama: "Kemitraan Strategis", kepala: ["Purnomo Aji"] },
    ],
  },
  {
    kode: "PMOIH",
    kepanjangan: "PMO Investasi Hilirisasi Perkebunan",
    // VERIFIKASI: tidak ada di Excel, nama diambil dari PDF
    kepala: {
      nama: "Tri Sutanto",
      jabatan: "Head of PMO Investasi Hilirisasi Perkebunan",
    },
    subDivisions: [],
  },

  // ---------------- Direktorat Keuangan dan Manajemen Risiko ----------------
  {
    kode: "DPAK",
    kepanjangan: "Divisi Perbendaharaan Anggaran dan Keuangan",
    kepala: { nama: "Luthfi Pudiarifiyanto" },
    subDivisions: [
      { nama: "Anggaran", kepala: ["Nugraha Akbar"] },
      { nama: "Perbendaharaan, Kas dan Bank", kepala: ["Yocga Merdikarano"] },
      {
        nama: "Keuangan Strategis dan Pembiayaan",
        kepala: ["Anggit Cahyo Aji"],
      },
    ],
  },
  {
    kode: "DAPJ",
    kepanjangan: "Divisi Akuntansi dan Perpajakan",
    kepala: { nama: "Iyushar Ganda Saputra" },
    subDivisions: [
      { nama: "Pelaporan dan Analisa Laporan Keuangan" },
      { nama: "Akuntansi", kepala: ["Adji Kaniawan"] },
      { nama: "Perpajakan dan Asuransi" },
    ],
  },
  {
    kode: "DPKK",
    kepanjangan: "Divisi Pengelolaan Anak Perusahaan dan Kinerja Korporasi",
    kepala: { nama: "Ibnu Maulana I. Arief" },
    subDivisions: [
      // VERIFIKASI: Excel terpotong "Manajemen Anper dan Af...", tidak jelas mana yang I dan II
      { nama: "Manajemen Anper dan Afiliasi I", kepala: ["Veny Octariviani"] },
      {
        nama: "Manajemen Anper dan Afiliasi II",
        kepala: ["Dwi Widyo Nugroho"],
      },
      { nama: "Manajemen Kinerja Korporasi", kepala: ["Dicky Pramudito"] },
    ],
  },
  {
    kode: "PMOSAPA",
    kepanjangan: "PMO Streamlining Anak Perusahaan dan Afiliasi",
    // VERIFIKASI: PDF → Moehamad Irwan Maulana, tetapi di Excel ia Kepala Divisi DKTK. Dikosongkan.
    kepala: null,
    subDivisions: [],
  },

  // ---------------- Direktorat Pemasaran dan Aset Manajemen ----------------
  {
    kode: "DMPS",
    kepanjangan: "Divisi Pemasaran",
    kepala: { nama: "Laeli Fadli Arif" },
    subDivisions: [
      { nama: "Pemasaran Karet dan Kopi", kepala: ["Ismi Arif Prasetyo"] },
      { nama: "Pemasaran Komoditi Teh, Antan dan Retail" },
      { nama: "HPS dan Informasi Harga", kepala: ["Angga Abiyanto"] },
    ],
  },
  {
    kode: "DMAT",
    kepanjangan: "Divisi Manajemen Aset 1",
    kepala: { nama: "Dwi Aries Sudarto" },
    subDivisions: [
      { nama: "Divestasi Aset I" },
      { nama: "Divestasi Aset II", kepala: ["Bop Kertiana"] },
    ],
  },
  {
    kode: "DMAS",
    kepanjangan: "Divisi Manajemen Aset 2",
    kepala: { nama: "Nelson Limbong" }, // penugasan dari Regional 4/5
    subDivisions: [
      { nama: "Pengelolaan Aset I", kepala: ["Ari Mandala Putra"] },
      { nama: "Pengelolaan Aset II", kepala: ["Dendy Firmanda Hernadi"] },
      {
        nama: "Analisa dan Pengembangan Aset",
        kepala: ["Adiguna Yudha Patria"],
      },
    ],
  },
  {
    kode: "PMOHC",
    kepanjangan: "PMO Human Capital",
    kepala: { nama: "Elminda Sari", jabatan: "Head of PMO Human Capital" },
    subDivisions: [],
    extra: [
      {
        namaJabatan: "Co Head of PMO Human Capital",
        level: LEVEL.KEPALA_SUB_DIVISI,
        pejabat: ["Yudi Wibowo"],
      },
    ],
  },

  // ---------------- Direktorat Hubungan Kelembagaan ----------------
  {
    kode: "DHKL",
    kepanjangan: "Divisi Hubungan Kelembagaan dan TJSL",
    kepala: { nama: "Dinnar Araffah Utang" }, // penugasan dari Regional 2; ejaan PDF "Dinnar Arrafah Hutang"
    subDivisions: [
      { nama: "Hubungan Kelembagaan" },
      { nama: "TJSL", kepala: ["Asep Rezha Saefulloh"] },
      { nama: "Keamanan", kepala: ["Brahma Satrya"] },
    ],
  },
  {
    kode: "DHKM",
    kepanjangan: "Divisi Hukum",
    kepala: { nama: "Satrya Adhitama" }, // di Excel tercatat di Regional 4/5
    subDivisions: [
      { nama: "Hukum dan Peraturan Perusahaan" },
      { nama: "Agraria", kepala: ["Febryanes Tiwow"] },
      { nama: "Hukum Litigasi dan Non Litigasi" },
    ],
  },
  {
    kode: "DMRS",
    kepanjangan: "Divisi Manajemen Risiko dan Sustainability",
    kepala: { nama: "Joko Purnomo" },
    subDivisions: [
      { nama: "Manajemen Risiko", kepala: ["Dian Wahyu"] },
      { nama: "Kepatuhan" },
      {
        nama: "Sistem Manajemen dan Sustainability",
        kepala: ["Mhd David P Sihombing"],
      },
    ],
  },
];

async function main() {
  // hapus dari tabel anak ke induk supaya foreign key tidak error
  await prisma.gameSession.deleteMany();
  await prisma.official.deleteMany();
  await prisma.position.deleteMany();
  await prisma.subDivision.deleteMany();
  await prisma.division.deleteMany();

  let jumlahSub = 0;
  let jumlahPejabat = 0;

  for (const d of DATA) {
    const division = await prisma.division.create({
      data: { kode: d.kode, kepanjangan: d.kepanjangan },
    });

    if (d.kepala) {
      await prisma.position.create({
        data: {
          namaJabatan: d.kepala.jabatan ?? "Kepala Divisi",
          level: LEVEL.KEPALA_DIVISI,
          divisionId: division.id,
          officials: { create: [{ nama: d.kepala.nama }] },
        },
      });
      jumlahPejabat++;
    }

    for (const s of d.subDivisions) {
      const sub = await prisma.subDivision.create({
        data: { nama: s.nama, divisionId: division.id },
      });
      jumlahSub++;
      // jabatan hanya dibuat jika ada pejabatnya; sub divisi kosong tetap dipakai untuk soal sub divisi
      if (s.kepala?.length) {
        await prisma.position.create({
          data: {
            namaJabatan: "Kepala Sub Divisi",
            level: LEVEL.KEPALA_SUB_DIVISI,
            divisionId: division.id,
            subDivisionId: sub.id,
            officials: { create: s.kepala.map((nama) => ({ nama })) },
          },
        });
        jumlahPejabat += s.kepala.length;
      }
    }

    for (const e of d.extra ?? []) {
      await prisma.position.create({
        data: {
          namaJabatan: e.namaJabatan,
          level: e.level,
          divisionId: division.id,
          officials: { create: e.pejabat.map((nama) => ({ nama })) },
        },
      });
      jumlahPejabat += e.pejabat.length;
    }
  }

  console.log(
    `Seed selesai: ${DATA.length} divisi, ${jumlahSub} sub divisi, ${jumlahPejabat} pejabat`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
