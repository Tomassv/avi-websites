import { test } from "node:test";
import assert from "node:assert/strict";
import { editJsonText, stringSpans } from "../src/guardrails/json-edit.ts";
import { strings } from "../src/guardrails/pointer.ts";
import { read } from "./helpers/site.ts";

test("only the edited characters change", () => {
  const src = '{\n  "hero": { "title": "Old — title", "cta": { "label": "Go", "href": "/x" } },\n  "tags": ["a", "b\\"q"],\n  "n": 1\n}\n';
  const { text } = editJsonText(src, [
    { pointer: "/hero/title", oldValue: "Old — title", newValue: 'New "quoted" <br> title' },
    { pointer: "/tags/1", oldValue: 'b"q', newValue: "B" },
  ]);
  assert.equal(text, '{\n  "hero": { "title": "New \\"quoted\\" <br> title", "cta": { "label": "Go", "href": "/x" } },\n  "tags": ["a", "B"],\n  "n": 1\n}\n');
});

test("every string in the real content files is located exactly", () => {
  for (const file of ["content/pages/home.json", "content/pages/evidence-automation.json", "content/landing/claims-automation.json", "content/site.json"]) {
    const src = read(file);
    const spans = stringSpans(src);
    const all = [...strings(JSON.parse(src))];
    assert.equal(spans.size, all.length, file);
    for (const s of all) {
      const span = spans.get(s.pointer)!;
      assert.equal(JSON.parse(src.slice(span.start, span.end)), s.value, `${file}${s.pointer}`);
    }
  }
});

test("an edit of a real file is a one-line diff", () => {
  const src = read("content/pages/home.json");
  const { text } = editJsonText(src, [{ pointer: "/whatWeDo/chip", oldValue: "What We Do", newValue: "What we do" }]);
  const a = src.split("\n");
  const b = text.split("\n");
  assert.equal(a.length, b.length);
  assert.equal(a.filter((line, i) => line !== b[i]).length, 1);
});
