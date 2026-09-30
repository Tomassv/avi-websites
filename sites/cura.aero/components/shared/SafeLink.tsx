import type { ReactNode } from "react";
import { isExternalHref, safeHref } from "@/lib/safe-url";

type Props = {
  href: string | undefined;
  className?: string;
  newTab?: boolean;
  children: ReactNode;
};

/**
 * A link whose href comes from content. Only allowlisted URLs become links (see lib/safe-url.ts);
 * anything else renders as plain text with the same class. Links are plain <a> on purpose:
 * full page loads keep each page's CSS isolated and GA page views working as before.
 */
export function SafeLink({ href, className, newTab, children }: Props) {
  const safe = safeHref(href);
  if (!safe) return <span className={className}>{children}</span>;
  const external = isExternalHref(safe);
  return (
    <a
      href={safe}
      className={className}
      target={newTab ? "_blank" : undefined}
      rel={external ? "noopener noreferrer" : undefined}
    >
      {children}
    </a>
  );
}
