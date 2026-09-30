import "@/styles/deck.css";
import type { DeckContent } from "@/lib/content-types";
import content from "@/content/pages/aireuropa.json";
import { buildMetadata, buildViewport } from "@/lib/seo";
import { DeckTemplate } from "@/templates/DeckTemplate";

const page: DeckContent = content;

export const metadata = buildMetadata(page.seo);
export const viewport = buildViewport(page.seo, { viewportFit: "cover" });

export default function AirEuropaDeck() {
  return <DeckTemplate content={page} file="content/pages/aireuropa.json" />;
}
