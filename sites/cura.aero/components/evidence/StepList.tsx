import type { EvidencePackageContent } from "@/lib/content-types";
import { Rich } from "@/components/shared/Rich";

/** The numbered data & flow reference list on evidence-package. */
export function StepList({ steps }: { steps: EvidencePackageContent["reference"]["steps"] }) {
  return (
    <div className="ev-steps fade-up d1">
      {steps.map((step, i) => (
        <div className="ev-step-card" key={i}>
          <div className="ev-step-num">{i + 1}</div>
          <div>
            <div className="ev-step-head">
              <h3>
                <Rich text={step.title} />
              </h3>
              {step.tag !== undefined && (
                <span className="ev-step-tag">
                  <Rich text={step.tag} />
                </span>
              )}
            </div>
            <ul className="ev-step-list">
              {step.items.map((item, j) => (
                <li key={j}>
                  {typeof item === "string" ? (
                    <Rich text={item} />
                  ) : (
                    <>
                      <Rich text={item.text} /> <span className="ev-quiet-inline">
                        <Rich text={item.source} />
                      </span>
                    </>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </div>
      ))}
    </div>
  );
}
