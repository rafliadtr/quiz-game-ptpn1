/**
 * src/app/page.tsx — layar awal: isi nama, pilih divisi, pilih mode
 * Kerangka tampil langsung; daftar divisi diambil per request di dalam Suspense.
 */
import { Suspense } from "react";
import { connection } from "next/server";
import { prisma } from "@/lib/prisma";
import StartForm from "@/components/StartForm";

async function WithDivisions() {
  // tandai bagian ini dinamis, supaya data divisi tidak dibekukan saat build
  await connection();
  const divisions = await prisma.division.findMany({
    select: { id: true, kode: true, kepanjangan: true },
    orderBy: { kode: "asc" },
  });
  return <StartForm divisions={divisions} />;
}

export default function Home() {
  return (
    <Suspense fallback={<StartForm divisions={null} />}>
      <WithDivisions />
    </Suspense>
  );
}
