/**
 * Shapes of the files in content/. lib/content.ts assigns each JSON file to its interface,
 * so a content file with the wrong shape fails the type check and the build.
 *
 * Strings marked Rich may contain the whitelisted inline markup (lib/rich.ts); every other
 * string is rendered as plain text. hrefs and image paths are validated when rendered.
 */

/** A string that may contain whitelisted inline markup. */
export type Rich = string;

export type Link = { label: Rich; href: string; newTab?: boolean };
export type ImageRef = { src: string; alt: string };

export type Seo = {
  title: string;
  description?: string;
  canonical?: string;
  robots?: string;
  author?: string;
  themeColor?: string;
  openGraph?: {
    type: string;
    siteName: string;
    title: string;
    description: string;
    url: string;
    image: string;
    imageAlt: string;
    locale: string;
  };
  twitter?: { card: string; title: string; description: string; image: string };
  jsonLd?: unknown;
};

// ── Site shell ──

export type SiteContent = {
  name: string;
  url: string;
  gaId: string;
  header: { logo: ImageRef; logoHref: string };
  footer: {
    logo: ImageRef;
    copyright: Rich;
    parent: Link;
    address: Rich;
  };
};

/** Per-page header: nav links and the call-to-action button. */
export type HeaderContent = {
  logoHref?: string;
  nav: Link[];
  cta: Link;
};

// ── Workflow diagrams ──

export type WorkflowNode = {
  icon: string;
  /** Rich: may use <span class='wf-lead'>. */
  title: Rich;
  /** Who supplies the step, shown at the right of the card head. */
  actor?: string;
  /** Orange actor tag (Cura's own steps). */
  actorCura?: boolean;
  /** An orange hand-off suffix after the actor, e.g. "→ Cura". */
  actorHandoff?: string;
  badges?: { done: string; prog: string };
  body?: Rich;
  list?: Rich[];
  /** A node with a title only (no divider or body). */
  headOnly?: boolean;
  /** Condition node: orange chip. */
  cond?: boolean;
};

export type Workflow = {
  /** The spine: nodes joined by connectors. */
  nodes: WorkflowNode[];
  /** Optional fork after the last spine node: each column is a chain of nodes. */
  branch?: WorkflowNode[][];
};
