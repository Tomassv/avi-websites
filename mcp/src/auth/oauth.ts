import { randomBytes, timingSafeEqual } from "node:crypto";
import type { Config } from "../config.ts";
import type { Logger } from "../log.ts";
import type { Store } from "../store/store.ts";
import { errorPage, esc, hostCookie, page, readCookie, redirect } from "../web/html.ts";
import { checkAllowed, isListed } from "./allowlist.ts";
import { ClientError, registerClient, resolveClient, type Client, type FetchLike } from "./clients.ts";
import { pkceChallenge, type GoogleClient } from "./google.ts";
import { isLoopback, redirectAllowed } from "./redirects.ts";
import { newRefreshToken, parseRefreshToken, randomId, seal, signAccessToken, unseal, type User } from "./tokens.ts";

/**
 * The authorization server (MCP-PLAN.md §4). Claude is the OAuth client, this server issues the
 * tokens, and Google only tells us who the user is. Every handler takes a web-standard Request.
 */
export type AuthDeps = { cfg: Config; store: Store; log: Logger; fetch: FetchLike; google: GoogleClient };

export const SCOPE = "websites";
const SUPPORTED_SCOPES = new Set([SCOPE, "offline_access"]);
const CODE_TTL = 60;
const STATE_TTL = 600;
export const SESSION_TTL = 8 * 3600;

// ── Discovery ──

export function protectedResourceMetadata(cfg: Config) {
  return { resource: cfg.resource, authorization_servers: [cfg.baseUrl], scopes_supported: [SCOPE], bearer_methods_supported: ["header"] };
}

export function authorizationServerMetadata(cfg: Config) {
  return {
    issuer: cfg.baseUrl,
    authorization_endpoint: `${cfg.baseUrl}/authorize`,
    token_endpoint: `${cfg.baseUrl}/token`,
    registration_endpoint: `${cfg.baseUrl}/register`,
    response_types_supported: ["code"],
    grant_types_supported: ["authorization_code", "refresh_token"],
    code_challenge_methods_supported: ["S256"],
    token_endpoint_auth_methods_supported: ["none"],
    client_id_metadata_document_supported: true,
    authorization_response_iss_parameter_supported: true,
    scopes_supported: [SCOPE, "offline_access"],
  };
}

export function resourceMetadataUrl(cfg: Config): string {
  return `${cfg.baseUrl}/.well-known/oauth-protected-resource/mcp`;
}

// ── Authorization request ──

type AuthRequest = {
  clientId: string;
  clientName: string;
  clientHost: string;
  redirectUri: string;
  codeChallenge: string;
  state: string;
  scope: string;
};

function redirectWithError(redirectUri: string, error: string, state: string, cfg: Config, description?: string): Response {
  const u = new URL(redirectUri);
  u.searchParams.set("error", error);
  if (description) u.searchParams.set("error_description", description);
  if (state) u.searchParams.set("state", state);
  u.searchParams.set("iss", cfg.baseUrl);
  return redirect(u.toString());
}

async function readAuthRequest(deps: AuthDeps, p: URLSearchParams): Promise<{ ok: true; req: AuthRequest; client: Client } | { ok: false; response: Response }> {
  const { cfg } = deps;
  const clientId = p.get("client_id") ?? "";
  const redirectUri = p.get("redirect_uri") ?? "";
  let client: Client;
  try {
    client = await resolveClient(cfg, clientId, deps.fetch, (url) => deps.log({ event: "cimd_client", clientId: url }));
  } catch (e) {
    const msg = e instanceof ClientError ? e.message : "the client could not be identified";
    return { ok: false, response: errorPage("Can't connect", `This app couldn't be identified: ${msg}.`) };
  }
  // Until the redirect URI is validated, errors are shown here, never redirected (open redirect).
  if (!redirectAllowed(cfg, redirectUri, client.redirectUris)) {
    return { ok: false, response: errorPage("Can't connect", "The app asked to return to an address that isn't allowed.") };
  }
  const state = p.get("state") ?? "";
  const fail = (error: string, description: string) => ({ ok: false as const, response: redirectWithError(redirectUri, error, state, cfg, description) });
  if (p.get("response_type") !== "code") return fail("unsupported_response_type", "response_type must be code");
  const challenge = p.get("code_challenge") ?? "";
  if (p.get("code_challenge_method") !== "S256" || !/^[A-Za-z0-9_-]{43}$/.test(challenge)) return fail("invalid_request", "PKCE with S256 is required");
  if (p.get("resource") !== cfg.resource) return fail("invalid_target", `resource must be ${cfg.resource}`);
  const scopes = (p.get("scope") ?? SCOPE).split(/\s+/).filter(Boolean);
  if (!scopes.every((s) => SUPPORTED_SCOPES.has(s))) return fail("invalid_scope", `supported scopes: ${[...SUPPORTED_SCOPES].join(" ")}`);
  const scope = [...new Set([SCOPE, ...scopes])].join(" ");
  return {
    ok: true,
    client,
    req: { clientId, clientName: client.name, clientHost: client.host, redirectUri, codeChallenge: challenge, state, scope },
  };
}

/** GET /authorize: validate, then show the consent page (required for proxies, §4.3 step 2). */
export async function handleAuthorize(request: Request, deps: AuthDeps): Promise<Response> {
  const r = await readAuthRequest(deps, new URL(request.url).searchParams);
  if (!r.ok) return r.response;
  const { req, client } = r;
  const csrf = randomId();
  const tx = await seal(deps.cfg, "authreq", { req, csrf }, STATE_TTL);
  const redirectHost = new URL(req.redirectUri).host;
  const who = client.kind === "cimd" ? `<strong>${esc(client.host)}</strong>` : `<strong>${esc(req.clientName)}</strong> (a registered app)`;
  const loopback = isLoopback(req.redirectUri)
    ? `<p class="warn">This app runs on your own computer (it returns to <code>${esc(redirectHost)}</code>). Only continue if you just started it, for example Claude Code.</p>`
    : "";
  const body = `
    <h1>Connect to AviLabs websites</h1>
    <p>${who} wants to edit the AviLabs websites on your behalf: change text, add pages and images, preview and publish.</p>
    <p class="muted">After you continue you'll sign in with your ${esc(deps.cfg.allowedDomain)} Google account, then return to <code>${esc(redirectHost)}</code>.</p>
    ${loopback}
    <form method="post" action="/authorize" class="row">
      <input type="hidden" name="tx" value="${esc(tx)}">
      <input type="hidden" name="csrf" value="${esc(csrf)}">
      <button class="primary" name="decision" value="allow">Continue with Google</button>
      <button class="secondary" name="decision" value="deny">Cancel</button>
    </form>`;
  return page("Connect", body, { headers: { "Set-Cookie": hostCookie("mcp_csrf", csrf, STATE_TTL, "Strict") } });
}

function sameSecret(a: string | null, b: string | null): boolean {
  if (!a || !b) return false;
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

/** POST /authorize: the consent decision. On allow, go to Google. */
export async function handleConsent(request: Request, deps: AuthDeps): Promise<Response> {
  const form = await request.formData();
  const tx = await unseal<{ req: AuthRequest; csrf: string }>(deps.cfg, "authreq", String(form.get("tx") ?? ""));
  if (!tx) return errorPage("Sign-in expired", "This sign-in took too long. Start again from Claude.");
  const csrfField = String(form.get("csrf") ?? "");
  if (!sameSecret(csrfField, readCookie(request, "__Host-mcp_csrf")) || csrfField !== tx.csrf) {
    return errorPage("Can't continue", "The sign-in form couldn't be verified. Start again from Claude.");
  }
  const clear = hostCookie("mcp_csrf", "", 0, "Strict");
  if (form.get("decision") !== "allow") {
    return redirectWithError(tx.req.redirectUri, "access_denied", tx.req.state, deps.cfg, "the user declined");
  }
  return startGoogle(deps, { flow: "mcp", req: tx.req }, [clear]);
}

// ── Google ──

type GoogleState = { flow: "mcp"; req: AuthRequest } | { flow: "browser"; returnTo: string };

async function startGoogle(deps: AuthDeps, target: GoogleState, extraCookies: string[] = []): Promise<Response> {
  const verifier = randomBytes(32).toString("base64url");
  const nonce = randomId();
  const txid = randomId();
  const state = await seal(deps.cfg, "gstate", { target, verifier, nonce, txid }, STATE_TTL);
  const url = deps.google.authUrl({ state, codeChallenge: pkceChallenge(verifier), nonce });
  const res = redirect(url);
  for (const c of [...extraCookies, hostCookie("mcp_tx", txid, STATE_TTL)]) res.headers.append("Set-Cookie", c);
  return res;
}

/** Sends a browser (preview gateway, upload page) through Google sign-in, then back to `returnTo`. */
export async function startBrowserSignIn(deps: AuthDeps, returnTo: string): Promise<Response> {
  if (!/^\/(p|upload)\/[A-Za-z0-9._~%?=&/-]*$/.test(returnTo)) return errorPage("Can't sign in", "Invalid return address.");
  return startGoogle(deps, { flow: "browser", returnTo });
}

/** GET /auth/google/callback */
export async function handleGoogleCallback(request: Request, deps: AuthDeps): Promise<Response> {
  const { cfg, log } = deps;
  const p = new URL(request.url).searchParams;
  const st = await unseal<{ target: GoogleState; verifier: string; nonce: string; txid: string }>(cfg, "gstate", p.get("state"));
  if (!st) return errorPage("Sign-in expired", "This sign-in took too long or was started elsewhere. Start again.");
  if (!sameSecret(st.txid, readCookie(request, "__Host-mcp_tx"))) {
    return errorPage("Can't continue", "This sign-in was started in a different browser. Start again.");
  }
  const clearTx = hostCookie("mcp_tx", "", 0);
  const target = st.target;
  if (p.get("error") || !p.get("code")) {
    if (target.flow === "mcp") return redirectWithError(target.req.redirectUri, "access_denied", target.req.state, cfg, "Google sign-in was cancelled");
    return errorPage("Sign-in cancelled", "Google sign-in was cancelled.");
  }

  let profile;
  try {
    profile = await deps.google.exchange(p.get("code")!, st.verifier);
  } catch {
    log({ event: "signin", outcome: "error", reason: "google exchange failed" });
    return errorPage("Sign-in failed", "Google sign-in couldn't be completed. Try again.", 502);
  }
  if (profile.nonce !== st.nonce) return errorPage("Sign-in failed", "The Google response didn't match this sign-in. Try again.");
  const allowed = checkAllowed(cfg, profile);
  if (!allowed.ok) {
    log({ event: "signin", outcome: "denied", user: typeof profile.email === "string" ? profile.email : null, reason: allowed.reason, flow: target.flow });
    const res = errorPage("Not allowed", `This Google account can't use the AviLabs websites connector (${allowed.reason}). Sign in with your ${cfg.allowedDomain} account.`, 403);
    res.headers.append("Set-Cookie", clearTx);
    return res;
  }
  const user: User = { sub: profile.sub, email: allowed.email, name: profile.name?.trim() || allowed.email };
  log({ event: "signin", outcome: "ok", user: user.email, flow: target.flow });

  if (target.flow === "browser") {
    const session = await seal(cfg, "session", { user }, SESSION_TTL);
    const res = redirect(target.returnTo);
    res.headers.append("Set-Cookie", clearTx);
    res.headers.append("Set-Cookie", hostCookie("mcp_session", session, SESSION_TTL));
    return res;
  }

  const { req } = target;
  const code = await seal(cfg, "code", { user, clientId: req.clientId, redirectUri: req.redirectUri, codeChallenge: req.codeChallenge, scope: req.scope, jti: randomId() }, CODE_TTL);
  const u = new URL(req.redirectUri);
  u.searchParams.set("code", code);
  if (req.state) u.searchParams.set("state", req.state);
  u.searchParams.set("iss", cfg.baseUrl);
  const res = redirect(u.toString());
  res.headers.append("Set-Cookie", clearTx);
  return res;
}

/** The browser session used by the preview gateway and the upload page. */
export async function readSession(request: Request, cfg: Config): Promise<User | null> {
  const s = await unseal<{ user: User }>(cfg, "session", readCookie(request, "__Host-mcp_session"));
  return s && isListed(cfg, s.user.email) ? s.user : null;
}

// ── Token endpoint ──

function tokenError(error: string, description: string, status = 400): Response {
  return Response.json({ error, error_description: description }, { status, headers: { "Cache-Control": "no-store", Pragma: "no-cache" } });
}

type Family = { jti: string; user: User; clientId: string; scope: string; createdAt: number };

async function issueTokens(deps: AuthDeps, user: User, clientId: string, scope: string, family?: { id: string; createdAt: number }): Promise<Response> {
  const { cfg, store } = deps;
  const access = await signAccessToken(cfg, user, clientId, SCOPE);
  const body: Record<string, unknown> = { access_token: access.token, token_type: "Bearer", expires_in: cfg.accessTtl, scope: SCOPE };
  if (scope.split(" ").includes("offline_access")) {
    const rt = newRefreshToken(cfg, family?.id);
    const createdAt = family?.createdAt ?? Math.floor(Date.now() / 1000);
    const remaining = createdAt + cfg.refreshMaxSeconds - Math.floor(Date.now() / 1000);
    const record: Family = { jti: rt.jti, user, clientId, scope, createdAt };
    await store.set(`rt:${rt.family}`, record, Math.min(cfg.refreshIdleSeconds, remaining));
    body.refresh_token = rt.token;
    body.scope = `${SCOPE} offline_access`;
  }
  return Response.json(body, { headers: { "Cache-Control": "no-store", Pragma: "no-cache" } });
}

/** POST /token (application/x-www-form-urlencoded) */
export async function handleToken(request: Request, deps: AuthDeps): Promise<Response> {
  const { cfg, store, log } = deps;
  const type = request.headers.get("content-type") ?? "";
  if (!type.startsWith("application/x-www-form-urlencoded")) return tokenError("invalid_request", "use application/x-www-form-urlencoded");
  const p = new URLSearchParams(await request.text());
  const clientId = p.get("client_id") ?? "";
  const resource = p.get("resource");
  if (resource !== null && resource !== cfg.resource) return tokenError("invalid_target", `resource must be ${cfg.resource}`);

  if (p.get("grant_type") === "authorization_code") {
    const code = await unseal<{ user: User; clientId: string; redirectUri: string; codeChallenge: string; scope: string; jti: string }>(cfg, "code", p.get("code"));
    if (!code) return tokenError("invalid_grant", "the code is invalid or expired");
    if (code.clientId !== clientId) return tokenError("invalid_grant", "the code was issued to another client");
    if (code.redirectUri !== p.get("redirect_uri")) return tokenError("invalid_grant", "redirect_uri doesn't match");
    const verifier = p.get("code_verifier") ?? "";
    if (!/^[A-Za-z0-9._~-]{43,128}$/.test(verifier) || pkceChallenge(verifier) !== code.codeChallenge) {
      return tokenError("invalid_grant", "PKCE verification failed");
    }
    if (!(await store.setOnce(`code:${code.jti}`, CODE_TTL * 2))) {
      log({ event: "token", outcome: "denied", user: code.user.email, reason: "code reused" });
      return tokenError("invalid_grant", "the code was already used");
    }
    if (!isListed(cfg, code.user.email)) return tokenError("invalid_grant", "this account is no longer allowed");
    log({ event: "token", outcome: "ok", grant: "authorization_code", user: code.user.email });
    return issueTokens(deps, code.user, clientId, code.scope);
  }

  if (p.get("grant_type") === "refresh_token") {
    const parsed = parseRefreshToken(cfg, p.get("refresh_token") ?? "");
    if (!parsed) return tokenError("invalid_grant", "the refresh token is invalid");
    const key = `rt:${parsed.family}`;
    const family = await store.get<Family>(key);
    if (!family) return tokenError("invalid_grant", "the refresh token expired or was revoked");
    if (family.jti !== parsed.jti) {
      // An old token was presented again: someone else may hold this family. Revoke it all.
      await store.del(key);
      log({ event: "token", outcome: "denied", user: family.user.email, reason: "refresh token reuse; family revoked" });
      return tokenError("invalid_grant", "the refresh token was already used");
    }
    if (family.clientId !== clientId) return tokenError("invalid_grant", "the refresh token belongs to another client");
    const now = Math.floor(Date.now() / 1000);
    const revoked = await store.get(`revoked:${family.user.email}`);
    if (!isListed(cfg, family.user.email) || revoked || now >= family.createdAt + cfg.refreshMaxSeconds) {
      await store.del(key);
      log({ event: "token", outcome: "denied", user: family.user.email, reason: revoked ? "revoked" : "no longer allowed or expired" });
      return tokenError("invalid_grant", "sign in again");
    }
    log({ event: "token", outcome: "ok", grant: "refresh_token", user: family.user.email });
    return issueTokens(deps, family.user, clientId, family.scope, { id: parsed.family, createdAt: family.createdAt });
  }

  return tokenError("unsupported_grant_type", "grant_type must be authorization_code or refresh_token");
}

/** POST /register (RFC 7591, application/json) */
export async function handleRegister(request: Request, deps: AuthDeps): Promise<Response> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "invalid_client_metadata", error_description: "the body must be JSON" }, { status: 400 });
  }
  try {
    const out = await registerClient(deps.cfg, body);
    deps.log({ event: "dcr_register", redirectUris: out.redirect_uris, clientName: out.client_name ?? null });
    return Response.json(out, { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    if (e instanceof ClientError) return Response.json({ error: "invalid_redirect_uri", error_description: e.message }, { status: 400 });
    throw e;
  }
}
