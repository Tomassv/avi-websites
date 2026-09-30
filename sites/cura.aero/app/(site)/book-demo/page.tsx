import Script from "next/script";
import type { BookDemoContent } from "@/lib/content-types";
import content from "@/content/pages/book-demo.json";
import { buildMetadata, buildViewport } from "@/lib/seo";
import { safeHubspotMeetingUrl } from "@/lib/safe-url";
import { MarketingTemplate } from "@/templates/MarketingTemplate";
import { JsonLd } from "@/components/shared/JsonLd";
import { Rich } from "@/components/shared/Rich";
import { SeoLinks } from "@/components/shared/SeoLinks";

const bookDemo: BookDemoContent = content;

export const metadata = buildMetadata(bookDemo.seo);
export const viewport = buildViewport(bookDemo.seo);

export default function BookDemoPage() {
  const { intro } = bookDemo;
  const meetingUrl = safeHubspotMeetingUrl(bookDemo.hubspotMeetingUrl);
  return (
    <MarketingTemplate header={bookDemo.header}>
      <SeoLinks seo={bookDemo.seo} />
      <JsonLd data={bookDemo.seo.jsonLd} />
      <link rel="preconnect" href="https://static.hsappstatic.net" />

      <section className="demo">
        <div className="container demo-inner">
          <div className="demo-intro fade-up">
            <div className="chip chip-orange">
              <Rich text={intro.chip} />
            </div>
            <h1>
              <Rich text={intro.title} />
            </h1>
            <p className="demo-sub">
              <Rich text={intro.sub} />
            </p>
            <ul className="demo-points">
              {intro.points.map((point, i) => (
                <li key={i}>
                  <span className="material-icons-round">check</span> <Rich text={point} />
                </li>
              ))}
            </ul>
          </div>

          <div className="demo-form-card">
            {meetingUrl && <div className="meetings-iframe-container" data-src={meetingUrl}></div>}
          </div>
        </div>
      </section>

      {/* HubSpot's embed script scans the page for .meetings-iframe-container on load. */}
      {meetingUrl && (
        <Script src="https://static.hsappstatic.net/MeetingsEmbed/ex/MeetingsEmbedCode.js" strategy="afterInteractive" />
      )}
    </MarketingTemplate>
  );
}
