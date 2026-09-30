import { randomId, unseal } from "../auth/tokens.ts";
import { readSession, startBrowserSignIn, type AuthDeps } from "../auth/oauth.ts";
import type { ChangeService } from "../github/changes.ts";
import { ToolError } from "../guardrails/errors.ts";
import { MAX_INPUT_BYTES } from "../guardrails/images.ts";
import { commitImage } from "../mcp/tools.ts";
import { getSite } from "../sites/index.ts";
import { errorPage, esc, page, SECURITY_HEADERS } from "./html.ts";

/**
 * The one-time upload page (MCP-PLAN.md §9). The link's token names the site, change, folder,
 * file name and user; the page only opens for that user's Google session, and the upload is
 * committed straight to the change's branch through the same image pipeline as upload_image.
 */
type UploadToken = { site: string; changeId: number | null; folder: string; name: string; email: string; jti: string };
type UploadRecord = { status: "waiting" | "done"; email: string; changeId?: number; path?: string; expiresAt?: string };

async function openToken(request: Request, deps: AuthDeps, token: string) {
  const t = await unseal<UploadToken>(deps.cfg, "upload", token);
  if (!t) return { error: errorPage("Link expired", "This upload link expired or isn't valid. Ask Claude for a new one.", 410) };
  const user = await readSession(request, deps.cfg);
  if (!user) return { signIn: true as const, t };
  if (user.email !== t.email) return { error: errorPage("Not your link", "This upload link was made for someone else.", 403) };
  const rec = await deps.store.get<UploadRecord>(`upload:${t.jti}`);
  if (!rec) return { error: errorPage("Link expired", "This upload link expired. Ask Claude for a new one.", 410) };
  if (rec.status === "done") return { error: errorPage("Already uploaded", `This link was already used; the image is ${rec.path}.`, 409) };
  return { t, user };
}

export async function handleUploadPage(request: Request, deps: AuthDeps, token: string): Promise<Response> {
  const r = await openToken(request, deps, token);
  if ("error" in r) return r.error!;
  if ("signIn" in r) return startBrowserSignIn(deps, `/upload/${token}`);
  const body = `
    <h1>Upload an image</h1>
    <p>For <strong>${esc(r.t.site)}</strong>, stored as <code>${esc(r.t.folder)}/${esc(r.t.name)}</code>.</p>
    <p class="muted">JPEG, PNG, WebP or AVIF. Large photos are made smaller in your browser before uploading; the server then resizes them, removes location and camera data, and saves them as WebP.</p>
    <form id="upload" data-max="${MAX_INPUT_BYTES}">
      <input type="file" id="file" accept="image/jpeg,image/png,image/webp,image/avif,image/heic" required>
      <div class="row"><button class="primary" type="submit">Upload</button></div>
    </form>
    <p id="status" class="muted" role="status"></p>
    <img id="thumb" class="thumb" alt="" hidden>`;
  return page("Upload an image", body, { scripts: ["/upload.js"] });
}

export async function handleUploadPost(request: Request, deps: AuthDeps & { changes: ChangeService }, token: string): Promise<Response> {
  const json = (status: number, body: Record<string, unknown>) => Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
  const origin = request.headers.get("origin");
  if (origin !== new URL(deps.cfg.baseUrl).origin) return json(403, { error: "This upload must come from the upload page." });
  const r = await openToken(request, deps, token);
  if ("error" in r) return json(r.error!.status, { error: "This upload link can't be used. Ask Claude for a new one." });
  if ("signIn" in r) return json(401, { error: "Sign in again: reload the page." });
  const site = getSite(r.t.site);
  if (!site) return json(400, { error: "Unknown site." });

  const length = Number(request.headers.get("content-length") ?? "0");
  if (length > MAX_INPUT_BYTES) return json(413, { error: `The file is too large even after shrinking (limit ${MAX_INPUT_BYTES / 1024 / 1024} MB).` });
  const data = Buffer.from(await request.arrayBuffer());
  if (!(await deps.store.setOnce(`upload-used:${r.t.jti}`, 1800))) return json(409, { error: "This link is already being used." });

  const ctx = { cfg: deps.cfg, user: r.user, changes: deps.changes, store: deps.store, log: deps.log, requestId: randomId(8) };
  try {
    const out = await commitImage(ctx, site, { folder: r.t.folder, name: r.t.name, data, change_id: r.t.changeId, via: "upload_page" });
    await deps.store.set(`upload:${r.t.jti}`, { status: "done", email: r.user.email, changeId: out.change.changeId, path: out.path } satisfies UploadRecord, 24 * 3600);
    deps.log({ event: "upload", outcome: "ok", user: r.user.email, site: site.id, changeId: out.change.changeId, files: [out.path] });
    return json(200, { ok: true, path: out.path, change_id: out.change.changeId, width: out.width, height: out.height });
  } catch (e) {
    await deps.store.del(`upload-used:${r.t.jti}`); // let the user try another file
    if (e instanceof ToolError) {
      deps.log({ event: "upload", outcome: "refused", user: r.user.email, code: e.code, message: e.message });
      return json(400, { error: e.message });
    }
    deps.log({ event: "upload", outcome: "error", user: r.user.email, error: String((e as Error)?.stack ?? e).slice(0, 2000) });
    return json(500, { error: "Something went wrong on the server." });
  }
}

/** The upload page's script: shrink large photos in the browser, then POST the bytes. */
export const UPLOAD_JS = `(() => {
  const form = document.getElementById("upload");
  const input = document.getElementById("file");
  const status = document.getElementById("status");
  const thumb = document.getElementById("thumb");
  const max = Number(form.dataset.max);
  const ok = ["image/jpeg", "image/png", "image/webp", "image/avif"];
  async function shrink(file) {
    if (ok.includes(file.type) && file.size <= max) return file;
    let bitmap;
    try { bitmap = await createImageBitmap(file, { imageOrientation: "from-image" }); }
    catch { throw new Error("This browser can't read that file. Export it as JPEG or PNG and try again."); }
    const scale = Math.min(1, 3000 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext("2d").drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    for (const q of [0.9, 0.8, 0.7]) {
      const blob = await new Promise((r) => canvas.toBlob(r, "image/jpeg", q));
      if (blob && blob.size <= max) return blob;
    }
    throw new Error("The photo is too large even after shrinking.");
  }
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const file = input.files && input.files[0];
    if (!file) return;
    form.querySelector("button").disabled = true;
    status.textContent = "Preparing…";
    try {
      const body = await shrink(file);
      status.textContent = "Uploading…";
      const res = await fetch(location.pathname, { method: "POST", body, headers: { "Content-Type": body.type || "application/octet-stream" }, credentials: "same-origin" });
      const out = await res.json();
      if (!res.ok) throw new Error(out.error || "Upload failed.");
      status.textContent = "Done: saved as " + out.path + " (" + out.width + "×" + out.height + "). You can go back to Claude now.";
      thumb.src = URL.createObjectURL(file);
      thumb.hidden = false;
      form.hidden = true;
    } catch (err) {
      status.textContent = err.message;
      form.querySelector("button").disabled = false;
    }
  });
})();`;

export function uploadScript(): Response {
  return new Response(UPLOAD_JS, { headers: { "Content-Type": "text/javascript; charset=utf-8", ...SECURITY_HEADERS, "Cache-Control": "public, max-age=300" } });
}
