import type { DocFooterContent, DocHeaderContent, DocTitleContent, FactCard } from "@/lib/content-types";
import { site } from "@/lib/content";
import { Img } from "@/components/shared/Img";
import { Rich } from "@/components/shared/Rich";
import { SafeLink } from "@/components/shared/SafeLink";

/** Building blocks shared by the internal document pages. */

export function DocHeader({ content }: { content: DocHeaderContent }) {
  const { logo } = site.header;
  const img = <Img src={logo.src} alt={logo.alt} eager />;
  return (
    <header className="page-header">
      <div className="page-header-inner">
        <div className="logo-wrap">{content.logoHref ? <SafeLink href={content.logoHref}>{img}</SafeLink> : img}</div>
        <div className="header-meta">
          <div className="doc-label">
            <Rich text={content.label} />
          </div>
          <div className="doc-date">
            <Rich text={content.date} />
          </div>
        </div>
      </div>
    </header>
  );
}

export function DocTitle({
  content,
  body,
  fade,
  children,
}: {
  content: DocTitleContent;
  /** Lead paragraph, when it doesn't live in the page's own title block. */
  body?: string;
  fade?: boolean;
  children?: React.ReactNode;
}) {
  const lead = body ?? content.body;
  return (
    <div className={fade ? "page-title fade-up" : "page-title"}>
      <div className="chip">
        <Rich text={content.chip} />
      </div>
      <h1>
        <Rich text={content.title} />
      </h1>
      {lead !== undefined && (
        <p>
          <Rich text={lead} />
        </p>
      )}
      {children}
    </div>
  );
}

export function FactCards({ facts }: { facts: FactCard[] }) {
  return (
    <div className="wf-facts fade-up d1">
      {facts.map((fact, i) => (
        <div className={`wf-fact wf-fact--${i + 1}`} key={i}>
          <div className="wf-fact-tag">
            <Rich text={fact.tag} />
          </div>
          <div className="wf-fact-num">
            <Rich text={fact.title} />
          </div>
          <div className="wf-fact-label">
            <Rich text={fact.body} />
          </div>
        </div>
      ))}
    </div>
  );
}

export function DocFooter({ content }: { content: DocFooterContent }) {
  return (
    <footer className="page-footer">
      <p>
        <Rich text={content.left} />
        {content.email && (
          <>
            {" "}
            <SafeLink href={content.email.href}>
              <Rich text={content.email.label} />
            </SafeLink>
          </>
        )}
      </p>
      <p>
        <Rich text={content.right} />
      </p>
    </footer>
  );
}
