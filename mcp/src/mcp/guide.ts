import type { SiteConfig } from "../sites/types.ts";
import { MAX_INPUT_BYTES, MAX_OUTPUT_BYTES, MAX_EDGE } from "../guardrails/images.ts";
import { MAX_TEXT } from "../guardrails/fields.ts";

/**
 * get_site_guide's text, built from the site's README and landing schema on main, so it
 * describes the rules the site actually enforces.
 */

/** A `## Heading` section (or `### …`) of a Markdown document, up to the next heading of its level. */
export function readmeSection(readme: string, heading: string): string | null {
  const lines = readme.split("\n");
  const start = lines.findIndex((l) => /^#{2,4} /.test(l) && l.replace(/^#+ /, "").trim() === heading);
  if (start === -1) return null;
  const level = /^#+/.exec(lines[start])![0].length;
  let end = lines.length;
  for (let i = start + 1; i < lines.length; i++) {
    const m = /^(#+) /.exec(lines[i]);
    if (m && m[1].length <= level) {
      end = i;
      break;
    }
  }
  return lines.slice(start, end).join("\n").trim();
}

type JsonSchema = { $defs?: Record<string, any>; properties?: Record<string, any>; required?: string[] };

function typeOf(s: any): string {
  if (!s) return "any";
  if (s.$ref) {
    const name = String(s.$ref).split("/").pop()!;
    const base = { rich: "rich text", text: "plain text", href: "link URL", link: "link {label, href, newTab?}", image: "image {src, alt}", imageSrc: "image path", icon: "icon name", anchorId: "anchor id" }[name] ?? name;
    return s.maxLength ? `${base} ≤${s.maxLength}` : base;
  }
  if (s.const !== undefined) return JSON.stringify(s.const);
  if (s.enum) return s.enum.map((v: unknown) => JSON.stringify(v)).join(" | ");
  if (s.type === "array") {
    const n = s.minItems !== undefined || s.maxItems !== undefined ? ` (${s.minItems ?? 0}–${s.maxItems ?? "∞"})` : "";
    return `list of ${typeOf(s.items)}${n}`;
  }
  if (s.type === "object" && s.properties) {
    return `{ ${Object.keys(s.properties).map((k) => `${k}${s.required?.includes(k) ? "" : "?"}`).join(", ")} }`;
  }
  if (s.oneOf) return s.oneOf.map(typeOf).join(" or ");
  return s.type ?? "any";
}

/** The landing section catalog as a compact field list per section type. */
export function sectionCatalog(schema: JsonSchema): string {
  const defs = schema.$defs ?? {};
  const out: string[] = [];
  for (const [name, def] of Object.entries(defs)) {
    if (!name.startsWith("section-")) continue;
    const fields = Object.entries(def.properties ?? {})
      .filter(([k]) => k !== "type")
      .map(([k, v]) => `  - \`${k}\`${def.required?.includes(k) ? "" : "?"}: ${typeOf(v)}`);
    out.push(`- **${name.slice(8)}**: ${def.description ?? ""}\n${fields.join("\n")}`);
  }
  return out.join("\n");
}

export function buildGuide(site: SiteConfig, readme: string, schema: JsonSchema | null): string {
  const parts: string[] = [`# Editing ${site.name} (${site.id})`, `Live site: ${site.productionUrl}`];
  parts.push(
    [
      "## How changes work",
      "1. Every edit goes into a *change* (a pull request). Pass the same `change_id` to later edits so they share one preview.",
      "2. Call `get_preview(change_id)`. When it's ready, give the user the preview link; they sign in with Google to open it.",
      "3. When the user approves, call `publish(change_id, confirm: true)`. The live site updates in 1–2 minutes.",
      "4. `undo(change_id)` reverts a published change through a new change (preview, then publish again).",
      "",
      "Pages with `draft: true` are published with the change but stay hidden on the live site.",
    ].join("\n"),
  );
  parts.push(
    [
      "## What can be edited",
      `- Text in existing pages: \`update_text\` with JSON pointers from \`get_page_content\`. Only existing text values change; structure never does. Max ${MAX_TEXT} characters per value.`,
      site.capabilities.landing ? "- New landing pages: `create_landing_page` with a JSON page built from the section catalog below." : "",
      site.capabilities.articles ? "- New articles and article edits: `create_article`, `update_article`." : "",
      `- Images: \`upload_image\` for small images (≤${MAX_INPUT_BYTES / 1024 / 1024} MB); \`get_image_upload_link\` for photos on the user's computer. JPEG, PNG, WebP or AVIF; SVG isn't accepted. Images are resized to ${MAX_EDGE} px, stripped of metadata and stored as WebP (≤${MAX_OUTPUT_BYTES / 1024 / 1024} MB).`,
      site.capabilities.landing ? `- Landing page images go in \`${site.imageFolders.landing}\` (upload with \`folder: "landing/<slug>"\`) before the page that uses them.` : "",
      "- Code, styles, the schema and configuration can't be changed.",
    ]
      .filter(Boolean)
      .join("\n"),
  );
  for (const heading of site.guide.sections) {
    const section = readmeSection(readme, heading);
    if (!section) continue;
    // The README's catalog is long; the schema summary below is the authoritative field list.
    parts.push(heading === "Landing pages" ? section.split(/\n#### /)[0] : section);
  }
  if (schema && site.capabilities.landing) {
    parts.push(`## Landing section catalog (from ${site.capabilities.landing.schema})\n\n\`?\` marks optional fields. Rich text may use the whitelisted markup above.\n\n${sectionCatalog(schema)}`);
  }
  return parts.join("\n\n");
}
