import type { DeckSlide } from "./content-types";

/** Fields each slide type must have. Checked at build time, so a malformed deck fails the build. */
const REQUIRED: Record<string, (keyof DeckSlide)[]> = {
  title: ["title", "lead"],
  stats: ["eyebrow", "title", "stats", "body"],
  silos: ["eyebrow", "title", "silos", "byhand", "body"],
  flow: ["eyebrow", "title", "steps"],
  table: ["eyebrow", "title", "head", "rows"],
  pack: ["eyebrow", "title", "doc", "annex", "body"],
  mono: ["eyebrow", "title", "mono", "body"],
  cards: ["eyebrow", "title", "cards"],
  learning: ["eyebrow", "title", "sources", "head", "rows", "out"],
  list: ["eyebrow", "title", "items", "body"],
  quote: ["quote"],
};

export const FLOW_KINDS = new Set(["api", "ai", "det", "hum"]);

export function validateDeck(slides: DeckSlide[], file: string): void {
  if (!slides.length) throw new Error(`${file}: a deck needs at least one slide`);
  let flows = 0;
  slides.forEach((slide, i) => {
    const required = REQUIRED[slide.type];
    if (!required) throw new Error(`${file}: slide ${i + 1} has unknown type "${slide.type}"`);
    for (const field of required) {
      if (slide[field] === undefined) throw new Error(`${file}: slide ${i + 1} (${slide.type}) is missing "${field}"`);
    }
    if (slide.type === "flow") {
      flows += 1;
      for (const step of slide.steps ?? []) {
        if (!FLOW_KINDS.has(step.kind)) throw new Error(`${file}: slide ${i + 1} has a step with unknown kind "${step.kind}"`);
      }
    }
  });
  if (flows > 1) throw new Error(`${file}: a deck can have at most one flow slide`);
}
