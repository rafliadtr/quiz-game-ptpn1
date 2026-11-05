/** Pita bergaris tinta-kertas; dipakai di kepala kartu dan kaki kartu peserta. */
export default function Stripe({
  height = 56,
  bars = 60,
  className = "",
}: {
  height?: number;
  bars?: number;
  className?: string;
}) {
  return (
    <div
      aria-hidden
      className={`stripe ${className}`}
      style={{ "--stripe-h": `${height}px` } as React.CSSProperties}
    >
      {Array.from({ length: bars }, (_, i) => (
        <span key={i} />
      ))}
    </div>
  );
}
