import { readSession, startBrowserSignIn, type AuthDeps } from "../auth/oauth.ts";
import type { ChangeService } from "../github/changes.ts";
import { ToolError } from "../guardrails/errors.ts";
import { getSite } from "../sites/index.ts";
import { errorPage, esc, page, redirect } from "./html.ts";

/**
 * The preview gateway (MCP-PLAN.md §8): /p/<change>?path=/page. The visitor signs in with
 * Google (same allowlist), then is sent to the change's Vercel preview with the site's
 * bypass secret; Vercel sets its bypass cookie and redirects to the plain URL.
 */
const SAFE_PATH = /^\/(?!\/)[A-Za-z0-9\-._~/%]*$/;

/** Only Vercel preview hosts ever receive the bypass secret. */
export function isPreviewHost(url: string): boolean {
  try {
    const u = new URL(url);
    return u.protocol === "https:" && u.hostname.endsWith(".vercel.app") && !u.username && !u.password && !u.port;
  } catch {
    return false;
  }
}

export async function handlePreview(request: Request, deps: AuthDeps & { changes: ChangeService }, changeParam: string): Promise<Response> {
  const url = new URL(request.url);
  const changeId = Number(changeParam);
  if (!Number.isInteger(changeId) || changeId <= 0) return errorPage("Not found", "This preview link isn't valid.", 404);
  const path = url.searchParams.get("path") || "/";
  if (!SAFE_PATH.test(path)) return errorPage("Not found", "This preview link isn't valid.", 404);

  const user = await readSession(request, deps.cfg);
  if (!user) return startBrowserSignIn(deps, `/p/${changeId}?path=${encodeURIComponent(path)}`);

  const siteId = await deps.changes.siteIdOf(changeId);
  const site = siteId ? getSite(siteId) : undefined;
  if (!site) return errorPage("Not found", `Change ${changeId} doesn't exist.`, 404);
  let status;
  try {
    status = await deps.changes.status(site, changeId);
  } catch (e) {
    if (e instanceof ToolError) return errorPage("Not found", e.message, 404);
    throw e;
  }
  if (status.state !== "ready" || !status.url) {
    const msg = status.state === "failed" ? "The preview build failed. Ask Claude about it." : "The preview is still being built. This page refreshes itself.";
    return page("Preview", `<h1>Change ${changeId}</h1><p>${esc(msg)}</p>`, { headers: status.state === "failed" ? {} : { Refresh: "20" } });
  }
  const secret = deps.cfg.env[site.vercel.bypassSecretEnv];
  if (!secret) return errorPage("Preview unavailable", "Preview access isn't configured for this site yet.", 503);
  if (!isPreviewHost(status.url)) return errorPage("Preview unavailable", "The preview address isn't a Vercel preview.", 502);

  deps.log({ event: "preview_opened", user: user.email, site: site.id, changeId, path });
  const target = new URL(path, status.url);
  target.searchParams.set("x-vercel-protection-bypass", secret);
  target.searchParams.set("x-vercel-set-bypass-cookie", "true");
  return redirect(target.toString());
}
