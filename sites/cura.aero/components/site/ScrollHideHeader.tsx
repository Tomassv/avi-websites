"use client";

import { useEffect } from "react";

/** Hides #header while scrolling down past 80px and shows it again on scroll up. */
export function ScrollHideHeader() {
  useEffect(() => {
    const header = document.getElementById("header");
    if (!header) return;
    let lastScrollY = window.scrollY;
    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const y = window.scrollY;
        header.classList.toggle("hidden", y > lastScrollY && y > 80);
        lastScrollY = y;
        ticking = false;
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  return null;
}
