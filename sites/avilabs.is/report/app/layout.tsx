import "@/styles/report.css";
import type { Metadata } from "next";
import { basePath } from "@/lib/base-path.ts";

export const metadata: Metadata = {
  title: "Plan3 | Customer Report",
  robots: { index: false, follow: false },
  icons: { icon: `${basePath}/favicon.ico` },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
