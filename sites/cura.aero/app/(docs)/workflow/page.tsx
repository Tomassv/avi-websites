import "@/styles/site.css";
import "@/styles/pages/workflow.css";
import type { WorkflowPageContent } from "@/lib/content-types";
import content from "@/content/pages/workflow.json";
import { buildMetadata, buildViewport } from "@/lib/seo";
import { DocTemplate } from "@/templates/DocTemplate";
import { DocTitle, FactCards } from "@/components/docs/Doc";
import { MaterialIcons } from "@/components/shared/MaterialIcons";
import { Rich } from "@/components/shared/Rich";
import { Workflow } from "@/components/workflow/Workflow";
import { FlowAnimation } from "@/components/workflow/FlowAnimation";

const page: WorkflowPageContent = content;

export const metadata = buildMetadata(page.seo);
export const viewport = buildViewport(page.seo);

export default function WorkflowPage() {
  return (
    <DocTemplate header={page.docHeader} wide>
      <MaterialIcons />
      <DocTitle content={page.title} fade />
      <FactCards facts={page.facts} />

      <section className="wf-section">
        <div className="wf-section-header">
          <h2>
            <Rich text={page.section.title} />
          </h2>
          <p>
            <Rich text={page.section.body} />
          </p>
        </div>
        <div className="wf-scroll fade-up d1">
          <Workflow data={page.flow} id="wf" className="wf--multi" />
          <FlowAnimation kind="branch" target="wf" />
        </div>

        <div className="wf-mobile-flow fade-up d1">
          <Workflow data={page.mobileFlow} id="wf-mobile" />
          <FlowAnimation kind="stack" target="wf-mobile" />
        </div>
      </section>
    </DocTemplate>
  );
}
