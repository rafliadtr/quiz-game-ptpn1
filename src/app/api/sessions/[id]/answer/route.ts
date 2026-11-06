import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";
import type { Question } from "@/lib/question-generator";
import { GAME, type AnswerRecord } from "@/lib/game-config";

const error = (message: string, status: number) =>
  Response.json({ error: message }, { status });

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = await req.json().catch(() => null);

  const questionIndex = Number(body?.questionIndex);
  const chosen: number | null =
    body?.answerIndex == null ? null : Number(body.answerIndex);

  const session = await prisma.gameSession.findUnique({ where: { id } });
  if (!session) return error("Sesi tidak ditemukan", 404);
  if (session.selesai) return error("Sesi sudah selesai", 409);
  if (questionIndex !== session.currentIndex)
    return error("Soal ini sudah dijawab atau belum aktif", 409);

  const questions = session.questions as unknown as Question[];
  const q = questions[questionIndex];
  if (!q) return error("Soal tidak ditemukan", 400);
  if (
    chosen !== null &&
    (!Number.isInteger(chosen) || chosen < 0 || chosen >= q.options.length)
  ) {
    return error("Pilihan jawaban tidak valid", 400);
  }

  // hitung waktu dari server
  const now = new Date();
  const elapsed = Math.max(
    0,
    now.getTime() - session.questionStartedAt.getTime(),
  );
  const timedOut = elapsed > GAME.TIME_LIMIT_MS + GAME.GRACE_MS;
  // soal easter egg: opsi mana pun benar, asal dijawab sebelum waktu habis
  const correct = !timedOut && chosen !== null && (q.allCorrect || chosen === q.answerIndex);
  const remaining = Math.max(0, GAME.TIME_LIMIT_MS - elapsed);
  const points = correct
    ? GAME.BASE_POINTS +
      Math.round((GAME.SPEED_BONUS * remaining) / GAME.TIME_LIMIT_MS)
    : 0;

  const previous = (session.answers as unknown as AnswerRecord[] | null) ?? [];
  const answers: AnswerRecord[] = [
    ...previous,
    {
      index: questionIndex,
      chosen,
      correct,
      timeMs: Math.min(elapsed, GAME.TIME_LIMIT_MS),
      points,
    },
  ];
  const nextIndex = questionIndex + 1;
  const done = nextIndex >= questions.length;

  // updateMany + filter currentIndex = kunci optimis, mencegah jawaban ganda (double klik)
  const updated = await prisma.gameSession.updateMany({
    where: { id, currentIndex: questionIndex, selesai: false },
    data: {
      answers: answers as unknown as Prisma.InputJsonValue,
      skor: { increment: points },
      currentIndex: nextIndex,
      selesai: done,
      // soal berikutnya dimulai setelah layar feedback selesai
      questionStartedAt: new Date(now.getTime() + GAME.FEEDBACK_MS),
    },
  });
  if (updated.count === 0) return error("Jawaban ganda terdeteksi", 409);

  return Response.json({
    correct,
    timedOut,
    // easter egg: pilihan pemain sendiri yang ditandai benar
    correctIndex: q.allCorrect && correct && chosen !== null ? chosen : q.answerIndex,
    explanation: q.explanation,
    points,
    totalScore: session.skor + points,
    done,
  });
}
