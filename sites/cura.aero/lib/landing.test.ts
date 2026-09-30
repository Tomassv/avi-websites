import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { getCatalog, isIndexable, landingSeo, loadAllLandingPages, parseLanding, sectionTypes, LandingError } from "./landing.ts";
import { reservedPaths } from "./landing-routes.ts";

const root = path.join(import.meta.dirname, "..");

test("every landing file and the catalog are valid", () => {
  const pages = loadAllLandingPages(root);
  assert.ok(pages.length > 0);
  getCatalog(root);
});

test("the catalog shows every section type, and the renderer handles each", () => {
  const types = sectionTypes(root);
  assert.equal(types.length, 16);
  const shown = getCatalog(root).sections.map((s) => s.type);
  assert.deepEqual([...shown].sort(), [...types].sort(), "content/landing-catalog.json must show each section type once");
  const renderer = fs.readFileSync(path.join(root, "components", "landing", "Sections.tsx"), "utf8");
  for (const t of types) assert.ok(renderer.includes(`case "${t}":`), `components/landing/Sections.tsx does not render "${t}"`);
});

// A minimal valid page, modified per case.
const base = () => ({
  draft: true,
  seo: {
    title: "A landing page title",
    description: "A description that is long enough to pass the fifty character minimum.",
    ogImage: { src: "/images/landing/claims-automation/mountains.jpg", alt: "" },
  },
  header: { nav: [], cta: { label: "Book a Demo", href: "/book-demo" } },
  sections: [{ type: "hero", title: "Hello" }] as Record<string, unknown>[],
});

const cta = {
  type: "cta-band",
  title: "Ready?",
  button: { label: "Go", href: "/book-demo" },
  photos: [1, 2, 3, 4].map((n) => `/images/landing/claims-automation/cta-${n}.jpg`),
};

function parse(doc: unknown, slug = "claims-automation") {
  return parseLanding(JSON.stringify(doc), slug, `content/landing/${slug}.json`, { root });
}

function fails(doc: unknown, pattern: RegExp, slug?: string) {
  assert.throws(() => parse(doc, slug), (e: unknown) => {
    assert.ok(e instanceof LandingError, String(e));
    assert.match(e.message, pattern);
    return true;
  });
}

test("a minimal page is valid", () => {
  const page = parse(base());
  assert.equal(page.slug, "claims-automation");
});

test("schema errors name the file and the field", () => {
  const extra = base();
  (extra.sections[0] as Record<string, unknown>).subtitle = "x";
  fails(extra, /^content\/landing\/claims-automation\.json: sections\[0\] \(hero\): unknown field "subtitle"$/m);

  const topExtra = { ...base(), layout: "wide" };
  fails(topExtra, /\(file\): unknown field "layout"/);

  const missing = base();
  delete (missing.seo as Partial<ReturnType<typeof base>["seo"]>).ogImage;
  fails(missing, /seo: "ogImage" is required/);

  const long = base();
  long.seo.title = "x".repeat(71);
  fails(long, /seo\.title: must be at most 70 characters \(is 71\)/);

  const markup = base();
  markup.sections[0].title = "Hi <a href='x'>there</a>";
  fails(markup, /sections\[0\] \(hero\)\.title: uses markup outside the whitelist/);

  const badClass = base();
  badClass.sections[0].title = "<span class='evil'>x</span>";
  fails(badClass, /sections\[0\] \(hero\)\.title: uses markup outside the whitelist/);

  const unknown = base();
  unknown.sections.push({ type: "carousel" });
  fails(unknown, /sections\[1\] \(carousel\): unknown section type "carousel" \(allowed: hero, text,/);

  const columns = base();
  columns.sections.push({ type: "cards", columns: 5, items: [{ title: "a" }, { title: "b" }] });
  fails(columns, /sections\[1\] \(cards\)\.columns: must be one of 2, 3, 4/);

  const twoCtas = base();
  twoCtas.sections.push(cta, cta);
  fails(twoCtas, /sections: may contain at most one cta-band section/);

  const badHref = base();
  badHref.header.cta.href = "javascript:alert(1)";
  fails(badHref, /header\.cta\.href: must be a site path/);

  const badIcon = base();
  badIcon.sections.push({ type: "cards", columns: 2, items: [{ title: "a", icon: "Bad Icon" }, { title: "b" }] });
  fails(badIcon, /sections\[1\] \(cards\)\.items\[0\]\.icon: must be a Material Icons name/);

  const badLogo = base();
  badLogo.sections.push({ type: "logos", items: [{ text: "A" }, { image: { src: "/x.png" } }] });
  fails(badLogo, /sections\[1\] \(logos\)\.items\[1\]: must be either/);
});

test("checks beyond the schema", () => {
  const otherFolder = base();
  otherFolder.seo.ogImage.src = "/images/landing/other-page/og.jpg";
  fails(otherFolder, /seo\.ogImage\.src: must be a file in \/images\/landing\/claims-automation\//);

  const missingFile = base();
  missingFile.seo.ogImage.src = "/images/landing/claims-automation/nope.jpg";
  fails(missingFile, /seo\.ogImage\.src: file not found: public\/images\/landing\/claims-automation\/nope\.jpg/);

  const photo = base();
  photo.sections.push({ ...cta, photos: [...cta.photos.slice(0, 3), "/images/cta/cta-4.jpg"] });
  fails(photo, /sections\[1\] \(cta-band\)\.photos\[3\]:/);

  const ids = base();
  ids.sections = [
    { type: "hero", title: "a", id: "top" },
    { type: "text", body: ["b"], id: "top" },
  ];
  fails(ids, /sections\[1\] \(text\)\.id: "top" is already used by sections\[0\]/);

  fails(base(), /file name must be lowercase words joined by hyphens/, "Bad_Name");
});

test("a slug can't take an existing route, redirect or public path", () => {
  const reserved = reservedPaths(root);
  for (const slug of ["book-demo", "evidence-automation", "news", "workflow", "aireuropa", "landing-catalog", "assets", "values", "images", "api"]) {
    assert.ok(reserved.has(slug), `${slug} should be reserved`);
  }
  fails(base(), /slug "book-demo" collides with the route app\/\(site\)\/book-demo; rename the file/, "book-demo");
  fails(base(), /slug "workflow" collides with the route app\/\(docs\)\/workflow/, "workflow");
  fails(base(), /slug "assets" collides with the redirect \/assets\/:path\*/, "assets");
  fails(base(), /slug "images" collides with public\/images/, "images");
});

test("seo: canonical URL, and noindex for drafts and noindex pages", () => {
  const page = parse({ ...base(), draft: false });
  const seo = landingSeo(page, "https://cura.aero");
  assert.equal(seo.canonical, "https://cura.aero/claims-automation");
  assert.equal(seo.openGraph?.image, "https://cura.aero/images/landing/claims-automation/mountains.jpg");
  assert.match(seo.robots ?? "", /^index, follow/);
  assert.equal(isIndexable(page), true);

  assert.equal(landingSeo(parse(base()), "https://cura.aero").robots, "noindex, nofollow");
  const noindex = parse({ ...base(), draft: false, seo: { ...base().seo, noindex: true } });
  assert.equal(isIndexable(noindex), false);
  assert.equal(landingSeo(noindex, "https://cura.aero").robots, "noindex, nofollow");
});

test("faq sections add FAQPage structured data", () => {
  const doc = base();
  doc.sections.push({ type: "faq", items: [{ question: "Why?", answer: "Because <strong>yes</strong>." }] });
  const ld = landingSeo(parse(doc), "https://cura.aero").jsonLd as { "@graph": { "@type": string; mainEntity?: unknown }[] };
  const faq = ld["@graph"].find((n) => n["@type"] === "FAQPage");
  assert.deepEqual(faq?.mainEntity, [{ "@type": "Question", name: "Why?", acceptedAnswer: { "@type": "Answer", text: "Because yes." } }]);
});
