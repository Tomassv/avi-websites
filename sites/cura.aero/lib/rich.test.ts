import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { parseRich, richToText, decodeEntities, MAX_DEPTH, RICH_CLASSES, type RichNode } from "./rich.ts";

/** Serialises a parsed tree back to HTML, for readable assertions. */
function html(nodes: RichNode[]): string {
  return nodes
    .map((n) => {
      if (typeof n === "string") return n.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
      if (n.tag === "br") return "<br>";
      if (n.tag === "span") return `<span class="${n.className}">${html(n.children)}</span>`;
      return `<${n.tag}>${html(n.children)}</${n.tag}>`;
    })
    .join("");
}
const p = (s: string) => html(parseRich(s));

test("keeps allowed markup", () => {
  assert.equal(p("Resolve Claims.<br><span class='orange'>Retain Customers.</span>"), 'Resolve Claims.<br><span class="orange">Retain Customers.</span>');
  assert.equal(p('<strong>a</strong> <b>b</b> <em>c</em>'), "<strong>a</strong> <b>b</b> <em>c</em>");
  assert.equal(p('<span class="hi hi-orange">x</span>'), '<span class="hi hi-orange">x</span>');
  assert.equal(p("a<br/>b<BR />c"), "a<br>b<br>c");
});

test("decodes entities to text, never to markup", () => {
  assert.equal(richToText("a &mdash; b &middot; c &rarr; d&hellip;"), "a — b · c → d…");
  assert.equal(p("&lt;script&gt;alert(1)&lt;/script&gt;"), "&lt;script&gt;alert(1)&lt;/script&gt;");
  assert.deepEqual(parseRich("&lt;img src=x onerror=alert(1)&gt;"), ["<img src=x onerror=alert(1)>"]);
  assert.equal(decodeEntities("&#65;&#x42;&#0;&#xD800;&bogus;"), "AB��&bogus;");
});

test("strips script and style with their contents", () => {
  assert.equal(p("a<script>alert(1)</script>b"), "ab");
  assert.equal(p("a<SCRIPT type='x'>alert(1)</SCRIPT >b"), "ab");
  assert.equal(p("a<style>body{display:none}</style>b"), "ab");
  assert.equal(p("a<script>never closed"), "a");
  assert.equal(p("a<iframe src='javascript:alert(1)'>x</iframe>b"), "ab");
});

test("drops disallowed tags but keeps their text", () => {
  assert.equal(p("<img src=x onerror=alert(1)>hi"), "hi");
  assert.equal(p('<svg onload="alert(1)"><circle/></svg>ok'), "ok");
  assert.equal(p('<a href="javascript:alert(1)">click</a>'), "click");
  assert.equal(p("<div><p>para</p></div>"), "para");
  assert.equal(p("<IMG SRC=x ONERROR=alert(1)>"), "");
  assert.equal(p('<img src="x" alt="a>b">after'), "after");
});

test("drops every attribute except whitelisted classes", () => {
  assert.equal(p('<span class="orange" onclick="alert(1)" style="color:red">x</span>'), '<span class="orange">x</span>');
  assert.equal(p('<span onclick="alert(1)" class=orange>x</span>'), '<span class="orange">x</span>');
  assert.equal(p('<span class="evil orange" >x</span>'), '<span class="orange">x</span>');
  assert.equal(p('<strong class="orange" onmouseover="x">y</strong>'), "<strong>y</strong>");
  // no allowed class: the span disappears, its children stay
  assert.equal(p('<span class="evil">x<em>y</em></span>'), "x<em>y</em>");
  assert.equal(p('<span style="position:fixed">x</span>'), "x");
});

test("drops comments, doctype and processing instructions", () => {
  assert.equal(p("a<!-- <script>alert(1)</script> -->b"), "ab");
  assert.equal(p("a<!DOCTYPE html>b<?xml x?>c<![CDATA[d]]>e"), "abce");
  assert.equal(p("a<!-- never closed"), "a");
});

test("handles malformed markup without throwing", () => {
  assert.equal(p("<strong>unclosed"), "<strong>unclosed</strong>");
  assert.equal(p("stray</strong></span> text"), "stray text");
  assert.equal(p("<strong>a<em>b</strong>c"), "<strong>a<em>b</em></strong>c");
  assert.equal(p("1 < 2 and 3 > 2"), "1 &lt; 2 and 3 &gt; 2");
  assert.equal(p("< script>alert(1)"), "&lt; script&gt;alert(1)");
  assert.equal(p("<"), "&lt;");
  assert.equal(p('<span class="orange>x'), "&lt;span class=\"orange&gt;x");
  assert.deepEqual(parseRich(undefined), []);
  assert.deepEqual(parseRich(42), []);
});

test("caps nesting depth", () => {
  const deep = "<em>".repeat(100) + "x" + "</em>".repeat(100);
  let depth = 0;
  let nodes = parseRich(deep);
  while (nodes.length && typeof nodes[0] !== "string") {
    const n = nodes[0];
    if (n.tag === "br") break;
    depth++;
    nodes = n.children;
  }
  assert.equal(depth, MAX_DEPTH);
  assert.deepEqual(nodes, ["x"]);
});

// Every string in content/ must only use whitelisted markup, so nothing an author wrote is
// silently stripped.
const ALLOWED_TAG = new RegExp(
  `^(<br\\s*/?>|</?(strong|b|em)>|</span>|<span class=(["'])(${RICH_CLASSES.join("|")})( (${RICH_CLASSES.join("|")}))*\\3>)$`,
);

function* strings(value: unknown, where: string): Generator<[string, string]> {
  if (typeof value === "string") yield [value, where];
  else if (Array.isArray(value)) for (const [i, v] of value.entries()) yield* strings(v, `${where}[${i}]`);
  else if (value && typeof value === "object") for (const [k, v] of Object.entries(value)) yield* strings(v, `${where}.${k}`);
}

test("content files only use whitelisted markup", () => {
  const root = path.join(import.meta.dirname, "..", "content");
  const files = fs.readdirSync(root, { recursive: true, encoding: "utf8" }).filter((f) => f.endsWith(".json"));
  assert.ok(files.length > 0);
  for (const file of files) {
    const data = JSON.parse(fs.readFileSync(path.join(root, file), "utf8"));
    for (const [s, where] of strings(data, file)) {
      for (const tag of s.match(/<[^>]*>?/g) ?? []) {
        assert.match(tag, ALLOWED_TAG, `${where}: markup outside the whitelist: ${tag}`);
      }
      assert.doesNotThrow(() => parseRich(s));
    }
  }
});
