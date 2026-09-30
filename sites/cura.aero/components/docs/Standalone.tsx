import type { StandaloneContent } from "@/lib/content-types";
import { safeId } from "@/lib/safe-url";
import { Rich } from "@/components/shared/Rich";

/** non-connected-value: category bands with card grids, alternating navy and orange. */
export function CategoryCards({ categories }: { categories: StandaloneContent["categories"] }) {
  let n = 0;
  return categories.map((cat, c) => (
    <div className={cat.blue ? "vp-group vp-group--blue" : "vp-group"} key={c}>
      <section className={`vp-cat vp-cat--${c % 2 ? "orange" : "navy"} fade-up`} id={safeId(cat.id)}>
        <div className="cat-label">
          <Rich text={cat.label} />
        </div>
        <h2>
          <Rich text={cat.title} />
        </h2>
      </section>

      <div className="vp-grid">
        {cat.cards.map((card, i) => {
          n += 1;
          return (
            <article className={i % 2 ? "vp-card fade-up d1" : "vp-card fade-up"} key={i}>
              <div className="vp-index">{String(n).padStart(2, "0")}</div>
              <h3>
                <Rich text={card.title} />
              </h3>
              <p>
                <Rich text={card.body} />
              </p>
            </article>
          );
        })}
      </div>
    </div>
  ));
}

/** Inputs → Cura → outcomes diagram. */
export function StandaloneFlow({ flow }: { flow: StandaloneContent["flow"] }) {
  return (
    <section className="flow fade-up" aria-label={flow.ariaLabel}>
      <h2 className="flow-title">
        <Rich text={flow.title} />
      </h2>

      <div className="flow-grid">
        <div className="flow-col-label flow-l-in">
          <Rich text={flow.labels.inputs} />
        </div>
        <div className="flow-col-label flow-l-core">
          <Rich text={flow.labels.core} />
        </div>
        <div className="flow-col-label flow-l-out">
          <Rich text={flow.labels.outputs} />
        </div>

        <div className="flow-col flow-col--in">
          {flow.inputs.map((node, i) => (
            <div className="flow-node" key={i}>
              <h3>
                <Rich text={node.title} />
              </h3>
              <p>
                <Rich text={node.body} />
              </p>
            </div>
          ))}
        </div>

        <div className="flow-core">
          <div className="flow-core-brand">
            <Rich text={flow.core.brand} />
          </div>
          <ul className="flow-steps">
            {flow.core.steps.map((step, i) => (
              <li key={i}>
                <Rich text={step} />
              </li>
            ))}
          </ul>
        </div>

        <div className="flow-col flow-col--out">
          {flow.outputs.map((out, i) => (
            <div className="flow-node" key={i}>
              <h3>
                <Rich text={out} />
              </h3>
            </div>
          ))}
        </div>

        <div className="flow-regs">
          <Rich text={flow.regulations} />
        </div>
      </div>

      <div className="flow-unlocks">
        <h3>
          <Rich text={flow.unlocks.title} />
        </h3>
        <div className="unlocks-chips">
          {flow.unlocks.chips.map((chip, i) => (
            <span className="unlocks-chip" key={i}>
              <Rich text={chip} />
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
