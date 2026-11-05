import { prisma } from "@/lib/prisma";

export async function GET() {
  const divisions = await prisma.division.findMany({
    select: { id: true, kode: true, kepanjangan: true },
    orderBy: { kode: "asc" },
  });
  return Response.json(divisions);
}
