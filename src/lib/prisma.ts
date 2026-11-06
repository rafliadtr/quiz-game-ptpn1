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

/** Baca env; nilai kosong atau berisi spasi saja dianggap tidak diisi. */
function env(name: string): string | undefined {
  const v = process.env[name]?.trim().replace(/^["']|["']$/g, "");
  return v ? v : undefined;
}

type DbConfig = {
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
  ssl: boolean;
  source: string;
};

/**
 * Susun konfigurasi koneksi. Urutan:
 * 1. DATABASE_HOST, DATABASE_USER, dst.
 * 2. Kalau DATABASE_HOST kosong, ambil dari DATABASE_URL (mysql://user:pass@host:port/db)
 * 3. Default Laragon (localhost), hanya di luar production.
 */
function readDbConfig(): DbConfig {
  const host = env("DATABASE_HOST");
  if (host) {
    return {
      host,
      port: Number(env("DATABASE_PORT") ?? 3306),
      user: env("DATABASE_USER") ?? "root",
      password: process.env.DATABASE_PASSWORD ?? "",
      database: env("DATABASE_NAME") ?? "quiz_game",
      ssl: env("DATABASE_SSL") === "true",
      source: "DATABASE_HOST",
    };
  }

  const url = env("DATABASE_URL");
  if (url) {
    const u = new URL(url);
    const sslMode = u.searchParams.get("ssl-mode") ?? u.searchParams.get("sslmode");
    return {
      host: u.hostname,
      port: Number(u.port || 3306),
      user: decodeURIComponent(u.username),
      password: decodeURIComponent(u.password),
      database: u.pathname.replace(/^\//, "") || "quiz_game",
      ssl:
        env("DATABASE_SSL") === "true" ||
        (sslMode !== null && sslMode.toUpperCase() !== "DISABLED"),
      source: "DATABASE_URL",
    };
  }

  if (process.env.NODE_ENV === "production") {
    // Jangan diam-diam konek ke localhost di server; itu yang membuat ECONNREFUSED 127.0.0.1:3306
    throw new Error(
      "[prisma] DATABASE_HOST / DATABASE_URL belum diisi di environment variables server. " +
        "Tambahkan di Vercel > Settings > Environment Variables (centang Production), lalu Redeploy.",
    );
  }

  return {
    host: "localhost",
    port: 3306,
    user: "root",
    password: "",
    database: "quiz_game",
    ssl: false,
    source: "default lokal",
  };
}

function createPrismaClient() {
  const cfg = readDbConfig();
  const ca = cfg.ssl ? readCa() : undefined;
  // Log konfigurasi (tanpa password) supaya mudah dicek di log Vercel
  console.log("[prisma] config", {
    source: cfg.source,
    host: cfg.host,
    port: cfg.port,
    user: cfg.user,
    database: cfg.database,
    passwordSet: Boolean(cfg.password),
    ssl: cfg.ssl,
    caLength: ca?.length ?? 0,
    caComplete: Boolean(ca?.includes("-----END CERTIFICATE-----")),
  });
  if (cfg.ssl && !ca) {
    console.error(
      "[prisma] SSL aktif tapi DATABASE_SSL_CA kosong; Aiven memakai CA sendiri, koneksi bisa ditolak",
    );
  }
  const adapter = new PrismaMariaDb({
    host: cfg.host,
    port: cfg.port,
    user: cfg.user,
    password: cfg.password,
    database: cfg.database,
    connectionLimit: 5,
    connectTimeout: 10_000,
    // Database cloud (Aiven) wajib SSL. Di lokal (Laragon) biarkan DATABASE_SSL kosong.
    ssl: cfg.ssl ? { ca, rejectUnauthorized: true } : undefined,
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
