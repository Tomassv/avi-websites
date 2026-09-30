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

// ── Internal documents ──

export type DocHeaderContent = {
  label: Rich;
  date: Rich;
  /** Where the logo links to, if anywhere. */
  logoHref?: string;
};

export type DocTitleContent = { chip: Rich; title: Rich; body?: Rich };

export type FactCard = { tag: Rich; title: Rich; body: Rich };

export type DocFooterContent = { left: Rich; right: Rich; email?: Link };

export type EvidencePackageContent = {
  seo: Seo;
  docHeader: DocHeaderContent;
  /** The lead paragraph is the shared evidence intro. */
  title: DocTitleContent;
  facts: FactCard[];
  intakeFlow: Workflow;
  reference: {
    tag: Rich;
    title: Rich;
    body: Rich;
    steps: {
      title: Rich;
      tag?: Rich;
      /** A plain item, or one with a muted source note after it. */
      items: (Rich | { text: Rich; source: Rich })[];
    }[];
  };
};

export type WorkflowPageContent = {
  seo: Seo;
  docHeader: DocHeaderContent;
  title: DocTitleContent;
  facts: FactCard[];
  section: { title: Rich; body: Rich };
  /** Spine plus one column per condition (shown from 600px up). */
  flow: Workflow;
  /** The stacked version shown on phones. */
  mobileFlow: Workflow;
};

export type UpdateContent = {
  seo: Seo;
  docHeader: DocHeaderContent;
  title: DocTitleContent;
  phases: { label: Rich; title: Rich; items: Rich[]; timing: Rich }[];
  timeline: { title: Rich; body: Rich; segments: { label: Rich; note: Rich }[] };
  footer: DocFooterContent;
};

export type ValuePropsContent = {
  seo: Seo;
  docHeader: DocHeaderContent;
  title: DocTitleContent;
  /** Shown in each image frame until its screenshot loads. */
  placeholder: Rich;
  categories: {
    id: string;
    label: Rich;
    title: Rich;
    intro: Rich;
    items: { title: Rich; benefits: Rich[]; body: Rich[]; image: ImageRef }[];
  }[];
  footer: DocFooterContent;
};

export type AhaCard = {
  /** An icon name from components/docs/VpIcon.tsx. */
  icon: string;
  /** plain | orange | navy | cream | bluelt (checked when rendered). */
  tone: string;
  featured?: boolean;
  /** Icon colour on light cards: orange (default) | navy. Dark cards always use white. */
  iconTone?: string;
  title: Rich;
  benefits: Rich[];
  body: Rich;
};

export type AhaContent = {
  seo: Seo;
  header: { badge: Rich; label: Rich };
  hero: { eyebrow: Rich; title: Rich; body: Rich };
  sections: {
    chip: Rich;
    /** orange | navy */
    chipTone: string;
    title: Rich;
    intro: Rich;
    count: Rich;
    cards: AhaCard[];
  }[];
  footer: { left: Rich; right: Rich };
};

export type StandaloneContent = {
  seo: Seo;
  docHeader: DocHeaderContent;
  title: DocTitleContent;
  covers: { label: Rich; regulations: Rich[] };
  categories: { id: string; label: Rich; title: Rich; blue?: boolean; cards: { title: Rich; body: Rich }[] }[];
  flow: {
    ariaLabel: string;
    title: Rich;
    labels: { inputs: Rich; core: Rich; outputs: Rich };
    inputs: { title: Rich; body: Rich }[];
    core: { brand: Rich; steps: Rich[] };
    outputs: Rich[];
    regulations: Rich;
    unlocks: { title: Rich; chips: Rich[] };
  };
  footer: DocFooterContent;
};

// ── Decks ──

/**
 * One slide. JSON can't carry a checked discriminant, so every field but `type` is optional
 * here and lib/deck.ts validates each slide against its type when the page is built.
 */
export type DeckSlide = {
  /** title | stats | silos | flow | table | pack | mono | cards | learning | list | quote */
  type: string;
  eyebrow?: Rich;
  title?: Rich;
  lead?: Rich;
  body?: Rich;
  stats?: { value: Rich; text: Rich }[];
  silos?: { tag: Rich; text: Rich }[];
  byhand?: { title: Rich; text: Rich };
  /** Flow steps. kind: api | ai | det | hum. */
  steps?: { kind: string; tag: Rich; title: Rich; detail: string }[];
  head?: Rich[];
  rows?: { label: Rich; cells: { text: Rich; tone: string }[] }[] | { from: Rich; was: Rich; now: Rich; next: Rich }[];
  doc?: { to: Rich; ref: Rich; title: Rich; sections: Rich[]; sign: Rich };
  annex?: { title: Rich; count: Rich; rows: { id: Rich; text: Rich; source: Rich }[]; seal: Rich };
  /** Monospace block; newlines and spacing are kept. */
  mono?: string;
  /** tint: priv | cura */
  cards?: { tint?: string; title: Rich; text: Rich }[];
  sources?: { title: Rich; text: Rich }[];
  out?: Rich;
  items?: { lead: Rich; text: Rich }[];
  quote?: Rich;
};

export type DeckContent = {
  seo: Seo;
  nav: { back: string; next: string; slide: string; logo: string };
  slides: DeckSlide[];
};

// ── News ──

export type NewsContent = {
  seo: Seo;
  header: HeaderContent;
  list: { chip: Rich; title: Rich; empty: Rich };
  article: { back: string; by: string; titleSuffix: string };
};
