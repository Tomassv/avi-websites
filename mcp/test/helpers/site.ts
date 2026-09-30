import fs from "node:fs";
import path from "node:path";
import { curaAero } from "../../src/sites/cura-aero/config.ts";

/** Reads cura.aero from the working tree, the way the server reads it from GitHub. */
export const site = curaAero;
export const siteDir = path.resolve(import.meta.dirname, "../../..", site.root);

export function read(rel: string): string {
  return fs.readFileSync(path.join(siteDir, rel), "utf8");
}

export function schema(): unknown {
  return JSON.parse(read("content/landing.schema.json"));
}

/** Every site-relative file path under the given top-level folders. */
export function treePaths(dirs = ["app", "public", "content"]): string[] {
  const out: string[] = [];
  const walk = (rel: string) => {
    for (const d of fs.readdirSync(path.join(siteDir, rel), { withFileTypes: true })) {
      if (d.name.startsWith(".") || d.name === "node_modules") continue;
      const child = `${rel}/${d.name}`;
      if (d.isDirectory()) walk(child);
      else out.push(child);
    }
  };
  for (const d of dirs) walk(d);
  return out;
}
