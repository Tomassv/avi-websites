import "@/styles/landing.css";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { site } from "@/lib/content";
import { showDrafts } from "@/lib/env";
import { getCatalog, landingSeo } from "@/lib/landing";
import { buildMetadata, buildViewport } from "@/lib/seo";
import { MarketingTemplate } from "@/templates/MarketingTemplate";
import { DraftBanner } from "@/components/shared/DraftBanner";
import { LandingSection } from "@/components/landing/Sections";

// Every landing section type with sample content (content/landing-catalog.json), so authors can
// see what is available. A draft: never on the live site, and never indexed.

const catalog = getCatalog();
const seo = { ...landingSeo(catalog, site.url), robots: "noindex, nofollow", jsonLd: undefined };

export const metadata: Metadata = buildMetadata(seo);
export const viewport = buildViewport(seo);

export default function LandingCatalogPage() {
  if (!showDrafts()) notFound();
  return (
    <MarketingTemplate header={catalog.header}>
      <section className="lp-catalog-intro">
        <div className="container">
          <div className="chip chip-orange">Landing pages</div>
          <h1>Section catalog</h1>
          <p>
            Every section a landing page can use, with sample content. Fields for each are in README.md under
            &ldquo;Landing pages&rdquo;, and in content/landing.schema.json.
          </p>
        </div>
      </section>
      {catalog.sections.map((section, i) => (
        <div key={i}>
          <div className="lp-catalog-label">
            <div className="container">
              <code>{section.type}</code>
              <span>README.md → Landing pages → {section.type}</span>
            </div>
          </div>
          <LandingSection section={section} />
        </div>
      ))}
      <DraftBanner />
    </MarketingTemplate>
  );
}
