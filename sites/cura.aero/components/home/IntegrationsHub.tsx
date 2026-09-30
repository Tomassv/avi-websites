import type { HomeContent } from "@/lib/content-types";
import { safeImageSrc } from "@/lib/safe-url";
import { Img } from "@/components/shared/Img";
import { Rich } from "@/components/shared/Rich";

/*
 * The hub diagram's geometry is tuned to the current label widths: each label sits in a fixed
 * pill with a spoke into the logo. Labels come from content in pill order; a longer label
 * needs its pill widened here too.
 */
const PILLS = [
  { x: 170, y: 70, w: 72, tx: 206, ty: 98 },
  { x: 120, y: 150, w: 96, tx: 168, ty: 178 },
  { x: 80, y: 230, w: 172, tx: 166, ty: 258 },
  { x: 150, y: 310, w: 70, tx: 185, ty: 338 },
  { x: 300, y: 370, w: 150, tx: 375, ty: 398 },
  { x: 470, y: 370, w: 270, tx: 605, ty: 398 },
  { x: 780, y: 64, w: 160, tx: 860, ty: 92 },
  { x: 840, y: 150, w: 160, tx: 920, ty: 178 },
  { x: 820, y: 236, w: 230, tx: 935, ty: 264 },
  { x: 800, y: 322, w: 140, tx: 870, ty: 350 },
  { x: 755, y: 370, w: 92, tx: 801, ty: 398 },
];

const SPOKES = [
  "M242,92 Q300,110 339.0,153.3",
  "M216,172 Q290,180 336.3,192.6",
  "M252,252 Q300,250 339.6,235.2",
  "M220,332 Q300,310 343.1,273.8",
  "M375,370 Q405,322 425.4,287.7",
  "M605,372 Q570,322 549.4,285.8",
  "M780,86 Q764,112 755.8,151.2",
  "M840,172 Q772,185 761.7,191.3",
  "M820,258 Q772,250 758.7,238.0",
  "M800,344 Q772,318 757.3,280.4",
  "M800,372 Q776,322 752.8,285.6",
];

const HEADS = [
  "M345,160 L335.0,154.2 L340.2,149.5 z",
  "M345,195 L333.5,195.5 L335.3,188.7 z",
  "M348,232 L338.9,239.1 L336.5,232.6 z",
  "M350,268 L343.8,277.8 L339.3,272.4 z",
  "M430,280 L427.4,291.2 L421.4,287.7 z",
  "M545,278 L553.5,285.8 L547.4,289.3 z",
  "M754,160 L752.8,148.5 L759.7,149.9 z",
  "M754,196 L761.6,187.3 L765.2,193.3 z",
  "M752,232 L762.5,236.8 L757.8,242.0 z",
  "M754,272 L761.3,281.0 L754.7,283.5 z",
  "M748,278 L756.9,285.4 L751.0,289.2 z",
];

export function IntegrationsHub({ content }: { content: HomeContent["integrations"] }) {
  const labels = content.hubLabels.slice(0, PILLS.length);
  const logoHref = safeImageSrc(content.hubLogo.src);
  return (
    <section className="integrations">
      <div className="container">
        <div className="integrations-header fade-up">
          <div className="chip chip-dark">
            <Rich text={content.chip} />
          </div>
          <h2>
            <Rich text={content.title} />
          </h2>
          <p>
            <Rich text={content.sub} />
          </p>
        </div>

        <div className="fade-up d1 integrations-hub-wrap">
          <svg className="integrations-hub" viewBox="0 0 1150 440" role="img" aria-label={content.hubAriaLabel}>
            {labels.map((_, i) => (
              <path key={`s${i}`} className="spoke" d={SPOKES[i]} />
            ))}
            {labels.map((_, i) => (
              <path key={`h${i}`} className="spoke-head" d={HEADS[i]} />
            ))}

            {logoHref && (
              <image
                className="cura-logo"
                href={logoHref}
                x="380"
                y="159"
                width="340"
                height="101"
                preserveAspectRatio="xMidYMid meet"
              />
            )}

            {labels.map((label, i) => {
              const p = PILLS[i];
              return (
                <g key={`p${i}`}>
                  <rect className="pill-rect" x={p.x} y={p.y} width={p.w} height="44" rx="22" />
                  <text className="pill-text" textAnchor="middle" x={p.tx} y={p.ty}>
                    {label}
                  </text>
                </g>
              );
            })}
          </svg>

          <div className="integrations-hub-mobile">
            <div className="ihm-center">
              <Img src={content.hubLogo.src} alt={content.hubLogo.alt} />
            </div>
            <ul className="ihm-pills">
              {content.hubLabels.map((label, i) => (
                <li key={i}>{label}</li>
              ))}
            </ul>
          </div>
        </div>

        <div className="integrations-logos fade-up d1">
          <div className="integrations-logos-label">
            <Rich text={content.logosLabel} />
          </div>
          <div className="integrations-logos-row">
            {content.logos.map((logo, i) =>
              "image" in logo ? (
                <Img key={i} src={logo.image.src} alt={logo.image.alt} />
              ) : (
                <span key={i}>{logo.text}</span>
              ),
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
