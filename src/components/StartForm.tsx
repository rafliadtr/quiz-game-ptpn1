"use client";

/**
 * Layar awal. Kiri: kartu formulir. Kanan: foto arsip kebun PTPN (teh, kopi, karet)
 * dengan kartu peserta yang terisi langsung saat nama dan divisi dipilih.
 */
import { useState } from "react";
import { useRouter } from "next/navigation";
import Stripe from "@/components/Stripe";
import { GAME } from "@/lib/game-config";
import { useReveal } from "@/lib/use-reveal";

type DivisionOption = { id: number; kode: string; kepanjangan: string };
type Mode = "own" | "mixed";

const MODES: { value: Mode; label: string; hint: string }[] = [
  { value: "own", label: "Divisiku saja", hint: "Semua soal tentang divisimu" },
  { value: "mixed", label: "Campur", hint: "Sebagian soal dari divisi lain" },
];

/** Foto arsip, sumber dan lisensi di public/kebun/credits.json */
const PHOTOS = [
  {
    src: "/kebun/sharing-session.jpeg",
    w: 2268,
    h: 4032,
    alt: "Pemateri memegang mikrofon di depan dinding berlogo PTPN I, peserta duduk mengelilingi meja rapat berbentuk U",
    caption: "Sharing Session",
  },
  {
    src: "/kebun/sharing-session2.jpeg",
    w: 2268,
    h: 4032,
    alt: "Peserta sharing session menyimak pemateri dari meja rapat panjang, dengan laptop dan catatan di depan mereka",
    caption: "Sharing Session",
  },
  {
    src: "/kebun/sharing-session3.jpeg",
    w: 2268,
    h: 4032,
    alt: "Pemateri menulis di flipchart di ruang rapat PTPN I sementara peserta di sisi meja menyimak",
    caption: "Sharing Session",
  },
  {
    src: "/kebun/teh-garoet.jpg",
    w: 1840,
    h: 1500,
    alt: "Lereng gunung berselimut kebun teh dan rumah administratur",
    caption: "Kebun teh Waspada, Garut",
  },
];

const FACTS = [
  { value: GAME.QUESTION_COUNT, note: "soal dalam satu sesi" },
  { value: GAME.TIME_LIMIT_MS / 1000, note: "detik untuk tiap soal" },
  {
    value: GAME.BASE_POINTS + GAME.SPEED_BONUS,
    note: "poin maksimal per soal",
  },
];

export default function StartForm({
  divisions,
}: {
  divisions: DivisionOption[] | null;
}) {
  const router = useRouter();
  const [nama, setNama] = useState("");
  const [divisionId, setDivisionId] = useState<number | null>(null);
  const [mode, setMode] = useState<Mode>("own");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const chosen = divisions?.find((d) => d.id === divisionId) ?? null;
  useReveal([divisions]);

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
    <main className="grid grid-cols-1 gap-3 p-3 lg:grid-cols-2">
      {/* ---------- foto kebun + kartu peserta ---------- */}
      <section
        aria-label="Kartu peserta"
        className="relative h-[60svh] min-h-105 overflow-hidden bg-black lg:order-2 lg:sticky lg:top-3 lg:h-[calc(100dvh-24px)]"
      >
        <div className="crossfade absolute inset-0">
          {PHOTOS.map((p, i) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={p.src}
              src={p.src}
              width={p.w}
              height={p.h}
              alt={p.alt}
              loading={i === 0 ? "eager" : "lazy"}
              className="archival absolute inset-0 size-full object-cover"
            />
          ))}
        </div>

        <ParticipantCard nama={nama} division={chosen} mode={mode} />

        <ul
          aria-hidden
          className="crossfade absolute right-0 bottom-0 hidden sm:block lg:right-auto lg:left-0"
        >
          {PHOTOS.map((p) => (
            <li
              key={p.src}
              className="absolute right-0 bottom-0 bg-ground px-4 py-2.5 text-sm whitespace-nowrap text-white lg:right-auto lg:left-0"
            >
              {p.caption}
            </li>
          ))}
        </ul>
      </section>

      {/* ---------- kartu formulir ---------- */}
      <div className="-mt-9 bg-paper lg:order-1 lg:mt-0">
        <Stripe />
        <div className="px-5 pt-8 pb-10 sm:px-12 sm:pt-10 lg:px-10 xl:px-14">
          <h1
            className="enter mt-2 max-w-[19ch] text-[clamp(2rem,1.2rem+3.1vw,3.75rem)] leading-[0.98] font-semibold tracking-[-0.04em]"
            style={{ "--i": 1 } as React.CSSProperties}
          >
            Seberapa kenal kamu dengan divisimu?
          </h1>
          <p
            className="enter mt-6 max-w-[46ch] text-lg leading-relaxed"
            style={{ "--i": 2 } as React.CSSProperties}
          >
            Tebak kepanjangan divisi, sub divisi, dan siapa menjabat apa. Makin
            cepat menjawab, makin besar poinnya. Hati-hati, beberapa soal
            sengaja menjebak.
          </p>

          <dl
            className="enter mt-10 grid grid-cols-3 gap-4 bg-surface p-5 sm:p-6"
            style={{ "--i": 3 } as React.CSSProperties}
          >
            {FACTS.map((f) => (
              <div key={f.value}>
                <dt className="text-[clamp(2rem,1.4rem+1.6vw,2.75rem)] leading-none font-semibold tracking-[-0.04em] tabular-nums">
                  {f.value}
                </dt>
                <dd className="mt-2 text-sm leading-snug text-muted">
                  {f.note}
                </dd>
              </div>
            ))}
          </dl>

          {divisions === null ? (
            <p className="mt-14 text-lg text-muted">Memuat daftar divisi...</p>
          ) : divisions.length === 0 ? (
            <p className="mt-14 bg-surface p-6 text-lg">
              Belum ada divisi yang terdaftar. Tambahkan data divisi terlebih
              dulu, lalu muat ulang halaman ini.
            </p>
          ) : (
            <form onSubmit={start} className="mt-14 space-y-12">
              <div>
                <label
                  htmlFor="nama"
                  className="block text-xl font-semibold tracking-tight"
                >
                  Nama kamu
                </label>
                <input
                  id="nama"
                  value={nama}
                  onChange={(e) => setNama(e.target.value)}
                  maxLength={50}
                  autoComplete="name"
                  placeholder="Opsional, tampil di kartu dan papan skor"
                  className="mt-3 h-14 w-full bg-surface px-4 text-lg outline-none placeholder:text-muted focus-visible:bg-surface-2"
                />
              </div>

              <fieldset>
                <legend className="text-xl font-semibold tracking-tight">
                  Pilih divisimu
                </legend>
                <div className="mt-4 grid grid-cols-2 gap-1.5 sm:grid-cols-3 lg:grid-cols-2 xl:grid-cols-3">
                  {divisions.map((d) => {
                    const selected = d.id === divisionId;
                    return (
                      <label
                        key={d.id}
                        className={`reveal group cursor-pointer p-3.5 transition-[background-color,transform] duration-200 active:scale-[0.98] has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-accent ${
                          selected
                            ? "bg-ink text-white"
                            : "bg-surface hover:bg-surface-2"
                        }`}
                      >
                        <input
                          type="radio"
                          name="division"
                          value={d.id}
                          checked={selected}
                          onChange={() => setDivisionId(d.id)}
                          className="sr-only"
                        />
                        <span className="block text-lg leading-none font-semibold tracking-[-0.02em]">
                          {d.kode}
                        </span>
                        <span
                          className={`mt-2 line-clamp-2 text-[13px] leading-snug ${selected ? "text-white/80" : "text-muted"}`}
                        >
                          {d.kepanjangan}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </fieldset>

              <fieldset>
                <legend className="text-xl font-semibold tracking-tight">
                  Jenis soal
                </legend>
                <div className="mt-4 grid grid-cols-2 gap-1.5">
                  {MODES.map((m) => {
                    const selected = mode === m.value;
                    return (
                      <label
                        key={m.value}
                        className={`reveal cursor-pointer p-4 transition-colors duration-200 has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-accent ${
                          selected
                            ? "bg-ink text-white"
                            : "bg-surface hover:bg-surface-2"
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
                        <span className="block text-lg font-semibold">
                          {m.label}
                        </span>
                        <span
                          className={`mt-1 block text-sm ${selected ? "text-white/80" : "text-muted"}`}
                        >
                          {m.hint}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </fieldset>

              {/* tombol menempel di bawah layar selama formulir terlihat, jadi selalu terjangkau */}
              <div className="sticky bottom-0 z-10 -mx-5 bg-paper px-5 pt-4 pb-5 sm:-mx-12 sm:px-12 lg:-mx-10 lg:px-10 xl:-mx-14 xl:px-14">
                <button
                  type="submit"
                  disabled={!divisionId || loading}
                  className="h-16 w-full bg-accent px-8 text-xl font-semibold tracking-tight text-ink transition-[background-color,transform] duration-200 hover:bg-accent-deep active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-surface-2 disabled:text-muted disabled:active:scale-100"
                >
                  {loading
                    ? "Menyiapkan soal..."
                    : chosen
                      ? `Mulai main sebagai ${chosen.kode}`
                      : "Mulai main"}
                </button>
                <p className="mt-3 text-sm text-muted" aria-live="polite">
                  {!divisionId
                    ? "Pilih divisimu dulu untuk mulai."
                    : "Tekan 1 sampai 4 di keyboard untuk menjawab lebih cepat."}
                </p>
                {error && (
                  <p role="alert" className="mt-3 font-medium text-salah">
                    {error}
                  </p>
                )}
              </div>
            </form>
          )}

          <p className="mt-16 text-[13px] leading-relaxed text-muted">
            Foto kebun teh Waspada, Garut:{" "}
            <a
              className="underline underline-offset-2 hover:text-ink"
              href="https://commons.wikimedia.org/wiki/File:Theeonderneming_Waspada_bij_Garoet,_KITLV_3331.tiff"
            >
              Woodbury &amp; Page, KITLV
            </a>
            ,{" "}
            <a
              className="underline underline-offset-2 hover:text-ink"
              href="https://creativecommons.org/licenses/by/4.0/"
            >
              CC BY 4.0
            </a>
            , via Wikimedia Commons.
          </p>
        </div>
      </div>
    </main>
  );
}

/** Kartu peserta yang terisi seketika dari isian formulir. */
function ParticipantCard({
  nama,
  division,
  mode,
}: {
  nama: string;
  division: DivisionOption | null;
  mode: Mode;
}) {
  return (
    <div className="absolute bottom-12 left-1/2 w-[min(300px,calc(100%-40px))] -translate-x-1/2 bg-paper sm:left-8 sm:translate-x-0 lg:right-14 lg:bottom-14 lg:left-auto">
      <div className="px-6 pt-4 pb-6">
        {/* lubang tali kartu */}
        <div
          aria-hidden
          className="mx-auto h-2.5 w-14 rounded-full bg-ground"
        />
        <p
          className={`mt-5 truncate text-2xl font-semibold tracking-tight ${nama.trim() ? "" : "text-muted"}`}
        >
          {nama.trim() || "Nama kamu"}
        </p>
        <p
          key={division?.kode ?? "none"}
          className={`mt-6 animate-pop text-[clamp(3rem,2.4rem+2vw,4.25rem)] leading-none font-bold tracking-[-0.05em] ${
            division ? "" : "text-surface-2"
          }`}
        >
          {division?.kode ?? "DIVISI"}
        </p>
        <p className="mt-3 min-h-[2.75em] text-[15px] leading-snug">
          {division?.kepanjangan ?? (
            <span className="text-muted">Pilih divisimu di formulir</span>
          )}
        </p>
        <p className="mt-4 bg-surface px-3 py-2 text-sm">
          {mode === "own" ? "Soal divisi sendiri" : "Soal campur divisi lain"}
        </p>
        <p className="mt-5 flex items-baseline justify-between gap-3 text-sm">
          <span className="font-semibold">Kenali Divisimu</span>
          <span className="text-muted">PTPN I Head Office</span>
        </p>
      </div>
      <Stripe height={14} bars={16} />
    </div>
  );
}
