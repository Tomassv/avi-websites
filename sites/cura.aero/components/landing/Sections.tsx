import type {
  BookDemoSection,
  CardsSection,
  CompareSection,
  CompareSide,
  CtaBandSection,
  FaqSection,
  HeroSection,
  ImageSection,
  ImageTextSection,
  LandingSection as Section,
  Link,
  LogosSection,
  QuoteSection,
  SpotlightSection,
  StatementSection,
  StatsSection,
  StepsSection,
  TagsSection,
  TextSection,
} from "@/lib/content-types";
import bookDemoPage from "@/content/pages/book-demo.json";
import { safeIconName, safeId } from "@/lib/safe-url";
import { Img } from "@/components/shared/Img";
import { Rich } from "@/components/shared/Rich";
import { SafeLink } from "@/components/shared/SafeLink";
import { BookDemo } from "@/components/site/BookDemo";
import { CtaBand } from "@/components/site/CtaBand";

/**
 * The landing-page section catalog. Each section renders one entry of a landing file's
 * `sections` list (content/landing.schema.json documents the fields; README.md shows them).
 * Layouts reuse the site's existing classes; the lp-* rules in styles/landing.css fill the gaps.
 */

function Icon({ name }: { name: string | undefined }) {
  const icon = safeIconName(name);
  return icon ? <span className="material-icons-round">{icon}</span> : null;
}

function Head({ chip, title, sub, chipTone = "orange" }: { chip?: string; title?: string; sub?: string; chipTone?: "orange" | "dark" }) {
  if (chip === undefined && title === undefined && sub === undefined) return null;
  return (
    <div className="lp-head fade-up">
      {chip !== undefined && (
        <div className={`chip chip-${chipTone}`}>
          <Rich text={chip} />
        </div>
      )}
      {title !== undefined && (
        <h2>
          <Rich text={title} />
        </h2>
      )}
      {sub !== undefined && (
        <p>
          <Rich text={sub} />
        </p>
      )}
    </div>
  );
}

function Button({ link, className = "btn btn-primary" }: { link: Link; className?: string }) {
  return (
    <SafeLink href={link.href} className={className} newTab={link.newTab}>
      <Rich text={link.label} />
    </SafeLink>
  );
}

function Hero({ s }: { s: HeroSection }) {
  return (
    <section className={s.image ? "hero lp-hero lp-hero--media" : "hero lp-hero"} id={safeId(s.id)}>
      <div className="container">
        <div className="hero-text">
          {s.eyebrow !== undefined && (
            <div className="hero-eyebrow">
              <span className="hero-eyebrow-dot"></span>
              <Rich text={s.eyebrow} />
            </div>
          )}
          <h1>
            <Rich text={s.title} />
          </h1>
          {s.sub !== undefined && (
            <p className="hero-sub">
              <Rich text={s.sub} />
            </p>
          )}
          {(s.cta || s.secondary) && (
            <div className="lp-actions">
              {s.cta && <Button link={s.cta} />}
              {s.secondary && (
                <SafeLink href={s.secondary.href} className="lp-link" newTab={s.secondary.newTab}>
                  <Rich text={s.secondary.label} />{" "}
                  <span className="material-icons-round">{s.secondary.href.startsWith("#") ? "arrow_downward" : "arrow_forward"}</span>
                </SafeLink>
              )}
            </div>
          )}
        </div>
        {s.image && (
          <div className="lp-hero-media fade-up">
            <Img src={s.image.src} alt={s.image.alt} className="lp-media-img" eager sizes="(max-width: 960px) 100vw, 560px" />
          </div>
        )}
      </div>
    </section>
  );
}

function Text({ s }: { s: TextSection }) {
  return (
    <section className={s.align === "center" ? "section lp-text lp-text--center" : "section lp-text"} id={safeId(s.id)}>
      <div className="container">
        <div className="lp-prose fade-up">
          {s.chip !== undefined && (
            <div className="chip chip-orange">
              <Rich text={s.chip} />
            </div>
          )}
          {s.title !== undefined && (
            <h2>
              <Rich text={s.title} />
            </h2>
          )}
          {s.body.map((p, i) => (
            <p key={i}>
              <Rich text={p} />
            </p>
          ))}
        </div>
      </div>
    </section>
  );
}

function ImageBlock({ s }: { s: ImageSection }) {
  return (
    <section className="section lp-image" id={safeId(s.id)}>
      <div className="container">
        <figure className={s.size === "narrow" ? "lp-figure lp-figure--narrow fade-up" : "lp-figure fade-up"}>
          <Img src={s.image.src} alt={s.image.alt} className="lp-media-img" sizes="(max-width: 1160px) 100vw, 1096px" />
          {s.caption !== undefined && (
            <figcaption>
              <Rich text={s.caption} />
            </figcaption>
          )}
        </figure>
      </div>
    </section>
  );
}

function ImageText({ s }: { s: ImageTextSection }) {
  return (
    <section className="section lp-split-section" id={safeId(s.id)}>
      <div className="container">
        <div className={`insight-inner lp-split lp-split--${s.imagePosition}`}>
          <div className="lp-split-text fade-up">
            {s.chip !== undefined && (
              <div className="chip chip-orange">
                <Rich text={s.chip} />
              </div>
            )}
            <h2>
              <Rich text={s.title} />
            </h2>
            {s.body.map((p, i) => (
              <p key={i}>
                <Rich text={p} />
              </p>
            ))}
            {s.points && (
              <ul className="demo-points">
                {s.points.map((point, i) => (
                  <li key={i}>
                    <span className="material-icons-round">check</span> <Rich text={point} />
                  </li>
                ))}
              </ul>
            )}
            {s.cta && (
              <div className="lp-actions">
                <Button link={s.cta} />
              </div>
            )}
          </div>
          <div className="lp-split-media fade-up d1">
            <Img src={s.image.src} alt={s.image.alt} className="lp-media-img" sizes="(max-width: 960px) 100vw, 540px" />
          </div>
        </div>
      </div>
    </section>
  );
}

function Cards({ s }: { s: CardsSection }) {
  return (
    <section className="section" id={safeId(s.id)}>
      <div className="container">
        <Head chip={s.chip} title={s.title} sub={s.sub} />
        <div className={`caps-grid lp-cards lp-cards--${s.columns} fade-up d1`}>
          {s.items.map((item, i) => (
            <div className="cap-card" key={i}>
              {(item.icon || s.numbered) && (
                <div className="cap-card-top">
                  {item.icon ? (
                    <div className="cap-icon">
                      <Icon name={item.icon} />
                    </div>
                  ) : (
                    <span />
                  )}
                  {s.numbered && <div className="cap-num">{String(i + 1).padStart(2, "0")}</div>}
                </div>
              )}
              <h3>
                <Rich text={item.title} />
              </h3>
              {item.body !== undefined && (
                <p className="lp-card-body">
                  <Rich text={item.body} />
                </p>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Stats({ s }: { s: StatsSection }) {
  return (
    <section className="section lp-stats" id={safeId(s.id)}>
      <div className="container">
        <Head chip={s.chip} title={s.title} />
        <div className={`lp-stats-row lp-stats-row--${s.items.length} fade-up d1`}>
          {s.items.map((item, i) => (
            <div className="lp-stat" key={i}>
              <div className="avilabs-stat-val lp-stat-val">
                <Rich text={item.value} />
              </div>
              <div className="avilabs-stat-label lp-stat-label">
                <Rich text={item.label} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Logos({ s }: { s: LogosSection }) {
  return (
    <section className="integrations lp-logos" id={safeId(s.id)}>
      <div className="container">
        <div className="integrations-logos fade-up">
          {s.label !== undefined && (
            <div className="integrations-logos-label">
              <Rich text={s.label} />
            </div>
          )}
          <div className="integrations-logos-row">
            {s.items.map((logo, i) =>
              "image" in logo ? <Img key={i} src={logo.image.src} alt={logo.image.alt} /> : <span key={i}>{logo.text}</span>,
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

function Quote({ s }: { s: QuoteSection }) {
  const who = [s.role, s.company].filter(Boolean).join(", ");
  return (
    <section className="section" id={safeId(s.id)}>
      <div className="container">
        <figure className={s.image ? "spotlight lp-quote lp-quote--image fade-up" : "spotlight lp-quote fade-up"}>
          {s.image && <Img src={s.image.src} alt={s.image.alt} className="lp-quote-photo" width={160} height={160} />}
          <div>
            <blockquote>
              <p>
                <Rich text={s.quote} />
              </p>
            </blockquote>
            <figcaption>
              <strong>{s.name}</strong>
              {who && <span>{who}</span>}
            </figcaption>
          </div>
        </figure>
      </div>
    </section>
  );
}

function Steps({ s }: { s: StepsSection }) {
  return (
    <section className="section" id={safeId(s.id)}>
      <div className="container">
        <Head chip={s.chip} title={s.title} sub={s.sub} />
        <ol className="lp-steps fade-up d1">
          {s.items.map((step, i) => (
            <li className="cap-card lp-step" key={i}>
              <div className="cap-num">{String(i + 1).padStart(2, "0")}</div>
              <div>
                <div className="lp-step-head">
                  <h3>
                    <Rich text={step.title} />
                  </h3>
                  {step.tag !== undefined && (
                    <span className="lp-step-tag">
                      <Rich text={step.tag} />
                    </span>
                  )}
                </div>
                {step.body !== undefined && (
                  <p>
                    <Rich text={step.body} />
                  </p>
                )}
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

function Faq({ s }: { s: FaqSection }) {
  return (
    <section className="section" id={safeId(s.id)}>
      <div className="container lp-faq-wrap">
        <Head chip={s.chip} title={s.title} />
        <div className="lp-faq fade-up d1">
          {s.items.map((item, i) => (
            <details className="lp-faq-item" key={i}>
              <summary>
                <span>{item.question}</span>
                <span className="material-icons-round" aria-hidden="true">
                  expand_more
                </span>
              </summary>
              <p>
                <Rich text={item.answer} />
              </p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

function Cta({ s }: { s: CtaBandSection }) {
  return <CtaBand content={s} id={safeId(s.id)} />;
}

function Demo({ s, first }: { s: BookDemoSection; first: boolean }) {
  return (
    <BookDemo
      intro={s}
      hubspotMeetingUrl={s.hubspotMeetingUrl ?? bookDemoPage.hubspotMeetingUrl}
      id={safeId(s.id)}
      className="lp-demo"
      heading={first ? "h1" : "h2"}
    />
  );
}

function Tags({ s }: { s: TagsSection }) {
  return (
    <section className="problem lp-tags" id={safeId(s.id)}>
      <div className="container">
        <div className="fade-up">
          {s.chip !== undefined && (
            <div className="chip chip-dark">
              <Rich text={s.chip} />
            </div>
          )}
          <h2>
            <Rich text={s.title} />
          </h2>
          {s.body !== undefined && (
            <p className="lp-tags-body">
              <Rich text={s.body} />
            </p>
          )}
        </div>
        <div className="problem-tags fade-up d1">
          {s.tags.map((tag, i) => (
            <span key={i}>
              <Rich text={tag} />
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

function Statement({ s }: { s: StatementSection }) {
  return (
    <section className="whatwedo" id={safeId(s.id)}>
      <div className="container">
        <div className="fade-up">
          {s.chip !== undefined && (
            <div className="chip chip-orange">
              <Rich text={s.chip} />
            </div>
          )}
          <h2>
            <Rich text={s.title} />
          </h2>
        </div>
        {s.cta && (
          <div className="whatwedo-cta fade-up d1">
            <Button link={s.cta} className="btn btn-outline-white" />
          </div>
        )}
      </div>
    </section>
  );
}

function CompareCard({ side, modifier }: { side: CompareSide; modifier: "before" | "after" }) {
  return (
    <div className={`lp-compare-card lp-compare-card--${modifier}`}>
      <div className="lp-compare-tag">
        <Rich text={side.tag} />
      </div>
      <h3>
        <Rich text={side.title} />
      </h3>
      <ul className="lp-compare-list">
        {side.items.map((item, i) => (
          <li key={i}>
            <Icon name={item.icon} />
            <span>
              <Rich text={item.text} />
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Compare({ s }: { s: CompareSection }) {
  return (
    <section className="section" id={safeId(s.id)}>
      <div className="container">
        <Head chip={s.chip} title={s.title} sub={s.body} />
        <div className="lp-compare fade-up d1">
          <CompareCard side={s.before} modifier="before" />
          <CompareCard side={s.after} modifier="after" />
        </div>
      </div>
    </section>
  );
}

function Spotlight({ s }: { s: SpotlightSection }) {
  return (
    <section className="section" id={safeId(s.id)}>
      <div className="container">
        <div className="spotlight fade-up">
          <div>
            {s.chip !== undefined && (
              <div className="chip chip-orange">
                <Rich text={s.chip} />
              </div>
            )}
            <h2>
              <Rich text={s.title} />
            </h2>
            {s.body !== undefined && (
              <p>
                <Rich text={s.body} />
              </p>
            )}
            {s.cta && <Button link={s.cta} />}
          </div>
          <ul className="spotlight-list">
            {s.items.map((item, i) => (
              <li key={i}>
                <Icon name={item.icon} />
                <span>
                  <strong>
                    <Rich text={item.title} />
                  </strong>
                  <Rich text={item.body} />
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

/** One section. `first` is true for the page's first section (a book-demo there is the h1). */
export function LandingSection({ section, first = false }: { section: Section; first?: boolean }) {
  switch (section.type) {
    case "hero":
      return <Hero s={section} />;
    case "text":
      return <Text s={section} />;
    case "image":
      return <ImageBlock s={section} />;
    case "image-text":
      return <ImageText s={section} />;
    case "cards":
      return <Cards s={section} />;
    case "stats":
      return <Stats s={section} />;
    case "logos":
      return <Logos s={section} />;
    case "quote":
      return <Quote s={section} />;
    case "steps":
      return <Steps s={section} />;
    case "faq":
      return <Faq s={section} />;
    case "cta-band":
      return <Cta s={section} />;
    case "book-demo":
      return <Demo s={section} first={first} />;
    case "tags":
      return <Tags s={section} />;
    case "statement":
      return <Statement s={section} />;
    case "compare":
      return <Compare s={section} />;
    case "spotlight":
      return <Spotlight s={section} />;
    default: {
      const unknown: never = section;
      throw new Error(`Unknown landing section type: ${JSON.stringify((unknown as { type?: unknown }).type)}`);
    }
  }
}

export function LandingSections({ sections }: { sections: Section[] }) {
  return (
    <>
      {sections.map((section, i) => (
        <LandingSection key={i} section={section} first={i === 0} />
      ))}
    </>
  );
}
