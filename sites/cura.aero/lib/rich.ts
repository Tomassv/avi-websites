/**
 * Whitelist parser for the inline markup allowed in content strings.
 *
 * Content is untrusted: it will be written by an automated tool from marketing input.
 * This turns a string into a small tree containing only the allowed tags and classes;
 * everything else is stripped. The tree is rendered by <Rich> as React elements, so text
 * is always escaped and no HTML string ever reaches the DOM.
 *
 * Allowed: <br>, <strong>, <b>, <em>, and <span class="…"> with classes from RICH_CLASSES.
 * - Disallowed tags lose the tag; their inner text is kept as plain text.
 * - <script>/<style> (and similar raw-text elements) are dropped with their contents.
 * - Comments, doctype and processing instructions are dropped.
 * - Every attribute except an allowed `class` on <span> is dropped.
 * - Unclosed tags are closed at the end, stray closing tags are ignored, and nesting is
 *   capped at MAX_DEPTH. Malformed input never throws.
 */

export type RichInline = "strong" | "b" | "em";

export type RichNode =
  | string
  | { tag: "br" }
  | { tag: RichInline; children: RichNode[] }
  | { tag: "span"; className: string; children: RichNode[] };

export const RICH_CLASSES = [
  "orange",
  "hi",
  "hi-orange",
  "hi-white",
  "text-bold",
  "wf-lead",
  "ev-quiet",
] as const;

const ALLOWED_CLASSES: ReadonlySet<string> = new Set(RICH_CLASSES);
const INLINE_TAGS: ReadonlySet<string> = new Set(["strong", "b", "em"]);
/** Elements whose contents are dropped entirely, not kept as text. */
const DROP_CONTENT_TAGS: ReadonlySet<string> = new Set([
  "script",
  "style",
  "template",
  "noscript",
  "textarea",
  "title",
  "xmp",
  "iframe",
  "object",
  "noembed",
  "noframes",
  "plaintext",
]);
export const MAX_DEPTH = 16;

const NAMED_ENTITIES: Readonly<Record<string, string>> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
  mdash: "—",
  ndash: "–",
  middot: "·",
  rarr: "→",
  larr: "←",
  hellip: "…",
  ldquo: "“",
  rdquo: "”",
  lsquo: "‘",
  rsquo: "’",
  minus: "−",
  euro: "€",
  times: "×",
};

/** Decodes the fixed set of named entities and numeric entities. Unknown ones are left as text. */
export function decodeEntities(text: string): string {
  return text.replace(/&(#[xX][0-9a-fA-F]{1,6}|#[0-9]{1,7}|[a-zA-Z]{2,8});/g, (whole, body: string) => {
    if (body[0] === "#") {
      const code = body[1] === "x" || body[1] === "X" ? parseInt(body.slice(2), 16) : parseInt(body.slice(1), 10);
      if (!Number.isFinite(code) || code <= 0 || code > 0x10ffff || (code >= 0xd800 && code <= 0xdfff)) {
        return "�";
      }
      return String.fromCodePoint(code);
    }
    return NAMED_ENTITIES[body] ?? whole;
  });
}

const TAG_RE = /^<(\/?)([a-zA-Z][a-zA-Z0-9-]*)((?:[^<>"']|"[^"]*"|'[^']*')*)>/;
const CLASS_ATTR_RE = /(?:^|\s)class\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+))/i;

function allowedClasses(attrs: string): string {
  const m = CLASS_ATTR_RE.exec(attrs);
  if (!m) return "";
  const raw = m[1] ?? m[2] ?? m[3] ?? "";
  const seen: string[] = [];
  for (const c of raw.split(/\s+/)) {
    if (c && ALLOWED_CLASSES.has(c) && !seen.includes(c)) seen.push(c);
  }
  return seen.join(" ");
}

type Frame = {
  /** The tag name as written (lowercased), used to match closing tags. */
  name: string;
  /** null for a transparent frame (a span with no allowed class): children go straight to the parent. */
  node: Extract<RichNode, { children: RichNode[] }> | null;
  children: RichNode[];
};

function pushText(target: RichNode[], text: string) {
  if (!text) return;
  const last = target[target.length - 1];
  if (typeof last === "string") target[target.length - 1] = last + text;
  else target.push(text);
}

export function parseRich(input: unknown): RichNode[] {
  if (typeof input !== "string" || input === "") return [];
  const root: RichNode[] = [];
  const stack: Frame[] = [];
  const out = () => (stack.length ? stack[stack.length - 1].children : root);

  let i = 0;
  let text = "";
  const flush = () => {
    pushText(out(), decodeEntities(text));
    text = "";
  };

  while (i < input.length) {
    const lt = input.indexOf("<", i);
    if (lt === -1) {
      text += input.slice(i);
      break;
    }
    text += input.slice(i, lt);
    const rest = input.slice(lt);

    // Comments, doctype, CDATA, processing instructions: dropped.
    if (rest.startsWith("<!--")) {
      const end = input.indexOf("-->", lt + 4);
      i = end === -1 ? input.length : end + 3;
      continue;
    }
    if (rest.startsWith("<!") || rest.startsWith("<?")) {
      const end = input.indexOf(">", lt);
      i = end === -1 ? input.length : end + 1;
      continue;
    }

    const m = TAG_RE.exec(rest);
    if (!m) {
      // A bare "<" that doesn't start a tag is text.
      text += "<";
      i = lt + 1;
      continue;
    }

    const closing = m[1] === "/";
    const name = m[2].toLowerCase();
    const attrs = m[3];
    i = lt + m[0].length;

    if (!closing && DROP_CONTENT_TAGS.has(name)) {
      // Skip to the matching close tag (or the end), dropping everything in between.
      const closeRe = new RegExp(`</${name}\\s*>`, "i");
      const after = input.slice(i);
      const cm = closeRe.exec(after);
      i = cm ? i + cm.index + cm[0].length : input.length;
      continue;
    }

    if (name === "br") {
      if (closing) continue;
      flush();
      out().push({ tag: "br" });
      continue;
    }

    const isInline = INLINE_TAGS.has(name);
    const isSpan = name === "span";
    if (!isInline && !isSpan) continue; // Disallowed tag: drop the tag, keep surrounding text.

    if (closing) {
      const idx = stack.map((f) => f.name).lastIndexOf(name);
      if (idx === -1) continue; // Stray closing tag.
      flush();
      while (stack.length > idx) closeFrame(stack, root);
      continue;
    }

    if (stack.length >= MAX_DEPTH) continue; // Too deep: ignore the tag, keep its text.
    flush();
    if (isInline) {
      const node = { tag: name as RichInline, children: [] as RichNode[] };
      stack.push({ name, node, children: node.children });
    } else {
      const className = allowedClasses(attrs);
      if (className) {
        const node = { tag: "span" as const, className, children: [] as RichNode[] };
        stack.push({ name, node, children: node.children });
      } else {
        stack.push({ name, node: null, children: [] });
      }
    }
  }

  flush();
  while (stack.length) closeFrame(stack, root);
  return root;
}

function closeFrame(stack: Frame[], root: RichNode[]) {
  const frame = stack.pop()!;
  const parent = stack.length ? stack[stack.length - 1].children : root;
  if (frame.node) {
    parent.push(frame.node);
  } else {
    for (const child of frame.children) {
      if (typeof child === "string") pushText(parent, child);
      else parent.push(child);
    }
  }
}

/** Plain-text rendering of a rich string (for alt text, aria labels and metadata). */
export function richToText(input: unknown): string {
  const walk = (nodes: RichNode[]): string =>
    nodes.map((n) => (typeof n === "string" ? n : n.tag === "br" ? " " : walk(n.children))).join("");
  return walk(parseRich(input));
}
