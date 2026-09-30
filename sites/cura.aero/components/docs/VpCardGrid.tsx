import type { AhaCard, AhaContent } from "@/lib/content-types";
import { Rich } from "@/components/shared/Rich";
import { VpIcon } from "./VpIcon";

const TONES = new Set(["orange", "navy", "cream", "bluelt"]);

function Card({ card, num }: { card: AhaCard; num: number }) {
  const dark = card.tone === "orange" || card.tone === "navy";
  const classes = ["vp-card", card.featured && "vp-card--featured", TONES.has(card.tone) && `vp-card--${card.tone}`]
    .filter(Boolean)
    .join(" ");
  const iconTone = dark ? "white" : card.iconTone === "navy" ? "navy" : "orange";
  return (
    <div className={classes}>
      <div className="vp-card-top">
        <div className={`vp-icon-wrap ico-${iconTone}`}>
          <VpIcon name={card.icon} />
        </div>
        <div className="vp-card-num">{String(num).padStart(2, "0")}</div>
      </div>
      <h3>
        <Rich text={card.title} />
      </h3>
      <div className="vp-benefits">
        {card.benefits.map((b, i) => (
          <span className="vp-benefit" key={i}>
            <Rich text={b} />
          </span>
        ))}
      </div>
      <p>
        <Rich text={card.body} />
      </p>
    </div>
  );
}

/** aha: numbered sections of value-proposition cards. */
export function VpCardGrid({ sections }: { sections: AhaContent["sections"] }) {
  let n = 0;
  return sections.map((section, s) => (
    <div className="container" key={s}>
      <div className="section-header">
        <div className="section-header-left">
          <div className="section-num">{String(s + 1).padStart(2, "0")}</div>
          <div className={`section-chip chip-${section.chipTone === "navy" ? "navy" : "orange"}`}>
            <Rich text={section.chip} />
          </div>
          <h2>
            <Rich text={section.title} />
          </h2>
          <p>
            <Rich text={section.intro} />
          </p>
        </div>
        <div className="section-count">
          <Rich text={section.count} />
        </div>
      </div>
      <div className="section-divider"></div>

      {/* the last grid has extra room before the footer */}
      <div className="vp-grid" style={s === sections.length - 1 ? { marginTop: 24, paddingBottom: 80 } : { marginTop: 24 }}>
        {section.cards.map((card) => {
          n += 1;
          return <Card card={card} num={n} key={n} />;
        })}
      </div>
    </div>
  ));
}
