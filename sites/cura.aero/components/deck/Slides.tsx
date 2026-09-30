import type { ReactNode } from "react";
import type { DeckSlide } from "@/lib/content-types";
import { Rich } from "@/components/shared/Rich";
import { CuraLogo } from "./CuraLogo";

/** Server-rendered slide bodies, one per slide type (the flow slide is interactive: see Deck). */

function Head({ slide }: { slide: DeckSlide }) {
  return (
    <>
      <p className="eyebrow">
        <Rich text={slide.eyebrow} />
      </p>
      <h2>
        <Rich text={slide.title} />
      </h2>
    </>
  );
}

function Body({ text, className = "body" }: { text?: string; className?: string }) {
  if (text === undefined) return null;
  return (
    <p className={className}>
      <Rich text={text} />
    </p>
  );
}

const CARD_TINTS = new Set(["priv", "cura"]);
const CELL_TONES = new Set(["y", "n", "opt"]);

export function slideBody(slide: DeckSlide, logoLabel: string): ReactNode {
  switch (slide.type) {
    case "title":
      return (
        <>
          <CuraLogo className="logo-lg" label={logoLabel} />
          <h1>
            <Rich text={slide.title} />
          </h1>
          <Body text={slide.lead} className="lead" />
        </>
      );

    case "stats":
      return (
        <>
          <Head slide={slide} />
          <div className={`grid g${slide.stats!.length}`}>
            {slide.stats!.map((s, i) => (
              <div className="card" key={i}>
                <div className="n">
                  <Rich text={s.value} />
                </div>
                <p>
                  <Rich text={s.text} />
                </p>
              </div>
            ))}
          </div>
          <Body text={slide.body} />
        </>
      );

    case "silos":
      return (
        <>
          <Head slide={slide} />
          <div className="silos">
            {slide.silos!.map((s, i) => (
              <div className="silo" key={i}>
                <em>
                  <Rich text={s.tag} />
                </em>
                <b>
                  <Rich text={s.text} />
                </b>
              </div>
            ))}
          </div>
          {/* dashed lines from the three silos down to the hand-work box */}
          <svg className="join" viewBox="0 0 1000 78" preserveAspectRatio="none" aria-hidden="true">
            <path d="M167 2 L494 72" />
            <path d="M500 2 L500 72" />
            <path d="M833 2 L506 72" />
          </svg>
          <div className="byhand">
            <b>
              <Rich text={slide.byhand!.title} />
            </b>
            <span>
              <Rich text={slide.byhand!.text} />
            </span>
          </div>
          <Body text={slide.body} className="body center" />
        </>
      );

    case "table": {
      const rows = slide.rows as { label: string; cells: { text: string; tone: string }[] }[];
      return (
        <>
          <Head slide={slide} />
          <table>
            <tbody>
              <tr>
                {slide.head!.map((h, i) => (
                  <th key={i}>
                    <Rich text={h} />
                  </th>
                ))}
              </tr>
              {rows.map((row, i) => (
                <tr key={i}>
                  <td>
                    <Rich text={row.label} />
                  </td>
                  {row.cells.map((cell, j) => (
                    <td key={j} className={CELL_TONES.has(cell.tone) ? cell.tone : undefined}>
                      <Rich text={cell.text} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </>
      );
    }

    case "pack": {
      const { doc, annex } = slide as Required<Pick<DeckSlide, "doc" | "annex">>;
      return (
        <>
          <Head slide={slide} />
          <div className="pack">
            <div className="doc">
              <p className="to">
                <Rich text={doc.to} />
              </p>
              <p className="rf">
                <Rich text={doc.ref} />
              </p>
              <h4>
                <Rich text={doc.title} />
              </h4>
              {doc.sections.map((sec, i) => (
                <div className="sec" key={i}>
                  <b>{i + 1}.</b>
                  <Rich text={sec} />
                </div>
              ))}
              <p className="sig">
                <Rich text={doc.sign} />
              </p>
            </div>
            <div className="anx">
              <div className="hd">
                <span>
                  <Rich text={annex.title} />
                </span>
                <span>
                  <Rich text={annex.count} />
                </span>
              </div>
              {annex.rows.map((row, i) => (
                <div className="arow" key={i}>
                  <i>
                    <Rich text={row.id} />
                  </i>
                  <span>
                    <Rich text={row.text} />
                  </span>
                  <em>
                    <Rich text={row.source} />
                  </em>
                </div>
              ))}
              <p className="seal">
                <Rich text={annex.seal} />
              </p>
            </div>
          </div>
          <Body text={slide.body} />
        </>
      );
    }

    case "mono":
      return (
        <>
          <Head slide={slide} />
          {/* plain text: .mono keeps its newlines and spacing */}
          <div className="mono">{slide.mono}</div>
          <Body text={slide.body} />
        </>
      );

    case "cards":
      return (
        <>
          <Head slide={slide} />
          <div className={`grid g${slide.cards!.length}`}>
            {slide.cards!.map((card, i) => (
              <div className={card.tint && CARD_TINTS.has(card.tint) ? `card tint-${card.tint}` : "card"} key={i}>
                <h3>
                  <Rich text={card.title} />
                </h3>
                <p>
                  <Rich text={card.text} />
                </p>
              </div>
            ))}
          </div>
          <Body text={slide.body} />
        </>
      );

    case "learning": {
      const rows = slide.rows as { from: string; was: string; now: string; next: string }[];
      const [edit, rule] = slide.sources!;
      return (
        <>
          <Head slide={slide} />
          <div className="lrnflow">
            <div className="lin">
              {[edit, rule].map(
                (src, i) =>
                  src && (
                    <div className={i === 0 ? "src s-edit" : "src s-rule"} key={i}>
                      <b>
                        <Rich text={src.title} />
                      </b>
                      <span>
                        <Rich text={src.text} />
                      </span>
                    </div>
                  ),
              )}
            </div>
            <div className="lmid">
              <table className="lrn">
                <tbody>
                  <tr>
                    {slide.head!.map((h, i) => (
                      <th key={i}>
                        <Rich text={h} />
                      </th>
                    ))}
                  </tr>
                  {rows.map((row, i) => (
                    <tr key={i}>
                      <td>
                        <Rich text={row.from} />
                      </td>
                      <td>
                        <span className="was">
                          <Rich text={row.was} />
                        </span>
                        <span className="now">
                          <Rich text={row.now} />
                        </span>
                      </td>
                      <td>
                        <Rich text={row.next} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="lout">
              <Rich text={slide.out} />
            </div>
          </div>
        </>
      );
    }

    case "list":
      return (
        <>
          <Head slide={slide} />
          <ul className="plain">
            {slide.items!.map((item, i) => (
              <li key={i}>
                <b>
                  <Rich text={item.lead} />
                </b>{" "}
                <Rich text={item.text} />
              </li>
            ))}
          </ul>
          <Body text={slide.body} />
        </>
      );

    case "quote":
      return (
        <>
          <CuraLogo className="logo-lg" label={logoLabel} />
          <div className="quote">
            <Rich text={slide.quote} />
          </div>
        </>
      );

    default:
      return null;
  }
}
