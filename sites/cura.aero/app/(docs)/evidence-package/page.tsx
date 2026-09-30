import "@/styles/site.css";
import "@/styles/pages/evidence-package.css";
import type { EvidencePackageContent } from "@/lib/content-types";
import content from "@/content/pages/evidence-package.json";
import { evidenceShared as shared } from "@/lib/content";
import { buildMetadata, buildViewport } from "@/lib/seo";
import { DocTemplate } from "@/templates/DocTemplate";
import { DocTitle, FactCards } from "@/components/docs/Doc";
import { MailPair, SectionHeader, SourceLegend, StageSplit } from "@/components/evidence/Evidence";
import { StepList } from "@/components/evidence/StepList";
import { Rich } from "@/components/shared/Rich";
import { Workflow } from "@/components/workflow/Workflow";
import { FlowAnimation } from "@/components/workflow/FlowAnimation";

const page: EvidencePackageContent = content;

export const metadata = buildMetadata(page.seo);
export const viewport = buildViewport(page.seo);

export default function EvidencePackagePage() {
  const ref = page.reference;
  return (
    <DocTemplate header={page.docHeader} wide>
      <DocTitle content={page.title} body={shared.intro} fade />
      <FactCards facts={page.facts} />

      <hr className="ev-rule fade-up" />

      <section className="wf-section">
        <StageSplit text={shared.stageOne}>
          <div className="ev-split-flow">
            <Workflow data={page.intakeFlow} id="wf-intake" />
            <FlowAnimation kind="linear" target="wf-intake" startDelay={550} />
          </div>
        </StageSplit>
        <SourceLegend cards={shared.legend} />
      </section>

      <section className="wf-section">
        <StageSplit text={shared.stageTwo}>
          <div className="ev-split-flow ev-split-flow--wide" style={{ marginTop: 48 }}>
            <Workflow data={shared.stageTwo.flow} id="wf-close" nodeClass={{ 0: "wf-node--draft" }} />
            <FlowAnimation kind="linear" target="wf-close" startDelay={450} />
          </div>
        </StageSplit>
      </section>

      <section className="wf-section ev-practice fade-up">
        <SectionHeader text={shared.practice} />
        <MailPair practice={shared.practice} />
      </section>

      <section className="wf-section">
        <div className="wf-section-header fade-up">
          <div className="step-tag">
            <Rich text={ref.tag} />
          </div>
          <h2>
            <Rich text={ref.title} />
          </h2>
          <p className="ev-steps-intro">
            <Rich text={ref.body} />
          </p>
        </div>
        <StepList steps={ref.steps} />
      </section>
    </DocTemplate>
  );
}
