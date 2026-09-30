import fs from "node:fs";
import path from "node:path";
import { redirects } from "./redirects.ts";

/**
 * Top-level paths a landing page can't take, each with what already uses it. Read from the code
 * rather than kept as a list, so a new route or redirect is reserved automatically:
 * - every static top-level route under app/ (inside any route group);
 * - the first segment of every redirect source (lib/redirects.ts);
 * - every top-level name in public/, and a few paths Next.js or hosting keep for themselves.
 */
export function reservedPaths(root = process.cwd()): Map<string, string> {
  const reserved = new Map<string, string>([["api", "a path kept for API routes"]]);
  const add = (name: string, why: string) => {
    if (!reserved.has(name)) reserved.set(name, why);
  };

  const app = path.join(root, "app");
  const routeDirs = (dir: string, rel: string) => {
    for (const d of fs.readdirSync(dir, { withFileTypes: true })) {
      if (!d.isDirectory() || d.name.startsWith("_") || d.name.startsWith("[")) continue;
      if (d.name.startsWith("(") && d.name.endsWith(")")) routeDirs(path.join(dir, d.name), `${rel}/${d.name}`);
      else add(d.name, `the route ${rel}/${d.name}`);
    }
  };
  if (fs.existsSync(app)) routeDirs(app, "app");

  for (const r of redirects) {
    const first = r.source.split("/")[1];
    if (first) add(first.replace(/:.*$/, ""), `the redirect ${r.source} (lib/redirects.ts)`);
  }

  const pub = path.join(root, "public");
  if (fs.existsSync(pub)) for (const name of fs.readdirSync(pub)) if (!name.startsWith(".")) add(name, `public/${name}`);

  return reserved;
}
