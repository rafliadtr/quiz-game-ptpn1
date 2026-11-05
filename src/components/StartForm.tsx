"use client";

/**
 * Layar awal "Peta Jalur Divisi". Pemain memilih jalurnya (divisi) dan rute (mode),
 * papan keberangkatan hijau terisi langsung dari pilihan itu.
 */
import { useState } from "react";
import { useRouter } from "next/navigation";
import { GAME } from "@/lib/game-config";
import { LineBadge } from "@/components/Route";

type DivisionOption = { id: number; kode: string; kepanjangan: string };
type Mode = "own" | "mixed";

const MODES: { value: Mode; label: string; hint: string }[] = [
  { value: "own", label: "Jalur divisiku", hint: "Semua soal tentang divisimu" },
  { value: "mixed", label: "Lintas jalur", hint: "Sebagian soal dari divisi lain" },
];

/** Foto acara sharing session di Head Office */
const PHOTOS = [
  {
    src: "/kebun/sharing-session.jpeg",
    alt: "Pemateri memegang mikrofon di depan dinding berlogo PTPN I, peserta duduk mengelilingi meja rapat berbentuk U",
  },
  {
    src: "/kebun/sharing-session2.jpeg",
    alt: "Peserta sharing session menyimak pemateri dari meja rapat panjang, dengan laptop dan catatan di depan mereka",
  },
  {
    src: "/kebun/sharing-session3.jpeg",
    alt: "Pemateri menulis di flipchart di ruang rapat PTPN I sementara peserta di sisi meja menyimak",
  },
];

export default function StartForm({ divisions }: { divisions: DivisionOption[] | null }) {
  const router = useRouter();
  const [nama, setNama] = useState("");
  const [divisionId, setDivisionId] = useState<number | null>(null);
  const [mode, setMode] = useState<Mode>("own");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const chosen = divisions?.find((d) => d.id === divisionId) ?? null;

  async function start(e: React.FormEvent) {
    e.preventDefault();
    if (!divisionId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ divisionId, mode, namaPemain: nama }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Permainan gagal dimulai.");
      router.push(`/play/${data.sessionId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Permainan gagal dimulai.");
      setLoading(false);
    }
  }

  return (
    <div className="min-h-dvh">
      {/* strip nama layanan */}
      <header className="sticky top-0 z-20 bg-hijau text-putih">
        <div className="flex h-14 items-center justify-between gap-4 px-5 sm:px-8">
          <p className="flex items-center gap-2.5 font-display text-xl font-bold tracking-wide">
            <RouteGlyph />
            Kenali Divisimu
          </p>
          <p className="text-sm font-medium text-putih/90">PTPN I Head Office</p>
        </div>
      </header>

      <main className="lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(400px,0.8fr)]">
        <div className="px-5 pt-8 pb-10 sm:px-10 sm:pt-12 lg:px-12 xl:px-16">
          <h1
            className="enter max-w-[16ch] font-display text-[clamp(2.6rem,1.6rem+4vw,4.75rem)] leading-[0.95] font-bold tracking-[-0.01em] text-balance"
            style={{ "--i": 1 } as React.CSSProperties}
          >
            Seberapa kenal kamu dengan divisimu?
          </h1>
          {/* di HP cukup satu baris aturan, supaya pilihan jalur langsung terlihat */}
          <p className="enter mt-3 text-lg leading-snug lg:hidden" style={{ "--i": 2 } as React.CSSProperties}>
            {GAME.QUESTION_COUNT} stasiun, {GAME.TIME_LIMIT_MS / 1000} detik per soal. Makin cepat, makin besar poinnya.
          </p>
          <p className="enter mt-5 hidden max-w-[48ch] text-lg leading-relaxed lg:block" style={{ "--i": 2 } as React.CSSProperties}>
            Satu perjalanan, {GAME.QUESTION_COUNT} stasiun. Di tiap stasiun ada satu soal tentang kepanjangan divisi,
            sub divisi, atau siapa menjabat apa. Kamu punya {GAME.TIME_LIMIT_MS / 1000} detik, dan makin cepat menjawab,
            makin besar poinnya (sampai {GAME.BASE_POINTS + GAME.SPEED_BONUS} per soal). Hati-hati, beberapa soal sengaja
            menjebak.
          </p>

          {/* strip rute versi HP */}
          <div className="enter mt-5 lg:hidden" style={{ "--i": 3 } as React.CSSProperties}>
            <DepartureBoard nama={nama} division={chosen} mode={mode} compact />
          </div>

          {divisions === null ? (
            <p className="mt-12 text-lg text-redup">Memuat daftar jalur...</p>
          ) : divisions.length === 0 ? (
            <p className="mt-12 rounded-panel bg-abu p-6 text-lg">
              Belum ada divisi yang terdaftar. Tambahkan data divisi terlebih dulu, lalu muat ulang halaman ini.
            </p>
          ) : (
            <form onSubmit={start} className="mt-8 space-y-11 lg:mt-10">
              <fieldset>
                <legend className="font-display text-2xl font-bold">Pilih jalurmu</legend>
                <p className="mt-1 text-redup">Setiap divisi adalah satu jalur.</p>
                <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-2 xl:grid-cols-3">
                  {divisions.map((d, i) => {
                    const selected = d.id === divisionId;
                    return (
                      <label
                        key={d.id}
                        className={`enter group flex cursor-pointer flex-col gap-2.5 rounded-panel border-2 p-3 transition-[background-color,border-color,transform] duration-200 active:scale-[0.98] has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-jingga ${
                          selected ? "border-hijau bg-hijau-muda" : "border-garis bg-putih hover:border-hijau/50"
                        }`}
                        style={{ "--i": 5 + Math.min(i, 12) * 0.5 } as React.CSSProperties}
                      >
                        <input
                          type="radio"
                          name="division"
                          value={d.id}
                          checked={selected}
                          onChange={() => setDivisionId(d.id)}
                          className="sr-only"
                        />
                        <LineBadge kode={d.kode} size="sm" tone={selected ? "green" : "muted"} className="self-start transition-colors" />
                        <span className="line-clamp-2 text-sm leading-snug">{d.kepanjangan}</span>
                      </label>
                    );
                  })}
                </div>
              </fieldset>

              <fieldset>
                <legend className="font-display text-2xl font-bold">Rute soal</legend>
                <div className="mt-4 grid grid-cols-2 gap-2">
                  {MODES.map((m) => {
                    const selected = mode === m.value;
                    return (
                      <label
                        key={m.value}
                        className={`cursor-pointer rounded-panel border-2 p-4 transition-colors duration-200 has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-jingga ${
                          selected ? "border-hijau bg-hijau-muda" : "border-garis bg-putih hover:border-hijau/50"
                        }`}
                      >
                        <input
                          type="radio"
                          name="mode"
                          value={m.value}
                          checked={selected}
                          onChange={() => setMode(m.value)}
                          className="sr-only"
                        />
                        <span className="block text-lg font-semibold">{m.label}</span>
                        <span className="mt-1 block text-sm text-redup">{m.hint}</span>
                      </label>
                    );
                  })}
                </div>
              </fieldset>

              <div>
                <label htmlFor="nama" className="block font-display text-2xl font-bold">
                  Nama kamu
                </label>
                <input
                  id="nama"
                  value={nama}
                  onChange={(e) => setNama(e.target.value)}
                  maxLength={50}
                  autoComplete="name"
                  placeholder="Opsional, tampil di papan keberangkatan"
                  className="mt-3 h-14 w-full rounded-panel border-2 border-garis bg-abu px-4 text-lg transition-colors outline-none placeholder:text-redup focus-visible:border-hijau focus-visible:bg-putih focus-visible:outline-none"
                />
              </div>

              {/* tombol menempel di bawah layar selama formulir terlihat */}
              <div className="sticky bottom-0 z-10 -mx-5 border-t border-garis bg-putih/95 px-5 pt-4 pb-5 backdrop-blur-sm sm:-mx-10 sm:px-10 lg:-mx-12 lg:px-12 xl:-mx-16 xl:px-16">
                <button
                  type="submit"
                  disabled={!divisionId || loading}
                  className="group flex h-16 w-full items-center justify-center gap-3 rounded-panel bg-jingga px-8 font-display text-2xl font-bold tracking-wide text-tinta transition-[background-color,transform] duration-200 hover:bg-jingga-tua active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-abu disabled:text-redup disabled:active:scale-100"
                >
                  {loading ? "Menyiapkan soal..." : chosen ? `Berangkat di jalur ${chosen.kode}` : "Berangkat"}
                  {!loading && (
                    <svg viewBox="0 0 20 20" fill="none" aria-hidden className="size-6 transition-transform duration-300 group-enabled:group-hover:translate-x-1.5">
                      <path d="M4 10h11m-4.5-5L15 10l-4.5 5" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </button>
                <p className="mt-3 text-sm text-redup" aria-live="polite">
                  {!divisionId ? "Pilih jalurmu dulu untuk berangkat." : "Tekan 1 sampai 4 di keyboard untuk menjawab lebih cepat."}
                </p>
                {error && (
                  <p role="alert" className="mt-3 font-medium text-salah">
                    {error}
                  </p>
                )}
              </div>
            </form>
          )}
        </div>

        {/* papan keberangkatan versi desktop */}
        <aside className="hidden lg:block">
          <div className="sticky top-14 h-[calc(100dvh-3.5rem)] p-4 pl-0">
            <DepartureBoard nama={nama} division={chosen} mode={mode} />
          </div>
        </aside>
      </main>
    </div>
  );
}

/** Ikon jalur kecil di strip: dua stasiun dihubungkan rel */
function RouteGlyph() {
  return (
    <svg viewBox="0 0 28 14" aria-hidden className="h-3.5 w-7">
      <rect x="4" y="5" width="20" height="4" rx="2" fill="currentColor" opacity=".55" />
      <circle cx="5" cy="7" r="4" className="fill-putih" />
      <circle cx="23" cy="7" r="4" className="fill-jingga" />
    </svg>
  );
}

/** Papan keberangkatan hijau: terisi langsung dari isian formulir. */
function DepartureBoard({
  nama,
  division,
  mode,
  compact = false,
}: {
  nama: string;
  division: DivisionOption | null;
  mode: Mode;
  compact?: boolean;
}) {
  const stations = GAME.QUESTION_COUNT;
  return (
    <section
      aria-label="Papan keberangkatan"
      className={`relative flex flex-col overflow-hidden rounded-panel bg-hijau text-putih ${compact ? "" : "h-full"}`}
    >
      <div className={compact ? "p-4" : "p-8 xl:p-10"}>
        <div className="flex items-center gap-4">
          <LineBadge
            key={division?.kode ?? "none"}
            kode={division?.kode ?? "?"}
            size={compact ? "lg" : "xl"}
            tone="light"
            className={division ? "animate-stamp" : "opacity-40"}
          />
          <p className={`leading-snug ${compact ? "text-base" : "text-xl"} ${division ? "" : "text-putih/90"}`}>
            {division ? division.kepanjangan : compact ? "Pilih jalurmu di bawah" : "Pilih jalurmu di formulir"}
          </p>
        </div>

        {/* rute 10 stasiun, menyala satu per satu saat jalur dipilih */}
        <ol key={division?.kode ?? "none"} aria-hidden className={`relative flex items-center justify-between ${compact ? "mt-4" : "mt-10"}`}>
          <span className="absolute inset-x-2 top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-putih/25" />
          {division && <span className="draw-x absolute inset-x-2 top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-putih" />}
          {Array.from({ length: stations }, (_, i) => {
            const last = i === stations - 1;
            return (
              <li
                key={i}
                className={`relative rounded-full ${compact ? "size-4 border-[3px]" : "size-6 border-4"} ${
                  division ? "animate-stamp" : ""
                } ${last && division ? "border-jingga bg-jingga" : division ? "border-putih bg-hijau" : "border-putih/35 bg-hijau"}`}
                style={division ? { animationDelay: `${200 + i * 90}ms` } : undefined}
              />
            );
          })}
        </ol>
        <p className={`flex justify-between text-sm text-putih/90 ${compact ? "mt-2" : "mt-3"}`}>
          <span>Berangkat</span>
          <span>Stasiun {stations}: skor akhir</span>
        </p>

        <dl className={`mt-10 grid-cols-2 gap-x-6 gap-y-4 border-t border-putih/20 pt-8 ${compact ? "hidden" : "grid"}`}>
          <div className="min-w-0">
            <dt className="text-sm text-putih/90">Penumpang</dt>
            <dd className={`mt-0.5 truncate font-display font-bold ${compact ? "text-xl" : "text-3xl"}`}>
              {nama.trim() || "Tanpa nama"}
            </dd>
          </div>
          <div>
            <dt className="text-sm text-putih/90">Rute</dt>
            <dd className={`mt-0.5 font-display font-bold ${compact ? "text-xl" : "text-3xl"}`}>
              {mode === "own" ? "Jalur divisiku" : "Lintas jalur"}
            </dd>
          </div>
        </dl>
      </div>

      {/* poster foto acara di peron */}
      {!compact && (
        <figure className="relative mx-8 mb-8 min-h-0 flex-1 overflow-hidden rounded-panel bg-hijau-tua xl:mx-10 xl:mb-10">
          <div className="crossfade absolute inset-0">
            {PHOTOS.map((p, i) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={p.src}
                src={p.src}
                alt={p.alt}
                loading={i === 0 ? "eager" : "lazy"}
                className="absolute inset-0 size-full object-cover object-[50%_45%]"
              />
            ))}
          </div>
          <figcaption className="absolute bottom-0 left-0 rounded-tr-panel bg-hijau px-4 py-2 text-sm font-medium">
            Sharing Session, Head Office PTPN I
          </figcaption>
        </figure>
      )}
    </section>
  );
}
