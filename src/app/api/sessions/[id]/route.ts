/**
 * src/app/api/sessions/[id]/route.ts
 * GET /api/sessions/:id
 * - Sesi berjalan  → status "playing": soal tanpa kunci + posisi + sisa waktu (untuk refresh/lanjut main)
 * - Sesi selesai   → status "done": skor + review lengkap dengan kunci jawaban
 */
import { prisma } from "@/lib/prisma";
import { toPublic, type Question } from "@/lib/question-generator";
import { GAME, type AnswerRecord } from "@/lib/game-config";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const session = await prisma.gameSession.findUnique({
    where: { id },
    include: { division: { select: { kode: true, kepanjangan: true } } },
  });
  if (!session) return Response.json({ error: "Sesi tidak ditemukan" }, { status: 404 });

  const questions = session.questions as unknown as Question[];
  const answers = (session.answers as unknown as AnswerRecord[] | null) ?? [];

  if (!session.selesai) {
    return Response.json({
      status: "playing",
      division: session.division,
      total: questions.length,
      currentIndex: session.currentIndex,
      skor: session.skor,
      timeLimitMs: GAME.TIME_LIMIT_MS,
      feedbackMs: GAME.FEEDBACK_MS,
      // bisa negatif jika soal berikutnya belum dimulai (masih jeda feedback)
      elapsedMs: Date.now() - session.questionStartedAt.getTime(),
      questions: toPublic(questions),
      // benar/salah soal yang sudah dijawab, untuk pita progres setelah refresh
      results: answers.map((a) => a.correct),
    });
  }

  const review = questions.map((q, i) => {
    const a = answers.find((x) => x.index === i);
    return {
      no: i + 1,
      prompt: q.prompt,
      options: q.options,
      // easter egg: pilihan pemain sendiri yang ditandai benar
      correctIndex: q.allCorrect && a?.correct && a.chosen !== null ? a.chosen : q.answerIndex,
      chosen: a?.chosen ?? null,
      correct: a?.correct ?? false,
      points: a?.points ?? 0,
      timeMs: a?.timeMs ?? null,
      explanation: q.explanation,
    };
  });

  return Response.json({
    status: "done",
    namaPemain: session.namaPemain,
    division: session.division,
    skor: session.skor,
    benar: review.filter((r) => r.correct).length,
    total: questions.length,
    review,
  });
}
