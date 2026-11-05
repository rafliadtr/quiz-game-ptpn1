"use client";

import { useEffect } from "react";

/**
 * Elemen ber-kelas `.reveal` naik dan muncul saat masuk layar.
 * Kelas `js` di <html> baru dipasang di sini, jadi tanpa skrip semua konten tetap terlihat.
 */
export function useReveal(deps: unknown[] = []) {
  useEffect(() => {
    document.documentElement.classList.add("js");
    const els = document.querySelectorAll<HTMLElement>(".reveal:not(.is-in)");
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          e.target.classList.add("is-in");
          io.unobserve(e.target);
        }
      },
      { rootMargin: "0px 0px -8% 0px" },
    );
    // jeda bertahap untuk elemen yang masuk bersamaan dalam satu baris/kelompok
    els.forEach((el, i) => {
      el.style.transitionDelay = `${(i % 6) * 60}ms`;
      io.observe(el);
    });
    return () => io.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}
