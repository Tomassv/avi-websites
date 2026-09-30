import { createHash } from "node:crypto";
import { parse as parseYaml, stringify as stringifyYaml } from "yaml";
import { randomId, seal } from "../auth/tokens.ts";
import type { BranchState, FileWrite } from "../github/changes.ts";
import { draftWarning } from "../guardrails/drafts.ts";
import { ToolError } from "../guardrails/errors.ts";
import { fieldKind, isReadOnly, validateField } from "../guardrails/fields.ts";
import { imageFileName, processImage } from "../guardrails/images.ts";
import { editJsonText } from "../guardrails/json-edit.ts";
import { checkSize, writablePath } from "../guardrails/paths.ts";
import { parsePointer, strings, type StringEdit } from "../guardrails/pointer.ts";
import { richChecker, type RichChecker } from "../guardrails/rich.ts";
import { buildSandbox, validateArticleFile, validateLandingFile } from "../guardrails/sandbox.ts";
import { SITES } from "../sites/index.ts";
import type { SiteConfig } from "../sites/types.ts";
import { done, siteOfChange, siteOrThrow, urlOf, type ToolContext } from "./context.ts";
import { buildGuide } from "./guide.ts";

/**
 * The tool handlers (MCP-PLAN.md §6). Each validates everything against the site's rules
 * before anything is committed, and ends its text with what Claude should do next.
 * src/mcp/server.ts registers them with their input schemas.
 */

const MAX_CONTENT_CHARS = 60_000;
const UPLOAD_TTL = 15 * 60;

// ── Shared helpers ──

async function readText(state: BranchState, path: string): Promise<string | null> {
  const buf = await state.read(path);
  return buf ? buf.toString("utf8") : null;
}

async function schemaText(site: SiteConfig, state: BranchState): Promise<string> {
  const p = site.capabilities.landing?.schema;
  const text = p ? await readText(state, p) : null;
  if (!text) throw new ToolError("rules_missing", `${site.id} has no landing schema, so its markup rules can't be checked`);
  return text;
}

async function richFor(site: SiteConfig, state: BranchState): Promise<RichChecker> {
  return richChecker(JSON.parse(await schemaText(site, state)));
}

async function sandboxFor(site: SiteConfig, state: BranchState, extraPaths: string[] = []): Promise<string> {
  return buildSandbox(site, { schemaText: await schemaText(site, state), paths: [...state.paths, ...extraPaths] });
}

function changeText(change: { changeId: number; prUrl: string }, created: boolean): string {
  return created ? `Started change ${change.changeId} (${change.prUrl}).` : `Added to change ${change.changeId}.`;
}

const previewNext = (id: number) => `call get_preview(change_id: ${id}) in about a minute to get the preview link. Pass change_id: ${id} to further edits so they share this preview.`;

function landingSlug(site: SiteConfig, slug: string): string {
  if (!site.rules.SLUG_RE.test(slug)) throw new ToolError("invalid_slug", `"${slug}" isn't a valid slug: use lowercase words joined by hyphens, like "spring-campaign"`);
  return slug;
}

/** New files may replace a file created earlier in the same change, never one that is live. */
async function assertNewFile(ctx: ToolContext, site: SiteConfig, state: BranchState, path: string): Promise<void> {
  if (!state.paths.has(path)) return;
  const main = await ctx.changes.mainState(site);
  if (main.paths.has(path)) throw new ToolError("already_exists", `${path} already exists on the live site; edit it instead of creating it`);
}

// ── Read tools ──

export async function listSites(ctx: ToolContext) {
  const sites = Object.values(SITES).map((s) => ({
    site: s.id,
    name: s.name,
    productionUrl: s.productionUrl,
    capabilities: [s.capabilities.pages && "pages", s.capabilities.landing && "landing", s.capabilities.articles && "articles", "images"].filter(Boolean),
  }));
  return done({ sites, user: { email: ctx.user.email, name: ctx.user.name } }, `Signed in as ${ctx.user.name} (${ctx.user.email}).\n${sites.map((s) => `- ${s.site}: ${s.name}, ${s.productionUrl}`).join("\n")}`, "call get_site_guide(site) before making changes to a site.");
}

const guideCache = new Map<string, string>();

export async function getSiteGuide(ctx: ToolContext, a: { site: string }) {
  const site = siteOrThrow(a.site);
  const main = await ctx.changes.mainState(site);
  const readmeBuf = await main.read(site.guide.readme);
  const schemaPath = site.capabilities.landing?.schema;
  const schemaBuf = schemaPath ? await main.read(schemaPath) : null;
  const key = createHash("sha256").update(readmeBuf ?? "").update("\0").update(schemaBuf ?? "").digest("hex");
  let guide = guideCache.get(key);
  if (!guide) {
    guide = buildGuide(site, readmeBuf?.toString("utf8") ?? "", schemaBuf ? JSON.parse(schemaBuf.toString("utf8")) : null);
    guideCache.set(key, guide);
  }
  return done({ site: site.id, guide }, guide, "use list_pages to find what to edit, or create a landing page or article.");
}

type PageEntry = { id: string; kind: "page" | "landing" | "article" | "shared"; file: string; url: string | null; title: string | null; draft?: boolean; internal?: boolean };

export async function listPages(ctx: ToolContext, a: { site: string; change_id?: number }) {
  const site = siteOrThrow(a.site);
  const state = await ctx.changes.branchState(site, a.change_id);
  const { pages, landing, articles, shared } = site.capabilities;
  const files = [...state.paths].sort();
  const entries: Promise<PageEntry>[] = [];
  const inDir = (dir: string, ext: string) => files.filter((f) => f.startsWith(`${dir}/`) && f.endsWith(ext) && !f.slice(dir.length + 1).includes("/"));
  const internalNames = new Set(
    files.flatMap((f) => site.internalRouteGroups.flatMap((g) => (f.startsWith(`app/${g}/`) && f.endsWith("/page.tsx") ? [f.split("/")[2]] : []))),
  );
  const jsonTitle = async (f: string) => {
    try {
      const doc = JSON.parse((await readText(state, f)) ?? "{}");
      return { title: typeof doc?.seo?.title === "string" ? doc.seo.title : null, draft: typeof doc.draft === "boolean" ? doc.draft : undefined };
    } catch {
      return { title: null, draft: undefined };
    }
  };
  if (pages) for (const f of inDir(pages.dir, ".json")) {
    const id = f.slice(pages.dir.length + 1, -5);
    entries.push(jsonTitle(f).then((t) => ({ id, kind: "page", file: f, url: urlOf(site, f), title: t.title, ...(internalNames.has(id) ? { internal: true } : {}) })));
  }
  if (landing) {
    for (const f of inDir(landing.dir, ".json")) entries.push(jsonTitle(f).then((t) => ({ id: f.slice(landing.dir.length + 1, -5), kind: "landing", file: f, url: urlOf(site, f), title: t.title, draft: t.draft })));
    if (landing.catalogFile && state.paths.has(landing.catalogFile)) entries.push(Promise.resolve({ id: "landing-catalog", kind: "landing", file: landing.catalogFile, url: urlOf(site, landing.catalogFile), title: "Section catalog", draft: true }));
  }
  if (articles) for (const f of inDir(articles.dir, ".md")) {
    entries.push(
      readText(state, f).then((src) => {
        const m = /^---\r?\n([\s\S]*?)\r?\n---/.exec(src ?? "");
        let fm: Record<string, unknown> = {};
        try {
          fm = (m ? parseYaml(m[1]) : {}) ?? {};
        } catch {
          // shown without a title
        }
        return { id: f.slice(articles.dir.length + 1, -3), kind: "article" as const, file: f, url: urlOf(site, f), title: typeof fm.title === "string" ? fm.title : null, draft: fm.draft === true };
      }),
    );
  }
  if (shared) {
    for (const d of shared.dirs) for (const f of inDir(d, ".json")) entries.push(Promise.resolve({ id: f, kind: "shared", file: f, url: null, title: null }));
    for (const f of shared.files) if (state.paths.has(f)) entries.push(Promise.resolve({ id: f, kind: "shared", file: f, url: null, title: null }));
  }
  const list = await Promise.all(entries);
  const text = list.map((p) => `- ${p.kind} \`${p.file}\`${p.url ? ` → ${p.url}` : ""}${p.title ? ` "${p.title}"` : ""}${p.draft ? " (draft)" : ""}${p.internal ? " (internal, behind a password)" : ""}`).join("\n");
  return done({ site: site.id, ref: a.change_id ?? "main", pages: list }, text, "call get_page_content(site, file) for the page to edit.");
}

export async function getPageContent(ctx: ToolContext, a: { site: string; file: string; change_id?: number }) {
  const site = siteOrThrow(a.site);
  const { path } = writablePath(site, a.file);
  const state = await ctx.changes.branchState(site, a.change_id);
  const text = await readText(state, path);
  if (text === null) throw new ToolError("not_found", `${path} doesn't exist${a.change_id ? ` in change ${a.change_id}` : ""}`);
  const url = urlOf(site, path);
  if (path.endsWith(".md")) {
    const m = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/.exec(text);
    const frontmatter = m ? parseYaml(m[1]) : null;
    const body = m ? m[2] : text;
    return done(
      { site: site.id, file: path, url, kind: "article", frontmatter, body, bodySha256: createHash("sha256").update(body).digest("hex") },
      `${path}${url ? ` (${url})` : ""}\n\nFrontmatter: ${JSON.stringify(frontmatter)}\n\n${body.slice(0, MAX_CONTENT_CHARS)}`,
      "to change it, call update_article with the fields to change; to replace the body, also pass oldBodySha256.",
    );
  }
  const doc = JSON.parse(text);
  const editable = [...strings(doc)]
    .filter((s) => !isReadOnly(site, path, s.pointer))
    .map((s) => ({ pointer: s.pointer, value: s.value, type: fieldKind(site, s.segments) }));
  const truncated = text.length > MAX_CONTENT_CHARS;
  const lines = editable.map((e) => `${e.pointer} [${e.type}]: ${JSON.stringify(e.value)}`).join("\n");
  return done(
    { site: site.id, file: path, url, kind: "json", editable, ...(truncated ? { contentTruncated: true } : { content: doc }) },
    `${path}${url ? ` (${url})` : ""}: ${editable.length} editable text values.\n\n${lines}`,
    "call update_text with the pointer, its current value as oldValue, and the new value.",
  );
}

// ── Write tools ──

export async function updateText(ctx: ToolContext, a: { site: string; file: string; edits: StringEdit[]; summary: string; change_id?: number }) {
  const site = siteOrThrow(a.site);
  const { path } = writablePath(site, a.file);
  if (!path.endsWith(".json")) throw new ToolError("not_json", "update_text edits JSON content files; use update_article for articles");
  const state = await ctx.changes.branchState(site, a.change_id);
  const source = await readText(state, path);
  if (source === null) throw new ToolError("not_found", `${path} doesn't exist; update_text only changes existing text`);
  for (const e of a.edits) {
    if (isReadOnly(site, path, e.pointer)) throw new ToolError("read_only", `${e.pointer} in ${path} can't be edited (it's generated or technical)`);
  }
  const { text, doc } = editJsonText(source, a.edits);
  const rich = await richFor(site, state);
  const fileExists = (p: string) => state.paths.has(p);
  for (const e of a.edits) validateField(site, fieldKind(site, parsePointer(e.pointer)), e.pointer, e.newValue, { rich, fileExists });

  const landing = site.capabilities.landing;
  const name = path.slice(path.lastIndexOf("/") + 1, -5);
  if (landing && (path.startsWith(`${landing.dir}/`) || path === landing.catalogFile)) {
    validateLandingFile(site, await sandboxFor(site, state), text, path === landing.catalogFile ? "landing-catalog" : name, path, path === landing.catalogFile);
  } else {
    for (const s of strings(doc)) {
      if (!rich.tagsAllowed(s.value)) throw new ToolError("invalid_value", `${s.pointer}: markup outside the whitelist`);
    }
  }
  checkSize(path, Buffer.byteLength(text));
  const change = await ctx.changes.write({
    state,
    user: ctx.user,
    summary: a.summary,
    tool: "update_text",
    files: [{ path, content: Buffer.from(text) }],
    comment: `${a.edits.length} text value(s) in \`${path}\`: ${a.edits.map((e) => e.pointer).join(", ")}`,
  });
  return done(
    { change_id: change.changeId, prUrl: change.prUrl, branch: change.branch, file: path, applied: a.edits.length },
    `${changeText(change, !a.change_id)} Updated ${a.edits.length} value(s) in ${path}.`,
    previewNext(change.changeId),
  );
}

type ArticleFields = { title?: string; description?: string; date?: string; author?: string; image?: string; draft?: boolean };

function articleSource(fields: ArticleFields & { draft: boolean }, body: string): string {
  const fm: Record<string, unknown> = { title: fields.title, description: fields.description, date: fields.date };
  if (fields.author) fm.author = fields.author;
  if (fields.image) fm.image = fields.image;
  fm.draft = fields.draft;
  return `---\n${stringifyYaml(fm, { lineWidth: 0 }).trimEnd()}\n---\n\n${body.replace(/^\s+/, "").trimEnd()}\n`;
}

async function checkArticle(ctx: ToolContext, site: SiteConfig, state: BranchState, slug: string, path: string, source: string, image?: string) {
  if (image && !state.paths.has(`public${image}`)) throw new ToolError("invalid_value", `image: ${image} doesn't exist; upload it first`);
  checkSize(path, Buffer.byteLength(source));
  return validateArticleFile(site, source, slug, path);
}

export async function createArticle(ctx: ToolContext, a: ArticleFields & { site: string; slug: string; title: string; description: string; date: string; body: string; draft?: boolean; change_id?: number }) {
  const site = siteOrThrow(a.site);
  const articles = site.capabilities.articles;
  if (!articles) throw new ToolError("unsupported", `${site.id} has no articles`);
  const slug = landingSlug(site, a.slug);
  const { path } = writablePath(site, `${articles.dir}/${slug}.md`);
  const state = await ctx.changes.branchState(site, a.change_id);
  await assertNewFile(ctx, site, state, path);
  const draft = a.draft ?? false;
  const source = articleSource({ ...a, draft }, a.body);
  await checkArticle(ctx, site, state, slug, path, source, a.image);
  const change = await ctx.changes.write({ state, user: ctx.user, summary: a.change_id ? `Article: ${a.title}` : `New article: ${a.title}`, tool: "create_article", files: [{ path, content: Buffer.from(source) }], comment: `article \`${path}\`${draft ? " (draft)" : ""}` });
  const url = urlOf(site, path);
  return done(
    { change_id: change.changeId, prUrl: change.prUrl, file: path, url, draft },
    `${changeText(change, !a.change_id)} Wrote ${path} (${url}).${draft ? " It's a draft, so it won't be visible on the live site after publishing." : ""}`,
    previewNext(change.changeId),
  );
}

export async function updateArticle(ctx: ToolContext, a: ArticleFields & { site: string; slug: string; body?: string; oldBodySha256?: string; summary: string; change_id?: number }) {
  const site = siteOrThrow(a.site);
  const articles = site.capabilities.articles;
  if (!articles) throw new ToolError("unsupported", `${site.id} has no articles`);
  const slug = landingSlug(site, a.slug);
  const { path } = writablePath(site, `${articles.dir}/${slug}.md`);
  const state = await ctx.changes.branchState(site, a.change_id);
  const current = await readText(state, path);
  if (current === null) throw new ToolError("not_found", `${path} doesn't exist; use create_article`);
  const m = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/.exec(current);
  if (!m) throw new ToolError("invalid_article", `${path} has no frontmatter`);
  const fm = (parseYaml(m[1]) ?? {}) as ArticleFields;
  let body = m[2];
  if (a.body !== undefined) {
    const sha = createHash("sha256").update(body).digest("hex");
    if (a.oldBodySha256 !== sha) throw new ToolError("stale_value", "the article body changed since you read it (oldBodySha256 doesn't match); call get_page_content again");
    body = a.body;
  }
  const merged = { ...fm, ...Object.fromEntries(Object.entries({ title: a.title, description: a.description, date: a.date, author: a.author, image: a.image, draft: a.draft }).filter(([, v]) => v !== undefined)) };
  const source = articleSource({ ...merged, draft: merged.draft ?? false }, body);
  await checkArticle(ctx, site, state, slug, path, source, merged.image);
  const change = await ctx.changes.write({ state, user: ctx.user, summary: a.summary, tool: "update_article", files: [{ path, content: Buffer.from(source) }], comment: `article \`${path}\`` });
  return done({ change_id: change.changeId, prUrl: change.prUrl, file: path, url: urlOf(site, path) }, `${changeText(change, !a.change_id)} Updated ${path}.`, previewNext(change.changeId));
}

export async function createLandingPage(ctx: ToolContext, a: { site: string; slug: string; page: Record<string, unknown>; change_id?: number }) {
  const site = siteOrThrow(a.site);
  const landing = site.capabilities.landing;
  if (!landing) throw new ToolError("unsupported", `${site.id} has no landing pages`);
  const slug = landingSlug(site, a.slug);
  const { path } = writablePath(site, `${landing.dir}/${slug}.json`);
  const state = await ctx.changes.branchState(site, a.change_id);
  await assertNewFile(ctx, site, state, path);
  const page = { ...a.page, draft: typeof a.page.draft === "boolean" ? a.page.draft : false };
  const source = JSON.stringify(page, null, 2) + "\n";
  checkSize(path, Buffer.byteLength(source));
  validateLandingFile(site, await sandboxFor(site, state), source, slug, path);
  const change = await ctx.changes.write({ state, user: ctx.user, summary: a.change_id ? `Landing page /${slug}` : `New landing page /${slug}`, tool: "create_landing_page", files: [{ path, content: Buffer.from(source) }], comment: `landing page \`${path}\`${page.draft ? " (draft)" : ""}` });
  const url = urlOf(site, path);
  return done(
    { change_id: change.changeId, prUrl: change.prUrl, file: path, url, draft: page.draft },
    `${changeText(change, !a.change_id)} Wrote ${path}, served at ${url}.${page.draft ? " It's a draft, so it won't be visible on the live site after publishing." : " Publishing will make it live."}`,
    previewNext(change.changeId),
  );
}

/** "landing/<slug>" or "news" → the site folder, e.g. public/images/landing/spring. */
function imageFolder(site: SiteConfig, folder: string): string {
  const m = /^landing\/(.+)$/.exec(folder);
  if (m && site.imageFolders.landing) return site.imageFolders.landing.replace("{slug}", landingSlug(site, m[1]));
  if (folder === "news" && site.imageFolders.news) return site.imageFolders.news;
  throw new ToolError("invalid_folder", `folder must be ${[site.imageFolders.landing && '"landing/<slug>"', site.imageFolders.news && '"news"'].filter(Boolean).join(" or ")}`);
}

/** Processes and commits one image. Shared by upload_image and the upload page. */
export async function commitImage(ctx: ToolContext, site: SiteConfig, p: { folder: string; name: string; data: Buffer; change_id?: number | null; via: string }) {
  const folder = imageFolder(site, p.folder);
  const file = imageFileName(p.name);
  const { path } = writablePath(site, `${folder}/${file}`);
  const state = await ctx.changes.branchState(site, p.change_id ?? undefined);
  if (state.paths.has(path)) throw new ToolError("already_exists", `${path} already exists; choose another name`);
  const img = await processImage(p.data);
  checkSize(path, img.bytes);
  const files: FileWrite[] = [{ path, content: img.data }];
  const change = await ctx.changes.write({ state, user: ctx.user, summary: p.change_id ? `Image ${file}` : `New image ${file}`, tool: p.via, files, comment: `image \`${path}\` (${img.width}×${img.height}, ${Math.round(img.bytes / 1024)} KB)` });
  return { change, path: urlOf(site, path)!, width: img.width, height: img.height, bytes: img.bytes };
}

export async function uploadImage(ctx: ToolContext, a: { site: string; folder: string; name: string; dataBase64: string; change_id?: number }) {
  const site = siteOrThrow(a.site);
  const b64 = a.dataBase64.replace(/^data:[a-z/+.-]+;base64,/i, "").replace(/\s+/g, "");
  if (!/^[A-Za-z0-9+/]*={0,2}$/.test(b64)) throw new ToolError("invalid_image", "dataBase64 isn't base64");
  const r = await commitImage(ctx, site, { folder: a.folder, name: a.name, data: Buffer.from(b64, "base64"), change_id: a.change_id, via: "upload_image" });
  return done(
    { change_id: r.change.changeId, prUrl: r.change.prUrl, path: r.path, width: r.width, height: r.height, bytes: r.bytes },
    `${changeText(r.change, !a.change_id)} Uploaded ${r.path} (${r.width}×${r.height}).`,
    `use "${r.path}" as the image src, and pass change_id: ${r.change.changeId} to the next edit.`,
  );
}

export async function getImageUploadLink(ctx: ToolContext, a: { site: string; folder: string; name: string; change_id?: number }) {
  const site = siteOrThrow(a.site);
  const folder = imageFolder(site, a.folder);
  const file = imageFileName(a.name);
  const { path } = writablePath(site, `${folder}/${file}`);
  if (a.change_id !== undefined) await ctx.changes.branchState(site, a.change_id); // checks the change
  const jti = randomId();
  const token = await seal(ctx.cfg, "upload", { site: site.id, changeId: a.change_id ?? null, folder: a.folder, name: file, email: ctx.user.email, jti }, UPLOAD_TTL);
  const expiresAt = new Date(Date.now() + UPLOAD_TTL * 1000).toISOString();
  await ctx.store.set(`upload:${jti}`, { status: "waiting", email: ctx.user.email, expiresAt }, UPLOAD_TTL + 300);
  const uploadUrl = `${ctx.cfg.baseUrl}/upload/${token}`;
  const imagePath = urlOf(site, path)!;
  return done(
    { upload_id: jti, uploadUrl, expiresAt, path: imagePath, change_id: a.change_id ?? null },
    `Upload link (valid 15 minutes, one use, only for ${ctx.user.email}): ${uploadUrl}\nThe image will be stored as ${imagePath}.`,
    `give the user the link. When they say it's uploaded, call check_upload(upload_id: "${jti}") to get the change_id, then use "${imagePath}" as the image src.`,
  );
}

export async function checkUpload(ctx: ToolContext, a: { upload_id: string }) {
  const rec = await ctx.store.get<{ status: string; email: string; changeId?: number; path?: string; expiresAt?: string }>(`upload:${a.upload_id}`);
  if (!rec || rec.email !== ctx.user.email) throw new ToolError("upload_not_found", "this upload link expired or doesn't exist; create a new one");
  if (rec.status !== "done") {
    return done({ status: "waiting", expiresAt: rec.expiresAt }, "The image hasn't been uploaded yet.", "ask the user to finish the upload, then check again.");
  }
  return done({ status: "done", change_id: rec.changeId, path: rec.path }, `Uploaded ${rec.path} in change ${rec.changeId}.`, `use "${rec.path}" as the image src and pass change_id: ${rec.changeId} to the next edit.`);
}

// ── Change tools ──

function liveUrls(site: SiteConfig, files: string[]): string[] {
  return [
    ...new Set(
      files
        .map((f) => (f.startsWith(`${site.root}/`) ? urlOf(site, f.slice(site.root.length + 1)) : null))
        .filter((u): u is string => Boolean(u) && !u!.startsWith("/images/"))
        .map((u) => `${site.productionUrl}${u === "/" ? "/" : u}`),
    ),
  ];
}

export async function getPreview(ctx: ToolContext, a: { change_id: number; path?: string }) {
  const site = await siteOfChange(ctx, a.change_id);
  const { result, status } = await ctx.changes.gates(site, a.change_id);
  const pagePaths = status.files.map((f) => (f.startsWith(`${site.root}/`) ? urlOf(site, f.slice(site.root.length + 1)) : null)).filter((u) => u && !u.startsWith("/images/"));
  const path = a.path ?? pagePaths[0] ?? "/";
  const previewLink = `${ctx.cfg.baseUrl}/p/${a.change_id}?path=${encodeURIComponent(path)}`;
  const warning = draftWarning(status.drafts);
  const files = status.files.map((f) => (f.startsWith(`${site.root}/`) ? f.slice(site.root.length + 1) : f));
  const lines = [
    `Change ${a.change_id}: preview ${status.state}.`,
    status.state === "ready" ? `Preview: ${previewLink} (the user signs in with Google to open it)` : "",
    `Files: ${files.join(", ")}`,
    warning ?? "",
    result.ok ? "Ready to publish." : `Not publishable yet: ${result.failures.map((f) => f.message).join("; ")}.`,
    ...result.notes,
  ].filter(Boolean);
  const next =
    status.state === "ready"
      ? result.ok
        ? "give the user the preview link. When they approve, call publish(change_id, confirm: true)."
        : status.approval === "required"
          ? `give the user the preview link. Publishing needs an approving review on ${status.pr.htmlUrl}.`
          : "give the user the preview link, and explain what blocks publishing."
      : status.state === "failed"
        ? "the site's build failed for this change. Tell the user; a content problem the checks missed may need fixing (edit again in the same change) or a developer."
        : "the preview is still building; call get_preview again in about a minute.";
  return done(
    {
      change_id: a.change_id,
      site: site.id,
      state: status.state,
      headSha: status.headSha,
      previewLink: status.state === "ready" ? previewLink : null,
      files,
      checks: status.checks,
      approval: status.approval,
      drafts: status.drafts,
      draftWarning: warning,
      publishable: result.ok,
      reasons: result.failures.map((f) => f.message),
    },
    lines.join("\n"),
    next,
  );
}

export async function publish(ctx: ToolContext, a: { change_id: number; confirm: true }) {
  const site = await siteOfChange(ctx, a.change_id);
  const r = await ctx.changes.publish(site, ctx.user, a.change_id);
  const warning = draftWarning(r.status.drafts);
  if (!r.published) {
    throw new ToolError(
      "not_publishable",
      `Change ${a.change_id} can't be published yet: ${r.result.failures.map((f) => f.message).join("; ")}.${warning ? ` Also note: ${warning}` : ""}`,
      { failures: r.result.failures, drafts: r.status.drafts },
    );
  }
  const urls = liveUrls(site, r.status.files);
  return done(
    { change_id: a.change_id, published: true, mergedSha: r.mergedSha, liveUrls: urls, drafts: r.status.drafts, draftWarning: warning },
    `Published change ${a.change_id}. The live site updates in 1–2 minutes: ${urls.join(", ") || site.productionUrl}.${warning ? `\n${warning}` : ""}`,
    `tell the user it's published. If it needs to be reverted, call undo(change_id: ${a.change_id}).`,
  );
}

export async function undo(ctx: ToolContext, a: { change_id: number }) {
  const site = await siteOfChange(ctx, a.change_id);
  const change = await ctx.changes.undo(site, ctx.user, a.change_id);
  return done(
    { change_id: change.changeId, prUrl: change.prUrl, revertsChange: a.change_id },
    `Started change ${change.changeId}, which reverts change ${a.change_id}. Nothing is live yet.`,
    `call get_preview(change_id: ${change.changeId}), then publish it to apply the undo.`,
  );
}

export async function discardChange(ctx: ToolContext, a: { change_id: number; confirm: true }) {
  const site = await siteOfChange(ctx, a.change_id);
  await ctx.changes.discard(site, ctx.user, a.change_id);
  return done({ change_id: a.change_id, discarded: true }, `Discarded change ${a.change_id}. Nothing was published.`, "start a new change if needed.");
}

export async function listChanges(ctx: ToolContext, a: { site?: string; state?: "open" | "published" | "all"; mine?: boolean; limit?: number }) {
  const site = a.site ? siteOrThrow(a.site) : undefined;
  const items = await ctx.changes.list({ site, state: a.state ?? "open", mine: a.mine ? ctx.user.email : undefined, limit: Math.min(a.limit ?? 20, 30) });
  const changes = items.map(({ pr, meta }) => ({
    change_id: pr.number,
    title: pr.title,
    site: pr.labels.find((l) => l.startsWith("site:"))?.slice(5) ?? null,
    author: meta.createdBy ?? null,
    state: pr.merged ? "published" : pr.state === "open" ? "open" : "discarded",
    createdAt: pr.createdAt,
    updatedAt: pr.updatedAt,
    prUrl: pr.htmlUrl,
  }));
  const text = changes.length ? changes.map((c) => `- ${c.change_id} [${c.state}] ${c.title} (${c.author ?? "?"}, ${c.updatedAt.slice(0, 10)})`).join("\n") : "No changes.";
  return done({ changes }, text, "call get_preview(change_id) for a change's preview and status.");
}

