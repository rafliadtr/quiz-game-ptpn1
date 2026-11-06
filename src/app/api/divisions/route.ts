import { connection } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  // tandai dinamis: ambil data per request, jangan di-render saat build
  await connection();
  const divisions = await prisma.division.findMany({
    select: { id: true, kode: true, kepanjangan: true },
    orderBy: { kode: "asc" },
  });
  return Response.json(divisions);
}
