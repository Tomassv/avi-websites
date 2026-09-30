# avi-websites MCP server

A remote MCP server that lets AviLabs marketers change the websites from Claude. They can edit
text, add articles and landing pages, upload images, preview, publish and undo.

Every change becomes a branch and a pull request in this repo. The site's own Vercel preview build
checks it, and `publish` squash-merges it. The design, and the reasons behind it, are in
[MCP-PLAN.md](MCP-PLAN.md).

It supports `sites/cura.aero` today; other sites are added with a per-site config ([Adding a site](#adding-a-site)).

## Commands

```sh
npm install
npm test            # unit and end-to-end tests (node:test)
npm run typecheck
npm run dev         # http://localhost:3000, reads .env.local
npm run build       # .vercel/output (what Vercel deploys)
npm run dev:token -- you@avilabs.is   # a 15-minute access token for the Inspector (DEV_MODE only)
npm run revoke -- someone@avilabs.is  # block a user now (add --undo to lift it)
```

Node 22.18 or newer. `npm test`, `dev`, `build` and `typecheck` all regenerate `src/generated/`
first (see [Site rules](#site-rules)).

## Layout

| Path | What |
|---|---|
| `src/app.ts` | Every HTTP route: discovery, OAuth, `/mcp`, the preview gateway, the upload page. |
| `src/auth/` | The authorization server: metadata, consent, Google sign-in, tokens, CIMD/DCR clients, the `/mcp` token verifier. |
| `src/mcp/` | The MCP server factory (`server.ts`), the tool handlers (`tools.ts`), and the site guide builder. |
| `src/github/` | `GitHubPort` with an Octokit implementation and an in-memory one; `changes.ts` is the change model (branches, signed commits, PRs, publish, undo). |
| `src/guardrails/` | Everything the server enforces: paths, JSON pointer edits, field rules, the Rich whitelist, the site-rules sandbox, drift, commit signatures, images, drafts, publish gates. |
| `src/web/` | Server-rendered pages (consent, errors, preview gateway, upload). |
| `src/sites/` | Per-site config (`cura-aero/config.ts`) and the adapter over the site's own rules. |
| `src/store/` | Upstash Redis (and an in-memory stand-in). |
| `scripts/` | `gen-rules.mjs`, `build.mjs`, `should-build.sh` (ignored build step), `dev-token.ts`, `revoke.ts`. |
| `test/` | One test file per area. `helpers/` reads cura.aero from the working tree. |

## Environment

| Variable | |
|---|---|
| `PUBLIC_BASE_URL` | Public URL of this deployment, e.g. `https://avi-websites-mcp.vercel.app`. The MCP endpoint is `<PUBLIC_BASE_URL>/mcp`. |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | The Google OAuth web client. |
| `ALLOWED_EMAIL_DOMAIN` | E.g. `avilabs.is`. Sign-in needs a verified Google Workspace account in this domain. |
| `ALLOWED_EMAILS` | Optional, comma-separated. When set, only these people (inside the domain) may sign in. |
| `TOKEN_SECRETS` | Comma-separated, each `openssl rand -base64 32`. The first signs and encrypts; all of them verify. |
| `COMMIT_SIGNING_SECRET` | `openssl rand -base64 32`. Signs the `Mcp-Signature` trailer on every commit. |
| `GITHUB_APP_ID`, `GITHUB_APP_PRIVATE_KEY`, `GITHUB_INSTALLATION_ID`, `GITHUB_REPO` | The GitHub App. `GITHUB_REPO` is `owner/name`; the private key may use `\n` for newlines. |
| `KV_REST_API_URL`, `KV_REST_API_TOKEN` | Upstash Redis; set by the Vercel Marketplace integration. |
| `PREVIEW_BYPASS_SECRET_CURA_AERO` | The "marketing-previews" bypass secret of cura's Vercel project. |
| `REQUIRE_APPROVAL` | `true` makes `publish` wait for an approving review on the PR. Default off. |
| `ACCESS_TOKEN_TTL_SECONDS`, `REFRESH_IDLE_DAYS`, `REFRESH_MAX_DAYS` | Defaults `900`, `7`, `30`. |
| `ALLOWED_CLIENT_ID_HOSTS` | Hosts whose Client ID Metadata Documents are accepted. Default `claude.ai`. |
| `EXTRA_REDIRECT_URIS` | Optional extra OAuth redirect URIs (exact match). |
| `DEV_MODE` | `1` locally only: allows `http://localhost`, the Inspector's redirect URI, `REDIS=memory` and `dev:token`. The server refuses to start with it on production. |
| `DRY_RUN` | `1`: GitHub is replaced by an in-memory copy of this checkout. Nothing is written, and every tool result says so. `DRY_RUN_PREVIEW_URL` sets what previews point at. |

`.env.example` lists them all.

## Test locally with the MCP Inspector

1. Create `.env.local`: copy `.env.example`, then set `DEV_MODE=1`, `DRY_RUN=1`, `REDIS=memory`,
   `PUBLIC_BASE_URL=http://localhost:3000`, generated `TOKEN_SECRETS` and
   `COMMIT_SIGNING_SECRET`, and `ALLOWED_EMAIL_DOMAIN`. Google values are only needed for the full
   OAuth flow.
2. `npm run dev`.
3. `npx @modelcontextprotocol/inspector`, transport **Streamable HTTP**, URL `http://localhost:3000/mcp`. Then either:
   - **Token:** `npm run dev:token -- you@avilabs.is`, and paste the output under
     Authentication → Bearer Token.
   - **Full OAuth:** add `http://localhost:3000/auth/google/callback` to the Google client's
     redirect URIs and use the Inspector's OAuth flow. That goes through DCR, the consent page,
     Google and `/token`.
4. Try `list_sites`, `get_site_guide`, `get_page_content`, `update_text`, then `get_preview` and
   `publish`. With `DRY_RUN=1` the "PR" and "publish" happen in memory.

To exercise real GitHub, drop `DRY_RUN` and point `GITHUB_REPO` at a sandbox repository with the
App installed. To test Claude itself, deploy a Vercel preview of this project, or use a tunnel
(`cloudflared tunnel --url http://localhost:3000`) with `PUBLIC_BASE_URL` set to it, and add
`<url>/mcp` as a custom connector.

## Deploy

Everything below is done once, by hand; the code creates no accounts or resources.

1. **GitHub App**, installed on this repository only. Repository permissions:
   - Contents: read and write;
   - Pull requests: read and write;
   - Metadata: read;
   - Commit statuses: read;
   - Checks: read;
   - Deployments: read.

   It needs no webhook. Note the App ID and installation ID, and generate a private key.
2. **Ruleset on `main`:** pull request required, zero approvals, squash merging allowed, and no
   bypass for the App.
3. **Google OAuth client** (Web application), with an Internal consent screen and scopes
   `openid email profile`. Its redirect URI is `<PUBLIC_BASE_URL>/auth/google/callback`.
4. **Vercel project `avi-websites-mcp`:**
   - Root Directory `mcp/`.
   - Leave "Include files outside of the Root Directory in the Build Step" **on**; the build reads
     `sites/*/lib`.
   - Framework preset "Other". `vercel.json` sets the install, build and ignored-build commands.
   - Add Upstash Redis from the Vercel Marketplace; it sets `KV_REST_API_URL` and `KV_REST_API_TOKEN`.
   - Set the other environment variables for Production.
5. **Preview bypass secret:** in the **cura** Vercel project, go to Settings → Deployment
   Protection → Protection Bypass for Automation. Add a secret named `marketing-previews` and put
   its value in `PREVIEW_BYPASS_SECRET_CURA_AERO` on the MCP project.
6. **Claude:** an Organization Owner goes to Organization settings → Connectors → Add → Custom. The
   URL is `<PUBLIC_BASE_URL>/mcp`, and the OAuth client is "Use Claude's published identity".
   Members then click Connect.

### Ignored build step

`vercel.json` sets `"ignoreCommand": "sh scripts/should-build.sh"`. If the project is set up in the
dashboard instead, choose Settings → Build and Deployment → Ignored Build Step → Custom, with this
command:

```sh
sh scripts/should-build.sh
```

It builds (exit 1) when `mcp/`, any `sites/*/lib/**` or any `sites/*/content/landing.schema.json`
changed since the last deployment of the branch, or when that can't be determined. It skips
(exit 0) otherwise, for example for a content-only commit. The server also refuses to write if
the site rules on `main` differ from the ones it was built with (`rules_outdated`), which covers
the minutes a redeploy takes.

### First test PR

Before marketers use the server, check the following on one test change:

1. The preview gateway lands on the preview URL **without** `x-vercel-protection-bypass` in the
   address bar. Vercel's cookie redirect should remove it; if it doesn't, stop and switch to the
   reverse-proxy option in MCP-PLAN.md §8.
2. The GitHub deployment environment and commit status names Vercel posts for cura match
   `vercel.previewEnvironment` and `vercel.statusContext` in `src/sites/cura-aero/config.ts`.
3. The squash commit on `main` shows the marketer as co-author.
4. A content-only commit skips the MCP deployment, and a `sites/cura.aero/lib` change builds it.

## Rotate a preview secret

In the site's Vercel project (Settings → Deployment Protection → Protection Bypass for Automation):

1. Add a new secret.
2. Put its value in `PREVIEW_BYPASS_SECRET_<SITE>` on the MCP project, and redeploy the MCP.
3. Revoke the old secret.

Browsers holding a bypass cookie from the old secret lose preview access. The next preview link
they open signs them in again.

## Other secrets

- **`TOKEN_SECRETS`:** put a new secret **first** and keep the old one second. Redeploy. After 30
  days (the longest refresh token), remove the old one.
- **`COMMIT_SIGNING_SECRET`:** rotating it makes open changes unpublishable, because their
  commits carry the old signature. Rotate when no changes are open, or discard and redo them.
- **Blocking a user now:** `npm run revoke -- someone@avilabs.is`, run with the production
  `KV_REST_API_*` values. This blocks their tokens immediately. Also remove them from
  `ALLOWED_EMAILS` or the Workspace.

## Tools

| Tool | What it does |
|---|---|
| `list_sites` | Sites and the signed-in user. |
| `get_site_guide` | What can be edited, markup rules, the landing section catalog (from the site's schema), the article format, image rules and the workflow. |
| `list_pages`, `get_page_content` | Content files with their URLs; one file's editable text values with JSON pointers. |
| `update_text` | Replace existing strings by pointer. No structural changes. |
| `create_article`, `update_article` | Articles; `draft` defaults to `false`. |
| `create_landing_page` | A landing page from the section catalog; `draft` defaults to `false`. |
| `upload_image`, `get_image_upload_link`, `check_upload` | Images, from base64 or through a one-time upload page. |
| `get_preview` | Build state, the gateway link, checks, approval, and drafts that stay hidden. |
| `publish` | Merges only when every gate passes (MCP-PLAN.md §7.6). |
| `undo`, `discard_change`, `list_changes` | Revert through a new change; close an unpublished change; list changes. |

Every call is logged as one JSON line (user, tool, site, change, outcome, duration). Large and
secret arguments are reduced to size and hash. Every write also leaves a comment on its PR.

## Site rules

`scripts/gen-rules.mjs` bundles the site's own `lib/*.ts` into `src/generated/<site>-rules.mjs`,
with `ajv` and `yaml` resolved from this project. It also writes a manifest of the site files'
git blob SHAs. The server therefore validates with the site's code as it is on `main`, never a
copy:
- Landing pages go through `parseLanding`, run in a sandbox built from the repo tree.
- Articles go through `parseArticle`.
- Links and images go through `safe-url.ts`.
- Rich text goes through the site schema's `$defs/rich/pattern`.

`test/site-rules.test.ts` checks that the dependency versions match the site's.

## Adding a site

1. Add the site to `SITES` in `scripts/gen-rules.mjs` (its root, and the lib modules to bundle).
2. Write `src/sites/<id>/rules.ts`, implementing `SiteRules` over the generated module, and
   `src/sites/<id>/config.ts`, giving its paths, image folders, read-only pointers, Vercel names
   and capabilities.
3. Register it in `src/sites/index.ts`, and add a `PREVIEW_BYPASS_SECRET_<SITE>` secret.
4. Add tests next to `test/helpers/site.ts`.

A site without landing pages or articles leaves those capabilities out, and the tools refuse
them for it.
