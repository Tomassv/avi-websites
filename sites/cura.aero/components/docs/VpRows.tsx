import type { ValuePropsContent } from "@/lib/content-types";
import { imageSize } from "@/lib/image-size";
import { safeId, safeImageSrc } from "@/lib/safe-url";
import { Rich } from "@/components/shared/Rich";
import { VpImage } from "./VpImage";

/** value-props: category bands, each followed by alternating text/screenshot rows. */
export function VpRows({ content }: { content: ValuePropsContent }) {
  let n = 0;
  return content.categories.map((cat, c) => (
    <div className="vp-group" key={c}>
      <section className={`vp-cat vp-cat--${c % 2 ? "orange" : "navy"} fade-up`} id={safeId(cat.id)}>
        <div className="cat-label">
          <Rich text={cat.label} />
        </div>
        <h2>
          <Rich text={cat.title} />
        </h2>
        <p>
          <Rich text={cat.intro} />
        </p>
      </section>

      {cat.items.map((item, i) => {
        n += 1;
        const src = safeImageSrc(item.image.src);
        const size = src ? imageSize(src) : null;
        return (
          <section className={i % 2 ? "vp vp--reverse" : "vp"} key={i}>
            <div className="vp-text fade-up">
              <div className="vp-index">{String(n).padStart(2, "0")}</div>
              <h2>
                <Rich text={item.title} />
              </h2>
              <div className="vp-benefits">
                {item.benefits.map((b, j) => (
                  <div className="vp-benefit" key={j}>
                    <span className="vp-benefit-icon">
                      <span className="material-icons-round">check</span>
                    </span>
                    <span>
                      <Rich text={b} />
                    </span>
                  </div>
                ))}
              </div>
              {item.body.map((p, j) => (
                <p className="vp-body" key={j}>
                  <Rich text={p} />
                </p>
              ))}
            </div>
            <div className="vp-media fade-up d1">
              <div className="vp-media-frame">
                <div className="vp-media-screen">
                  {src && size ? (
                    <VpImage
                      src={src}
                      width={size.width}
                      height={size.height}
                      alt={item.image.alt}
                      placeholder={<Placeholder text={content.placeholder} />}
                    />
                  ) : (
                    <div className="vp-media-placeholder">
                      <Placeholder text={content.placeholder} />
                    </div>
                  )}
                </div>
              </div>
            </div>
          </section>
        );
      })}
    </div>
  ));
}

function Placeholder({ text }: { text: string }) {
  return (
    <>
      <span className="material-icons-round">image</span>
      <span>
        <Rich text={text} />
      </span>
    </>
  );
}
