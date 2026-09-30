import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import sharp from "sharp";
import { createApp } from "../src/app.ts";
import { memoryRepo, readCheckout, type MemoryRepo } from "../src/github/memory.ts";
import { memoryStore } from "../src/store/store.ts";
import { seal, signAccessToken } from "../src/auth/tokens.ts";
import { testConfig } from "./helpers/config.ts";

const repoRoot = path.resolve(import.meta.dirname, "../..");
const checkout = Object.fromEntries(Object.entries(readCheckout(repoRoot)).filter(([p]) => p.startsWith("sites/cura.aero/")));
const jane = { sub: "1", email: "jane@avilabs.is", name: "Jane Doe" };
const HOST = "https://mcp.example.com";

async function setup(over: Record<string, string> = {}) {
  const cfg = testConfig({ PREVIEW_BYPASS_SECRET_CURA_AERO: "bypass-secret", ...over });
  const gh: MemoryRepo = memoryRepo(checkout);
  const store = memoryStore();
  const logs: Record<string, unknown>[] = [];
  const app = createApp({
    cfg,
    store,
    log: (e) => logs.push(e),
    fetch,
    gh,
    google: { authUrl: ({ state }) => `https://google.test/auth?state=${encodeURIComponent(state)}`, exchange: async () => { throw new Error("not used"); } },
  });
  const { token } = await signAccessToken(cfg, jane, "https://claude.ai/oauth/mcp-client-metadata", "websites");
  let id = 0;
  async function call(name: string, args: Record<string, unknown> = {}) {
    const res = await app.fetch(
      new Request(`${HOST}/mcp`, {
        method: "POST",
        headers: { host: "mcp.example.com", "content-type": "application/json", accept: "application/json, text/event-stream", authorization: `Bearer ${token}`, "mcp-protocol-version": "2025-11-25" },
        body: JSON.stringify({ jsonrpc: "2.0", id: ++id, method: "tools/call", params: { name, arguments: args } }),
      }),
    );
    const text = await res.text();
    const data = JSON.parse(/^data: (.*)$/m.exec(text)![1]);
    if (data.error) return { isError: true, error: data.error, text: JSON.stringify(data.error), s: {} as Record<string, any> };
    const r = data.result;
    return { isError: Boolean(r.isError), text: r.content.map((c: { text: string }) => c.text).join("\n"), s: (r.structuredContent ?? {}) as Record<string, any> };
  }
  const session = async () => `__Host-mcp_session=${encodeURIComponent(await seal(cfg, "session", { user: jane }, 3600))}`;
  return { cfg, gh, store, logs, app, call, session };
}

const png = (w = 40, h = 30) => sharp({ create: { width: w, height: h, channels: 3, background: "#fe6c3b" } }).png().toBuffer();

const landing = (slug: string, over: Record<string, unknown> = {}) => ({
  seo: { title: "Spring campaign for claims teams", description: "A landing page for the spring campaign, written for airline claims and customer care teams.", ogImage: { src: `/images/landing/${slug}/og.webp`, alt: "" } },
  header: { nav: [], cta: { label: "Book a Demo", href: "/book-demo" } },
  sections: [{ type: "hero", title: "Close claims <span class='orange'>faster</span>" }],
  ...over,
});

test("read tools: sites, guide, pages, content", async () => {
  const { call } = await setup();
  const sites = await call("list_sites");
  assert.equal(sites.s.user.email, "jane@avilabs.is");
  assert.match(sites.text, /Next: call get_site_guide/);

  const guide = await call("get_site_guide", { site: "cura.aero" });
  assert.match(guide.s.guide, /## Editing content/);
  assert.match(guide.s.guide, /\*\*cta-band\*\*/);
  assert.match(guide.s.guide, /`photos`: list of image path \(4–4\)/);
  assert.match(guide.s.guide, /draft: true` are published with the change but stay hidden/);

  const pages = await call("list_pages", { site: "cura.aero" });
  const byId = Object.fromEntries(pages.s.pages.map((p: { id: string }) => [p.id, p]));
  assert.equal(byId.home.url, "/");
  assert.equal(byId.aha.internal, true);
  assert.equal(byId["book-demo"].internal, undefined);
  assert.equal(byId["claims-automation"].draft, true);
  assert.equal(byId["example-article"].url, "/news/example-article");
  assert.ok(byId["content/site.json"]);

  const home = await call("get_page_content", { site: "cura.aero", file: "content/pages/home.json" });
  const pointers = home.s.editable.map((e: { pointer: string }) => e.pointer);
  assert.ok(pointers.includes("/hero/title"));
  assert.ok(pointers.includes("/hero/cta/href"));
  assert.ok(!pointers.some((p: string) => p.includes("jsonLd") || p.endsWith("/canonical")));
  assert.equal(home.s.editable.find((e: { pointer: string }) => e.pointer === "/cta/photos/0").type, "image");

  const refused = await call("get_page_content", { site: "cura.aero", file: "lib/rich.ts" });
  assert.equal(refused.isError, true);
  assert.equal(refused.s.code, "path_not_writable");
  assert.equal((await call("list_pages", { site: "nope.example" })).s.code, "unknown_site");
});

test("update_text: a one-line change in a new change, and every guardrail", async () => {
  const { call, gh } = await setup();
  const before = (await gh.readFile("main", "sites/cura.aero/content/pages/home.json"))!.toString();
  const ok = await call("update_text", {
    site: "cura.aero",
    file: "content/pages/home.json",
    edits: [{ pointer: "/whatWeDo/chip", oldValue: "What We Do", newValue: "What we do" }],
    summary: "Sentence case for the What We Do chip",
  });
  assert.equal(ok.isError, false, ok.text);
  const id = ok.s.change_id;
  assert.match(ok.text, /Next: call get_preview\(change_id: 1\)/);
  const after = (await gh.readFile(ok.s.branch, "sites/cura.aero/content/pages/home.json"))!.toString();
  assert.equal(after, before.replace('"chip": "What We Do"', '"chip": "What we do"'));

  const edit = (edits: unknown[], file = "content/pages/home.json") => call("update_text", { site: "cura.aero", file, edits, summary: "Test edit", change_id: id });
  const code = async (p: Promise<{ s: Record<string, any> }>, c: string) => assert.equal((await p).s.code, c);
  await code(edit([{ pointer: "/hero/title", oldValue: "stale", newValue: "x" }]), "stale_value");
  await code(edit([{ pointer: "/hero/title", oldValue: "Resolve Claims.<br><span class='orange'>Retain Customers.</span>", newValue: "<a href='https://evil.example'>x</a>" }]), "invalid_value");
  await code(edit([{ pointer: "/hero/cta/href", oldValue: "/book-demo", newValue: "javascript:alert(1)" }]), "invalid_value");
  await code(edit([{ pointer: "/insight/photo/src", oldValue: "/images/cura-girl.jpg", newValue: "/images/missing.jpg" }]), "invalid_value");
  await code(edit([{ pointer: "/seo/canonical", oldValue: "https://cura.aero/", newValue: "https://evil.example/" }]), "read_only");
  await code(edit([{ pointer: "/hero", oldValue: "", newValue: "x" }]), "pointer_not_string");
  await code(edit([{ pointer: "/hero/new", oldValue: "", newValue: "x" }]), "pointer_not_found");
  await code(edit([{ pointer: "/gaId", oldValue: "G-83QLM5X9DK", newValue: "G-EVIL" }], "content/site.json"), "read_only");
  await code(edit([{ pointer: "/footer/parent/href", oldValue: "https://avilabs.is", newValue: "https://evil.example" }], "content/site.json"), "read_only");
  await code(edit([{ pointer: "/x", oldValue: "", newValue: "x" }], "content/landing.schema.json"), "path_not_writable");
  await code(edit([{ pointer: "/x", oldValue: "", newValue: "x" }], "content/articles/example-article.md"), "not_json");
  const footer = await edit([{ pointer: "/footer/address", oldValue: "Sóltún 26, 105, Reykjavik, Iceland", newValue: "Sóltún 26, 105 Reykjavík, Iceland" }], "content/site.json");
  assert.equal(footer.isError, false, footer.text);
  assert.equal((await gh.listPullCommits(id)).length, 2, "refused edits wrote nothing");

  // A landing file is re-validated with the site's rules as a whole.
  const landingEdit = await call("update_text", {
    site: "cura.aero",
    file: "content/landing/claims-automation.json",
    edits: [{ pointer: "/seo/title", oldValue: "Claims automation for airlines — Cura", newValue: "x".repeat(71) }],
    summary: "Too long",
  });
  assert.equal(landingEdit.s.code, "invalid_landing");
  assert.match(landingEdit.text, /seo\.title: must be at most 70 characters/);
});

test("landing pages: images first, drafts default to false, the site's rules apply", async () => {
  const { call, gh } = await setup();
  const img = await call("upload_image", { site: "cura.aero", folder: "landing/spring", name: "og", dataBase64: (await png()).toString("base64") });
  assert.equal(img.isError, false, img.text);
  assert.equal(img.s.path, "/images/landing/spring/og.webp");
  const id = img.s.change_id;

  const bad = await call("create_landing_page", { site: "cura.aero", slug: "spring", page: landing("spring", { layout: "wide" }), change_id: id });
  assert.match(bad.text, /unknown field "layout"/);
  assert.equal((await call("create_landing_page", { site: "cura.aero", slug: "book-demo", page: landing("book-demo"), change_id: id })).s.code, "invalid_landing");
  assert.equal((await call("create_landing_page", { site: "cura.aero", slug: "claims-automation", page: landing("claims-automation") })).s.code, "already_exists");
  assert.equal((await call("create_landing_page", { site: "cura.aero", slug: "Spring", page: landing("spring") })).s.code, "invalid_slug");

  const page = await call("create_landing_page", { site: "cura.aero", slug: "spring", page: landing("spring"), change_id: id });
  assert.equal(page.isError, false, page.text);
  assert.equal(page.s.draft, false);
  const written = JSON.parse((await gh.readFile(page.s.prUrl && (await gh.getPull(id))!.headRef, "sites/cura.aero/content/landing/spring.json"))!.toString());
  assert.equal(written.draft, false);
  assert.match(page.text, /Publishing will make it live/);

  // Replacing a page created in the same change is fine; a draft is reported by get_preview.
  const again = await call("create_landing_page", { site: "cura.aero", slug: "spring", page: landing("spring", { draft: true }), change_id: id });
  assert.equal(again.isError, false, again.text);
  const preview = await call("get_preview", { change_id: id });
  assert.deepEqual(preview.s.drafts, [{ file: "content/landing/spring.json", url: "/spring" }]);
  assert.match(preview.text, /These pages are drafts and won't be visible on the live site after publishing: \/spring/);
});

test("images: SVG and junk are refused, names can't collide", async () => {
  const { call } = await setup();
  const svg = await call("upload_image", { site: "cura.aero", folder: "news", name: "logo", dataBase64: Buffer.from("<svg xmlns='http://www.w3.org/2000/svg'/>").toString("base64") });
  assert.equal(svg.s.code, "unsupported_image");
  assert.equal((await call("upload_image", { site: "cura.aero", folder: "../../lib", name: "x", dataBase64: "AA==" })).s.code, "invalid_folder");
  assert.equal((await call("upload_image", { site: "cura.aero", folder: "news", name: "x", dataBase64: "not base64!" })).s.code, "invalid_image");
  const first = await call("upload_image", { site: "cura.aero", folder: "news", name: "Team Photo", dataBase64: (await png()).toString("base64") });
  assert.equal(first.s.path, "/images/news/team-photo.webp");
  const dup = await call("upload_image", { site: "cura.aero", folder: "news", name: "team photo", dataBase64: (await png()).toString("base64"), change_id: first.s.change_id });
  assert.equal(dup.s.code, "already_exists");
});

test("articles: create (draft false by default), update with a stale-body check", async () => {
  const { call, gh } = await setup();
  const missingImage = await call("create_article", { site: "cura.aero", slug: "hello", title: "Hello", description: "First post.", date: "2026-10-01", image: "/images/news/nope.webp", body: "Hi." });
  assert.equal(missingImage.s.code, "invalid_value");
  const created = await call("create_article", { site: "cura.aero", slug: "hello", title: "Hello: a first post", description: "First post.", date: "2026-10-01", body: "Hi **there**." });
  assert.equal(created.isError, false, created.text);
  assert.equal(created.s.draft, false);
  const branch = (await gh.getPull(created.s.change_id))!.headRef;
  const src = (await gh.readFile(branch, "sites/cura.aero/content/articles/hello.md"))!.toString();
  assert.match(src, /^---\ntitle: "Hello: a first post"\ndescription: First post\.\ndate: 2026-10-01\ndraft: false\n---\n\nHi \*\*there\*\*\.\n$/);
  assert.equal((await call("create_article", { site: "cura.aero", slug: "example-article", title: "x", description: "x", date: "2026-10-01", body: "x" })).s.code, "already_exists");
  const badDate = await call("create_article", { site: "cura.aero", slug: "later", title: "x", description: "x", date: "2026-13-45", body: "x" });
  assert.equal(badDate.s.code, "invalid_article");

  const content = await call("get_page_content", { site: "cura.aero", file: "content/articles/hello.md", change_id: created.s.change_id });
  const stale = await call("update_article", { site: "cura.aero", slug: "hello", body: "New", oldBodySha256: "0".repeat(64), summary: "Edit body", change_id: created.s.change_id });
  assert.equal(stale.s.code, "stale_value");
  const updated = await call("update_article", { site: "cura.aero", slug: "hello", body: "New body.", oldBodySha256: content.s.bodySha256, draft: true, summary: "Edit body", change_id: created.s.change_id });
  assert.equal(updated.isError, false, updated.text);
  const src2 = (await gh.readFile(branch, "sites/cura.aero/content/articles/hello.md"))!.toString();
  assert.match(src2, /draft: true\n---\n\nNew body\.\n$/);
});

test("preview, publish and undo through the tools", async () => {
  const { call, gh, logs } = await setup();
  const c = await call("update_text", { site: "cura.aero", file: "content/pages/book-demo.json", edits: [{ pointer: "/intro/chip", oldValue: "Book a Demo", newValue: "Book a demo" }], summary: "Sentence case chip" });
  const id = c.s.change_id;
  const waiting = await call("get_preview", { change_id: id });
  assert.equal(waiting.s.state, "missing");
  assert.equal(waiting.s.publishable, false);
  assert.match(waiting.text, /call get_preview again/);
  assert.equal((await call("publish", { change_id: id, confirm: true })).s.code, "not_publishable");
  assert.equal((await call("publish", { change_id: id, confirm: false })).isError, true);

  gh.previews.set((await gh.getPull(id))!.headSha, { state: "ready", url: "https://cura-git-x.vercel.app", description: null });
  const ready = await call("get_preview", { change_id: id });
  assert.equal(ready.s.previewLink, `${HOST}/p/${id}?path=%2Fbook-demo`);
  assert.equal(ready.s.publishable, true);

  const pub = await call("publish", { change_id: id, confirm: true });
  assert.equal(pub.isError, false, pub.text);
  assert.deepEqual(pub.s.liveUrls, ["https://cura.aero/book-demo"]);
  const main = JSON.parse((await gh.readFile("main", "sites/cura.aero/content/pages/book-demo.json"))!.toString());
  assert.equal(main.intro.chip, "Book a demo");

  const u = await call("undo", { change_id: id });
  assert.equal(u.isError, false, u.text);
  assert.equal(u.s.revertsChange, id);
  const list = await call("list_changes", { site: "cura.aero", state: "all" });
  assert.deepEqual(list.s.changes.map((x: { change_id: number; state: string }) => [x.change_id, x.state]), [[u.s.change_id, "open"], [id, "published"]]);

  const discarded = await call("discard_change", { change_id: u.s.change_id, confirm: true });
  assert.equal(discarded.isError, false);

  // Every call was logged with the user, and nothing secret or bulky.
  const toolLogs = logs.filter((l) => l.event === "tool");
  assert.ok(toolLogs.every((l) => l.user === "jane@avilabs.is"));
  assert.ok(toolLogs.some((l) => l.tool === "publish" && l.outcome === "ok" && l.changeId === id));
  assert.ok(!JSON.stringify(logs).includes("Bearer"));
});

test("publish warns about drafts in the change", async () => {
  const { call, gh } = await setup();
  const created = await call("create_article", { site: "cura.aero", slug: "soon", title: "Soon", description: "Coming soon.", date: "2026-10-01", body: "Soon.", draft: true });
  gh.previews.set((await gh.getPull(created.s.change_id))!.headSha, { state: "ready", url: "https://x.vercel.app", description: null });
  const pub = await call("publish", { change_id: created.s.change_id, confirm: true });
  assert.equal(pub.isError, false, pub.text);
  assert.match(pub.text, /These pages are drafts and won't be visible on the live site after publishing: \/news\/soon\./);
  assert.deepEqual(pub.s.drafts, [{ file: "content/articles/soon.md", url: "/news/soon" }]);
});

test("the upload link: session-bound, single use, committed to the change", async () => {
  const { call, app, session, logs } = await setup();
  const link = await call("get_image_upload_link", { site: "cura.aero", folder: "landing/summer", name: "Hero Photo" });
  assert.equal(link.isError, false, link.text);
  assert.equal(link.s.path, "/images/landing/summer/hero-photo.webp");
  const url = new URL(link.s.uploadUrl);
  assert.equal((await call("check_upload", { upload_id: link.s.upload_id })).s.status, "waiting");

  const get = (cookie?: string) => app.fetch(new Request(url, { headers: cookie ? { cookie } : {} }));
  const signIn = await get();
  assert.equal(signIn.status, 302);
  assert.match(signIn.headers.get("location")!, /^https:\/\/google\.test\/auth/);
  const pageRes = await get(await session());
  assert.equal(pageRes.status, 200);
  assert.match(await pageRes.text(), /summer\/hero-photo\.webp/);
  assert.match(pageRes.headers.get("content-security-policy")!, /frame-ancestors 'none'/);

  const post = async (origin: string, body: Buffer) =>
    app.fetch(new Request(url, { method: "POST", headers: { cookie: await session(), origin, "content-type": "image/png" }, body }));
  assert.equal((await post("https://evil.example", await png())).status, 403);
  const bad = await post(HOST, Buffer.from("<svg/>"));
  assert.equal(bad.status, 400, "a refused file doesn't burn the link");
  const ok = await post(HOST, await png(3000, 2000));
  assert.equal(ok.status, 200);
  const out = (await ok.json()) as { path: string; change_id: number; width: number };
  assert.equal(out.path, "/images/landing/summer/hero-photo.webp");
  assert.equal(out.width, 2400);
  assert.equal((await post(HOST, await png())).status, 409, "single use");
  const done = await call("check_upload", { upload_id: link.s.upload_id });
  assert.deepEqual([done.s.status, done.s.change_id, done.s.path], ["done", out.change_id, out.path]);
  assert.ok(logs.some((l) => l.event === "upload" && l.outcome === "ok"));

  const forged = await app.fetch(new Request(`${HOST}/upload/not-a-token`, { headers: { cookie: await session() } }));
  assert.equal(forged.status, 410);
});

test("the preview gateway: sign-in, then a Vercel preview with the bypass cookie", async () => {
  const { call, gh, app, session } = await setup();
  const c = await call("update_text", { site: "cura.aero", file: "content/pages/news.json", edits: [{ pointer: "/list/chip", oldValue: JSON.parse(checkout["sites/cura.aero/content/pages/news.json"].toString()).list.chip, newValue: "News" }], summary: "News chip" });
  const id = c.s.change_id;
  const open = async (p: string, cookie?: string) => app.fetch(new Request(`${HOST}${p}`, { headers: cookie ? { cookie } : {} }));

  const anon = await open(`/p/${id}?path=/news`);
  assert.match(anon.headers.get("location")!, /^https:\/\/google\.test\/auth/);
  const building = await open(`/p/${id}?path=/news`, await session());
  assert.equal(building.headers.get("refresh"), "20");

  const head = (await gh.getPull(id))!.headSha;
  gh.previews.set(head, { state: "ready", url: "https://cura-git-mcp.vercel.app", description: null });
  const go = await open(`/p/${id}?path=/news`, await session());
  assert.equal(go.status, 302);
  const target = new URL(go.headers.get("location")!);
  assert.equal(`${target.origin}${target.pathname}`, "https://cura-git-mcp.vercel.app/news");
  assert.equal(target.searchParams.get("x-vercel-protection-bypass"), "bypass-secret");
  assert.equal(target.searchParams.get("x-vercel-set-bypass-cookie"), "true");
  assert.equal(go.headers.get("referrer-policy"), "no-referrer");

  gh.previews.set(head, { state: "ready", url: "https://evil.example", description: null });
  assert.equal((await open(`/p/${id}?path=/news`, await session())).status, 502, "the secret only goes to *.vercel.app");
  assert.equal((await open(`/p/${id}?path=//evil.example`, await session())).status, 404);
  assert.equal((await open(`/p/999`, await session())).status, 404);
});

test("the gateway needs the site's bypass secret", async () => {
  const { call, gh, app, session } = await setup({ PREVIEW_BYPASS_SECRET_CURA_AERO: "" });
  const c = await call("upload_image", { site: "cura.aero", folder: "news", name: "a", dataBase64: (await png()).toString("base64") });
  gh.previews.set((await gh.getPull(c.s.change_id))!.headSha, { state: "ready", url: "https://x.vercel.app", description: null });
  assert.equal((await app.fetch(new Request(`${HOST}/p/${c.s.change_id}`, { headers: { cookie: await session() } }))).status, 503);
});

test("the MCP endpoint: 401 challenge, host and origin checks, discovery", async () => {
  const { app } = await setup();
  const res = await app.fetch(new Request(`${HOST}/mcp`, { method: "POST", headers: { host: "mcp.example.com", "content-type": "application/json" }, body: "{}" }));
  assert.equal(res.status, 401);
  assert.match(res.headers.get("www-authenticate")!, /resource_metadata="https:\/\/mcp\.example\.com\/\.well-known\/oauth-protected-resource\/mcp"/);
  assert.match(res.headers.get("www-authenticate")!, /scope="websites"/);
  const badHost = await app.fetch(new Request(`${HOST}/mcp`, { method: "POST", headers: { host: "evil.example", "content-type": "application/json" }, body: "{}" }));
  assert.equal(badHost.status, 403);
  const badOrigin = await app.fetch(new Request(`${HOST}/mcp`, { method: "POST", headers: { host: "mcp.example.com", origin: "https://evil.example" }, body: "{}" }));
  assert.equal(badOrigin.status, 403);
  const prm = (await (await app.fetch(new Request(`${HOST}/.well-known/oauth-protected-resource/mcp`))).json()) as { resource: string };
  assert.equal(prm.resource, `${HOST}/mcp`);
  const as = (await (await app.fetch(new Request(`${HOST}/.well-known/oauth-authorization-server`))).json()) as { issuer: string };
  assert.equal(as.issuer, HOST);
});
