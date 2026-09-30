import type { CtaBandContent } from "@/lib/content-types";
import { Img } from "@/components/shared/Img";
import { Rich } from "@/components/shared/Rich";
import { SafeLink } from "@/components/shared/SafeLink";

/** Photo shapes along the strip, in order; the two shape spans sit between them. */
const PHOTO_SHAPES = ["hs-circle", "hs-leaf", "hs-arch", "hs-circle"];

export function CtaBand({ content }: { content: CtaBandContent }) {
  const photo = (i: number) =>
    content.photos[i] ? (
      <Img src={content.photos[i]} alt="" className={`hs-photo ${PHOTO_SHAPES[i]}`} width={440} height={440} />
    ) : null;
  return (
    <section className="cta-section" id="book-demo">
      <div className="cta-content fade-up">
        <h2>
          <Rich text={content.title} />
        </h2>
        <SafeLink href={content.button.href} className="btn btn-outline-white btn-demo">
          <Rich text={content.button.label} />
        </SafeLink>
      </div>

      <div className="cta-strip" aria-hidden="true">
        <span className="cta-shape cta-shape--half"></span>
        {photo(0)}
        {photo(1)}
        <span className="cta-shape cta-shape--bar"></span>
        {photo(2)}
        {photo(3)}
      </div>
    </section>
  );
}
