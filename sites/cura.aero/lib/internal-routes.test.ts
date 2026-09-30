import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

// Every page under app/(docs) and app/(deck) is internal and must be listed in the
// proxy.ts matcher, so a new internal page can't be left public by accident.

const root = path.join(import.meta.dirname, "..");

function routesIn(group: string): string[] {
  const dir = path.join(root, "app", group);
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((d) => d.isDirectory() && fs.existsSync(path.join(dir, d.name, "page.tsx")))
    .map((d) => `/${d.name}`);
}

function matcher(): string[] {
  const src = fs.readFileSync(path.join(root, "proxy.ts"), "utf8");
  const block = /matcher:\s*\[([\s\S]*?)\]/.exec(src);
  assert.ok(block, "proxy.ts must export a matcher array");
  return [...block[1].matchAll(/"([^"]+)"/g)].map((m) => m[1]);
}

test("every internal route is behind basic auth", () => {
  const protectedPaths = matcher();
  for (const route of [...routesIn("(docs)"), ...routesIn("(deck)")]) {
    assert.ok(protectedPaths.includes(route), `${route} is missing from the proxy.ts matcher`);
  }
});

test("no public route is behind basic auth", () => {
  const protectedPaths = matcher();
  for (const route of routesIn("(site)")) {
    assert.ok(!protectedPaths.includes(route), `${route} is public but listed in the proxy.ts matcher`);
  }
  assert.ok(!protectedPaths.includes("/"));
});
