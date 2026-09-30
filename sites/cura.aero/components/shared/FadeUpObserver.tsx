"use client";

import { useEffect } from "react";

/** Reveals every .fade-up element as it scrolls into view (same logic as the old inline script). */
export function FadeUpObserver() {
  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("visible");
            io.unobserve(e.target);
          }
        });
      },
      { threshold: 0.08 },
    );
    document.querySelectorAll(".fade-up").forEach((el) => {
      io.observe(el);
    });
    return () => io.disconnect();
  }, []);
  return null;
}
