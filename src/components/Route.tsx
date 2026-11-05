/**
 * Bahasa visual "Peta Jalur Divisi": lencana jalur, cap stasiun, dan peta rute 10 stasiun.
 * Status selalu punya ikon selain warna (centang = benar, silang = salah).
 */

/** Lencana kode divisi, seperti lencana nama jalur di peta kereta. */
export function LineBadge({
  kode,
  tone = "light",
  size = "md",
  className = "",
}: {
  kode: string;
  tone?: "light" | "green" | "muted";
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}) {
  const tones = {
    light: "bg-putih text-hijau",
    green: "bg-hijau text-putih",
    muted: "bg-abu text-redup",
  };
  const sizes = {
    sm: "h-7 min-w-12 px-2 text-base rounded-md",
    md: "h-9 min-w-14 px-2.5 text-xl rounded-lg",
    lg: "h-12 min-w-20 px-3.5 text-[1.75rem] rounded-panel",
    xl: "h-20 min-w-30 px-5 text-[3rem] rounded-panel",
  };
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center font-display leading-none font-bold tracking-wide ${tones[tone]} ${sizes[size]} ${className}`}
    >
      {kode}
    </span>
  );
}

export function CheckIcon({ className = "size-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" fill="none" aria-hidden className={className}>
      <path d="M3 8.5l3.2 3L13 4.5" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function CrossIcon({ className = "size-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" fill="none" aria-hidden className={className}>
      <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" />
    </svg>
  );
}

export type StopState = "ok" | "no" | "now" | "next";

/**
 * Satu titik stasiun di peta rute. Ukurannya ikut variabel --stop (22px di HP, 28px di layar lebar)
 * supaya rel hijau tetap terlihat di antara stasiun. Stasiun yang sudah dijawab dicap dengan animasi.
 */
export function Stop({ state, no, stampDelay }: { state: StopState; no: number; stampDelay?: number }) {
  const box = "relative z-10 grid size-(--stop) place-items-center rounded-full";
  if (state === "ok" || state === "no") {
    const ok = state === "ok";
    return (
      <span
        className={`${box} animate-stamp border-[3px] ${ok ? "border-hijau bg-hijau text-putih" : "border-salah bg-putih text-salah"}`}
        style={stampDelay !== undefined ? { animationDelay: `${stampDelay}ms` } : undefined}
      >
        {ok ? <CheckIcon className="size-3 sm:size-3.5" /> : <CrossIcon className="size-3 sm:size-3.5" />}
        <span className="sr-only">
          Stasiun {no}: {ok ? "benar" : "salah"}
        </span>
      </span>
    );
  }
  return (
    <span className={`${box} border-[3px] border-hijau bg-putih font-display text-[11px] leading-none font-bold text-hijau sm:text-xs`}>
      <span aria-hidden>{state === "next" ? no : ""}</span>
      <span className="sr-only">
        Stasiun {no}: {state === "now" ? "sedang dijawab" : "belum"}
      </span>
    </span>
  );
}

/** Stasiun bernomor besar untuk daftar pembahasan; tanda kecil di sudut memberi status selain warna. */
export function ReviewStop({ no, correct }: { no: number; correct: boolean }) {
  return (
    <span
      className={`relative grid size-10 place-items-center rounded-full border-[3px] font-display text-base leading-none font-bold ${
        correct ? "border-hijau bg-hijau text-putih" : "border-salah bg-putih text-salah"
      }`}
    >
      {no}
      <span
        aria-hidden
        className={`absolute -right-2 -bottom-2 grid size-[18px] place-items-center rounded-full border-2 border-putih ${
          correct ? "bg-hijau text-putih" : "bg-salah text-putih"
        }`}
      >
        {correct ? <CheckIcon className="size-2" /> : <CrossIcon className="size-2" />}
      </span>
      <span className="sr-only">
        Stasiun {no}, {correct ? "benar" : "salah"}
      </span>
    </span>
  );
}

/**
 * Peta rute horizontal. Seluruh rel berwarna hijau: muda untuk yang belum dilewati, penuh di
 * belakang kereta. Penanda jingga meluncur ke stasiun berikutnya dan berdenyut sekali saat tiba.
 */
export function RouteMap({
  total,
  index,
  results,
  showTrain = true,
  stampStagger,
}: {
  total: number;
  index: number;
  results: (boolean | undefined)[];
  showTrain?: boolean;
  /** jeda bertahap (ms) untuk cap stasiun, dipakai di layar hasil */
  stampStagger?: number;
}) {
  const progress = Math.min(index, total - 1) / (total - 1);
  // rel membentang dari pusat stasiun pertama ke pusat stasiun terakhir
  const edge = "calc(0.875rem + var(--stop) / 2)";
  const at = (f: number) => `calc(${edge} + (100% - 2 * ${edge}) * ${f})`;
  return (
    <div className="relative px-3.5 py-2 [--stop:22px] sm:[--stop:28px]" aria-label="Peta perjalanan">
      <div className="absolute top-1/2 -mt-[3px] h-1.5 rounded-full bg-hijau/25" style={{ left: edge, right: edge }} aria-hidden />
      <div
        className={`rail-fill absolute top-1/2 -mt-[3px] h-1.5 rounded-full bg-hijau ${stampStagger !== undefined ? "draw-x" : ""}`}
        style={{ left: edge, right: edge, transform: `scaleX(${progress})` }}
        aria-hidden
      />
      <ol className="relative flex items-center justify-between">
        {Array.from({ length: total }, (_, i) => {
          const r = results[i];
          const state: StopState = r === true ? "ok" : r === false ? "no" : i === index ? "now" : "next";
          return (
            <li key={i} className="grid place-items-center">
              <Stop state={state} no={i + 1} stampDelay={stampStagger !== undefined ? 300 + i * stampStagger : undefined} />
            </li>
          );
        })}
      </ol>
      {showTrain && index < total && (
        <>
          <span
            aria-hidden
            className="train absolute top-1/2 z-20 size-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-jingga shadow-[0_1px_4px_rgba(46,27,25,0.35)] sm:size-4"
            style={{ left: at(progress) }}
          />
          {/* denyut sekali saat kereta tiba di stasiun baru */}
          <span
            key={index}
            aria-hidden
            className="arrival-ping absolute top-1/2 z-10 size-(--stop) -translate-x-1/2 -translate-y-1/2 rounded-full"
            style={{ left: at(progress) }}
          />
        </>
      )}
    </div>
  );
}
