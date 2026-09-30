import type { HeaderContent } from "@/lib/content-types";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";

/** Public marketing pages: site header, the page's sections, site footer. */
export function MarketingTemplate({ header, children }: { header: HeaderContent; children: React.ReactNode }) {
  return (
    <>
      <Header content={header} />
      {children}
      <Footer />
    </>
  );
}
