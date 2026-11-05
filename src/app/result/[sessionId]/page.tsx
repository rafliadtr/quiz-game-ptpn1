"use client";

/**
 * src/app/result/[sessionId]/page.tsx — skor akhir + pembahasan
 */
import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import Stripe from "@/components/Stripe";
import { useReveal } from "@/lib/use-reveal";

type ReviewItem = {
  no: number;
  prompt: string;
  options: string[];
  correctIndex: number;
  chosen: number | null;
  correct: boolean;
  points: number;
  timeMs: number | null;
  explanation: string;
};

type Result = {
  status: "done";
  namaPemain: string | null;
  division: { kode: string; kepanjangan: string };
  skor: number;
  benar: number;
  total: number;
  review: ReviewItem[];
};

function verdict(benar: number, total: number) {
  const r = benar / total;
  if (r === 1) return "Sempurna. Kamu hafal betul struktur organisasinya.";
  if (r >= 0.7) return "Mantap, kamu cukup kenal dengan divisimu.";
  if (r >= 0.4) return "Lumayan. Baca pembahasannya, lalu coba lagi.";
  return "Masih banyak yang perlu dikenali. Pembahasan di bawah bisa membantu.";
}

/** Angka skor naik dari 0 saat halaman dibuka. */
function useCountUp(target: number, ms = 900) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let frame = 0;
    const start = performance.now();
    const step = (now: number) => {
      const t = reduced ? 1 : Math.min(1, (now - start) / ms);
      setValue(Math.round(target * (1 - Math.pow(1 - t, 3))));
      if (t < 1) frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [target, ms]);
  return value;
}

// useParams butuh batas Suspense agar halaman bisa di-prerender saat build
export default function ResultPage() {
  return (
    <Suspense
      fallback={
        <main className="mx-auto max-w-[1040px] px-3 py-6 sm:px-6">
          <div className="bg-paper p-8 text-lg text-muted sm:p-12">Menghitung skor...</div>
        </main>
      }
    >
      <ResultLoader />
    </Suspense>
  );
}

function ResultLoader() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const router = useRouter();
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const res = await fetch(`/api/sessions/${sessionId}`, { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) return setError(data.error ?? "Hasil tidak bisa dimuat.");
      if (data.status === "playing") return router.replace(`/play/${sessionId}`);
      setResult(data);
    })();
  }, [sessionId, router]);

  if (error || !result) {
    return (
      <main className="mx-auto max-w-[1040px] px-3 py-6 sm:px-6">
        <div className="bg-paper p-8 sm:p-12">
          {error ? (
            <>
              <h1 className="text-3xl font-semibold tracking-tight">Hasil tidak bisa dimuat</h1>
              <p role="alert" className="mt-3 text-lg text-salah">
                {error}
              </p>
            </>
          ) : (
            <p className="text-lg text-muted">Menghitung skor...</p>
          )}
        </div>
      </main>
    );
  }

  return <ResultView result={result} />;
}

function ResultView({ result }: { result: Result }) {
  const skor = useCountUp(result.skor);
  useReveal();
  const answered = result.review.filter((r) => r.timeMs !== null && r.chosen !== null);
  const avgSec = answered.length
    ? (answered.reduce((s, r) => s + (r.timeMs ?? 0), 0) / answered.length / 1000).toFixed(1).replace(".", ",")
    : "–";

  return (
    <main className="mx-auto max-w-[1040px] px-3 pt-3 pb-16 sm:px-6 sm:pt-6">
      <div className="flex min-h-14 items-center justify-between gap-4 px-1 pb-3 text-white">
        <Link href="/" className="font-semibold hover:text-accent">
          Kenali Divisimu
        </Link>
        <p className="text-white/70">{result.division.kepanjangan}</p>
      </div>

      {/* tiket skor: badan + sobekan */}
      <section className="enter relative grid bg-paper md:grid-cols-[1fr_300px]">
        <div className="p-6 sm:p-10">
          <p className="text-lg">
            {result.namaPemain ? <span className="font-semibold">{result.namaPemain}</span> : "Hasil kamu"}
            <span className="text-muted"> · {result.division.kode}</span>
          </p>
          <h1 className="mt-6 text-[clamp(5rem,3rem+9vw,10rem)] leading-[0.85] font-semibold tracking-[-0.06em] tabular-nums">
            {skor}
            <span className="ml-3 text-[clamp(1.25rem,1rem+1vw,2rem)] font-medium tracking-tight text-muted">poin</span>
          </h1>
          <p className="mt-8 max-w-[40ch] text-2xl leading-snug font-semibold tracking-tight">
            {verdict(result.benar, result.total)}
          </p>
        </div>

        {/* garis sobek: titik bulat + takik di kedua ujung */}
        <div className="relative flex flex-col justify-between gap-8 border-t-[6px] border-dotted border-surface-2 bg-surface p-6 sm:p-10 md:border-t-0 md:border-l-[6px]">
          <span aria-hidden className="absolute -top-4 -left-4 hidden size-8 rounded-full bg-ground md:block" />
          <span aria-hidden className="absolute -bottom-4 -left-4 hidden size-8 rounded-full bg-ground md:block" />
          <dl className="grid grid-cols-3 gap-4 md:grid-cols-1 md:gap-6">
            <div>
              <dt className="text-sm text-muted">Benar</dt>
              <dd className="text-4xl font-semibold tracking-tight tabular-nums text-benar">
                {result.benar}
                <span className="text-xl text-muted">/{result.total}</span>
              </dd>
            </div>
            <div>
              <dt className="text-sm text-muted">Salah</dt>
              <dd className="text-4xl font-semibold tracking-tight tabular-nums text-salah">
                {result.total - result.benar}
              </dd>
            </div>
            <div>
              <dt className="text-sm text-muted">Rata-rata waktu</dt>
              <dd className="text-4xl font-semibold tracking-tight tabular-nums">
                {avgSec}
                <span className="text-xl text-muted"> dtk</span>
              </dd>
            </div>
          </dl>
          <Link
            href="/"
            className="flex h-16 items-center justify-center bg-accent px-6 text-xl font-semibold tracking-tight text-ink transition-[background-color,transform] duration-200 hover:bg-accent-deep active:scale-[0.98]"
          >
            Main lagi
          </Link>
        </div>
      </section>
      <Stripe height={10} bars={80} className="[&>span:nth-child(even)]:bg-paper" />

      <section className="mt-20">
        <h2 className="px-1 text-[clamp(2rem,1.5rem+2vw,3rem)] font-semibold tracking-[-0.04em] text-white">
          Pembahasan
        </h2>
        <ol className="mt-6 space-y-1.5">
          {result.review.map((r) => (
            <li
              key={r.no}
              className="reveal grid gap-x-6 gap-y-4 bg-paper p-5 sm:grid-cols-[56px_1fr] sm:p-7 lg:grid-cols-[56px_1fr_300px]"
            >
              <p
                className={`grid size-14 place-items-center text-2xl font-semibold tabular-nums text-white ${
                  r.correct ? "bg-benar" : "bg-salah"
                }`}
              >
                <span className="sr-only">Soal </span>
                {r.no}
                <span className="sr-only">{r.correct ? ", benar" : ", salah"}</span>
              </p>
              <div>
                <p className="text-xl leading-snug font-semibold tracking-tight">{r.prompt}</p>
                <p className="mt-2 leading-relaxed">{r.explanation}</p>
              </div>
              <dl className="space-y-2 sm:col-start-2 lg:col-start-auto">
                {!r.correct && (
                  <div className="bg-surface px-4 py-3">
                    <dt className="text-sm text-muted">Jawabanmu</dt>
                    <dd className="font-medium text-salah">
                      {r.chosen === null ? "Tidak dijawab" : r.options[r.chosen]}
                    </dd>
                  </div>
                )}
                <div className="bg-surface px-4 py-3">
                  <dt className="text-sm text-muted">{r.correct ? `Jawabanmu, +${r.points} poin` : "Jawaban benar"}</dt>
                  <dd className="font-medium text-benar">{r.options[r.correctIndex]}</dd>
                </div>
              </dl>
            </li>
          ))}
        </ol>
      </section>
    </main>
  );
}
