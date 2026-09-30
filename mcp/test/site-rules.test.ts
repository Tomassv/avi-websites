import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { buildSandbox, validateArticleFile, validateLandingFile } from "../src/guardrails/sandbox.ts";
import { assertNoDrift, driftedFiles, manifestDirs } from "../src/guardrails/drift.ts";
import { ToolError } from "../src/guardrails/errors.ts";
import { read, site, siteDir, treePaths } from "./helpers/site.ts";

const schemaText = read("content/landing.schema.json");
const paths = treePaths();
const root = buildSandbox(site, { schemaText, paths });
const example = () => JSON.parse(read("content/landing/claims-automation.json"));

const fails = (doc: unknown, slug: string, pattern: RegExp, sandbox = root) =>
  assert.throws(
    () => validateLandingFile(site, sandbox, JSON.stringify(doc), slug, `content/landing/${slug}.json`),
    (e: unknown) => e instanceof ToolError && e.code === "invalid_landing" && pattern.test(e.message),
  );

test("the site's own landing validation runs in the sandbox", () => {
  const page = validateLandingFile(site, root, read("content/landing/claims-automation.json"), "claims-automation", "content/landing/claims-automation.json");
  assert.equal(page.draft, true);
  validateLandingFile(site, root, read("content/landing-catalog.json"), "landing-catalog", "content/landing-catalog.json", true);
});

test("the site's rules reject what the site's build would", () => {
  fails({ ...example(), layout: "wide" }, "claims-automation", /unknown field "layout"/);
  fails(example(), "book-demo", /collides with the route app\/\(site\)\/book-demo/);
  fails(example(), "images", /collides with public\/images/);
  fails(example(), "assets", /collides with the redirect/);
  const wrongFolder = example();
  wrongFolder.seo.ogImage.src = "/images/landing/other/mountains.jpg";
  fails(wrongFolder, "claims-automation", /must be a file in \/images\/landing\/claims-automation\//);
  const missing = example();
  missing.seo.ogImage.src = "/images/landing/claims-automation/nope.webp";
  fails(missing, "claims-automation", /file not found/);
  const twoCtas = example();
  const cta = twoCtas.sections.find((s: { type: string }) => s.type === "cta-band");
  twoCtas.sections.push(cta);
  fails(twoCtas, "claims-automation", /at most one cta-band/);
  fails(example(), "Bad_Slug", /lowercase words joined by hyphens/);
});

test("an image in the same commit counts as existing", () => {
  const doc = example();
  doc.seo.ogImage.src = "/images/landing/claims-automation/new-og.webp";
  fails(doc, "claims-automation", /file not found/);
  const withUpload = buildSandbox(site, { schemaText, paths: [...paths, "public/images/landing/claims-automation/new-og.webp"] });
  validateLandingFile(site, withUpload, JSON.stringify(doc), "claims-automation", "content/landing/claims-automation.json");
});

test("a changed schema gets its own sandbox", () => {
  const stricter = JSON.parse(schemaText);
  stricter.properties.seo = { ...stricter.$defs.seo };
  stricter.$defs.seo.properties.title.maxLength = 12;
  const other = buildSandbox(site, { schemaText: JSON.stringify(stricter), paths });
  assert.notEqual(other, root);
  fails(example(), "claims-automation", /seo\.title: must be at most 12 characters/, other);
});

test("articles use the site's parseArticle", () => {
  const md = read("content/articles/example-article.md");
  assert.equal(validateArticleFile(site, md, "example-article", "content/articles/example-article.md").draft, true);
  assert.throws(
    () => validateArticleFile(site, md.replace(/^date: .*$/m, "date: soon"), "example-article", "x.md"),
    (e: unknown) => e instanceof ToolError && e.code === "invalid_article" && /"date" must be an ISO date/.test(e.message),
  );
});

test("drift: the manifest matches the working tree, and any change is caught", () => {
  const actual = Object.fromEntries(
    Object.keys(site.rulesManifest.files).map((f) => [f, gitBlobSha(fs.readFileSync(path.join(siteDir, "../..", f)))]),
  );
  assertNoDrift(site, actual);
  assert.deepEqual(driftedFiles(site, { ...actual, "sites/cura.aero/lib/rich.ts": "0".repeat(40) }), ["sites/cura.aero/lib/rich.ts"]);
  assert.throws(() => assertNoDrift(site, {}), (e: unknown) => e instanceof ToolError && e.code === "rules_outdated");
  assert.deepEqual(manifestDirs(site), ["sites/cura.aero/lib"]);
});

test("the bundled dependencies match the site's pinned versions", () => {
  const sitePkg = JSON.parse(read("package.json"));
  const mcpPkg = JSON.parse(fs.readFileSync(path.resolve(import.meta.dirname, "../package.json"), "utf8"));
  for (const dep of ["ajv", "yaml"]) {
    const siteVersion = sitePkg.dependencies[dep] ?? sitePkg.devDependencies?.[dep];
    assert.equal(mcpPkg.dependencies[dep], siteVersion, `${dep}: mcp has ${mcpPkg.dependencies[dep]}, the site has ${siteVersion}`);
  }
});

import { createHash } from "node:crypto";
function gitBlobSha(buf: Buffer): string {
  return createHash("sha1").update(`blob ${buf.length}\0`).update(buf).digest("hex");
}
