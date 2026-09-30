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

// ── Shared page pieces ──

/** The orange call-to-action band with the photo strip (home, evidence-automation). */
export type CtaBandContent = {
  title: Rich;
  button: Link;
  /** Four photos, filling the strip's circle, leaf, arch and circle shapes in order. */
  photos: string[];
};

// ── Home ──

export type HomeContent = {
  seo: Seo;
  header: HeaderContent;
  hero: { title: Rich; sub: Rich; cta: Link; workflow: Workflow };
  problem: { chip: Rich; title: Rich; tags: Rich[] };
  insight: {
    chip: Rich;
    title: Rich;
    sub: Rich;
    bad: Rich;
    good: Rich;
    photo: ImageRef;
    arrow: ImageRef;
  };
  whatWeDo: { chip: Rich; title: Rich; cta: Link };
  capabilities: { chip: Rich; title: Rich; sub: Rich; items: { icon: string; title: Rich }[] };
  integrations: {
    chip: Rich;
    title: Rich;
    sub: Rich;
    hubAriaLabel: string;
    hubLogo: ImageRef;
    /** Labels for the hub diagram pills, in the order of the fixed pill positions. */
    hubLabels: string[];
    logosLabel: Rich;
    logos: ({ image: ImageRef } | { text: string })[];
  };
  avilabs: {
    chip: Rich;
    title: Rich;
    sub: Rich;
    leadLogo: ImageRef;
    body: Rich;
    stat: { value: Rich; label: Rich };
    family: ImageRef[];
  };
  cta: CtaBandContent;
};

// ── Book a demo ──

export type BookDemoContent = {
  seo: Seo;
  header: HeaderContent;
  intro: { chip: Rich; title: Rich; sub: Rich; points: Rich[] };
  hubspotMeetingUrl: string;
};

// ── Evidence pages (evidence-automation, evidence-package) ──

export type StageText = { tag: Rich; title: Rich; body: Rich };

export type Mail = {
  subject: Rich;
  fields: { label: Rich; value: Rich }[];
  /** Paragraphs before the numbered list (the first is the greeting). */
  before: Rich[];
  /** Plain items (the request) or titled items with a note (the reply). */
  items: ({ text: Rich } | { title: Rich; note: Rich })[];
  after: Rich[];
  sign: Rich;
  attachments?: Rich[];
  integrity?: { text: Rich; hash: string };
};

/** Copy shared by both evidence pages: content/shared/evidence-sources.json. */
export type EvidenceShared = {
  intro: Rich;
  stageOne: StageText;
  legend: { who: Rich; title: Rich; body: Rich }[];
  stageTwo: StageText & { flow: Workflow };
  practice: StageText & { request: Mail; reply: Mail };
};

export type IconItem = { icon: string; text: Rich };

export type EvidenceAutomationContent = {
  seo: Seo;
  header: HeaderContent;
  hero: {
    eyebrow: Rich;
    title: Rich;
    sub: Rich;
    cta: Link;
    secondary: Link;
    workflow: Workflow;
  };
  pain: { title: Rich; body: Rich; tags: Rich[] };
  compare: {
    chip: Rich;
    title: Rich;
    body: Rich;
    now: { tag: Rich; title: Rich; items: IconItem[] };
    cura: { tag: Rich; title: Rich; items: IconItem[] };
  };
  howItWorks: { chip: Rich; title: Rich; intakeFlow: Workflow };
  learning: {
    chip: Rich;
    title: Rich;
    body: Rich;
    cards: { title: Rich; speed: { icon: string; label: Rich; fast: boolean }; body: Rich }[];
    note: IconItem;
  };
  cta: CtaBandContent;
};
