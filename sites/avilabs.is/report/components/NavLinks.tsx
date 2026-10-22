"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export type NavLink = { href: string; label: string; match?: string };

/** `match` is the path prefix that marks the link active; defaults to href. */
export function NavLinks({ links, className, activeClass }: { links: NavLink[]; className: string; activeClass?: string }) {
  const pathname = usePathname();
  return (
    <div className={className}>
      {links.map(({ href, label, match = href }) => {
        const active = pathname === match || pathname.startsWith(`${match}/`);
        return (
          <Link key={href} href={href} className={active ? activeClass : undefined} aria-current={active ? "page" : undefined}>
            {label}
          </Link>
        );
      })}
    </div>
  );
}
