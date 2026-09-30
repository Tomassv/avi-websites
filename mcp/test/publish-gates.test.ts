import { test } from "node:test";
import assert from "node:assert/strict";
import { evaluatePublish, type PublishInput } from "../src/guardrails/publish-gates.ts";
import { commitSignature, withTrailers, SIGNATURE_TRAILER } from "../src/guardrails/signature.ts";
import { site } from "./helpers/site.ts";

const secret = Buffer.from("k".repeat(32));
const head = "1".repeat(40);

function signedCommit(sha: string, tree: string, parent: string, email = "jane@avilabs.is") {
  return {
    sha,
    tree,
    parents: [parent],
    authorEmail: email,
    verified: true,
    message: withTrailers("Edit", [[SIGNATURE_TRAILER, commitSignature(secret, tree, parent, email)]]),
  };
}

function input(over: Partial<PublishInput> = {}): PublishInput {
  return {
    pr: { number: 7, state: "open", merged: false, labels: ["mcp", "site:cura.aero"], siteId: "cura.aero", headSha: head, mergeable: true },
    files: ["sites/cura.aero/content/pages/home.json"],
    commits: [signedCommit(head, "a".repeat(40), "0".repeat(40))],
    preview: { state: "ready", sha: head },
    checks: [
      { name: "Vercel – cura-aero", state: "success", ownVercel: true },
      { name: "Vercel – avilabs-is", state: "failure", ownVercel: false },
    ],
    approval: { required: false, approved: false },
    ...over,
  };
}

const gates = (i: PublishInput) => evaluatePublish(site, i, secret).failures.map((f) => f.gate);

test("a clean change passes every gate", () => {
  const r = evaluatePublish(site, input(), secret);
  assert.deepEqual(r, { ok: true, failures: [], notes: [] });
});

test("gate 1: open, labelled, this site, mergeable", () => {
  const base = input().pr;
  assert.deepEqual(gates(input({ pr: { ...base, merged: true, state: "closed" } })), [1]);
  assert.deepEqual(gates(input({ pr: { ...base, state: "closed" } })), [1]);
  assert.deepEqual(gates(input({ pr: { ...base, labels: ["site:cura.aero"] } })), [1]);
  assert.deepEqual(gates(input({ pr: { ...base, siteId: "avilabs.is" } })), [1]);
  assert.deepEqual(gates(input({ pr: { ...base, mergeable: false } })), [1]);
  assert.deepEqual(gates(input({ pr: { ...base, mergeable: null } })), [1]);
});

test("gate 2: files outside the allowlist", () => {
  for (const f of ["sites/cura.aero/lib/rich.ts", "sites/cura.aero/content/landing.schema.json", "sites/avilabs.is/index.html", "mcp/src/app.ts"]) {
    assert.deepEqual(gates(input({ files: ["sites/cura.aero/content/pages/home.json", f] })), [2], f);
  }
});

test("gate 2: commits need a valid Mcp-Signature; GitHub's Verified is optional", () => {
  const good = signedCommit(head, "a".repeat(40), "0".repeat(40));
  assert.deepEqual(gates(input({ commits: [{ ...good, message: "Edit\n\nChanged-Via: someone" }] })), [2]);
  assert.deepEqual(gates(input({ commits: [{ ...good, tree: "9".repeat(40) }] })), [2]);
  assert.deepEqual(gates(input({ commits: [{ ...good, authorEmail: "mallory@avilabs.is" }] })), [2]);
  assert.deepEqual(gates(input({ commits: [] })), [2]);
  const unverified = evaluatePublish(site, input({ commits: [{ ...good, verified: false }] }), secret);
  assert.equal(unverified.ok, true);
  assert.match(unverified.notes[0], /not marked Verified/);
  const mixed = [signedCommit("2".repeat(40), "b".repeat(40), "0".repeat(40)), { ...good, message: "hand-pushed" }];
  const r = evaluatePublish(site, input({ commits: mixed }), secret);
  assert.equal(r.ok, false);
  assert.match(r.failures[0].message, /1111111 has no Mcp-Signature/);
});

test("gate 3: the preview must be ready for the current head", () => {
  assert.match(evaluatePublish(site, input({ preview: { state: "building", sha: head } }), secret).failures[0].message, /isn't ready/);
  assert.match(evaluatePublish(site, input({ preview: { state: "failed", sha: head } }), secret).failures[0].message, /build failed/);
  assert.match(evaluatePublish(site, input({ preview: { state: "ready", sha: "0".repeat(40) } }), secret).failures[0].message, /older version/);
  assert.deepEqual(gates(input({ preview: { state: "missing", sha: null } })), [3]);
});

test("gate 4: every other check must pass; other sites' Vercel builds are informational", () => {
  const base = input().checks;
  assert.deepEqual(gates(input({ checks: [...base, { name: "lint", state: "failure", ownVercel: false }] })), [4]);
  assert.deepEqual(gates(input({ checks: [...base, { name: "lint", state: "pending", ownVercel: false }] })), [4]);
  assert.deepEqual(gates(input({ checks: [...base, { name: "lint", state: "neutral", ownVercel: false }] })), []);
  assert.deepEqual(gates(input({ checks: [...base, { name: "tests", state: "skipped", ownVercel: false }] })), []);
  assert.deepEqual(gates(input({ checks: [{ name: "Vercel – avilabs-is", state: "pending", ownVercel: false }] })), []);
});

test("gate 5: approval only when required", () => {
  assert.deepEqual(gates(input({ approval: { required: true, approved: false } })), [5]);
  assert.deepEqual(gates(input({ approval: { required: true, approved: true } })), []);
  assert.deepEqual(gates(input({ approval: { required: false, approved: false } })), []);
});
