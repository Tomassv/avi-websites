import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { parseArticle, ArticleError } from "./articles.ts";

const md = (fm: string, body = "Hello **world**.\n") => `---\n${fm}\n---\n${body}`;
const ok = 'title: "A title"\ndescription: Short summary\ndate: 2026-10-01\ndraft: false';

test("parses valid frontmatter and body", () => {
  const a = parseArticle(md(ok + '\nauthor: AviLabs\nimage: /images/news/hero.jpg'), "a-title");
  assert.equal(a.title, "A title");
  assert.equal(a.date, "2026-10-01");
  assert.equal(a.author, "AviLabs");
  assert.equal(a.image, "/images/news/hero.jpg");
  assert.equal(a.draft, false);
  assert.equal(a.body, "Hello **world**.\n");
});

test("handles CRLF line endings and a BOM", () => {
  const a = parseArticle("﻿" + md(ok).replace(/\n/g, "\r\n"), "x");
  assert.equal(a.title, "A title");
});

test("rejects invalid articles with the file and field in the message", () => {
  const cases: [string, string, RegExp][] = [
    [md(ok), "Bad_Slug", /file name/],
    ["no frontmatter", "x", /must start/],
    ["---\ntitle: x\n", "x", /not closed/],
    [md(ok.replace('title: "A title"\n', "")), "x", /"title" is required/],
    [md(ok.replace("draft: false", "")), "x", /"draft" is required/],
    [md(ok.replace("draft: false", 'draft: "no"')), "x", /"draft" is required/],
    [md(ok.replace("2026-10-01", "1 October")), "x", /ISO date/],
    [md(ok.replace("2026-10-01", "2026-13-45")), "x", /ISO date/],
    [md(ok + "\nimage: https://evil.example/x.png"), "x", /"image"/],
    [md(ok + "\nimage: /images/../proxy.ts"), "x", /"image"/],
    [md(ok + "\nlayout: raw"), "x", /unknown frontmatter field "layout"/],
    [md(ok + "\ntitle: again"), "x", /not valid YAML/],
    [md("- a\n- b"), "x", /key: value/],
  ];
  for (const [src, slug, re] of cases) {
    assert.throws(() => parseArticle(src, slug, `content/articles/${slug}.md`), (e: unknown) => {
      assert.ok(e instanceof ArticleError);
      assert.match((e as Error).message, re);
      assert.match((e as Error).message, new RegExp(`content/articles/${slug}\\.md`));
      return true;
    });
  }
});

test("every article in content/articles is valid", () => {
  const dir = path.join(import.meta.dirname, "..", "content", "articles");
  if (!fs.existsSync(dir)) return;
  for (const f of fs.readdirSync(dir).filter((f) => f.endsWith(".md"))) {
    assert.doesNotThrow(() => parseArticle(fs.readFileSync(path.join(dir, f), "utf8"), f.slice(0, -3)), f);
  }
});
