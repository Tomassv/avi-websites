import type { ReactNode } from "react";
import type { EvidenceShared, IconItem, Mail, StageText } from "@/lib/content-types";
import { safeIconName } from "@/lib/safe-url";
import { Rich } from "@/components/shared/Rich";

/** Pieces shared by evidence-automation and evidence-package. */

function Icon({ name }: { name: string }) {
  const icon = safeIconName(name);
  return icon ? <span className="material-icons-round">{icon}</span> : null;
}

export function SectionHeader({ text }: { text: StageText }) {
  return (
    <div className="wf-section-header">
      <div className="step-tag">
        <Rich text={text.tag} />
      </div>
      <h2>
        <Rich text={text.title} />
      </h2>
      <p>
        <Rich text={text.body} />
      </p>
    </div>
  );
}

/** Stage explainer on the left, its flow on the right. */
export function StageSplit({ text, children }: { text: StageText; children: ReactNode }) {
  return (
    <div className="ev-split fade-up">
      <SectionHeader text={text} />
      {children}
    </div>
  );
}

export function SourceLegend({ cards, style }: { cards: EvidenceShared["legend"]; style?: React.CSSProperties }) {
  return (
    <div className="ev-legend fade-up d1" style={style}>
      {cards.map((card, i) => (
        <div className="ev-legend-card" key={i}>
          <div className="who">
            <Rich text={card.who} />
          </div>
          <h3>
            <Rich text={card.title} />
          </h3>
          <p>
            <Rich text={card.body} />
          </p>
        </div>
      ))}
    </div>
  );
}

function MailCard({ mail, direction }: { mail: Mail; direction: "in" | "out" }) {
  return (
    <div className={`ev-mail ev-mail--${direction}`}>
      <div className="ev-mail-meta">
        <div className="ev-subject">
          <Rich text={mail.subject} />
        </div>
        <dl className="ev-fields">
          {mail.fields.map((f, i) => (
            <FieldRow key={i} label={f.label} value={f.value} />
          ))}
        </dl>
      </div>

      <div className="ev-mail-body">
        {mail.before.map((p, i) => (
          <p key={i}>
            <Rich text={p} />
          </p>
        ))}
        <ol className="ev-mail-list">
          {mail.items.map((item, i) => (
            <li key={i}>
              <span className="ev-item">
                {"text" in item ? (
                  <Rich text={item.text} />
                ) : (
                  <>
                    <b>
                      <Rich text={item.title} />
                    </b>
                    <span className="ev-quiet">
                      <Rich text={item.note} />
                    </span>
                  </>
                )}
              </span>
            </li>
          ))}
        </ol>
        {mail.after.map((p, i) => (
          <p key={i}>
            <Rich text={p} />
          </p>
        ))}
        <div className="ev-sign">
          <Rich text={mail.sign} />
        </div>
      </div>

      {(mail.attachments || mail.integrity) && (
        <div className="ev-mail-foot">
          {mail.attachments && (
            <div className="ev-attach">
              {mail.attachments.map((a, i) => (
                <span key={i}>
                  <span className="material-icons-round">description</span>
                  <Rich text={a} />
                </span>
              ))}
            </div>
          )}
          {mail.integrity && (
            <div className="ev-integrity">
              <span className="material-icons-round">lock</span>
              <span>
                <Rich text={mail.integrity.text} /> <span className="ev-hash">{mail.integrity.hash}</span>
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function FieldRow({ label, value }: { label: string; value: string }) {
  return (
    <>
      <dt>
        <Rich text={label} />
      </dt>
      <dd>
        <Rich text={value} />
      </dd>
    </>
  );
}

/** The authority's request and the reply it produces, side by side. */
export function MailPair({ practice }: { practice: EvidenceShared["practice"] }) {
  return (
    <div className="ev-pair">
      <MailCard mail={practice.request} direction="in" />
      <div className="ev-pair-arrow">
        <span className="material-icons-round">arrow_forward</span>
      </div>
      <MailCard mail={practice.reply} direction="out" />
    </div>
  );
}

export function IconList({ items, className }: { items: IconItem[]; className: string }) {
  return (
    <ul className={className}>
      {items.map((item, i) => (
        <li key={i}>
          <Icon name={item.icon} />
          <span>
            <Rich text={item.text} />
          </span>
        </li>
      ))}
    </ul>
  );
}

export { Icon };
