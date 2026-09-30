import { test } from "node:test";
import assert from "node:assert/strict";
import { showDrafts } from "./env.ts";

test("drafts are hidden on the live site only", () => {
  assert.equal(showDrafts({ VERCEL_ENV: "production", NODE_ENV: "production" }), false);
  assert.equal(showDrafts({ VERCEL_ENV: "preview", NODE_ENV: "production" }), true);
  assert.equal(showDrafts({ VERCEL_ENV: "development", NODE_ENV: "development" }), true);
  // Local `next dev` and local `next build`: VERCEL_ENV is unset.
  assert.equal(showDrafts({ NODE_ENV: "production" }), true);
  assert.equal(showDrafts({}), true);
});
