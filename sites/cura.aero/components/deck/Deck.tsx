"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import type { DeckContent, DeckSlide } from "@/lib/content-types";
import { Rich } from "@/components/shared/Rich";
import { CuraLogo } from "./CuraLogo";

type Props = {
  /** Server-rendered slide bodies; the flow slide's entry is null (it's rendered here). */
  bodies: ReactNode[];
  /** The flow slide, if the deck has one. */
  flow: { index: number; slide: DeckSlide } | null;
  nav: DeckContent["nav"];
};

/**
 * Slide navigation, ported from the static deck: arrow keys, space, Page Up/Down, Home/End,
 * the dots and Back/Next. On the flow slide, Next/Back first step through its nodes.
 */
export function Deck({ bodies, flow, nav }: Props) {
  const count = bodies.length;
  const [slide, setSlide] = useState(0);
  const [sub, setSub] = useState<number | null>(null);
  const steps = flow?.slide.steps ?? [];

  // Mirror state in refs so the key handler always sees the latest position.
  const pos = useRef({ slide, sub });
  pos.current = { slide, sub };

  const go = useCallback(
    (n: number) => {
      if (n < 0 || n >= count) return;
      setSlide(n);
      // entering the flow slide always starts on its first node
      if (flow && n === flow.index) setSub(0);
    },
    [count, flow],
  );

  const advance = useCallback(() => {
    const { slide: i, sub: s } = pos.current;
    if (flow && i === flow.index && s !== null && s < steps.length - 1) {
      setSub(s + 1);
      return;
    }
    go(i + 1);
  }, [flow, steps.length, go]);

  const retreat = useCallback(() => {
    const { slide: i, sub: s } = pos.current;
    if (flow && i === flow.index && s !== null && s > 0) {
      setSub(s - 1);
      return;
    }
    go(i - 1);
  }, [flow, go]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === " " || e.key === "PageDown") {
        e.preventDefault();
        advance();
      }
      if (e.key === "ArrowLeft" || e.key === "PageUp") {
        e.preventDefault();
        retreat();
      }
      if (e.key === "Home") go(0);
      if (e.key === "End") go(count - 1);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [advance, retreat, go, count]);

  return (
    <>
      <div className="stage">
        {bodies.map((body, i) => (
          <section className={i === slide ? "slide on" : "slide"} key={i}>
            {flow && i === flow.index ? (
              <FlowSlide slide={flow.slide} active={sub} onPick={setSub} />
            ) : (
              body
            )}
          </section>
        ))}
      </div>

      <div className="nav">
        <div className="navleft">
          <CuraLogo className="logo-sm" label={nav.logo} />
          <div className="dots" id="dots">
            {bodies.map((_, i) => (
              <button
                key={i}
                className={i === slide ? "dot on" : "dot"}
                aria-label={`${nav.slide} ${i + 1}`}
                onClick={() => go(i)}
              />
            ))}
          </div>
        </div>
        <div className="btns">
          <span className="count" id="count">
            {slide + 1} / {count}
          </span>
          <button className="nb" id="prev" onClick={retreat} disabled={slide === 0}>
            {nav.back}
          </button>
          <button className="nb" id="next" onClick={advance} disabled={slide === count - 1}>
            {nav.next}
          </button>
        </div>
      </div>
    </>
  );
}

const KINDS = new Set(["api", "ai", "det", "hum"]);

function FlowSlide({
  slide,
  active,
  onPick,
}: {
  slide: DeckSlide;
  active: number | null;
  onPick: (n: number) => void;
}) {
  const steps = slide.steps ?? [];
  return (
    <>
      <p className="eyebrow">
        <Rich text={slide.eyebrow} />
      </p>
      <h2>
        <Rich text={slide.title} />
      </h2>
      <div className="fl" id="fl">
        {steps.map((step, i) => (
          <div
            className={i === active ? "fn act" : "fn"}
            data-k={KINDS.has(step.kind) ? step.kind : undefined}
            key={i}
            onClick={() => onPick(i)}
          >
            <em>
              <Rich text={step.tag} />
            </em>
            <b>
              <Rich text={step.title} />
            </b>
          </div>
        ))}
      </div>
      {/* plain text, as the old deck set it with textContent */}
      <div className="det" id="det">
        {active !== null ? steps[active]?.detail : null}
      </div>
    </>
  );
}
