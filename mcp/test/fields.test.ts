import { test } from "node:test";
import assert from "node:assert/strict";
import { fieldKind, isReadOnly, validateField } from "../src/guardrails/fields.ts";
import { richChecker } from "../src/guardrails/rich.ts";
import { strings } from "../src/guardrails/pointer.ts";
import { ToolError } from "../src/guardrails/errors.ts";
import { read, schema, site } from "./helpers/site.ts";

const rich = richChecker(schema());
const ctx = { rich, fileExists: (p: string) => p === "public/images/cura-girl.jpg" };
const ok = (kind: Parameters<typeof validateField>[1], value: string) => validateField(site, kind, "/x", value, ctx);
const bad = (kind: Parameters<typeof validateField>[1], value: string) =>
  assert.throws(() => ok(kind, value), (e: unknown) => e instanceof ToolError && e.code === "invalid_value", value);

test("the Rich whitelist comes from the site's schema", () => {
  ok("rich", "Resolve Claims.<br><span class='orange'>Retain Customers.</span>");
  ok("rich", "Risk score &lt; threshold → Flag");
  ok("rich", '<strong>a</strong> <em>b</em> <span class="hi hi-orange">c</span>');
  bad("rich", "<a href='https://evil.example'>x</a>");
  bad("rich", "<span class='evil'>x</span>");
  bad("rich", "<img src=x onerror=alert(1)>");
  bad("rich", "a < b");
  bad("rich", "x".repeat(2001));
});

test("the schema's classes are exactly the site's RICH_CLASSES", () => {
  const pattern = (schema() as { $defs: { rich: { pattern: string } } }).$defs.rich.pattern;
  const groups = [...pattern.matchAll(/class=["']\(\?:([a-z|-]+)\)/g)].map((m) => m[1]);
  assert.equal(groups.length, 2, "one class list per quote style");
  for (const g of groups) assert.deepEqual(g.split("|").sort(), [...site.rules.RICH_CLASSES].sort());
});

test("existing content passes the tag-level check (the site's rich.test.ts rule)", () => {
  for (const file of ["content/pages/home.json", "content/pages/evidence-automation.json", "content/site.json"]) {
    for (const s of strings(JSON.parse(read(file)))) assert.ok(rich.tagsAllowed(s.value), `${file}${s.pointer}`);
  }
  assert.equal(rich.tagsAllowed("a <script>x</script>"), false);
});

test("links, images, icons and HubSpot links use the site's validators", () => {
  ok("href", "/book-demo");
  ok("href", "#faq");
  ok("href", "https://avilabs.is");
  ok("href", "mailto:hello@cura.aero");
  bad("href", "javascript:alert(1)");
  bad("href", "//evil.example");
  bad("href", "http://cura.aero");
  ok("image", "/images/cura-girl.jpg");
  bad("image", "/images/missing.jpg");
  bad("image", "https://evil.example/x.jpg");
  bad("image", "/images/../secret.jpg");
  ok("icon", "verified");
  bad("icon", "Verified Icon");
  ok("hubspot", "https://meetings.hubspot.com/x/y?embed=true");
  bad("hubspot", "https://evil.example/meetings");
});

test("field type comes from the key; array items take the array's key", () => {
  assert.equal(fieldKind(site, ["hero", "cta", "href"]), "href");
  assert.equal(fieldKind(site, ["cta", "photos", 2]), "image");
  assert.equal(fieldKind(site, ["insight", "photo", "src"]), "image");
  assert.equal(fieldKind(site, ["capabilities", "items", 0, "icon"]), "icon");
  assert.equal(fieldKind(site, ["hero", "title"]), "rich");
  assert.equal(fieldKind(site, ["problem", "tags", 3]), "rich");
});

test("read-only pointers", () => {
  const f = "content/pages/home.json";
  assert.equal(isReadOnly(site, f, "/seo/jsonLd/@graph/0/name"), true);
  assert.equal(isReadOnly(site, f, "/seo/canonical"), true);
  assert.equal(isReadOnly(site, f, "/seo/openGraph/url"), true);
  assert.equal(isReadOnly(site, f, "/seo/title"), false);
  assert.equal(isReadOnly(site, f, "/hero/title"), false);
  assert.equal(isReadOnly(site, "content/site.json", "/gaId"), true);
  assert.equal(isReadOnly(site, "content/site.json", "/url"), true);
  assert.equal(isReadOnly(site, "content/site.json", "/header/logo/src"), true);
  assert.equal(isReadOnly(site, "content/site.json", "/footer/copyright"), false);
  assert.equal(isReadOnly(site, "content/site.json", "/footer/parent/href"), true);
});
