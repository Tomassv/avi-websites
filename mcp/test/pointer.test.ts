import { test } from "node:test";
import assert from "node:assert/strict";
import { applyStringEdits, formatPointer, getAt, parsePointer, sameShape } from "../src/guardrails/pointer.ts";
import { ToolError } from "../src/guardrails/errors.ts";

const doc = {
  hero: { title: "Old", cta: { label: "Go", href: "/book-demo" } },
  tags: ["a", "b"],
  "a/b": { "c~d": "escaped" },
  count: 3,
  flag: true,
};

const code = (fn: () => unknown, c: string) => assert.throws(fn, (e: unknown) => e instanceof ToolError && e.code === c);

test("replaces existing strings and leaves the original untouched", () => {
  const out = applyStringEdits(doc, [
    { pointer: "/hero/title", oldValue: "Old", newValue: "New" },
    { pointer: "/tags/1", oldValue: "b", newValue: "B" },
    { pointer: "/a~1b/c~0d", oldValue: "escaped", newValue: "ok" },
  ]) as typeof doc;
  assert.equal(out.hero.title, "New");
  assert.equal(out.tags[1], "B");
  assert.equal(out["a/b"]["c~d"], "ok");
  assert.equal(doc.hero.title, "Old");
});

test("refuses missing pointers, non-strings, stale values and duplicates", () => {
  code(() => applyStringEdits(doc, [{ pointer: "/hero/sub", oldValue: "", newValue: "x" }]), "pointer_not_found");
  code(() => applyStringEdits(doc, [{ pointer: "/tags/2", oldValue: "", newValue: "x" }]), "pointer_not_found");
  code(() => applyStringEdits(doc, [{ pointer: "/tags/01", oldValue: "b", newValue: "x" }]), "pointer_not_found");
  code(() => applyStringEdits(doc, [{ pointer: "/tags/-", oldValue: "", newValue: "x" }]), "pointer_not_found");
  code(() => applyStringEdits(doc, [{ pointer: "/count", oldValue: "3", newValue: "4" }]), "pointer_not_string");
  code(() => applyStringEdits(doc, [{ pointer: "/hero", oldValue: "", newValue: "x" }]), "pointer_not_string");
  code(() => applyStringEdits(doc, [{ pointer: "/hero/title", oldValue: "Older", newValue: "x" }]), "stale_value");
  code(
    () =>
      applyStringEdits(doc, [
        { pointer: "/hero/title", oldValue: "Old", newValue: "x" },
        { pointer: "/hero/title", oldValue: "Old", newValue: "y" },
      ]),
    "pointer_duplicate",
  );
  code(() => applyStringEdits(doc, [{ pointer: "hero/title", oldValue: "Old", newValue: "x" }]), "pointer_invalid");
  code(() => applyStringEdits(doc, [{ pointer: "/a~2b/x", oldValue: "", newValue: "x" }]), "pointer_invalid");
  code(() => applyStringEdits(doc, [{ pointer: "", oldValue: "", newValue: "x" }]), "pointer_invalid");
});

test("a pointer can't reach through __proto__ or inherited keys", () => {
  code(() => applyStringEdits(doc, [{ pointer: "/__proto__/x", oldValue: "", newValue: "x" }]), "pointer_not_found");
  code(() => applyStringEdits(doc, [{ pointer: "/hero/toString", oldValue: "", newValue: "x" }]), "pointer_not_found");
});

test("a non-string new value is refused", () => {
  code(() => applyStringEdits(doc, [{ pointer: "/hero/title", oldValue: "Old", newValue: 5 as unknown as string }]), "pointer_not_string");
});

test("shape comparison", () => {
  assert.equal(sameShape(doc, structuredClone(doc)), true);
  assert.equal(sameShape({ a: "x" }, { a: "y" }), true);
  assert.equal(sameShape({ a: "x" }, { a: "x", b: "y" }), false);
  assert.equal(sameShape({ a: ["x"] }, { a: ["x", "y"] }), false);
  assert.equal(sameShape({ a: "x" }, { a: 1 }), false);
  assert.equal(sameShape({ a: 1 }, { a: 2 }), false);
  assert.equal(sameShape({ a: null }, { a: "x" }), false);
});

test("pointer helpers", () => {
  assert.deepEqual(parsePointer("/a~1b/c~0d/0"), ["a/b", "c~d", "0"]);
  assert.equal(formatPointer(["a/b", "c~d", 0]), "/a~1b/c~0d/0");
  assert.deepEqual(getAt(doc, "/hero/cta/href"), { found: true, value: "/book-demo" });
  assert.equal(getAt(doc, "/nope").found, false);
});
