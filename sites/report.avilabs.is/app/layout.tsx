import "@/styles/report.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Plan3 | Customer Report",
  robots: { index: false, follow: false },
  icons: { icon: "/favicon.ico" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
