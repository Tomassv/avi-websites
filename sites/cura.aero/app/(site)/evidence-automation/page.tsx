import "@/styles/pages/evidence-automation.css";
import type { EvidenceAutomationContent } from "@/lib/content-types";
import content from "@/content/pages/evidence-automation.json";
import { evidenceShared } from "@/lib/content";
import { buildMetadata, buildViewport } from "@/lib/seo";
import { MarketingTemplate } from "@/templates/MarketingTemplate";
import { SeoLinks } from "@/components/shared/SeoLinks";
import { CtaBand } from "@/components/site/CtaBand";
import { AutomationHero, Compare, HowItWorks, Learning, Pain, Practice } from "@/components/evidence/AutomationSections";

const page: EvidenceAutomationContent = content;

export const metadata = buildMetadata(page.seo);
export const viewport = buildViewport(page.seo);

export default function EvidenceAutomationPage() {
  return (
    <MarketingTemplate header={page.header}>
      <SeoLinks seo={page.seo} />
      <AutomationHero content={page.hero} />
      <Pain content={page.pain} />
      <Compare content={page.compare} />
      <div className="container">
        <div className="ea-rule"></div>
      </div>
      <HowItWorks content={page.howItWorks} shared={evidenceShared} />
      <Practice shared={evidenceShared} />
      <Learning content={page.learning} />
      <CtaBand content={page.cta} />
    </MarketingTemplate>
  );
}
