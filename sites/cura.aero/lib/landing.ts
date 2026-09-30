import fs from "node:fs";
import path from "node:path";
import Ajv2020, { type ErrorObject } from "ajv/dist/2020.js";
import type { LandingContent, LandingSection, Seo } from "./content-types.ts";
import { SLUG_RE } from "./articles.ts";
import { showDrafts } from "./env.ts";
import { reservedPaths } from "./landing-routes.ts";
import { richToText } from "./rich.ts";
import { safeHref, safeHubspotMeetingUrl, safeImageSrc } from "./safe-url.ts";

/**
 * Landing pages: content/landing/<slug>.json, served at /<slug> by app/(site)/[slug].
 *
 * Every file is checked against content/landing.schema.json, then against the rules a schema
 * can't express: the slug is free, images sit in this page's folder and exist, links pass the
 * same validators they are rendered with, and section ids are unique. An invalid file fails the
 * build with every problem listed as `file: field: message`. Drafts are validated too, then left
 * out of the live site (see showDrafts in lib/env.ts).
 */

export type LandingPage = LandingContent & { slug: string; file: string };

export class LandingError extends Error {}

type Options = {
  /** Package root: content/, public/ and app/ are read from here. */
  root?: string;
  /** The catalog page owns its route, so its slug is not checked against reserved paths. */
  skipReserved?: boolean;
};

const MAX_ERRORS = 12;

type Validator = ReturnType<InstanceType<typeof Ajv2020>["compile"]>;
const validators = new Map<string, { validate: Validator; schema: Schema }>();

type Schema = {
  properties: { sections: { allOf: { contains: { properties: { type: { const: string } } } }[] } };
  $defs: Record<string, unknown>;
};

function validator(root: string) {
  let v = validators.get(root);
  if (!v) {
    const schema = JSON.parse(fs.readFileSync(path.join(root, "content", "landing.schema.json"), "utf8")) as Schema;
    const ajv = new Ajv2020({ allErrors: true, discriminator: true, strict: true });
    v = { validate: ajv.compile(schema), schema };
    validators.set(root, v);
  }
  return v;
}

/** The section types the schema allows, in catalog order. */
export function sectionTypes(root = process.cwd()): string[] {
  const { schema } = validator(root);
  return Object.keys(schema.$defs)
    .filter((k) => k.startsWith("section-"))
    .map((k) => k.slice("section-".length));
}

/** Parses and validates one landing file. `file` is used in error messages. */
export function parseLanding(source: string, slug: string, file: string, options: Options = {}): LandingPage {
  const root = options.root ?? process.cwd();
  const fail = (lines: string[]): never => {
    throw new LandingError(lines.map((l) => `${file}: ${l}`).join("\n"));
  };

  if (!SLUG_RE.test(slug)) fail([`file name must be lowercase words joined by hyphens (got "${slug}")`]);
  if (!options.skipReserved) {
    const taken = reservedPaths(root).get(slug);
    if (taken) fail([`slug "${slug}" collides with ${taken}; rename the file`]);
  }

  let data: unknown;
  try {
    data = JSON.parse(source.replace(/^﻿/, ""));
  } catch (e) {
    fail([`is not valid JSON (${(e as Error).message})`]);
  }

  const { validate, schema } = validator(root);
  if (!validate(data)) fail(formatErrors(validate.errors ?? [], data, schema));

  const page = data as LandingContent;
  const problems = extraChecks(page, slug, root);
  if (problems.length) fail(problems);

  return { ...page, slug, file };
}

// ── Error messages ──

/** "/sections/3/image/src" → "sections[3] (image-text).image.src" */
function fieldName(instancePath: string, data: unknown): string {
  if (!instancePath) return "(file)";
  let out = "";
  let node: unknown = data;
  for (const raw of instancePath.split("/").slice(1)) {
    const seg = raw.replace(/~1/g, "/").replace(/~0/g, "~");
    const parentIsSections = out === "sections";
    out += /^\d+$/.test(seg) ? `[${seg}]` : out ? `.${seg}` : seg;
    node = node && typeof node === "object" ? (node as Record<string, unknown>)[seg] : undefined;
    if (parentIsSections && node && typeof node === "object" && typeof (node as { type?: unknown }).type === "string") {
      out += ` (${(node as { type: string }).type})`;
    }
  }
  return out;
}

function valueAt(instancePath: string, data: unknown): unknown {
  let node = data;
  for (const seg of instancePath.split("/").slice(1)) {
    node = node && typeof node === "object" ? (node as Record<string, unknown>)[seg.replace(/~1/g, "/").replace(/~0/g, "~")] : undefined;
  }
  return node;
}

/** Readable messages for each $defs pattern, keyed by the schema path of the pattern. */
const PATTERN_MESSAGES: Record<string, string> = {
  "#/$defs/rich/pattern":
    "uses markup outside the whitelist (allowed: <br>, <strong>, <b>, <em>, <span class='…'> with orange, hi, hi-orange, hi-white, text-bold, wf-lead, ev-quiet); write a literal < or > as &lt; or &gt;",
  "#/$defs/text/pattern": "must be plain text, without < or >",
  "#/$defs/image/properties/alt/pattern": "must be plain text, without < or >",
  "#/$defs/href/pattern": "must be a site path (/…), an anchor (#…), an https:// URL or a mailto: address",
  "#/$defs/imageSrc/pattern": "must be an image file (jpg, png, webp, avif, svg) in /images/landing/<slug>/",
  "#/$defs/icon/pattern": "must be a Material Icons name (lowercase letters, digits and underscores)",
  "#/$defs/anchorId/pattern": "must be lowercase letters, digits and hyphens, starting with a letter (max 60)",
  "#/$defs/section-book-demo/properties/hubspotMeetingUrl/pattern": "must be a https://meetings.hubspot.com/ link",
};

function formatErrors(errors: ErrorObject[], data: unknown, schema: Schema): string[] {
  const lines: string[] = [];
  const seen = new Set<string>();
  // With oneOf (logo items), ajv reports each branch's failure and then the oneOf itself;
  // the summary line is enough.
  const oneOfPaths = new Set(errors.filter((e) => e.keyword === "oneOf").map((e) => e.instancePath));

  for (const e of errors) {
    if (e.keyword !== "oneOf" && [...oneOfPaths].some((p) => e.instancePath.startsWith(p) && e.schemaPath.includes("/oneOf/"))) continue;
    // The "at most one" checks test every section against `contains`; only the summary matters.
    if (/\/allOf\/\d+\/contains\//.test(e.schemaPath)) continue;
    const field = fieldName(e.instancePath, data);
    const value = valueAt(e.instancePath, data);
    const p = e.params as Record<string, unknown>;
    let msg: string;
    switch (e.keyword) {
      case "additionalProperties":
        msg = `unknown field "${p.additionalProperty}"`;
        break;
      case "required":
        msg = `"${p.missingProperty}" is required`;
        break;
      case "maxLength":
        msg = `must be at most ${p.limit} characters (is ${typeof value === "string" ? value.length : "?"})`;
        break;
      case "minLength":
        msg = p.limit === 1 ? "must not be empty" : `must be at least ${p.limit} characters (is ${typeof value === "string" ? value.length : "?"})`;
        break;
      case "maxItems":
        msg = `must have at most ${p.limit} items`;
        break;
      case "minItems":
        msg = `must have at least ${p.limit} item${p.limit === 1 ? "" : "s"}`;
        break;
      case "enum":
        msg = `must be one of ${(p.allowedValues as unknown[]).map((v) => JSON.stringify(v)).join(", ")}`;
        break;
      case "const":
        msg = `must be ${JSON.stringify(p.allowedValue)}`;
        break;
      case "type":
        msg = `must be ${p.type === "array" || p.type === "object" ? "an" : "a"} ${p.type}`;
        break;
      case "pattern":
        msg = PATTERN_MESSAGES[e.schemaPath] ?? `must match ${p.pattern}`;
        break;
      case "discriminator":
        msg =
          p.error === "mapping"
            ? `unknown section type ${JSON.stringify(p.tagValue)} (allowed: ${sectionTypesFrom(schema).join(", ")})`
            : `"type" is required and must be a string`;
        break;
      case "contains":
      case "maxContains": {
        const i = Number(/allOf\/(\d+)\/(?:max)?[cC]ontains$/.exec(e.schemaPath)?.[1]);
        const type = schema.properties.sections.allOf[i]?.contains.properties.type.const;
        msg = `may contain at most one ${type} section`;
        break;
      }
      case "oneOf":
        msg = e.instancePath.includes("/items/") ? `must be either {"image": {…}} or {"text": "…"}` : "does not match any allowed shape";
        break;
      default:
        msg = e.message ?? "is invalid";
    }
    const line = `${field}: ${msg}`;
    if (!seen.has(line)) {
      seen.add(line);
      lines.push(line);
    }
  }
  if (lines.length > MAX_ERRORS) return [...lines.slice(0, MAX_ERRORS), `…and ${lines.length - MAX_ERRORS} more`];
  return lines;
}

function sectionTypesFrom(schema: Schema): string[] {
  return Object.keys(schema.$defs)
    .filter((k) => k.startsWith("section-"))
    .map((k) => k.slice("section-".length));
}

// ── Checks the schema can't express ──

function extraChecks(page: LandingContent, slug: string, root: string): string[] {
  const problems: string[] = [];
  const folder = `/images/landing/${slug}/`;

  const image = (src: string, where: string) => {
    if (!src.startsWith(folder)) problems.push(`${where}: must be a file in ${folder} (got "${src}")`);
    else if (!safeImageSrc(src)) problems.push(`${where}: is not an allowed image path`);
    else if (!fs.existsSync(path.join(root, "public", src))) problems.push(`${where}: file not found: public${src}`);
  };

  const walk = (value: unknown, where: string, key: string) => {
    if (typeof value === "string") {
      if (key === "src") image(value, where);
      else if (key === "photos") image(value, where);
      else if (key === "href" && !safeHref(value)) problems.push(`${where}: is not an allowed link`);
      else if (key === "hubspotMeetingUrl" && !safeHubspotMeetingUrl(value)) problems.push(`${where}: is not a valid HubSpot meeting link`);
      return;
    }
    if (Array.isArray(value)) {
      value.forEach((v, i) => walk(v, `${where}[${i}]`, key));
      return;
    }
    if (value && typeof value === "object") {
      for (const [k, v] of Object.entries(value)) walk(v, where ? `${where}.${k}` : k, k);
    }
  };
  walk(page.seo, "seo", "seo");
  walk(page.header, "header", "header");
  page.sections.forEach((s, i) => walk(s, `sections[${i}] (${s.type})`, ""));

  const ids = new Map<string, number>();
  page.sections.forEach((s, i) => {
    if (!s.id) return;
    const first = ids.get(s.id);
    if (first !== undefined) problems.push(`sections[${i}] (${s.type}).id: "${s.id}" is already used by sections[${first}]`);
    else ids.set(s.id, i);
  });

  return problems;
}

// ── Loading ──

function landingDir(root: string) {
  return path.join(root, "content", "landing");
}

/** Every landing file, validated (drafts included). Throws on the first invalid file. */
export function loadAllLandingPages(root = process.cwd()): LandingPage[] {
  const dir = landingDir(root);
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".json"))
    .sort()
    .map((f) => parseLanding(fs.readFileSync(path.join(dir, f), "utf8"), f.slice(0, -5), `content/landing/${f}`, { root }));
}

/** The landing pages in this build: all of them where drafts are shown, else published ones. */
export function getLandingPages(root = process.cwd()): LandingPage[] {
  return loadAllLandingPages(root).filter((p) => showDrafts() || !p.draft);
}

export function getLandingPage(slug: string): LandingPage | undefined {
  if (!SLUG_RE.test(slug)) return undefined;
  return getLandingPages().find((p) => p.slug === slug);
}

export const CATALOG_SLUG = "landing-catalog";

/** content/landing-catalog.json: sample content for every section type, shown at /landing-catalog. */
export function getCatalog(root = process.cwd()): LandingPage {
  const file = path.join(root, "content", "landing-catalog.json");
  return parseLanding(fs.readFileSync(file, "utf8"), CATALOG_SLUG, "content/landing-catalog.json", { root, skipReserved: true });
}

// ── SEO ──

// The same values as the existing public pages (content/pages/home.json).
const ROBOTS_INDEX = "index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1";
const ROBOTS_NOINDEX = "noindex, nofollow";

/** Whether search engines may index the page: published and not marked noindex. */
export function isIndexable(page: LandingPage): boolean {
  return !page.draft && !page.seo.noindex;
}

/** Expands a landing page's short seo block into the site's full Seo shape. */
export function landingSeo(page: LandingPage, siteUrl: string): Seo {
  const url = `${siteUrl}/${page.slug}`;
  const image = `${siteUrl}${page.seo.ogImage.src}`;
  const { title, description } = page.seo;
  return {
    title,
    description,
    canonical: url,
    robots: isIndexable(page) ? ROBOTS_INDEX : ROBOTS_NOINDEX,
    author: "AviLabs",
    themeColor: "#051457",
    openGraph: {
      type: "website",
      siteName: "Cura",
      title,
      description,
      url,
      image,
      imageAlt: page.seo.ogImage.alt,
      locale: "en_US",
    },
    twitter: { card: "summary_large_image", title, description, image },
    jsonLd: landingJsonLd(page, url, siteUrl),
  };
}

function landingJsonLd(page: LandingPage, url: string, siteUrl: string) {
  const graph: unknown[] = [
    {
      "@type": "WebPage",
      "@id": `${url}#webpage`,
      url,
      name: page.seo.title,
      description: page.seo.description,
      inLanguage: "en",
      isPartOf: { "@id": `${siteUrl}/#website` },
      about: { "@id": `${siteUrl}/#organization` },
    },
  ];
  const faqs = page.sections.filter((s): s is Extract<LandingSection, { type: "faq" }> => s.type === "faq");
  if (faqs.length) {
    graph.push({
      "@type": "FAQPage",
      "@id": `${url}#faq`,
      mainEntity: faqs.flatMap((f) =>
        f.items.map((q) => ({
          "@type": "Question",
          name: q.question,
          acceptedAnswer: { "@type": "Answer", text: richToText(q.answer) },
        })),
      ),
    });
  }
  return { "@context": "https://schema.org", "@graph": graph };
}
