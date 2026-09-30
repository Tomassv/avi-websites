import type { EvidenceAutomationContent, EvidenceShared } from "@/lib/content-types";
import { Rich } from "@/components/shared/Rich";
import { SafeLink } from "@/components/shared/SafeLink";
import { Workflow } from "@/components/workflow/Workflow";
import { FlowAnimation } from "@/components/workflow/FlowAnimation";
import { Icon, IconList, MailPair, SectionHeader, SourceLegend, StageSplit } from "./Evidence";

type Page = EvidenceAutomationContent;

function Head({ chip, title, body }: { chip: string; title: string; body?: string }) {
  return (
    <>
      <div className="chip chip-orange">
        <Rich text={chip} />
      </div>
      <h2>
        <Rich text={title} />
      </h2>
      {body !== undefined && (
        <p>
          <Rich text={body} />
        </p>
      )}
    </>
  );
}

export function AutomationHero({ content }: { content: Page["hero"] }) {
  return (
    <section className="hero ea-hero">
      <div className="container">
        <div className="hero-text">
          <div className="hero-eyebrow">
            <span className="hero-eyebrow-dot"></span>
            <Rich text={content.eyebrow} />
          </div>
          <h1>
            <Rich text={content.title} />
          </h1>
          <p className="hero-sub">
            <Rich text={content.sub} />
          </p>
          <div className="ea-hero-actions">
            <SafeLink href={content.cta.href} className="btn btn-primary">
              <Rich text={content.cta.label} />
            </SafeLink>
            <SafeLink href={content.secondary.href} className="ea-link">
              <Rich text={content.secondary.label} /> <span className="material-icons-round">arrow_downward</span>
            </SafeLink>
          </div>
        </div>

        <div className="ea-hero-flow fade-up">
          <Workflow data={content.workflow} id="wf-hero" />
          <FlowAnimation kind="linear" target="wf-hero" startDelay={550} />
        </div>
      </div>
    </section>
  );
}

export function Pain({ content }: { content: Page["pain"] }) {
  return (
    <section className="ea-pain">
      <div className="container">
        <h2 className="fade-up">
          <Rich text={content.title} />
        </h2>
        <p className="fade-up">
          <Rich text={content.body} />
        </p>
        <div className="ea-pain-tags fade-up d1">
          {content.tags.map((tag, i) => (
            <span key={i}>
              <Rich text={tag} />
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

export function Compare({ content }: { content: Page["compare"] }) {
  const card = (side: Page["compare"]["now"], modifier: string) => (
    <div className={`ea-compare-card ea-compare-card--${modifier}`}>
      <div className="ea-compare-tag">
        <Rich text={side.tag} />
      </div>
      <h3>
        <Rich text={side.title} />
      </h3>
      <IconList items={side.items} className="ea-compare-list" />
    </div>
  );
  return (
    <section className="ea-section">
      <div className="container">
        <div className="ea-head fade-up">
          <Head chip={content.chip} title={content.title} body={content.body} />
        </div>

        <div className="ea-compare fade-up d1">
          {card(content.now, "now")}
          {card(content.cura, "cura")}
        </div>
      </div>
    </section>
  );
}

export function HowItWorks({ content, shared }: { content: Page["howItWorks"]; shared: EvidenceShared }) {
  return (
    <section className="ea-section" id="how-it-works">
      <div className="container">
        <div className="ea-head fade-up">
          <Head chip={content.chip} title={content.title} body={shared.intro} />
        </div>

        <div className="ea-stage">
          <StageSplit text={shared.stageOne}>
            <div className="ev-split-flow">
              <Workflow data={content.intakeFlow} id="wf-intake" />
              <FlowAnimation kind="linear" target="wf-intake" startDelay={550} />
            </div>
          </StageSplit>
          <SourceLegend cards={shared.legend} style={{ marginTop: 44 }} />
        </div>

        <div className="ea-stage">
          <StageSplit text={shared.stageTwo}>
            <div className="ev-split-flow ev-split-flow--wide">
              <Workflow data={shared.stageTwo.flow} id="wf-close" nodeClass={{ 0: "wf-node--draft" }} />
              <FlowAnimation kind="linear" target="wf-close" startDelay={450} />
            </div>
          </StageSplit>
        </div>
      </div>
    </section>
  );
}

export function Practice({ shared }: { shared: EvidenceShared }) {
  return (
    <section className="ea-section ea-section--tight">
      <div className="container">
        <div className="ev-practice fade-up">
          <SectionHeader text={shared.practice} />
          <MailPair practice={shared.practice} />
        </div>
      </div>
    </section>
  );
}

export function Learning({ content }: { content: Page["learning"] }) {
  return (
    <section className="ea-section">
      <div className="container">
        <div className="lrn-panel fade-up">
          <div className="ea-head">
            <Head chip={content.chip} title={content.title} body={content.body} />
          </div>

          <div className="lrn-list">
            {content.cards.map((card, i) => (
              <article className="lrn-card" key={i}>
                <div className="lrn-card-head">
                  <h3>
                    <Rich text={card.title} />
                  </h3>
                  <span className={card.speed.fast ? "lrn-speed lrn-speed--fast" : "lrn-speed"}>
                    <Icon name={card.speed.icon} />
                    <Rich text={card.speed.label} />
                  </span>
                </div>
                <p>
                  <Rich text={card.body} />
                </p>
              </article>
            ))}
          </div>

          <p className="lrn-note">
            <Icon name={content.note.icon} />
            <span>
              <Rich text={content.note.text} />
            </span>
          </p>
        </div>
      </div>
    </section>
  );
}
