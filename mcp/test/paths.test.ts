import { test } from "node:test";
import assert from "node:assert/strict";
import { checkSize, isWritable, normalizePath, siteRelative, writablePath } from "../src/guardrails/paths.ts";
import { ToolError } from "../src/guardrails/errors.ts";
import { site } from "./helpers/site.ts";

const refused = (p: string, ...codes: string[]) =>
  assert.throws(() => writablePath(site, p), (e: unknown) => e instanceof ToolError && codes.includes(e.code), p);

test("content files and image folders are writable", () => {
  for (const p of [
    "content/pages/home.json",
    "content/site.json",
    "content/shared/evidence-sources.json",
    "content/landing/new-page.json",
    "content/landing-catalog.json",
    "content/articles/hello.md",
    "public/images/landing/new-page/hero.webp",
    "public/images/news/photo.webp",
  ]) {
    assert.equal(writablePath(site, p).repoPath, `sites/cura.aero/${p}`);
  }
});

test("rules, code, config and other folders are not", () => {
  for (const p of [
    "content/landing.schema.json",
    "app/(site)/page.tsx",
    "lib/rich.ts",
    "styles/site.css",
    "components/site/Header.tsx",
    "package.json",
    "package-lock.json",
    "next.config.ts",
    "proxy.ts",
    "README.md",
    "public/robots.txt",
    "public/images/logo.svg",
    "public/images/landing/hero.webp",
    "public/images/values/x.webp",
    "content/pages/home.ts",
    "content/pages/home.json.js",
  ]) {
    refused(p, "path_not_writable", "path_invalid");
  }
});

test("path tricks are refused before matching", () => {
  for (const p of [
    "../avilabs.is/index.html",
    "content/../package.json",
    "content/./pages/home.json",
    "/content/pages/home.json",
    "content//pages/home.json",
    "content\\pages\\home.json",
    "content/pages/%2e%2e/home.json",
    "content/pages/.env.json",
    "content/pages/home .json",
    "content/pages/ho\u0000me.json",
    ".github/workflows/x.yml",
    "",
  ]) {
    refused(p, "path_invalid");
  }
  assert.equal(normalizePath("content/pages/home.json").ok, true);
});

test("case variants don't slip past the protected glob", () => {
  refused("content/Landing.schema.json", "path_invalid");
  refused("Content/landing.schema.json", "path_invalid");
  refused("content/pages/Home.json", "path_invalid");
  assert.equal(isWritable(site, "content/landing.schema.json"), false);
});

test("repo paths from a PR diff map back to the site, or to nothing", () => {
  assert.equal(siteRelative(site, "sites/cura.aero/content/pages/home.json"), "content/pages/home.json");
  assert.equal(siteRelative(site, "sites/avilabs.is/index.html"), null);
  assert.equal(siteRelative(site, "mcp/src/app.ts"), null);
});

test("size limits per file type", () => {
  checkSize("content/pages/home.json", 256 * 1024);
  assert.throws(() => checkSize("content/pages/home.json", 256 * 1024 + 1), /limit/);
  assert.throws(() => checkSize("content/articles/a.md", 100 * 1024 + 1), /limit/);
  assert.throws(() => checkSize("public/images/news/a.png", 10), /unsupported/);
});
