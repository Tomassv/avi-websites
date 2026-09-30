import type { HomeContent } from "@/lib/content-types";
import { safeIconName } from "@/lib/safe-url";
import { Img } from "@/components/shared/Img";
import { Rich } from "@/components/shared/Rich";
import { SafeLink } from "@/components/shared/SafeLink";
import { Workflow } from "@/components/workflow/Workflow";
import { FlowAnimation } from "@/components/workflow/FlowAnimation";

export function Hero({ content }: { content: HomeContent["hero"] }) {
  return (
    <section className="hero hero3">
      <div className="container">
        <div className="hero-text">
          <h1>
            <Rich text={content.title} />
          </h1>
          <p className="hero-sub">
            <Rich text={content.sub} />
          </p>
          <SafeLink href={content.cta.href} className="btn btn-primary">
            <Rich text={content.cta.label} />
          </SafeLink>
        </div>

        <div className="hero-flow fade-up">
          <Workflow data={content.workflow} id="wf" />
          <FlowAnimation kind="home" target="wf" />
        </div>
      </div>
    </section>
  );
}

export function Problem({ content }: { content: HomeContent["problem"] }) {
  return (
    <section className="problem">
      <div className="container">
        <div className="fade-up">
          <div className="chip chip-dark">
            <Rich text={content.chip} />
          </div>
          <h2>
            <Rich text={content.title} />
          </h2>
        </div>
        <div className="problem-tags fade-up d1">
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

export function Insight({ content }: { content: HomeContent["insight"] }) {
  return (
    <section className="insight">
      <div className="container">
        <div className="insight-inner">
          <div className="insight-left fade-up">
            <div className="chip chip-dark">
              <Rich text={content.chip} />
            </div>
            <h2>
              <Rich text={content.title} />
            </h2>
            <p className="insight-sub">
              <Rich text={content.sub} />
            </p>
            <div className="insight-checks">
              <div className="insight-check">
                <div className="insight-check-icon bad">
                  <span className="material-icons-round">close</span>
                </div>
                <span>
                  <Rich text={content.bad} />
                </span>
              </div>
              <div className="insight-check">
                <div className="insight-check-icon good">
                  <span className="material-icons-round">check</span>
                </div>
                <span>
                  <Rich text={content.good} />
                </span>
              </div>
            </div>
          </div>
          <div className="insight-right fade-up d1">
            <div className="insight-photo-wrap">
              <Img src={content.photo.src} alt={content.photo.alt} className="insight-photo" width={420} height={420} />
            </div>
            <Img src={content.arrow.src} alt={content.arrow.alt} className="insight-arrow" sizes="250px" />
          </div>
        </div>
      </div>
    </section>
  );
}

export function WhatWeDo({ content }: { content: HomeContent["whatWeDo"] }) {
  return (
    <section className="whatwedo" id="what-we-do">
      <div className="container">
        <div className="fade-up">
          <div className="chip chip-orange">
            <Rich text={content.chip} />
          </div>
          <h2>
            <Rich text={content.title} />
          </h2>
        </div>
        <div className="whatwedo-cta fade-up d1">
          <SafeLink href={content.cta.href} className="btn btn-outline-white">
            <Rich text={content.cta.label} />
          </SafeLink>
        </div>
      </div>
    </section>
  );
}

export function Capabilities({ content }: { content: HomeContent["capabilities"] }) {
  return (
    <section className="section">
      <div className="container">
        <div className="caps-header fade-up">
          <div>
            <div className="chip chip-orange">
              <Rich text={content.chip} />
            </div>
            <h2>
              <Rich text={content.title} />
            </h2>
            <p>
              <Rich text={content.sub} />
            </p>
          </div>
        </div>

        <div className="caps-grid fade-up d1">
          {content.items.map((item, i) => {
            const icon = safeIconName(item.icon);
            return (
              <div className="cap-card" key={i}>
                <div className="cap-card-top">
                  <div className="cap-icon">{icon && <span className="material-icons-round">{icon}</span>}</div>
                  <div className="cap-num">{String(i + 1).padStart(2, "0")}</div>
                </div>
                <h3>
                  <Rich text={item.title} />
                </h3>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/** The sibling-product logos each have their own size modifier, keyed by file name. */
const FAMILY_MODIFIERS = new Set(["plan3", "impax", "grounded"]);

export function AviLabsFamily({ content }: { content: HomeContent["avilabs"] }) {
  return (
    <section className="avilabs">
      <div className="container">
        <div className="fade-up">
          <div className="chip chip-orange">
            <Rich text={content.chip} />
          </div>
          <h2 className="avilabs-left">
            <Rich text={content.title} />
          </h2>
          <p>
            <Rich text={content.sub} />
          </p>
        </div>
        <div className="avilabs-right fade-up d1">
          <Img
            src={content.leadLogo.src}
            alt={content.leadLogo.alt}
            className="avilabs-logo avilabs-logo--avilabs avilabs-logo--lead"
          />
          <p>
            <Rich text={content.body} />
          </p>
          <div className="avilabs-stats">
            <div>
              <div className="avilabs-stat-val">
                <Rich text={content.stat.value} />
              </div>
              <div className="avilabs-stat-label">
                <Rich text={content.stat.label} />
              </div>
            </div>
            {content.family.map((logo, i) => {
              const key = /([a-z0-9]+)\.svg$/i.exec(logo.src)?.[1]?.toLowerCase() ?? "";
              const modifier = FAMILY_MODIFIERS.has(key) ? ` avilabs-logo--${key}` : "";
              return (
                <div key={i}>
                  <Img src={logo.src} alt={logo.alt} className={`avilabs-logo${modifier}`} />
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
