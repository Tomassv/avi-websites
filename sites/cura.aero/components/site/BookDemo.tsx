import Script from "next/script";
import type { BookDemoContent } from "@/lib/content-types";
import { safeHubspotMeetingUrl } from "@/lib/safe-url";
import { Rich } from "@/components/shared/Rich";

type Props = {
  intro: BookDemoContent["intro"];
  hubspotMeetingUrl: string;
  /** Landing pages: an anchor id, an extra section class, and h2 when the page already has an h1. */
  id?: string;
  className?: string;
  heading?: "h1" | "h2";
};

/** The intro and HubSpot meeting scheduler of /book-demo (also the landing "book-demo" section). */
export function BookDemo({ intro, hubspotMeetingUrl, id, className, heading: Heading = "h1" }: Props) {
  const meetingUrl = safeHubspotMeetingUrl(hubspotMeetingUrl);
  return (
    <>
      <link rel="preconnect" href="https://static.hsappstatic.net" />

      <section className={className ? `demo ${className}` : "demo"} id={id}>
        <div className="container demo-inner">
          <div className="demo-intro fade-up">
            <div className="chip chip-orange">
              <Rich text={intro.chip} />
            </div>
            <Heading>
              <Rich text={intro.title} />
            </Heading>
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
    </>
  );
}
