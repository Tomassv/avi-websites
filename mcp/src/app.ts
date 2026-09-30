import { createMcpHandler, hostHeaderValidationResponse, originValidationResponse, requireBearerAuth } from "@modelcontextprotocol/server";
import { Hono } from "hono";
import {
  authorizationServerMetadata,
  handleAuthorize,
  handleConsent,
  handleGoogleCallback,
  handleRegister,
  handleToken,
  protectedResourceMetadata,
  resourceMetadataUrl,
  SCOPE,
  type AuthDeps,
} from "./auth/oauth.ts";
import { randomId } from "./auth/tokens.ts";
import { mcpVerifier, userOf } from "./auth/verifier.ts";
import { changeService, type ChangeService } from "./github/changes.ts";
import type { GitHubPort } from "./github/port.ts";
import { buildServer } from "./mcp/server.ts";
import { errorPage, page } from "./web/html.ts";
import { handlePreview } from "./web/preview.ts";
import { handleUploadPage, handleUploadPost, uploadScript } from "./web/upload.ts";

/**
 * Every HTTP route of the server. Deployed as one Vercel function; `npm run dev` serves the
 * same app locally.
 */
export type AppDeps = AuthDeps & { gh: GitHubPort };

/** Browsers (the MCP Inspector) call these from another origin; no cookies are involved. */
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Authorization, Content-Type, Mcp-Protocol-Version, Mcp-Session-Id, Last-Event-ID",
  "Access-Control-Expose-Headers": "WWW-Authenticate, Mcp-Session-Id",
  "Access-Control-Max-Age": "600",
};

function withCors(res: Response): Response {
  const out = new Response(res.body, res);
  for (const [k, v] of Object.entries(CORS)) out.headers.set(k, v);
  return out;
}

export function createApp(deps: AppDeps): Hono {
  const { cfg } = deps;
  const changes: ChangeService = changeService({ cfg, gh: deps.gh, log: deps.log });
  const base = new URL(cfg.baseUrl);
  const hosts = cfg.devMode ? [base.hostname, "localhost", "127.0.0.1"] : [base.hostname];
  const origins = cfg.devMode ? [base.hostname, "localhost", "127.0.0.1"] : [base.hostname];

  const gate = requireBearerAuth({ verifier: mcpVerifier(cfg, deps.store), requiredScopes: [SCOPE], resourceMetadataUrl: resourceMetadataUrl(cfg) });
  const mcp = createMcpHandler((mctx) => {
    const user = userOf(mctx.authInfo);
    if (!user) throw new Error("MCP request without a verified user");
    return buildServer({ cfg, changes, store: deps.store, log: deps.log, requestId: randomId(8) }, user);
  });

  const app = new Hono();

  app.options("*", () => new Response(null, { status: 204, headers: CORS }));

  // Discovery. The path-suffixed PRM location is the one the 401 challenge names.
  app.get("/.well-known/oauth-protected-resource/mcp", () => withCors(Response.json(protectedResourceMetadata(cfg))));
  app.get("/.well-known/oauth-protected-resource", () => withCors(Response.json(protectedResourceMetadata(cfg))));
  app.get("/.well-known/oauth-authorization-server", () => withCors(Response.json(authorizationServerMetadata(cfg))));

  // Authorization server.
  app.get("/authorize", (c) => handleAuthorize(c.req.raw, deps));
  app.post("/authorize", (c) => handleConsent(c.req.raw, deps));
  app.get("/auth/google/callback", (c) => handleGoogleCallback(c.req.raw, deps));
  app.post("/token", async (c) => withCors(await handleToken(c.req.raw, deps)));
  app.post("/register", async (c) => withCors(await handleRegister(c.req.raw, deps)));

  // MCP.
  app.all("/mcp", async (c) => {
    const req = c.req.raw;
    const rejected = hostHeaderValidationResponse(req, hosts) ?? originValidationResponse(req, origins);
    if (rejected) return rejected;
    const auth = await gate(req);
    if (auth instanceof Response) return withCors(auth);
    return withCors(await mcp.fetch(req, { authInfo: auth }));
  });

  // Browser pages.
  app.get("/p/:change", (c) => handlePreview(c.req.raw, { ...deps, changes }, c.req.param("change")));
  app.get("/upload.js", () => uploadScript());
  app.get("/upload/:token", (c) => handleUploadPage(c.req.raw, deps, c.req.param("token")));
  app.post("/upload/:token", (c) => handleUploadPost(c.req.raw, { ...deps, changes }, c.req.param("token")));

  app.get("/", () =>
    page(
      "AviLabs websites",
      `<h1>AviLabs websites connector</h1><p>This is an MCP server for Claude. An organization Owner adds <code>${cfg.resource}</code> as a custom connector; members then connect with their Google account.</p>`,
    ),
  );
  app.get("/healthz", () => Response.json({ ok: true }));
  app.notFound(() => errorPage("Not found", "There's nothing here.", 404));
  app.onError((err) => {
    deps.log({ event: "http_error", error: String(err?.stack ?? err).slice(0, 2000) });
    return errorPage("Something went wrong", "The server hit an error. Try again.", 500);
  });
  return app;
}
