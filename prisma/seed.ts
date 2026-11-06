/**
 * prisma/seed.ts — mengisi database dengan struktur Head Office PTPN I
 * Jalankan: npx prisma db seed
 * Datanya ada di prisma/org-data.ts.
 *
 * PERINGATAN: seed menghapus semua data lama, termasuk riwayat sesi game.
 */
import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import { DATA, LEVEL } from "./org-data";

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
      // jabatan hanya dibuat jika ada karyawannya; sub divisi kosong tetap dipakai untuk soal sub divisi
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
    `Seed selesai: ${DATA.length} divisi, ${jumlahSub} sub divisi, ${jumlahPejabat} karyawan`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
