import "@/styles/landing.css";
import { notFound } from "next/navigation";
import type { Metadata, Viewport } from "next";
import { site } from "@/lib/content";
import { getLandingPage, getLandingPages, landingSeo } from "@/lib/landing";
import { buildMetadata, buildViewport } from "@/lib/seo";
import { MarketingTemplate } from "@/templates/MarketingTemplate";
import { DraftBanner } from "@/components/shared/DraftBanner";
import { JsonLd } from "@/components/shared/JsonLd";
import { SeoLinks } from "@/components/shared/SeoLinks";
import { LandingSections } from "@/components/landing/Sections";

// Landing pages: content/landing/<slug>.json. Every file is validated when this route is built,
// so an invalid one fails the build (see lib/landing.ts).

export const dynamicParams = false;

export function generateStaticParams() {
  return getLandingPages().map((p) => ({ slug: p.slug }));
}

type Params = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const page = getLandingPage((await params).slug);
  return page ? buildMetadata(landingSeo(page, site.url)) : {};
}

export async function generateViewport({ params }: Params): Promise<Viewport> {
  const page = getLandingPage((await params).slug);
  return page ? buildViewport(landingSeo(page, site.url)) : {};
}

export default async function LandingPage({ params }: Params) {
  const page = getLandingPage((await params).slug);
  if (!page) notFound();
  const seo = landingSeo(page, site.url);
  return (
    <MarketingTemplate header={page.header}>
      <SeoLinks seo={seo} />
      <JsonLd data={seo.jsonLd} />
      <LandingSections sections={page.sections} />
      {page.draft && <DraftBanner />}
    </MarketingTemplate>
  );
}
