import type { DeckContent } from "@/lib/content-types";
import { validateDeck } from "@/lib/deck";
import { CuraLogoSymbol } from "@/components/deck/CuraLogo";
import { Deck } from "@/components/deck/Deck";
import { slideBody } from "@/components/deck/Slides";

/**
 * A slide deck from a content file. Slide bodies are rendered on the server; navigation and
 * the flow slide run in the Deck client component. Decks are internal: their route must be in
 * the proxy.ts matcher.
 */
export function DeckTemplate({ content, file }: { content: DeckContent; file: string }) {
  validateDeck(content.slides, file);
  const flowIndex = content.slides.findIndex((s) => s.type === "flow");
  const bodies = content.slides.map((slide, i) => (i === flowIndex ? null : slideBody(slide, content.nav.logo)));
  return (
    <>
      <CuraLogoSymbol />
      <Deck
        bodies={bodies}
        flow={flowIndex === -1 ? null : { index: flowIndex, slide: content.slides[flowIndex] }}
        nav={content.nav}
      />
    </>
  );
}
