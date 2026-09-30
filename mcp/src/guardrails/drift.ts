import type { SiteConfig } from "../sites/types.ts";
import { ToolError } from "./errors.ts";

/**
 * The rules bundle was built from specific versions of the site's lib files. If main now has
 * different versions (a redeploy is pending), the server must not validate with the old ones.
 * `repoShas` maps repo paths to their git blob SHA on main.
 */
export function driftedFiles(site: SiteConfig, repoShas: Record<string, string | undefined>): string[] {
  return Object.entries(site.rulesManifest.files)
    .filter(([file, sha]) => repoShas[file] !== sha)
    .map(([file]) => file);
}

export function assertNoDrift(site: SiteConfig, repoShas: Record<string, string | undefined>): void {
  const drifted = driftedFiles(site, repoShas);
  if (drifted.length) {
    throw new ToolError(
      "rules_outdated",
      `The site's rules changed since this server was deployed (${drifted.join(", ")}). ` +
        "Nothing was changed. The server redeploys automatically when rules change; try again in a few minutes, " +
        "or ask a developer to redeploy avi-websites-mcp.",
    );
  }
}

/** The directories whose listings give the blob SHAs drift checking needs. */
export function manifestDirs(site: SiteConfig): string[] {
  return [...new Set(Object.keys(site.rulesManifest.files).map((f) => f.slice(0, f.lastIndexOf("/"))))];
}
