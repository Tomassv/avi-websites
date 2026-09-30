import { parse as parseYaml } from "yaml";
import type { SiteConfig } from "../sites/types.ts";

/**
 * Draft pages in a change. A draft is published with the change but hidden on the live site,
 * so get_preview and publish say so explicitly.
 */
export type DraftPage = { file: string; url: string };

export const DRAFT_WARNING = "These pages are drafts and won't be visible on the live site after publishing";

export function findDrafts(site: SiteConfig, files: { path: string; content: string }[]): DraftPage[] {
  const out: DraftPage[] = [];
  const landing = site.capabilities.landing;
  const articles = site.capabilities.articles;
  for (const f of files) {
    const name = f.path.slice(f.path.lastIndexOf("/") + 1);
    if (landing && f.path.startsWith(`${landing.dir}/`) && name.endsWith(".json")) {
      try {
        if ((JSON.parse(f.content) as { draft?: unknown }).draft === true) {
          out.push({ file: f.path, url: `${landing.urlPrefix}${name.slice(0, -5)}` });
        }
      } catch {
        // Invalid JSON is reported by validation, not here.
      }
    } else if (articles && f.path.startsWith(`${articles.dir}/`) && name.endsWith(".md")) {
      const m = /^---\r?\n([\s\S]*?)\r?\n---/.exec(f.content.replace(/^﻿/, ""));
      try {
        if (m && (parseYaml(m[1]) as { draft?: unknown })?.draft === true) {
          out.push({ file: f.path, url: `${articles.urlPrefix}${name.slice(0, -3)}` });
        }
      } catch {
        // As above.
      }
    }
  }
  return out;
}

export function draftWarning(drafts: DraftPage[]): string | null {
  return drafts.length ? `${DRAFT_WARNING}: ${drafts.map((d) => d.url).join(", ")}.` : null;
}
