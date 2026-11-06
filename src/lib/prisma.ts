import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient } from "../generated/prisma/client";
import type { OrgData } from "@/lib/question-generator";

/**
 * Rapikan sertifikat CA dari env. Menerima format multi-baris maupun satu baris
 * dengan "\n", dan membuang tanda kutip atau \r yang ikut tertempel.
 */
function readCa(): string | undefined {
  const raw = process.env.DATABASE_SSL_CA;
  if (!raw) return undefined;
  const ca = raw
    .trim()
    .replace(/^["']|["']$/g, "")
    .replace(/\\n/g, "\n")
    .replace(/\r/g, "")
    .trim();
  if (!ca.includes("-----END CERTIFICATE-----")) {
    console.error("[prisma] DATABASE_SSL_CA tidak lengkap (tidak ada END CERTIFICATE)");
  }
  return ca + "\n";
}

function createPrismaClient() {
  const ca = process.env.DATABASE_SSL === "true" ? readCa() : undefined;
  // Log konfigurasi (tanpa password) supaya mudah dicek di log Vercel
  console.log("[prisma] config", {
    host: process.env.DATABASE_HOST ?? "(kosong -> localhost)",
    port: process.env.DATABASE_PORT ?? "(kosong -> 3306)",
    user: process.env.DATABASE_USER ?? "(kosong)",
    database: process.env.DATABASE_NAME ?? "(kosong)",
    passwordSet: Boolean(process.env.DATABASE_PASSWORD),
    ssl: process.env.DATABASE_SSL === "true",
    caLength: ca?.length ?? 0,
    caComplete: Boolean(ca?.includes("-----END CERTIFICATE-----")),
  });
  const adapter = new PrismaMariaDb({
    host: process.env.DATABASE_HOST ?? "localhost",
    port: Number(process.env.DATABASE_PORT ?? 3306),
    user: process.env.DATABASE_USER ?? "root",
    password: process.env.DATABASE_PASSWORD ?? "",
    database: process.env.DATABASE_NAME ?? "quiz_game",
    connectionLimit: 5,
    connectTimeout: 10_000,
    // Database cloud (Aiven) wajib SSL. Di lokal (Laragon) biarkan DATABASE_SSL kosong.
    ssl:
      process.env.DATABASE_SSL === "true"
        ? { ca, rejectUnauthorized: true }
        : undefined,
  });
  return new PrismaClient({ adapter });
}

// Simpan satu instance di globalThis supaya hot reload Next.js
// tidak membuat koneksi baru setiap kali file berubah.
const globalForPrisma = globalThis as unknown as {
  prisma?: ReturnType<typeof createPrismaClient>;
};

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

/** Ambil seluruh data organisasi dalam bentuk yang dipakai question-generator. */
export async function getOrgData(): Promise<OrgData> {
  const [divisions, subDivisions, positions, officials] = await Promise.all([
    prisma.division.findMany({
      select: { id: true, kode: true, kepanjangan: true },
    }),
    prisma.subDivision.findMany({
      select: { id: true, nama: true, divisionId: true },
    }),
    prisma.position.findMany({
      select: {
        id: true,
        namaJabatan: true,
        level: true,
        divisionId: true,
        subDivisionId: true,
      },
    }),
    prisma.official.findMany({
      select: { id: true, nama: true, positionId: true },
    }),
  ]);
  return { divisions, subDivisions, positions, officials };
}
