import { createHash } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import type { SiteConfig } from "../sites/types.ts";
import { ToolError } from "./errors.ts";

/**
 * The site's parseLanding reads a filesystem root: the schema, app/ (for reserved routes),
 * public/ (reserved names, and whether images exist). This builds a throwaway copy of exactly
 * those parts from the repo tree at the change's branch head, so the site's own code runs
 * unchanged. Image and route files are empty placeholders; only their existence matters.
 */
export function buildSandbox(site: SiteConfig, input: { schemaText: string; paths: string[] }): string {
  const relevant = input.paths.filter((p) => p.startsWith("app/") || p.startsWith("public/")).sort();
  const key = createHash("sha256").update(input.schemaText).update("\0").update(relevant.join("\n")).digest("hex").slice(0, 24);
  const root = path.join(os.tmpdir(), "avi-mcp-rules", `${site.id}-${key}`);
  if (fs.existsSync(path.join(root, ".ready"))) return root;

  fs.rmSync(root, { recursive: true, force: true });
  const schemaPath = path.join(root, site.capabilities.landing?.schema ?? "content/landing.schema.json");
  fs.mkdirSync(path.dirname(schemaPath), { recursive: true });
  fs.writeFileSync(schemaPath, input.schemaText);
  fs.mkdirSync(path.join(root, "app"), { recursive: true });
  fs.mkdirSync(path.join(root, "public"), { recursive: true });
  for (const p of relevant) {
    const abs = path.join(root, p);
    if (!abs.startsWith(root + path.sep)) continue;
    fs.mkdirSync(path.dirname(abs), { recursive: true });
    fs.writeFileSync(abs, "");
  }
  fs.writeFileSync(path.join(root, ".ready"), "");
  return root;
}

/** Runs the site's own landing validation; a validation failure becomes a ToolError. */
export function validateLandingFile(site: SiteConfig, root: string, source: string, slug: string, file: string, skipReserved = false) {
  try {
    return site.rules.parseLanding(source, slug, file, { root, skipReserved });
  } catch (e) {
    if (site.rules.isValidationError(e)) throw new ToolError("invalid_landing", (e as Error).message);
    throw e;
  }
}

export function validateArticleFile(site: SiteConfig, source: string, slug: string, file: string) {
  try {
    return site.rules.parseArticle(source, slug, file);
  } catch (e) {
    if (site.rules.isValidationError(e)) throw new ToolError("invalid_article", (e as Error).message);
    throw e;
  }
}
