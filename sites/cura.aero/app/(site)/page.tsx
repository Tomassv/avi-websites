import type { HomeContent } from "@/lib/content-types";
import content from "@/content/pages/home.json";
import { buildMetadata, buildViewport } from "@/lib/seo";
import { MarketingTemplate } from "@/templates/MarketingTemplate";
import { JsonLd } from "@/components/shared/JsonLd";
import { SeoLinks } from "@/components/shared/SeoLinks";
import { CtaBand } from "@/components/site/CtaBand";
import { Hero, Problem, Insight, WhatWeDo, Capabilities, AviLabsFamily } from "@/components/home/Sections";
import { IntegrationsHub } from "@/components/home/IntegrationsHub";

const home: HomeContent = content;

export const metadata = buildMetadata(home.seo);
export const viewport = buildViewport(home.seo);

export default function HomePage() {
  return (
    <MarketingTemplate header={home.header}>
      <SeoLinks seo={home.seo} />
      <JsonLd data={home.seo.jsonLd} />
      <Hero content={home.hero} />
      <Problem content={home.problem} />
      <Insight content={home.insight} />
      <WhatWeDo content={home.whatWeDo} />
      <Capabilities content={home.capabilities} />
      <IntegrationsHub content={home.integrations} />
      <AviLabsFamily content={home.avilabs} />
      <CtaBand content={home.cta} />
    </MarketingTemplate>
  );
}
