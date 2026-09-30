import "@/styles/pages/aha.css";
import type { AhaContent } from "@/lib/content-types";
import content from "@/content/pages/aha.json";
import { site } from "@/lib/content";
import { buildMetadata, buildViewport } from "@/lib/seo";
import { Img } from "@/components/shared/Img";
import { Rich } from "@/components/shared/Rich";
import { VpCardGrid } from "@/components/docs/VpCardGrid";

const page: AhaContent = content;

export const metadata = buildMetadata(page.seo);
export const viewport = buildViewport(page.seo);

/** The "overview" document variant: full-width sticky header and hero banner. */
export default function AhaPage() {
  const { logo } = site.header;
  return (
    <>
      <header className="page-header">
        <div className="container">
          <div className="page-header-inner">
            <div className="logo-wrap">
              <Img src={logo.src} alt={logo.alt} eager />
            </div>
            <div className="header-right">
              <span className="confidential-badge">
                <Rich text={page.header.badge} />
              </span>
              <span className="header-doc-info">
                <Rich text={page.header.label} />
              </span>
            </div>
          </div>
        </div>
      </header>

      <div className="hero-banner">
        <div className="container">
          <div className="hero-eyebrow">
            <Rich text={page.hero.eyebrow} />
          </div>
          <h1>
            <Rich text={page.hero.title} />
          </h1>
          <p>
            <Rich text={page.hero.body} />
          </p>
        </div>
      </div>

      <VpCardGrid sections={page.sections} />

      <footer className="page-footer">
        <div
          className="container"
          style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}
        >
          <p>
            <Rich text={page.footer.left} />
          </p>
          <p>
            <Rich text={page.footer.right} />
          </p>
        </div>
      </footer>
    </>
  );
}
