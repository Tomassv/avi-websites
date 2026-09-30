import "@/styles/next-image.css";
import type { Metadata } from "next";
import Script from "next/script";
import { site } from "@/lib/content";

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  icons: { icon: [{ url: "/images/favicon.png", type: "image/png" }] },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // The "js" class is added before paint (it gates the .fade-up reveal), so the
    // server-rendered class list differs from the client's.
    <html lang="en" suppressHydrationWarning>
      <body>
        <Script id="js-class" strategy="beforeInteractive">
          {"document.documentElement.classList.add('js');"}
        </Script>
        {children}
      </body>
    </html>
  );
}
