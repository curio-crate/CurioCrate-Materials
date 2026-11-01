"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

/**
 * Eases `.reveal` elements in the first time they scroll into view. What is already on screen is marked shown
 * before anything is hidden, so nothing flickers; without JavaScript (or with reduced motion) everything just shows.
 */
export function RevealObserver() {
  const pathname = usePathname();
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const els = Array.from(document.querySelectorAll<HTMLElement>(".reveal:not(.is-in)"));
    for (const el of els) if (el.getBoundingClientRect().top < window.innerHeight) el.classList.add("is-in");
    document.documentElement.dataset.reveal = "on";
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          e.target.classList.add("is-in");
          io.unobserve(e.target);
        }
      },
      { rootMargin: "0px 0px -6% 0px" },
    );
    for (const el of els) if (!el.classList.contains("is-in")) io.observe(el);
    return () => io.disconnect();
  }, [pathname]);
  return null;
}
