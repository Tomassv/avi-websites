import fs from "node:fs";
import path from "node:path";
import { parse as parseYaml } from "yaml";
import { showDrafts } from "./env.ts";
import { safeImageSrc } from "./safe-url.ts";

/**
 * Articles: content/articles/<slug>.md, YAML frontmatter plus a plain Markdown body.
 * Frontmatter is validated strictly; an invalid article fails the build, naming the file and
 * field. Drafts are left out of the live site (see showDrafts in lib/env.ts).
 */

export type ArticleMeta = {
  slug: string;
  title: string;
  description: string;
  /** ISO date, YYYY-MM-DD. */
  date: string;
  author?: string;
  image?: string;
  draft: boolean;
};

export type Article = ArticleMeta & { body: string };

export const SLUG_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const KNOWN_KEYS = new Set(["title", "description", "date", "author", "image", "draft"]);

export class ArticleError extends Error {}

/** Parses and validates one article file. `file` is used in error messages. */
export function parseArticle(source: string, slug: string, file = `${slug}.md`): Article {
  const fail = (msg: string): never => {
    throw new ArticleError(`${file}: ${msg}`);
  };
  if (!SLUG_RE.test(slug)) fail(`file name must be lowercase words joined by hyphens (got "${slug}")`);

  const text = source.replace(/^﻿/, "").replace(/\r\n?/g, "\n");
  if (!text.startsWith("---\n")) fail("must start with a --- frontmatter block");
  const end = text.indexOf("\n---\n", 3);
  const endAtEof = text.endsWith("\n---") ? text.length - 4 : -1;
  const close = end !== -1 ? end : endAtEof;
  if (close === -1) fail("frontmatter block is not closed with ---");

  let data: unknown;
  try {
    data = parseYaml(text.slice(4, close), { schema: "core", uniqueKeys: true });
  } catch (e) {
    fail(`frontmatter is not valid YAML (${(e as Error).message.split("\n")[0]})`);
  }
  if (!data || typeof data !== "object" || Array.isArray(data)) fail("frontmatter must be a set of key: value pairs");
  const fm = data as Record<string, unknown>;

  for (const key of Object.keys(fm)) if (!KNOWN_KEYS.has(key)) fail(`unknown frontmatter field "${key}"`);

  const str = (key: string, required: boolean): string | undefined => {
    const v = fm[key];
    if (v === undefined || v === null) {
      if (required) fail(`"${key}" is required`);
      return undefined;
    }
    if (typeof v !== "string" || !v.trim()) fail(`"${key}" must be a non-empty string`);
    return (v as string).trim();
  };

  const title = str("title", true)!;
  const description = str("description", true)!;
  const date = str("date", true)!;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(`${date}T00:00:00Z`))) {
    fail(`"date" must be an ISO date like 2026-10-01 (got "${date}")`);
  }
  const author = str("author", false);
  const image = str("image", false);
  if (image !== undefined && !safeImageSrc(image)) fail(`"image" must be a file under /images/ (got "${image}")`);
  if (typeof fm.draft !== "boolean") fail(`"draft" is required and must be true or false`);

  return { slug, title, description, date, author, image, draft: fm.draft as boolean, body: text.slice(close + 5) };
}

const ARTICLES_DIR = path.join(process.cwd(), "content", "articles");

/** Every article that should be published in this build, newest first. */
export function getArticles(): Article[] {
  if (!fs.existsSync(ARTICLES_DIR)) return [];
  return fs
    .readdirSync(ARTICLES_DIR)
    .filter((f) => f.endsWith(".md"))
    .map((f) => parseArticle(fs.readFileSync(path.join(ARTICLES_DIR, f), "utf8"), f.slice(0, -3), `content/articles/${f}`))
    .filter((a) => showDrafts() || !a.draft)
    .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : a.slug.localeCompare(b.slug)));
}

export function getArticle(slug: string): Article | undefined {
  if (!SLUG_RE.test(slug)) return undefined;
  return getArticles().find((a) => a.slug === slug);
}

/** "2026-10-01" → "1 October 2026" (UTC, so every build renders the same). */
export function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(
    new Date(`${iso}T00:00:00Z`),
  );
}
