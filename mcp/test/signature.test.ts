import { test } from "node:test";
import assert from "node:assert/strict";
import { commitSignature, readTrailer, verifyCommitSignature, withTrailers, SIGNATURE_TRAILER } from "../src/guardrails/signature.ts";

const secret = Buffer.from("s".repeat(32));
const tree = "a".repeat(40);
const parent = "b".repeat(40);
const email = "jane@avilabs.is";

function commit(message: string, over: Partial<{ tree: string; parents: string[]; authorEmail: string }> = {}) {
  return { sha: "c".repeat(40), tree, parents: [parent], authorEmail: email, message, ...over };
}
const signed = () =>
  withTrailers("Update hero", [
    ["Changed-Via", "avi-websites-mcp (update_text)"],
    [SIGNATURE_TRAILER, commitSignature(secret, tree, parent, email)],
  ]);

test("a valid trailer is accepted", () => {
  assert.deepEqual(verifyCommitSignature(secret, commit(signed())), { ok: true });
});

test("a missing trailer is refused", () => {
  const r = verifyCommitSignature(secret, commit("Update hero\n\nChanged-Via: someone"));
  assert.equal(r.ok, false);
  assert.match((r as { reason: string }).reason, /no Mcp-Signature trailer/);
});

test("an invalid trailer is refused: wrong key, altered tree, parent or author, junk", () => {
  const other = Buffer.from("t".repeat(32));
  for (const [label, c, key] of [
    ["wrong key", commit(signed()), other],
    ["altered tree", commit(signed(), { tree: "d".repeat(40) }), secret],
    ["altered parent", commit(signed(), { parents: ["e".repeat(40)] }), secret],
    ["altered author", commit(signed(), { authorEmail: "mallory@avilabs.is" }), secret],
    ["junk", commit(`x\n\n${SIGNATURE_TRAILER}: ${"f".repeat(64)}`), secret],
  ] as const) {
    const r = verifyCommitSignature(key, c);
    assert.equal(r.ok, false, label);
    assert.match((r as { reason: string }).reason, /invalid Mcp-Signature/, label);
  }
  const malformed = verifyCommitSignature(secret, commit(`x\n\n${SIGNATURE_TRAILER}: nothex`));
  assert.match((malformed as { reason: string }).reason, /malformed/);
});

test("a trailer in the body, not the final paragraph, doesn't count", () => {
  const sig = commitSignature(secret, tree, parent, email);
  const r = verifyCommitSignature(secret, commit(`Title\n\n${SIGNATURE_TRAILER}: ${sig}\n\nMore text`));
  assert.equal(r.ok, false);
});

test("merge commits are refused", () => {
  const r = verifyCommitSignature(secret, commit(signed(), { parents: [parent, "d".repeat(40)] }));
  assert.match((r as { reason: string }).reason, /2 parents/);
});

test("trailer helpers", () => {
  const m = withTrailers("Title\n\nBody", [["Co-authored-by", "A <a@x>"], ["Published-by", "B <b@x>"]]);
  assert.equal(readTrailer(m, "published-by"), "B <b@x>");
  assert.equal(readTrailer(m, "nope"), null);
});
