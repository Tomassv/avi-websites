import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { changeService } from "../src/github/changes.ts";
import { memoryRepo, readCheckout, BOT } from "../src/github/memory.ts";
import { readTrailer, verifyCommitSignature } from "../src/guardrails/signature.ts";
import { ToolError } from "../src/guardrails/errors.ts";
import { testConfig } from "./helpers/config.ts";
import { site } from "./helpers/site.ts";

const repoRoot = path.resolve(import.meta.dirname, "../..");
const checkout = Object.fromEntries(Object.entries(readCheckout(repoRoot)).filter(([p]) => p.startsWith("sites/cura.aero/")));
const jane = { sub: "1", email: "jane@avilabs.is", name: "Jane Doe" };
const bob = { sub: "2", email: "bob@avilabs.is", name: "Bob" };

function setup(over: Record<string, string> = {}) {
  const gh = memoryRepo(checkout);
  const cfg = testConfig(over);
  const svc = changeService({ cfg, gh, log: () => {} });
  return { gh, cfg, svc };
}

const code = (c: string) => (e: unknown) => e instanceof ToolError && e.code === c;

async function edit(svc: ReturnType<typeof setup>["svc"], changeId: number | undefined, text: string, user = jane, file = "content/pages/home.json") {
  const state = await svc.branchState(site, changeId);
  const doc = JSON.parse((await state.read(file))!.toString());
  doc.hero.title = text;
  return svc.write({ state, user, summary: `Hero: ${text}`, tool: "update_text", files: [{ path: file, content: Buffer.from(JSON.stringify(doc, null, 2)) }], comment: "1 string" });
}

test("a new change is a signed commit on an mcp/ branch with a labelled PR", async () => {
  const { gh, cfg, svc } = setup();
  const mainBefore = await gh.getBranchSha("main");
  const change = await edit(svc, undefined, "New hero");
  assert.match(change.branch, /^mcp\/cura-aero\/\d{8}-hero-new-hero-[0-9a-f]{4}$/);
  const pr = (await gh.getPull(change.changeId))!;
  assert.deepEqual(pr.labels, ["mcp", "site:cura.aero"]);
  assert.equal(pr.title, "[cura.aero] Hero: New hero");
  assert.match(pr.body, /<!-- mcp:\{"site":"cura.aero","createdBy":"jane@avilabs.is"\} -->/);
  const [commit] = await gh.listPullCommits(change.changeId);
  assert.deepEqual(commit.author, { name: "Jane Doe", email: "jane@avilabs.is" });
  assert.deepEqual(commit.committer, { name: BOT.name, email: BOT.email });
  assert.equal(readTrailer(commit.message, "Changed-Via"), "avi-websites-mcp (update_text)");
  assert.deepEqual(verifyCommitSignature(cfg.commitSigningKey, { ...commit, authorEmail: commit.author.email }), { ok: true });
  assert.equal(await gh.getBranchSha("main"), mainBefore, "main is never written by a change");
  assert.match(gh.comments.get(change.changeId)![0], /update_text\*\* by Jane Doe/);
});

test("later edits add commits to the same change; a concurrent edit is refused", async () => {
  const { gh, svc } = setup();
  const first = await edit(svc, undefined, "One");
  const second = await edit(svc, first.changeId, "Two", bob);
  assert.equal(second.branch, first.branch);
  assert.equal((await gh.listPullCommits(first.changeId)).length, 2);

  const stale = await svc.branchState(site, first.changeId);
  await edit(svc, first.changeId, "Three");
  await assert.rejects(
    svc.write({ state: stale, user: jane, summary: "late", tool: "update_text", files: [{ path: "content/pages/news.json", content: Buffer.from("{}") }], comment: "" }),
    code("change_moved"),
  );
});

test("the service itself refuses non-writable paths", async () => {
  const { svc } = setup();
  const state = await svc.branchState(site);
  for (const p of ["content/landing.schema.json", "lib/rich.ts", "package.json"]) {
    await assert.rejects(svc.write({ state, user: jane, summary: "x", tool: "t", files: [{ path: p, content: Buffer.from("x") }], comment: "" }), code("path_not_writable"), p);
  }
});

test("rules drift on main blocks every write", async () => {
  const { gh, svc } = setup();
  await gh.pushDirect("main", { "sites/cura.aero/lib/rich.ts": "// changed" }, "change rules", jane);
  await assert.rejects(edit(svc, undefined, "x"), code("rules_outdated"));
});

test("change ids are checked: other site, closed, published, missing", async () => {
  const { gh, svc } = setup();
  await assert.rejects(svc.branchState(site, 99), code("change_not_found"));
  const c = await edit(svc, undefined, "x");
  gh.pulls[0].labels = ["mcp", "site:avilabs.is"];
  await assert.rejects(svc.branchState(site, c.changeId), code("change_other_site"));
  gh.pulls[0].labels = ["mcp", "site:cura.aero"];
  await gh.closePull(c.changeId);
  await assert.rejects(svc.branchState(site, c.changeId), code("change_closed"));
});

test("publish: blocked until the preview is ready, then squash-merged with trailers", async () => {
  const { gh, svc } = setup();
  const c = await edit(svc, undefined, "Live hero");
  await edit(svc, c.changeId, "Live hero 2", bob);

  const early = await svc.publish(site, jane, c.changeId);
  assert.equal(early.published, false);
  assert.deepEqual(early.result.failures.map((f) => f.gate), [3]);

  const head = (await gh.getPull(c.changeId))!.headSha;
  gh.previews.set(head, { state: "ready", url: "https://cura-preview.vercel.app", description: null });
  const st = await svc.status(site, c.changeId);
  assert.equal(st.state, "ready");
  assert.equal(st.url, "https://cura-preview.vercel.app");

  const done = await svc.publish(site, jane, c.changeId);
  assert.equal(done.published, true);
  const main = await gh.getCommit((await gh.getBranchSha("main"))!);
  assert.equal(main.sha, (done as { mergedSha: string }).mergedSha);
  assert.match(main.message, /^\[cura\.aero\] Hero: Live hero \(#1\)/);
  assert.match(main.message, /Co-authored-by: Jane Doe <jane@avilabs\.is>\nCo-authored-by: Bob <bob@avilabs\.is>\nPublished-by: Jane Doe <jane@avilabs\.is>/);
  const home = JSON.parse((await gh.readFile("main", "sites/cura.aero/content/pages/home.json"))!.toString());
  assert.equal(home.hero.title, "Live hero 2");
  assert.equal(await gh.getBranchSha(c.branch), null, "the branch is deleted");
  const again = await svc.publish(site, jane, c.changeId);
  assert.match(again.result.failures[0].message, /already published/);
});

test("publish: a hand-pushed commit blocks the merge (gate 2)", async () => {
  const { gh, svc } = setup();
  const c = await edit(svc, undefined, "x");
  const sha = await gh.pushDirect(c.branch, { "sites/cura.aero/content/pages/news.json": "{}" }, "sneaky", jane);
  gh.previews.set(sha, { state: "ready", url: null, description: null });
  const r = await svc.publish(site, jane, c.changeId);
  assert.equal(r.published, false);
  assert.ok(r.result.failures.some((f) => f.gate === 2 && /no Mcp-Signature/.test(f.message)));
  const code2 = await gh.pushDirect(c.branch, { "sites/cura.aero/lib/rich.ts": "x" }, "code", jane);
  gh.previews.set(code2, { state: "ready", url: null, description: null });
  const r2 = await svc.publish(site, jane, c.changeId);
  assert.ok(r2.result.failures.some((f) => /lib\/rich\.ts/.test(f.message)));
});

test("publish: REQUIRE_APPROVAL waits for an approval of the current head", async () => {
  const { gh, svc } = setup({ REQUIRE_APPROVAL: "true" });
  const c = await edit(svc, undefined, "x");
  const head = (await gh.getPull(c.changeId))!.headSha;
  gh.previews.set(head, { state: "ready", url: null, description: null });
  assert.deepEqual((await svc.publish(site, jane, c.changeId)).result.failures.map((f) => f.gate), [5]);
  gh.reviews.set(c.changeId, [{ user: "dev", isBot: false, state: "APPROVED", commitId: "old", submittedAt: "" }]);
  assert.equal((await svc.publish(site, jane, c.changeId)).published, false, "approval of an older head");
  gh.reviews.set(c.changeId, [
    { user: "dev", isBot: false, state: "APPROVED", commitId: head, submittedAt: "" },
    { user: "lead", isBot: false, state: "CHANGES_REQUESTED", commitId: head, submittedAt: "" },
  ]);
  assert.equal((await svc.publish(site, jane, c.changeId)).published, false, "changes requested");
  gh.reviews.set(c.changeId, [{ user: "dev", isBot: false, state: "APPROVED", commitId: head, submittedAt: "" }]);
  assert.equal((await svc.status(site, c.changeId)).approval, "approved");
  assert.equal((await svc.publish(site, jane, c.changeId)).published, true);
});

test("a change that conflicts with main can't be published", async () => {
  const { gh, svc } = setup();
  const a = await edit(svc, undefined, "A");
  const b = await edit(svc, undefined, "B");
  for (const c of [a, b]) gh.previews.set((await gh.getPull(c.changeId))!.headSha, { state: "ready", url: null, description: null });
  assert.equal((await svc.publish(site, jane, a.changeId)).published, true);
  const r = await svc.publish(site, jane, b.changeId);
  assert.equal(r.published, false);
  assert.match(r.result.failures[0].message, /conflicts/);
});

test("drafts in a change are reported", async () => {
  const { svc } = setup();
  const state = await svc.branchState(site);
  const page = JSON.parse((await state.read("content/landing/claims-automation.json"))!.toString());
  const c = await svc.write({ state, user: jane, summary: "Spring page", tool: "create_landing_page", files: [{ path: "content/landing/spring.json", content: Buffer.from(JSON.stringify({ ...page, draft: true })) }], comment: "" });
  const st = await svc.status(site, c.changeId);
  assert.deepEqual(st.drafts, [{ file: "content/landing/spring.json", url: "/spring" }]);
});

test("undo restores the files as they were before publishing, as a new change", async () => {
  const { gh, svc } = setup();
  const before = (await gh.readFile("main", "sites/cura.aero/content/pages/home.json"))!.toString();
  const state = await svc.branchState(site);
  const c = await svc.write({
    state,
    user: jane,
    summary: "Hero and new article",
    tool: "update_text",
    files: [
      { path: "content/pages/home.json", content: Buffer.from(before.replace(/"Resolve Claims\./, '"Changed.')) },
      { path: "content/articles/new.md", content: Buffer.from("---\ntitle: x\n---\n") },
    ],
    comment: "",
  });
  gh.previews.set((await gh.getPull(c.changeId))!.headSha, { state: "ready", url: null, description: null });
  await svc.publish(site, jane, c.changeId);

  await assert.rejects(svc.undo(site, jane, 99), code("change_not_found"));
  const u = await svc.undo(site, bob, c.changeId);
  assert.equal(u.revertsChange, c.changeId);
  const branchHome = (await gh.readFile(u.branch, "sites/cura.aero/content/pages/home.json"))!.toString();
  assert.equal(branchHome, before);
  assert.equal(await gh.readFile(u.branch, "sites/cura.aero/content/articles/new.md"), null);
  assert.equal((await gh.getPull(u.changeId))!.title, "[cura.aero] Undo: Hero and new article");
  const [commit] = await gh.listPullCommits(u.changeId);
  assert.equal(commit.author.email, "bob@avilabs.is");
});

test("undo refuses when a file changed since publishing, and for unpublished changes", async () => {
  const { gh, svc } = setup();
  const c = await edit(svc, undefined, "First");
  await assert.rejects(svc.undo(site, jane, c.changeId), code("not_published"));
  gh.previews.set((await gh.getPull(c.changeId))!.headSha, { state: "ready", url: null, description: null });
  await svc.publish(site, jane, c.changeId);
  const later = await edit(svc, undefined, "Second");
  gh.previews.set((await gh.getPull(later.changeId))!.headSha, { state: "ready", url: null, description: null });
  await svc.publish(site, jane, later.changeId);
  await assert.rejects(svc.undo(site, jane, c.changeId), code("undo_conflict"));
});

test("discard closes the PR and deletes the branch; list filters by site, state and author", async () => {
  const { gh, svc } = setup();
  const a = await edit(svc, undefined, "A");
  const b = await edit(svc, undefined, "B", bob);
  assert.deepEqual((await svc.list({ site, state: "open", limit: 10 })).map((x) => x.pr.number), [b.changeId, a.changeId]);
  assert.deepEqual((await svc.list({ site, state: "open", mine: "bob@avilabs.is", limit: 10 })).map((x) => x.pr.number), [b.changeId]);
  await svc.discard(site, jane, a.changeId);
  assert.equal((await gh.getPull(a.changeId))!.state, "closed");
  assert.equal(await gh.getBranchSha(a.branch), null);
  assert.deepEqual((await svc.list({ site, state: "open", limit: 10 })).map((x) => x.pr.number), [b.changeId]);
  assert.deepEqual((await svc.list({ site, state: "published", limit: 10 })).length, 0);
});
