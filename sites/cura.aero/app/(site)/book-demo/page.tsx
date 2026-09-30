import type { BookDemoContent } from "@/lib/content-types";
import content from "@/content/pages/book-demo.json";
import { buildMetadata, buildViewport } from "@/lib/seo";
import { MarketingTemplate } from "@/templates/MarketingTemplate";
import { JsonLd } from "@/components/shared/JsonLd";
import { SeoLinks } from "@/components/shared/SeoLinks";
import { BookDemo } from "@/components/site/BookDemo";

const bookDemo: BookDemoContent = content;

export const metadata = buildMetadata(bookDemo.seo);
export const viewport = buildViewport(bookDemo.seo);

export default function BookDemoPage() {
  return (
    <MarketingTemplate header={bookDemo.header}>
      <SeoLinks seo={bookDemo.seo} />
      <JsonLd data={bookDemo.seo.jsonLd} />
      <BookDemo intro={bookDemo.intro} hubspotMeetingUrl={bookDemo.hubspotMeetingUrl} />
    </MarketingTemplate>
  );
}
