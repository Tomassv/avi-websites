import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash, randomBytes } from "node:crypto";
import { SignJWT } from "jose";
import { loadConfig } from "../src/config.ts";
import { memoryStore } from "../src/store/store.ts";
import { checkAllowed } from "../src/auth/allowlist.ts";
import { clearClientCache, registerClient, resolveClient } from "../src/auth/clients.ts";
import { redirectAllowed, CLAUDE_CALLBACK } from "../src/auth/redirects.ts";
import { signAccessToken, verifyAccessToken } from "../src/auth/tokens.ts";
import { mcpVerifier } from "../src/auth/verifier.ts";
import {
  authorizationServerMetadata,
  handleAuthorize,
  handleConsent,
  handleGoogleCallback,
  handleRegister,
  handleToken,
  protectedResourceMetadata,
  readSession,
  startBrowserSignIn,
  type AuthDeps,
} from "../src/auth/oauth.ts";
import type { GoogleProfile } from "../src/auth/google.ts";
import { testConfig } from "./helpers/config.ts";

const CIMD = "https://claude.ai/oauth/mcp-client-metadata";
const cimdDoc = { client_id: CIMD, client_name: "Claude", redirect_uris: [CLAUDE_CALLBACK], token_endpoint_auth_method: "none" };
const fakeFetch = (doc: unknown = cimdDoc, status = 200) => async () => new Response(JSON.stringify(doc), { status });

function deps(profile: Partial<GoogleProfile> = {}, cfg = testConfig()) {
  const logs: Record<string, unknown>[] = [];
  let lastNonce = "";
  const d: AuthDeps = {
    cfg,
    store: memoryStore(),
    log: (e) => logs.push(e),
    fetch: fakeFetch(),
    google: {
      authUrl: ({ state, nonce }) => {
        lastNonce = nonce;
        return `https://google.test/auth?state=${encodeURIComponent(state)}`;
      },
      exchange: async () => ({ sub: "g-1", email: "jane@avilabs.is", email_verified: true, hd: "avilabs.is", name: "Jane Doe", nonce: lastNonce, ...profile }),
    },
  };
  return { d, logs };
}

const verifier = randomBytes(32).toString("base64url");
const challenge = createHash("sha256").update(verifier).digest("base64url");

function authorizeUrl(over: Record<string, string> = {}) {
  const p = new URLSearchParams({
    response_type: "code",
    client_id: CIMD,
    redirect_uri: CLAUDE_CALLBACK,
    code_challenge: challenge,
    code_challenge_method: "S256",
    state: "claude-state",
    resource: "https://mcp.example.com/mcp",
    scope: "websites offline_access",
    ...over,
  });
  return `https://mcp.example.com/authorize?${p}`;
}

const cookieValue = (res: Response, name: string) => {
  for (const c of res.headers.getSetCookie()) if (c.startsWith(`${name}=`)) return decodeURIComponent(c.slice(name.length + 1).split(";")[0]);
  return null;
};

/** Runs the browser part of the flow and returns Claude's callback URL. */
async function signIn(d: AuthDeps, url = authorizeUrl()): Promise<URL> {
  clearClientCache();
  const consent = await handleAuthorize(new Request(url), d);
  assert.equal(consent.status, 200);
  const html = await consent.text();
  assert.match(html, /claude\.ai/);
  const tx = /name="tx" value="([^"]+)"/.exec(html)![1];
  const csrf = /name="csrf" value="([^"]+)"/.exec(html)![1];
  const csrfCookie = cookieValue(consent, "__Host-mcp_csrf")!;
  const toGoogle = await handleConsent(
    new Request("https://mcp.example.com/authorize", {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded", cookie: `__Host-mcp_csrf=${csrfCookie}` },
      body: new URLSearchParams({ tx, csrf, decision: "allow" }),
    }),
    d,
  );
  assert.equal(toGoogle.status, 302);
  const state = new URL(toGoogle.headers.get("location")!).searchParams.get("state")!;
  const txCookie = cookieValue(toGoogle, "__Host-mcp_tx")!;
  const back = await handleGoogleCallback(
    new Request(`https://mcp.example.com/auth/google/callback?code=g-code&state=${encodeURIComponent(state)}`, { headers: { cookie: `__Host-mcp_tx=${txCookie}` } }),
    d,
  );
  assert.equal(back.status, 302, await back.clone().text());
  return new URL(back.headers.get("location")!);
}

const tokenRequest = (params: Record<string, string>) =>
  new Request("https://mcp.example.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(params),
  });

test("discovery documents advertise what Claude needs for CIMD", () => {
  const cfg = testConfig();
  assert.deepEqual(protectedResourceMetadata(cfg), {
    resource: "https://mcp.example.com/mcp",
    authorization_servers: ["https://mcp.example.com"],
    scopes_supported: ["websites"],
    bearer_methods_supported: ["header"],
  });
  const as = authorizationServerMetadata(cfg);
  assert.equal(as.client_id_metadata_document_supported, true);
  assert.deepEqual(as.token_endpoint_auth_methods_supported, ["none"]);
  assert.deepEqual(as.code_challenge_methods_supported, ["S256"]);
  assert.equal(as.authorization_response_iss_parameter_supported, true);
  assert.ok(as.scopes_supported.includes("offline_access"));
});

test("config: required variables, https, DEV_MODE never in production", () => {
  assert.throws(() => loadConfig({}), /Missing environment variables: PUBLIC_BASE_URL, GOOGLE_CLIENT_ID/);
  assert.throws(() => testConfig({ PUBLIC_BASE_URL: "http://mcp.example.com" }), /must be https/);
  assert.equal(testConfig({ PUBLIC_BASE_URL: "http://localhost:3000", DEV_MODE: "1" }).devMode, true);
  assert.throws(() => testConfig({ DEV_MODE: "1", VERCEL_ENV: "production" }), /DEV_MODE must not be set in production/);
  assert.throws(() => testConfig({ TOKEN_SECRETS: Buffer.from("short").toString("base64") }), /at least 32 bytes/);
});

test("the full flow: consent, Google, code, tokens bound to this server", async () => {
  const { d } = deps();
  const back = await signIn(d);
  assert.equal(`${back.origin}${back.pathname}`, CLAUDE_CALLBACK);
  assert.equal(back.searchParams.get("state"), "claude-state");
  assert.equal(back.searchParams.get("iss"), "https://mcp.example.com");
  const code = back.searchParams.get("code")!;

  const res = await handleToken(tokenRequest({ grant_type: "authorization_code", code, client_id: CIMD, redirect_uri: CLAUDE_CALLBACK, code_verifier: verifier, resource: "https://mcp.example.com/mcp" }), d);
  assert.equal(res.status, 200);
  assert.equal(res.headers.get("cache-control"), "no-store");
  const body = (await res.json()) as { access_token: string; refresh_token: string; expires_in: number; token_type: string };
  assert.equal(body.token_type, "Bearer");
  assert.equal(body.expires_in, 900);
  const claims = await verifyAccessToken(d.cfg, body.access_token);
  assert.deepEqual([claims.email, claims.name, claims.clientId], ["jane@avilabs.is", "Jane Doe", CIMD]);
  const info = await mcpVerifier(d.cfg, d.store).verifyAccessToken(body.access_token);
  assert.equal((info.extra!.user as { email: string }).email, "jane@avilabs.is");
  assert.ok(body.refresh_token);

  // The same code again: refused.
  const again = await handleToken(tokenRequest({ grant_type: "authorization_code", code, client_id: CIMD, redirect_uri: CLAUDE_CALLBACK, code_verifier: verifier }), d);
  assert.equal(again.status, 400);
  assert.equal(((await again.json()) as { error: string }).error, "invalid_grant");
});

test("token endpoint: PKCE, redirect_uri, client and resource must match", async () => {
  const { d } = deps();
  const code = (await signIn(d)).searchParams.get("code")!;
  const base = { grant_type: "authorization_code", code, client_id: CIMD, redirect_uri: CLAUDE_CALLBACK, code_verifier: verifier };
  const cases: Record<string, string>[] = [
    { code_verifier: randomBytes(32).toString("base64url") },
    { redirect_uri: "http://localhost:3000/callback" },
    { client_id: "https://claude.ai/other" },
    { resource: "https://other.example.com/mcp" },
    { code: "garbage" },
  ];
  for (const over of cases) {
    const r = await handleToken(tokenRequest({ ...base, ...over }), d);
    assert.equal(r.status, 400, JSON.stringify(over));
  }
  const json = await handleToken(new Request("https://mcp.example.com/token", { method: "POST", headers: { "content-type": "application/json" }, body: "{}" }), d);
  assert.equal(((await json.json()) as { error: string }).error, "invalid_request");
  // The code is still usable after those failures.
  assert.equal((await handleToken(tokenRequest(base), d)).status, 200);
});

test("refresh tokens rotate, and reuse revokes the whole family", async () => {
  const { d, logs } = deps();
  const code = (await signIn(d)).searchParams.get("code")!;
  const first = (await (await handleToken(tokenRequest({ grant_type: "authorization_code", code, client_id: CIMD, redirect_uri: CLAUDE_CALLBACK, code_verifier: verifier }), d)).json()) as { refresh_token: string };
  const refresh = (rt: string) => handleToken(tokenRequest({ grant_type: "refresh_token", refresh_token: rt, client_id: CIMD }), d);

  const second = await refresh(first.refresh_token);
  assert.equal(second.status, 200);
  const rotated = ((await second.json()) as { refresh_token: string }).refresh_token;
  assert.notEqual(rotated, first.refresh_token);

  const reused = await refresh(first.refresh_token);
  assert.equal(((await reused.json()) as { error: string }).error, "invalid_grant");
  assert.ok(logs.some((l) => /reuse/.test(String(l.reason))));
  // The attacker's reuse also killed the legitimate token.
  assert.equal((await refresh(rotated)).status, 400);
  assert.equal((await refresh("a.b.c.d")).status, 400);
});

test("no refresh token without offline_access", async () => {
  const { d } = deps();
  const code = (await signIn(d, authorizeUrl({ scope: "websites" }))).searchParams.get("code")!;
  const body = (await (await handleToken(tokenRequest({ grant_type: "authorization_code", code, client_id: CIMD, redirect_uri: CLAUDE_CALLBACK, code_verifier: verifier }), d)).json()) as Record<string, unknown>;
  assert.equal(body.refresh_token, undefined);
});

test("removing someone from ALLOWED_EMAILS stops their refresh and their access token", async () => {
  const { d } = deps();
  const code = (await signIn(d)).searchParams.get("code")!;
  const t = (await (await handleToken(tokenRequest({ grant_type: "authorization_code", code, client_id: CIMD, redirect_uri: CLAUDE_CALLBACK, code_verifier: verifier }), d)).json()) as { refresh_token: string; access_token: string };
  const narrowed = { ...d, cfg: { ...d.cfg, allowedEmails: ["someone.else@avilabs.is"] } };
  assert.equal((await handleToken(tokenRequest({ grant_type: "refresh_token", refresh_token: t.refresh_token, client_id: CIMD }), narrowed)).status, 400);
  await assert.rejects(mcpVerifier(narrowed.cfg, d.store).verifyAccessToken(t.access_token), /no longer allowed/);
  await d.store.set("revoked:jane@avilabs.is", 1, 60);
  await assert.rejects(mcpVerifier(d.cfg, d.store).verifyAccessToken(t.access_token), /no longer allowed/);
});

test("access tokens for another audience, issuer or key, or expired, are refused", async () => {
  const cfg = testConfig();
  const user = { sub: "1", email: "jane@avilabs.is", name: "Jane" };
  const other = testConfig({ PUBLIC_BASE_URL: "https://other.example.com" });
  await assert.rejects(verifyAccessToken(cfg, (await signAccessToken(other, user, "c", "websites")).token), /invalid token/);
  const otherKey = testConfig({ TOKEN_SECRETS: Buffer.from("x".repeat(32)).toString("base64") });
  await assert.rejects(verifyAccessToken(cfg, (await signAccessToken(otherKey, user, "c", "websites")).token), /unknown key/);
  const [k] = cfg.keys.jwt;
  const expired = await new SignJWT({ email: user.email, client_id: "c", scope: "websites" })
    .setProtectedHeader({ alg: "HS256", kid: k.kid, typ: "at+jwt" })
    .setIssuer(cfg.baseUrl).setAudience(cfg.resource).setSubject("1").setJti("j")
    .setExpirationTime(Math.floor(Date.now() / 1000) - 10).sign(k.bytes);
  await assert.rejects(verifyAccessToken(cfg, expired), /expired/);
  await assert.rejects(verifyAccessToken(cfg, "not.a.token"), /malformed|unknown key/);
  // Key rotation: a token signed with the old (second) key still verifies.
  const rotated = testConfig({ TOKEN_SECRETS: `${Buffer.from("n".repeat(32)).toString("base64")},${Buffer.from("t".repeat(32)).toString("base64")}` });
  assert.equal((await verifyAccessToken(rotated, (await signAccessToken(cfg, user, "c", "websites")).token)).email, user.email);
});

test("sign-in allowlist: verified, in the domain, Workspace-managed, and on the list if there is one", () => {
  const cfg = testConfig();
  const ok = { email: "Jane@AviLabs.is", email_verified: true, hd: "avilabs.is" };
  assert.deepEqual(checkAllowed(cfg, ok), { ok: true, email: "jane@avilabs.is" });
  assert.equal(checkAllowed(cfg, { ...ok, email_verified: false }).ok, false);
  assert.equal(checkAllowed(cfg, { ...ok, email_verified: "true" }).ok, false);
  assert.equal(checkAllowed(cfg, { ...ok, email: "jane@gmail.com", hd: undefined }).ok, false);
  assert.equal(checkAllowed(cfg, { ...ok, hd: undefined }).ok, false);
  assert.equal(checkAllowed(cfg, { ...ok, email: "jane@evil-avilabs.is" }).ok, false);
  assert.equal(checkAllowed(cfg, { ...ok, email: "jane@avilabs.is.evil.com", hd: "avilabs.is" }).ok, false);
  const listed = testConfig({ ALLOWED_EMAILS: " jane@avilabs.is , Bob@avilabs.is" });
  assert.equal(checkAllowed(listed, ok).ok, true);
  assert.equal(checkAllowed(listed, { ...ok, email: "bob@avilabs.is" }).ok, true);
  assert.deepEqual(checkAllowed(listed, { ...ok, email: "eve@avilabs.is" }), { ok: false, reason: "not on ALLOWED_EMAILS" });
  // The list narrows; it never admits someone outside the domain.
  const outside = testConfig({ ALLOWED_EMAILS: "friend@gmail.com" });
  assert.equal(checkAllowed(outside, { email: "friend@gmail.com", email_verified: true, hd: undefined }).ok, false);
});

test("denied accounts get a 403 page and never a code", async () => {
  const { d, logs } = deps({ email: "eve@gmail.com", hd: undefined });
  await assert.rejects(signIn(d));
  assert.ok(logs.some((l) => l.event === "signin" && l.outcome === "denied"));
});

test("the Google callback is bound to the browser that started it", async () => {
  const { d } = deps();
  clearClientCache();
  const consent = await handleAuthorize(new Request(authorizeUrl()), d);
  const html = await consent.text();
  const tx = /name="tx" value="([^"]+)"/.exec(html)![1];
  const csrf = /name="csrf" value="([^"]+)"/.exec(html)![1];
  const post = (cookie: string, decision = "allow") =>
    handleConsent(new Request("https://mcp.example.com/authorize", { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded", cookie }, body: new URLSearchParams({ tx, csrf, decision }) }), d);
  assert.equal((await post("")).status, 400, "missing CSRF cookie");
  assert.equal((await post("__Host-mcp_csrf=other")).status, 400, "wrong CSRF cookie");
  const denied = await post(`__Host-mcp_csrf=${csrf}`, "deny");
  assert.equal(new URL(denied.headers.get("location")!).searchParams.get("error"), "access_denied");
  const toGoogle = await post(`__Host-mcp_csrf=${csrf}`);
  const state = new URL(toGoogle.headers.get("location")!).searchParams.get("state")!;
  const cb = (cookie: string) => handleGoogleCallback(new Request(`https://mcp.example.com/auth/google/callback?code=x&state=${encodeURIComponent(state)}`, { headers: { cookie } }), d);
  assert.equal((await cb("")).status, 400);
  assert.equal((await cb("__Host-mcp_tx=someone-else")).status, 400);
});

test("authorize: bad client or redirect shows a page; other errors go back to the client", async () => {
  const { d } = deps();
  clearClientCache();
  const page = async (url: string) => {
    const r = await handleAuthorize(new Request(url), d);
    assert.equal(r.status, 400, url);
    assert.equal(r.headers.get("location"), null);
  };
  await page(authorizeUrl({ redirect_uri: "https://evil.example/cb" }));
  await page(authorizeUrl({ client_id: "https://evil.example/client" }));
  await page(authorizeUrl({ client_id: "plain-id" }));
  const back = async (over: Record<string, string>, error: string) => {
    const r = await handleAuthorize(new Request(authorizeUrl(over)), d);
    assert.equal(r.status, 302);
    const u = new URL(r.headers.get("location")!);
    assert.equal(u.searchParams.get("error"), error);
    assert.equal(u.searchParams.get("state"), "claude-state");
  };
  await back({ code_challenge_method: "plain" }, "invalid_request");
  await back({ code_challenge: "short" }, "invalid_request");
  await back({ resource: "https://other.example.com/mcp" }, "invalid_target");
  await back({ scope: "websites admin" }, "invalid_scope");
  await back({ response_type: "token" }, "unsupported_response_type");
});

test("redirect URIs: Claude's callback, loopback on any port, Inspector only in dev", () => {
  const cfg = testConfig();
  const dev = testConfig({ DEV_MODE: "1" });
  const loop = ["http://localhost/callback", "http://127.0.0.1/callback"];
  assert.equal(redirectAllowed(cfg, CLAUDE_CALLBACK, [CLAUDE_CALLBACK]), true);
  assert.equal(redirectAllowed(cfg, "http://localhost:53682/callback", loop), true);
  assert.equal(redirectAllowed(cfg, "http://127.0.0.1:9/callback", loop), true);
  assert.equal(redirectAllowed(cfg, "http://localhost:53682/other", loop), false);
  assert.equal(redirectAllowed(cfg, "https://localhost:53682/callback", loop), false);
  assert.equal(redirectAllowed(cfg, "http://localhost.evil.com/callback", loop), false);
  assert.equal(redirectAllowed(cfg, CLAUDE_CALLBACK, loop), false, "must be registered by the client");
  assert.equal(redirectAllowed(cfg, "https://claude.ai/api/mcp/auth_callback/x", [CLAUDE_CALLBACK]), false);
  assert.equal(redirectAllowed(cfg, "http://localhost:6274/oauth/callback", ["http://localhost:6274/oauth/callback"]), false);
  assert.equal(redirectAllowed(dev, "http://localhost:6274/oauth/callback", ["http://localhost:6274/oauth/callback"]), true);
});

test("CIMD: host allowlist, self-matching client_id, size and public client", async () => {
  const cfg = testConfig();
  clearClientCache();
  const c = await resolveClient(cfg, CIMD, fakeFetch());
  assert.deepEqual([c.kind, c.host, c.name], ["cimd", "claude.ai", "claude.ai"]);
  clearClientCache();
  await assert.rejects(resolveClient(cfg, "https://evil.example/client", fakeFetch()), /not allowed/);
  await assert.rejects(resolveClient(cfg, "http://claude.ai/x", fakeFetch()), /unknown client_id/);
  await assert.rejects(resolveClient(cfg, "https://claude.ai:8443/x", fakeFetch()), /plain https/);
  await assert.rejects(resolveClient(cfg, CIMD, fakeFetch({ ...cimdDoc, client_id: "https://claude.ai/other" })), /doesn't match/);
  await assert.rejects(resolveClient(cfg, CIMD, fakeFetch({ ...cimdDoc, client_name: "x".repeat(20000) })), /too large/);
  await assert.rejects(resolveClient(cfg, CIMD, fakeFetch({ ...cimdDoc, token_endpoint_auth_method: "client_secret_basic" })), /public clients/);
  await assert.rejects(resolveClient(cfg, CIMD, fakeFetch(cimdDoc, 404)), /returned 404/);
  await assert.rejects(resolveClient(cfg, CIMD, fakeFetch({ ...cimdDoc, redirect_uris: [] })), /redirect_uris/);
});

test("stateless DCR: the client id is the registration", async () => {
  const cfg = testConfig({ DEV_MODE: "1", PUBLIC_BASE_URL: "http://localhost:3000" });
  const reg = await registerClient(cfg, { redirect_uris: ["http://localhost:6274/oauth/callback"], client_name: "MCP Inspector" });
  const c = await resolveClient(cfg, reg.client_id as string);
  assert.deepEqual([c.kind, c.name, c.redirectUris], ["dcr", "MCP Inspector", ["http://localhost:6274/oauth/callback"]]);
  await assert.rejects(registerClient(cfg, { redirect_uris: ["https://evil.example/cb"] }), /not allowed/);
  await assert.rejects(registerClient(cfg, { redirect_uris: [] }), /1 to 5/);
  await assert.rejects(resolveClient(cfg, "dcr_forged"), /unknown client_id/);
  const res = await handleRegister(new Request("http://localhost:3000/register", { method: "POST", body: "{nope" }), deps().d);
  assert.equal(res.status, 400);
});

test("browser sign-in sets a session for the preview gateway", async () => {
  const { d } = deps();
  const start = await startBrowserSignIn(d, "/p/12?path=/claims");
  const state = new URL(start.headers.get("location")!).searchParams.get("state")!;
  const tx = cookieValue(start, "__Host-mcp_tx")!;
  const back = await handleGoogleCallback(new Request(`https://mcp.example.com/auth/google/callback?code=c&state=${encodeURIComponent(state)}`, { headers: { cookie: `__Host-mcp_tx=${tx}` } }), d);
  assert.equal(back.headers.get("location"), "/p/12?path=/claims");
  const session = cookieValue(back, "__Host-mcp_session")!;
  const user = await readSession(new Request("https://mcp.example.com/p/12", { headers: { cookie: `__Host-mcp_session=${encodeURIComponent(session)}` } }), d.cfg);
  assert.equal(user?.email, "jane@avilabs.is");
  assert.equal((await startBrowserSignIn(d, "https://evil.example/")).status, 400);
  assert.equal((await startBrowserSignIn(d, "//evil.example/")).status, 400);
});
