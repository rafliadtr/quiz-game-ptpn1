"use client";

/**
 * src/app/play/[sessionId]/page.tsx — halaman kuis
 * Timer di sini hanya tampilan. Penilaian waktu yang berlaku dihitung server.
 */
import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";

type PublicQuestion = { no: number; type: string; prompt: string; options: string[] };

type PlayingState = {
  status: "playing";
  division: { kode: string; kepanjangan: string };
  total: number;
  currentIndex: number;
  skor: number;
  timeLimitMs: number;
  feedbackMs: number;
  elapsedMs: number;
  questions: PublicQuestion[];
  results?: boolean[];
};

type Feedback = {
  chosen: number | null;
  correct: boolean;
  timedOut: boolean;
  correctIndex: number;
  explanation: string;
  points: number;
  done: boolean;
};

const LETTERS = ["A", "B", "C", "D"];

// useParams butuh batas Suspense agar halaman bisa di-prerender saat build
export default function PlayPage() {
  return (
    <Suspense
      fallback={
        <Shell>
          <div className="bg-paper p-8 text-lg text-muted sm:p-12">Memuat soal...</div>
        </Shell>
      }
    >
      <PlayGame />
    </Suspense>
  );
}

function PlayGame() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const router = useRouter();

  const [game, setGame] = useState<PlayingState | null>(null);
  const [index, setIndex] = useState(0);
  const [skor, setSkor] = useState(0);
  const [results, setResults] = useState<boolean[]>([]);
  const [remaining, setRemaining] = useState(0);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [error, setError] = useState<string | null>(null);

  const deadline = useRef(0); // waktu (Date.now) saat soal aktif habis
  const submitting = useRef(false);

  const load = useCallback(async () => {
    const res = await fetch(`/api/sessions/${sessionId}`, { cache: "no-store" });
    const data = await res.json();
    if (!res.ok) return setError(data.error ?? "Sesi tidak bisa dimuat.");
    if (data.status === "done") return router.replace(`/result/${sessionId}`);

    const state = data as PlayingState;
    deadline.current = Date.now() - state.elapsedMs + state.timeLimitMs;
    submitting.current = false;
    setGame(state);
    setIndex(state.currentIndex);
    setSkor(state.skor);
    setResults(state.results ?? []);
    setFeedback(null);
  }, [sessionId, router]);

  useEffect(() => {
    load();
  }, [load]);

  const submit = useCallback(
    async (answerIndex: number | null) => {
      if (!game || feedback || submitting.current) return;
      submitting.current = true;

      const res = await fetch(`/api/sessions/${sessionId}/answer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questionIndex: index, answerIndex }),
      });
      const data = await res.json();

      // 409 = posisi soal tidak sinkron (misal dua tab terbuka): ambil ulang dari server
      if (res.status === 409) return load();
      if (!res.ok) {
        submitting.current = false;
        return setError(data.error ?? "Jawaban gagal dikirim.");
      }

      setFeedback({ ...data, chosen: answerIndex });
      setSkor(data.totalScore);
      setResults((r) => [...r.slice(0, index), data.correct]);

      setTimeout(() => {
        if (data.done) return router.push(`/result/${sessionId}`);
        deadline.current = Date.now() + game.timeLimitMs;
        submitting.current = false;
        setFeedback(null);
        setIndex((i) => i + 1);
      }, game.feedbackMs);
    },
    [game, feedback, index, sessionId, load, router]
  );

  // timer tampilan
  useEffect(() => {
    if (!game || feedback) return;
    const tick = () => {
      const left = Math.min(game.timeLimitMs, Math.max(0, deadline.current - Date.now()));
      setRemaining(left);
      if (left === 0) submit(null);
    };
    tick();
    const t = setInterval(tick, 100);
    return () => clearInterval(t);
  }, [game, feedback, index, submit]);

  // keyboard: 1-4 atau A-D
  useEffect(() => {
    if (!game) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const q = game.questions[index];
      if (!q) return;
      const key = e.key.toUpperCase();
      const i = /^[1-4]$/.test(key) ? Number(key) - 1 : LETTERS.indexOf(key);
      if (i >= 0 && i < q.options.length) submit(i);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [game, index, submit]);

  if (error) {
    return (
      <Shell>
        <div className="bg-paper p-8 sm:p-12">
          <h1 className="text-3xl font-semibold tracking-tight">Ada yang tidak beres</h1>
          <p role="alert" className="mt-3 text-lg text-salah">
            {error}
          </p>
          <Link
            href="/"
            className="mt-8 inline-flex h-14 items-center bg-accent px-8 text-lg font-semibold text-ink transition-colors hover:bg-accent-deep"
          >
            Kembali ke awal
          </Link>
        </div>
      </Shell>
    );
  }

  if (!game) {
    return (
      <Shell>
        <div className="bg-paper p-8 text-lg text-muted sm:p-12">Memuat soal...</div>
      </Shell>
    );
  }

  const q = game.questions[index];
  const ratio = feedback ? 0 : remaining / game.timeLimitMs;
  const seconds = Math.ceil(remaining / 1000);
  const urgent = !feedback && ratio < 0.3;

  return (
    <Shell
      bar={
        <>
          <p className="text-white">
            <span className="font-semibold">Kenali Divisimu</span>
            <span className="text-white/70"> · {game.division.kode}</span>
          </p>
          <p className="text-white">
            <span key={skor} className="inline-block animate-pop text-3xl font-semibold tracking-tight tabular-nums">
              {skor}
            </span>{" "}
            <span className="text-white/70">poin</span>
          </p>
        </>
      }
    >
      <div className="bg-paper">
        {/* pita progres: satu balok per soal */}
        <ol aria-label="Progres soal" className="flex h-4 gap-1 bg-paper">
          {Array.from({ length: game.total }, (_, i) => {
            const r = results[i];
            const tone =
              r === true ? "bg-benar" : r === false ? "bg-salah" : i === index ? "bg-accent" : "bg-surface-2";
            const label = r === true ? "benar" : r === false ? "salah" : i === index ? "sedang dijawab" : "belum";
            return (
              <li key={i} className={`flex-1 transition-colors duration-300 ${tone}`}>
                <span className="sr-only">
                  Soal {i + 1}: {label}
                </span>
              </li>
            );
          })}
        </ol>

        <div className="px-5 pt-6 pb-8 sm:px-10 sm:pt-8 sm:pb-10">
          <div className="flex items-end justify-between gap-6">
            <h1 className="text-xl font-semibold tracking-tight">
              Soal {index + 1} <span className="font-normal text-muted">dari {game.total}</span>
            </h1>
            <p className={`text-right leading-none ${urgent ? "text-salah" : ""}`} aria-hidden>
              <span className="text-5xl font-semibold tracking-[-0.04em] tabular-nums sm:text-6xl">
                {feedback ? 0 : seconds}
              </span>
              <span className="ml-1.5 text-base text-muted">detik</span>
            </p>
          </div>

          {/* bar waktu */}
          <div
            className="mt-4 h-2.5 overflow-hidden bg-surface-2"
            role="progressbar"
            aria-label="Sisa waktu"
            aria-valuemin={0}
            aria-valuemax={game.timeLimitMs / 1000}
            aria-valuenow={seconds}
          >
            <div
              className={`h-full origin-left transition-transform duration-100 ease-linear ${urgent ? "bg-salah" : "bg-ink"}`}
              style={{ transform: `scaleX(${ratio})` }}
            />
          </div>

          <p
            key={`prompt-${index}`}
            className="enter mt-10 max-w-[34ch] text-[clamp(1.5rem,1.1rem+1.3vw,2.25rem)] leading-[1.15] font-semibold tracking-[-0.025em] text-balance"
          >
            {q.prompt}
          </p>

          <div key={`opts-${index}`} className="mt-8 grid gap-1.5 sm:grid-cols-2">
            {q.options.map((opt, i) => {
              let tone = "bg-surface hover:bg-surface-2";
              let keyTone = "bg-ink text-white";
              if (feedback) {
                if (i === feedback.correctIndex) {
                  tone = "bg-benar text-white";
                  keyTone = "bg-white text-benar";
                } else if (i === feedback.chosen) {
                  tone = "bg-salah text-white";
                  keyTone = "bg-white text-salah";
                } else {
                  tone = "bg-surface opacity-45";
                }
              }
              return (
                <button
                  key={i}
                  onClick={() => submit(i)}
                  disabled={!!feedback}
                  className={`enter flex min-h-22 items-center gap-4 p-4 text-left text-lg leading-snug font-medium transition-[background-color,opacity,transform] duration-200 not-disabled:active:scale-[0.98] disabled:cursor-default ${tone}`}
                  style={{ "--i": i + 1 } as React.CSSProperties}
                >
                  <span
                    aria-hidden
                    className={`grid size-10 shrink-0 place-items-center font-semibold transition-colors ${keyTone}`}
                  >
                    {LETTERS[i]}
                  </span>
                  {opt}
                </button>
              );
            })}
          </div>

          <div aria-live="polite" className="mt-8 min-h-24">
            {feedback ? (
              <div className="animate-pop">
                <p className={`text-3xl font-semibold tracking-tight ${feedback.correct ? "text-benar" : "text-salah"}`}>
                  {feedback.correct
                    ? `Benar, +${feedback.points} poin`
                    : feedback.timedOut || feedback.chosen === null
                      ? "Waktu habis"
                      : "Kurang tepat"}
                </p>
                <p className="mt-2 max-w-[62ch] text-lg leading-relaxed">{feedback.explanation}</p>
              </div>
            ) : (
              <p className="text-base text-muted">
                Tekan 1 sampai {q.options.length} atau A sampai {LETTERS[q.options.length - 1]} untuk menjawab.
              </p>
            )}
          </div>
        </div>
      </div>
    </Shell>
  );
}

/** Bingkai halaman: latar navy, bar atas di atas latar, kartu kertas di tengah. */
function Shell({ bar, children }: { bar?: React.ReactNode; children: React.ReactNode }) {
  return (
    <main className="mx-auto flex min-h-dvh max-w-[1040px] flex-col px-3 pt-3 pb-10 sm:px-6 sm:pt-6">
      <div className="flex min-h-14 items-center justify-between gap-4 px-1 pb-3">{bar}</div>
      {children}
    </main>
  );
}
