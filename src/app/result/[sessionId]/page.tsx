"use client";

/**
 * src/app/result/[sessionId]/page.tsx — skor akhir + pembahasan
 * Perjalanan digambar ulang stasiun demi stasiun, pembahasan berjajar di sepanjang rel.
 */
import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { LineBadge, ReviewStop, RouteMap } from "@/components/Route";

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

/** Angka skor naik dari 0 saat halaman dibuka (angka berubah, tidak ada yang bergerak, jadi tetap jalan saat "kurangi gerak"). */
function useCountUp(target: number, ms = 1400, delay = 300) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    let frame = 0;
    const start = performance.now() + delay;
    const step = (now: number) => {
      const t = Math.min(1, Math.max(0, (now - start) / ms));
      setValue(Math.round(target * (1 - Math.pow(1 - t, 3))));
      if (t < 1) frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [target, ms, delay]);
  return value;
}

// useParams butuh batas Suspense agar halaman bisa di-prerender saat build
export default function ResultPage() {
  return (
    <Suspense fallback={<Pending />}>
      <ResultLoader />
    </Suspense>
  );
}

function Pending({ error }: { error?: string | null }) {
  return (
    <main className="min-h-dvh">
      <div className="h-16 bg-hijau" />
      <div className="mx-auto max-w-[960px] px-5 pt-10 sm:px-8">
        {error ? (
          <>
            <h1 className="font-display text-4xl font-bold">Hasil tidak bisa dimuat</h1>
            <p role="alert" className="mt-3 text-lg text-salah">
              {error}
            </p>
          </>
        ) : (
          <p className="text-lg text-redup">Menghitung skor...</p>
        )}
      </div>
    </main>
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

  if (error || !result) return <Pending error={error} />;
  return <ResultView result={result} />;
}

function ResultView({ result }: { result: Result }) {
  const skor = useCountUp(result.skor);
  const answered = result.review.filter((r) => r.timeMs !== null && r.chosen !== null);
  const avgSec = answered.length
    ? (answered.reduce((s, r) => s + (r.timeMs ?? 0), 0) / answered.length / 1000).toFixed(1).replace(".", ",")
    : "–";
  const celebrate = result.benar / result.total >= 0.7;
  const stamp = 140; // jeda cap per stasiun (ms)

  return (
    <main className="min-h-dvh pb-20">
      <header className="bg-hijau text-putih">
        <div className="mx-auto flex h-16 max-w-[960px] items-center gap-3 px-4 sm:px-8">
          <LineBadge kode={result.division.kode} />
          <p className="min-w-0 flex-1 truncate text-[15px] font-medium text-putih/90">{result.division.kepanjangan}</p>
          <Link href="/" className="shrink-0 font-display text-lg font-bold tracking-wide underline-offset-4 hover:underline">
            Kenali Divisimu
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-[960px] px-4 sm:px-8">
        {/* papan tujuan: skor */}
        <section className="enter relative mt-5 overflow-hidden rounded-panel bg-hijau px-6 pt-6 pb-8 text-putih sm:mt-8 sm:px-10 sm:pt-8 sm:pb-10">
          {celebrate && <Leaves count={result.benar === result.total ? 26 : 16} />}
          <p className="relative text-lg text-putih/90">
            {result.namaPemain ? <span className="font-semibold text-putih">{result.namaPemain}</span> : "Kamu"} tiba di
            stasiun terakhir jalur {result.division.kode}
          </p>
          <h1 className="relative mt-4 font-display text-[clamp(5.5rem,3rem+11vw,11rem)] leading-[0.82] font-bold tabular-nums">
            {skor}
            <span className="ml-3 font-sans text-[clamp(1.25rem,1rem+1vw,2rem)] font-medium text-putih/90">poin</span>
          </h1>
          <p className="relative mt-6 max-w-[34ch] font-display text-[clamp(1.6rem,1.3rem+1vw,2.2rem)] leading-tight font-bold text-balance">
            {verdict(result.benar, result.total)}
          </p>
        </section>

        {/* peta perjalanan yang dicap */}
        <section className="enter mt-3 rounded-panel bg-abu px-3 pt-6 pb-6 sm:px-8" style={{ "--i": 2 } as React.CSSProperties}>
          <h2 className="px-1 font-display text-2xl font-bold">Perjalananmu</h2>
          <div className="mt-5">
            <RouteMap
              total={result.total}
              index={result.total}
              results={result.review.map((r) => r.correct)}
              showTrain={false}
              stampStagger={stamp}
            />
          </div>
          <div className="mt-5 flex flex-wrap items-center justify-between gap-5 px-1">
            <p className="text-lg">
              <span className="font-semibold text-hijau">{result.benar} benar</span>,{" "}
              <span className="font-semibold text-salah">{result.total - result.benar} salah</span>
              <span className="text-redup">, rata-rata {avgSec} detik per jawaban</span>
            </p>
            <Link
              href="/"
              className="group flex h-14 w-full items-center justify-center gap-3 rounded-panel bg-jingga px-8 font-display text-2xl font-bold tracking-wide text-tinta transition-[background-color,transform] duration-200 hover:bg-jingga-tua active:scale-[0.98] sm:w-auto"
            >
              Main lagi
              <svg viewBox="0 0 20 20" fill="none" aria-hidden className="size-6 transition-transform duration-300 group-hover:translate-x-1.5">
                <path d="M4 10h11m-4.5-5L15 10l-4.5 5" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </Link>
          </div>
        </section>

        {/* pembahasan di sepanjang rel */}
        <section className="mt-16">
          <h2 className="font-display text-[clamp(2.2rem,1.7rem+2vw,3.2rem)] leading-none font-bold">Pembahasan</h2>
          <p className="mt-2 text-redup">Setiap stasiun, jawabanmu, dan penjelasannya.</p>
          <ol className="relative mt-8">
            <span aria-hidden className="absolute top-4 bottom-4 left-[17px] w-1.5 rounded-full bg-hijau" />
            {result.review.map((r) => (
              <li key={r.no} className="relative grid grid-cols-[40px_1fr] gap-x-4 pb-10 last:pb-0 sm:gap-x-6">
                <div>
                  <ReviewStop no={r.no} correct={r.correct} />
                </div>
                <div className="grid gap-x-8 gap-y-4 lg:grid-cols-[1fr_300px]">
                  <div>
                    <p className="pt-1 font-display text-2xl leading-tight font-bold text-balance">{r.prompt}</p>
                    <p className="mt-2 max-w-[62ch] leading-relaxed">{r.explanation}</p>
                  </div>
                  <dl className="space-y-2 self-start">
                    {!r.correct && (
                      <div className="rounded-panel border-2 border-salah/30 bg-putih px-4 py-3">
                        <dt className="text-sm text-redup">Jawabanmu</dt>
                        <dd className="font-semibold text-salah">
                          {r.chosen === null ? "Tidak dijawab" : r.options[r.chosen]}
                        </dd>
                      </div>
                    )}
                    <div className="rounded-panel bg-hijau-muda px-4 py-3">
                      <dt className="text-sm text-redup">{r.correct ? `Jawabanmu, +${r.points} poin` : "Jawaban benar"}</dt>
                      <dd className="font-semibold text-hijau-tua">{r.options[r.correctIndex]}</dd>
                    </div>
                  </dl>
                </div>
              </li>
            ))}
          </ol>
        </section>
      </div>
    </main>
  );
}

/** Daun hijau dan jingga berjatuhan sekali di papan skor, untuk skor tinggi. */
function Leaves({ count }: { count: number }) {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      {Array.from({ length: count }, (_, i) => {
        // posisi semu-acak tapi tetap, tanpa Math.random
        const x = (i * 37) % 100;
        // daun mulai jatuh saat hitungan skor hampir selesai
        const style = {
          left: `${x}%`,
          "--delay": `${1.1 + ((i * 13) % 10) * 0.16}s`,
          "--dur": `${3.2 + ((i * 7) % 6) * 0.25}s`,
          "--dx": `${((i * 29) % 80) - 40}px`,
          "--r0": `${(i * 47) % 360}deg`,
          "--r1": `${((i * 47) % 360) + 260}deg`,
        } as React.CSSProperties;
        return <span key={i} className={`leaf ${i % 3 === 0 ? "bg-jingga" : "bg-putih/80"}`} style={style} />;
      })}
    </div>
  );
}
