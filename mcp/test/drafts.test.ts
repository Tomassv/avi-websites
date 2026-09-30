import { test } from "node:test";
import assert from "node:assert/strict";
import { draftWarning, findDrafts } from "../src/guardrails/drafts.ts";
import { site } from "./helpers/site.ts";

test("draft landing pages and articles are found; published ones and other files aren't", () => {
  const drafts = findDrafts(site, [
    { path: "content/landing/spring.json", content: JSON.stringify({ draft: true }) },
    { path: "content/landing/live.json", content: JSON.stringify({ draft: false }) },
    { path: "content/articles/hello.md", content: "---\ntitle: x\ndraft: true\n---\nBody" },
    { path: "content/articles/live.md", content: "---\ntitle: x\ndraft: false\n---\ndraft: true" },
    { path: "content/pages/home.json", content: JSON.stringify({ draft: true }) },
    { path: "content/landing/broken.json", content: "{" },
  ]);
  assert.deepEqual(drafts, [
    { file: "content/landing/spring.json", url: "/spring" },
    { file: "content/articles/hello.md", url: "/news/hello" },
  ]);
  assert.match(draftWarning(drafts)!, /won't be visible on the live site after publishing: \/spring, \/news\/hello\./);
  assert.equal(draftWarning([]), null);
});
