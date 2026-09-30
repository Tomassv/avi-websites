import type { HeaderContent } from "@/lib/content-types";
import { site } from "@/lib/content";
import { Img } from "@/components/shared/Img";
import { Rich } from "@/components/shared/Rich";
import { SafeLink } from "@/components/shared/SafeLink";
import { ScrollHideHeader } from "./ScrollHideHeader";

export function Header({ content }: { content: HeaderContent }) {
  const { logo, logoHref } = site.header;
  return (
    <>
      <header id="header">
        <div className="container">
          <SafeLink href={content.logoHref ?? logoHref} className="logo">
            <Img src={logo.src} alt={logo.alt} eager />
          </SafeLink>
          <nav className="header-nav">
            {content.nav.map((link, i) => (
              <SafeLink key={i} href={link.href} newTab={link.newTab}>
                <Rich text={link.label} />
              </SafeLink>
            ))}
          </nav>
          <SafeLink href={content.cta.href} className="btn btn-primary" newTab={content.cta.newTab}>
            <Rich text={content.cta.label} />
          </SafeLink>
        </div>
      </header>
      <ScrollHideHeader />
    </>
  );
}
