import "@/styles/pages/non-connected-value.css";
import type { StandaloneContent } from "@/lib/content-types";
import content from "@/content/pages/non-connected-value.json";
import { buildMetadata, buildViewport } from "@/lib/seo";
import { DocTemplate } from "@/templates/DocTemplate";
import { DocFooter, DocTitle } from "@/components/docs/Doc";
import { CategoryCards, StandaloneFlow } from "@/components/docs/Standalone";
import { Rich } from "@/components/shared/Rich";

const page: StandaloneContent = content;

export const metadata = buildMetadata(page.seo);
export const viewport = buildViewport(page.seo);

export default function NonConnectedValuePage() {
  return (
    <DocTemplate header={page.docHeader}>
      <DocTitle content={page.title}>
        <div className="covers">
          <span className="covers-label">
            <Rich text={page.covers.label} />
          </span>
          {page.covers.regulations.map((reg, i) => (
            <span className="reg-chip" key={i}>
              <Rich text={reg} />
            </span>
          ))}
        </div>
      </DocTitle>
      <CategoryCards categories={page.categories} />
      <StandaloneFlow flow={page.flow} />
      <DocFooter content={page.footer} />
    </DocTemplate>
  );
}
