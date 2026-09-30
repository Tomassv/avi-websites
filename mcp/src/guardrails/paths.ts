import type { SiteConfig } from "../sites/types.ts";
import { ToolError } from "./errors.ts";
import { matchesAny } from "./glob.ts";

/**
 * The per-site path allowlist. Every file the server writes goes through `writablePath`, and
 * publish re-checks the whole PR diff with `isWritable`. Paths are site-relative
 * (e.g. "content/pages/home.json"); the repo path is `${site.root}/${path}`.
 */

// Lowercase ASCII letters, digits, "-", "_" and "." only. Lowercase-only also means two paths
// can't differ just by case, which would collide on case-insensitive checkouts (macOS).
const SAFE_SEGMENT = /^[a-z0-9_\-.]+$/;

export const MAX_BYTES: Record<string, number> = {
  json: 256 * 1024,
  md: 100 * 1024,
  webp: 1.5 * 1024 * 1024,
};

/** Normalizes a site-relative path, or explains why it isn't one. */
export function normalizePath(input: string): { ok: true; path: string } | { ok: false; reason: string } {
  if (typeof input !== "string" || !input) return { ok: false, reason: "path is empty" };
  if (input.length > 300) return { ok: false, reason: "path is too long" };
  if (/[\u0000-\u001f\u007f\\%]/.test(input)) return { ok: false, reason: "path contains a forbidden character" };
  if (input.startsWith("/")) return { ok: false, reason: "path must be relative to the site folder" };
  const segments = input.split("/");
  for (const s of segments) {
    if (!s) return { ok: false, reason: "path has an empty segment" };
    if (s === "." || s === ".." || s.startsWith(".")) return { ok: false, reason: `path segment "${s}" is not allowed` };
    if (!SAFE_SEGMENT.test(s)) return { ok: false, reason: `path segment "${s}" contains a forbidden character` };
  }
  return { ok: true, path: segments.join("/") };
}

/** Whether a normalized site-relative path may be written (protected globs win). */
export function isWritable(site: SiteConfig, path: string): boolean {
  if (matchesAny(path, site.protected)) return false;
  return matchesAny(path, site.writable);
}

/** Validates a path for writing and returns both forms, or throws a ToolError. */
export function writablePath(site: SiteConfig, input: string): { path: string; repoPath: string } {
  const n = normalizePath(input);
  if (!n.ok) throw new ToolError("path_invalid", `${input}: ${n.reason}`);
  if (!isWritable(site, n.path)) {
    throw new ToolError(
      "path_not_writable",
      `${n.path} can't be changed through this server. Only content files and the site's image folders are writable.`,
    );
  }
  return { path: n.path, repoPath: `${site.root}/${n.path}` };
}

/** Maps a repo path from a PR diff back to a site path, or null if it's outside the site. */
export function siteRelative(site: SiteConfig, repoPath: string): string | null {
  const prefix = `${site.root}/`;
  return repoPath.startsWith(prefix) ? repoPath.slice(prefix.length) : null;
}

export function checkSize(path: string, bytes: number): void {
  const ext = path.slice(path.lastIndexOf(".") + 1).toLowerCase();
  const max = MAX_BYTES[ext];
  if (max === undefined) throw new ToolError("path_invalid", `${path}: unsupported file type`);
  if (bytes > max) throw new ToolError("too_large", `${path} is ${bytes} bytes; the limit for .${ext} files is ${max}.`);
}
