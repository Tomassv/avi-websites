import { site } from "@/lib/content";
import { Img } from "@/components/shared/Img";
import { Rich } from "@/components/shared/Rich";
import { SafeLink } from "@/components/shared/SafeLink";

export function Footer() {
  const { logo, copyright, parent, address } = site.footer;
  return (
    <footer>
      <div className="container">
        <div className="footer-top">
          <Img src={logo.src} alt={logo.alt} />
          <p className="footer-copy">
            <Rich text={copyright} />{" "}
            <SafeLink href={parent.href} newTab={parent.newTab}>
              <Rich text={parent.label} />
            </SafeLink>
            <br />
            <Rich text={address} />
          </p>
        </div>
      </div>
    </footer>
  );
}
