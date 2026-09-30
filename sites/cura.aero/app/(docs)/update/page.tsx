import "@/styles/pages/update.css";
import type { UpdateContent } from "@/lib/content-types";
import content from "@/content/pages/update.json";
import { buildMetadata, buildViewport } from "@/lib/seo";
import { DocTemplate } from "@/templates/DocTemplate";
import { DocFooter, DocTitle } from "@/components/docs/Doc";
import { Rich } from "@/components/shared/Rich";

const page: UpdateContent = content;

export const metadata = buildMetadata(page.seo);
export const viewport = buildViewport(page.seo);

/** Timeline segment colours, in order. */
const SEGMENTS = ["now", "poc", "prod"];

export default function UpdatePage() {
  return (
    <DocTemplate header={page.docHeader}>
      <DocTitle content={page.title} />

      <div className="phases">
        {page.phases.map((phase, i) => (
          <div className={`phase-card phase-card--${i + 1}`} key={i}>
            <div className="phase-num">{String(i + 1).padStart(2, "0")}</div>
            <div className="phase-body">
              <div>
                <div className="phase-label">
                  <Rich text={phase.label} />
                </div>
                <div className="phase-title">
                  <Rich text={phase.title} />
                </div>
                <ul className="phase-items">
                  {phase.items.map((item, j) => (
                    <li key={j}>
                      <Rich text={item} />
                    </li>
                  ))}
                </ul>
              </div>
              <span className="phase-timing">
                <Rich text={phase.timing} />
              </span>
            </div>
          </div>
        ))}
      </div>

      <div className="timeline-section">
        <div className="timeline-header">
          <h2>
            <Rich text={page.timeline.title} />
          </h2>
          <p>
            <Rich text={page.timeline.body} />
          </p>
        </div>
        <div className="timeline-track">
          {page.timeline.segments.map((seg, i) => (
            <div className={`timeline-seg timeline-seg--${SEGMENTS[i] ?? "prod"}`} key={i}>
              <Rich text={seg.label} />
            </div>
          ))}
        </div>
        <div className="timeline-labels">
          {page.timeline.segments.map((seg, i) => (
            <span key={i}>
              <Rich text={seg.note} />
            </span>
          ))}
        </div>
      </div>

      <DocFooter content={page.footer} />
    </DocTemplate>
  );
}
