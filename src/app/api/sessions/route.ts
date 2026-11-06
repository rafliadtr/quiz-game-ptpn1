/**
 * app/api/sessions/route.ts
 * POST /api/sessions → buat sesi game baru
 * Body: { divisionId: number, mode?: "own" | "mixed", namaPemain?: string }
 */
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";
import { generateQuestions, isEasterEggName, toPublic } from "@/lib/question-generator";
import { GAME } from "@/lib/game-config";

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);

  const divisionId = Number(body?.divisionId);
  const mode = body?.mode === "mixed" ? "mixed" : "own";
  const namaPemain =
    typeof body?.namaPemain === "string" && body.namaPemain.trim()
      ? body.namaPemain.trim().slice(0, 50)
      : null;

  if (!Number.isInteger(divisionId)) {
    return Response.json({ error: "divisionId tidak valid" }, { status: 400 });
  }

  // data organisasi kecil, jadi dimuat sekali lalu dioper ke generator
  const [divisions, subDivisions, positions, officials] = await Promise.all([
    prisma.division.findMany(),
    prisma.subDivision.findMany(),
    prisma.position.findMany(),
    prisma.official.findMany(),
  ]);

  if (!divisions.some((d) => d.id === divisionId)) {
    return Response.json({ error: "Divisi tidak ditemukan" }, { status: 404 });
  }

  const questions = generateQuestions(
    { divisions, subDivisions, positions, officials },
    // nama tertentu (lihat isEasterEggName) membuka soal rahasia DPSB
    { divisionId, mode, count: GAME.QUESTION_COUNT, easterEgg: isEasterEggName(namaPemain) },
  );

  if (questions.length === 0) {
    return Response.json(
      { error: "Data divisi belum cukup untuk membuat soal" },
      { status: 422 },
    );
  }

  const session = await prisma.gameSession.create({
    data: {
      divisionId,
      namaPemain,
      questions: questions as unknown as Prisma.InputJsonValue, // lengkap dengan kunci, hanya di server
      answers: [],
      questionStartedAt: new Date(),
    },
  });

  return Response.json(
    {
      sessionId: session.id,
      total: questions.length,
      timeLimitMs: GAME.TIME_LIMIT_MS,
      feedbackMs: GAME.FEEDBACK_MS,
      questions: toPublic(questions), // tanpa answerIndex & explanation
    },
    { status: 201 },
  );
}
