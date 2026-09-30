import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const script = path.resolve(import.meta.dirname, "../scripts/should-build.sh");

/** A throwaway repo shaped like this one, with one commit per call to `commit`. */
function repo() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "should-build-"));
  const git = (...args: string[]) => execFileSync("git", args, { cwd: dir, encoding: "utf8", env: { ...process.env, GIT_AUTHOR_NAME: "t", GIT_AUTHOR_EMAIL: "t@t", GIT_COMMITTER_NAME: "t", GIT_COMMITTER_EMAIL: "t@t" } }).trim();
  git("init", "-q", "-b", "main");
  const write = (files: Record<string, string>) => {
    for (const [p, c] of Object.entries(files)) {
      fs.mkdirSync(path.dirname(path.join(dir, p)), { recursive: true });
      fs.writeFileSync(path.join(dir, p), c);
    }
    git("add", "-A");
    git("commit", "-q", "-m", "c");
    return git("rev-parse", "HEAD");
  };
  const base = write({
    "mcp/package.json": "{}",
    "sites/cura.aero/lib/rich.ts": "a",
    "sites/cura.aero/content/landing.schema.json": "{}",
    "sites/cura.aero/content/pages/home.json": "{}",
    "sites/avilabs.is/index.html": "x",
  });
  const run = (prev: string | undefined) =>
    spawnSync("sh", [script], { cwd: path.join(dir, "mcp"), env: { ...process.env, VERCEL_GIT_PREVIOUS_SHA: prev ?? "" }, encoding: "utf8" }).status;
  return { base, write, run };
}

test("builds when the server, a site's lib or a landing schema changes", () => {
  const changes: Record<string, string>[] = [
    { "mcp/src/app.ts": "x" },
    { "sites/cura.aero/lib/rich.ts": "b" },
    { "sites/cura.aero/lib/new/deep.ts": "b" },
    { "sites/cura.aero/content/landing.schema.json": '{"x":1}' },
    { "sites/plan3.aero/lib/x.ts": "new site" },
  ];
  for (const change of changes) {
    const r = repo();
    r.write(change);
    assert.equal(r.run(r.base), 1, JSON.stringify(change));
  }
});

test("skips for content-only and unrelated changes", () => {
  const r = repo();
  r.write({ "sites/cura.aero/content/pages/home.json": '{"a":1}', "sites/avilabs.is/index.html": "y", "sites/cura.aero/public/images/x.webp": "i" });
  assert.equal(r.run(r.base), 0);
});

test("builds when there is no usable previous deployment", () => {
  const r = repo();
  r.write({ "sites/cura.aero/content/pages/home.json": '{"a":1}' });
  assert.equal(r.run(undefined), 1);
  assert.equal(r.run("0".repeat(40)), 1);
});
