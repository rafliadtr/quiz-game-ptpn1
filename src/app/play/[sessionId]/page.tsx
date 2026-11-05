"use client";

/**
 * src/app/play/[sessionId]/page.tsx — halaman kuis
 * Timer di sini hanya tampilan. Penilaian waktu yang berlaku dihitung server.
 */
import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { CheckIcon, CrossIcon, LineBadge, RouteMap } from "@/components/Route";

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
const URGENT_MS = 5_000;

// useParams butuh batas Suspense agar halaman bisa di-prerender saat build
export default function PlayPage() {
  return (
    <Suspense fallback={<Loading />}>
      <PlayGame />
    </Suspense>
  );
}

function Loading() {
  return (
    <main className="min-h-dvh">
      <div className="h-14 bg-hijau" />
      <p className="px-5 pt-10 text-lg text-redup sm:px-8">Kereta sedang disiapkan...</p>
    </main>
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
      <main className="min-h-dvh">
        <div className="h-14 bg-hijau" />
        <div className="mx-auto max-w-[880px] px-5 pt-10 sm:px-8">
          <h1 className="font-display text-4xl font-bold">Perjalanan terhenti</h1>
          <p role="alert" className="mt-3 text-lg text-salah">
            {error}
          </p>
          <Link
            href="/"
            className="mt-8 inline-flex h-14 items-center rounded-panel bg-jingga px-8 font-display text-xl font-bold text-tinta transition-colors hover:bg-jingga-tua"
          >
            Kembali ke awal
          </Link>
        </div>
      </main>
    );
  }

  if (!game) return <Loading />;

  const q = game.questions[index];
  const ratio = feedback ? 0 : remaining / game.timeLimitMs;
  const seconds = Math.ceil(remaining / 1000);
  const urgent = !feedback && remaining > 0 && remaining <= URGENT_MS;

  return (
    <main className="min-h-dvh pb-12">
      {/* strip nama jalur */}
      <header className="sticky top-0 z-30 bg-hijau text-putih">
        <div className="mx-auto flex h-16 max-w-[880px] items-center gap-3 px-4 sm:px-8">
          <LineBadge kode={game.division.kode} />
          <p className="min-w-0 flex-1 truncate text-[15px] leading-tight font-medium text-putih/90">
            {game.division.kepanjangan}
          </p>
          <p className="shrink-0 text-right leading-none">
            <span key={skor} className="inline-block min-w-[3ch] origin-right animate-stamp font-display text-[2rem] font-bold tabular-nums">
              {skor}
            </span>
            <span className="ml-1 text-sm text-putih/90">poin</span>
          </p>
        </div>
      </header>

      <div className="mx-auto max-w-[880px]">
        {/* peta rute + timer */}
        <section className="bg-abu px-3 pt-5 pb-4 sm:mt-4 sm:rounded-panel sm:px-6">
          <RouteMap total={game.total} index={index} results={results} />
          <p className="mt-2 flex justify-between gap-4 px-1 text-sm font-medium text-redup">
            <span className="text-tinta">
              Stasiun {index + 1} dari {game.total}
            </span>
            <span>Stasiun {game.total}: skor akhir</span>
          </p>
          <div className="mt-3 flex items-center gap-3 px-1">
            <div
              className="h-2.5 flex-1 overflow-hidden rounded-full bg-garis"
              role="progressbar"
              aria-label="Sisa waktu"
              aria-valuemin={0}
              aria-valuemax={game.timeLimitMs / 1000}
              aria-valuenow={seconds}
            >
              <div
                className={`h-full origin-left rounded-full bg-jingga transition-transform duration-100 ease-linear ${urgent ? "timer-urgent" : ""}`}
                style={{ transform: `scaleX(${ratio})` }}
              />
            </div>
            <p className="w-20 text-right leading-none" aria-hidden>
              <span
                key={urgent ? seconds : "calm"}
                className={`inline-block font-display text-3xl font-bold tabular-nums ${urgent ? "animate-tick" : ""}`}
              >
                {feedback ? 0 : seconds}
              </span>
              <span className="ml-1 text-sm text-redup">detik</span>
            </p>
          </div>
        </section>

        <div className="px-4 sm:px-0">
          {/* papan stasiun: soal */}
          <section key={`board-${index}`} className="enter-arrive mt-5 rounded-panel bg-hijau px-5 py-5 text-putih sm:px-8 sm:py-7">
            <h1 className="max-w-[30ch] font-display text-[clamp(1.75rem,1.3rem+1.8vw,2.6rem)] leading-[1.08] font-bold text-balance">
              {q.prompt}
            </h1>
          </section>

          {/* pintu jawaban */}
          <div key={`opts-${index}`} className="mt-3 grid gap-2 sm:mt-4 sm:grid-cols-2 sm:gap-2.5">
            {q.options.map((opt, i) => {
              const isCorrect = feedback && i === feedback.correctIndex;
              const isWrongPick = feedback && i === feedback.chosen && !feedback.correct;
              const faded = feedback && !isCorrect && !isWrongPick;
              let tone = "border-garis bg-putih hover:border-hijau hover:bg-hijau-muda";
              let keyTone = "bg-tinta text-putih";
              let motion = "";
              if (isCorrect) {
                tone = "border-hijau bg-hijau text-putih";
                keyTone = "bg-putih text-hijau animate-stamp";
              } else if (isWrongPick) {
                tone = "border-salah bg-salah text-putih";
                keyTone = "bg-putih text-salah";
                motion = "animate-shake";
              } else if (faded) {
                tone = "border-garis bg-putih opacity-40";
              }
              return (
                <button
                  key={i}
                  onClick={() => submit(i)}
                  disabled={!!feedback}
                  className={`enter-arrive relative flex min-h-16 items-center gap-4 rounded-panel border-2 px-4 py-3 text-left text-lg leading-snug font-semibold sm:min-h-20 sm:py-4 transition-[background-color,border-color,opacity] duration-200 not-disabled:active:scale-[0.98] disabled:cursor-default ${tone}`}
                  style={{ "--i": i + 2 } as React.CSSProperties}
                >
                  <span
                    className={`flex w-full items-center gap-4 ${motion} ${isCorrect && feedback?.correct ? "pr-16" : ""}`}
                  >
                    <span
                      aria-hidden
                      className={`grid size-10 shrink-0 place-items-center rounded-full font-display text-xl font-bold transition-colors ${keyTone}`}
                    >
                      {isCorrect ? <CheckIcon className="size-5" /> : isWrongPick ? <CrossIcon className="size-5" /> : LETTERS[i]}
                    </span>
                    <span className="flex-1">{opt}</span>
                  </span>
                  {isCorrect && feedback?.correct && (
                    <span
                      aria-hidden
                      className="absolute top-1/2 right-3 -mt-4 animate-float-up rounded-full bg-jingga px-2.5 py-1 font-display text-lg font-bold text-tinta"
                    >
                      +{feedback.points}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* hasil per soal */}
          <div aria-live="polite" className="mt-6 min-h-28">
            {feedback ? (
              <div className="animate-rise">
                <p
                  className={`flex items-center gap-2.5 font-display text-3xl font-bold ${
                    feedback.correct ? "text-hijau" : "text-salah"
                  }`}
                >
                  <span
                    className={`grid size-9 animate-stamp place-items-center rounded-full text-putih ${
                      feedback.correct ? "bg-hijau" : "bg-salah"
                    }`}
                  >
                    {feedback.correct ? <CheckIcon className="size-5" /> : <CrossIcon className="size-5" />}
                  </span>
                  {feedback.correct
                    ? `Benar, +${feedback.points} poin`
                    : feedback.timedOut || feedback.chosen === null
                      ? "Waktu habis"
                      : "Kurang tepat"}
                </p>
                <p className="mt-2 max-w-[62ch] text-lg leading-relaxed">{feedback.explanation}</p>
              </div>
            ) : (
              <p className="text-base text-redup">
                Tekan 1 sampai {q.options.length} atau A sampai {LETTERS[q.options.length - 1]} untuk menjawab.
              </p>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
