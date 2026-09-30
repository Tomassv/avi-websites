import { FadeUpObserver } from "@/components/shared/FadeUpObserver";

export default function DocsLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Onest:wght@400;500;600;700&display=swap" precedence="fonts" />
      <link rel="stylesheet" href="https://fonts.googleapis.com/icon?family=Material+Icons+Round" precedence="fonts" />
      {children}
      <FadeUpObserver />
    </>
  );
}
