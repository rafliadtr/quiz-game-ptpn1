export const GAME = {
  QUESTION_COUNT: 10,
  TIME_LIMIT_MS: 15_000, // waktu per soal
  GRACE_MS: 1_500, // toleransi latensi jaringan
  FEEDBACK_MS: 2_500, // lama layar benar/salah sebelum UI otomatis lanjut
  BASE_POINTS: 100, // poin untuk jawaban benar
  SPEED_BONUS: 50, // bonus maksimal jika menjawab seketika
} as const;

/** Satu jawaban yang tersimpan di GameSession.answers */
export type AnswerRecord = {
  index: number;
  chosen: number | null;
  correct: boolean;
  timeMs: number;
  points: number;
};
