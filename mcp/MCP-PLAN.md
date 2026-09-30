# avi-websites MCP server — plan

Status: **approved 2026-09-30**, with the changes in §17 ("Approval changes"). The decisions are in §17. Nothing
outside this file exists yet. `sites/` is not touched.

## 1. Goal

AviLabs marketers change the websites from Claude chat: edit text, add articles and landing
pages, upload images, preview, publish and undo. They never touch git, Vercel or code.

The server is a remote MCP server that marketers add to Claude as a custom connector. It holds
no content itself. Every change becomes a branch and a pull request in this repo, the site's own
Vercel preview build checks it, and publishing merges the PR.

It starts with `sites/cura.aero`. Other sites are added later by writing one per-site config
module (§10).

## 2. What I checked

Checked on 2026-09-30:

| Source | What it settles |
|---|---|
| [MCP spec, Authorization, revision 2026-07-28](https://modelcontextprotocol.io/specification/latest/basic/authorization) | The MCP server is an OAuth 2.1 resource server. It **MUST** serve Protected Resource Metadata (RFC 9728) and **MUST** check that tokens were issued for it (RFC 8707 audience). Clients **MUST** send `resource`. Client ID Metadata Documents (CIMD) are **SHOULD**; Dynamic Client Registration (DCR) is **MAY** and deprecated. Invalid or expired tokens get `401`. Authorization servers **SHOULD** send `iss` in authorization responses (RFC 9207). |
| [MCP spec, Authorization security considerations](https://modelcontextprotocol.io/specification/latest/basic/authorization/security-considerations) | Authorization servers **SHOULD** issue short-lived access tokens and **MUST** rotate refresh tokens for public clients. Exact redirect-URI matching is required. There's CIMD SSRF guidance. A "proxy server using a static client ID" **MUST** get user consent per client before forwarding to the third-party authorization server (this server is that case, with Google as the third party). No token passthrough. |
| [Claude docs, Authentication for connectors](https://claude.com/docs/connectors/building/authentication) | Claude supports `oauth_cimd` and `oauth_dcr` by default. It uses CIMD only if the authorization server metadata has `client_id_metadata_document_supported: true` **and** `"none"` in `token_endpoint_auth_methods_supported`; otherwise it falls back to DCR. Other requirements and limits are listed below. |
| [Claude docs, Lazy authentication](https://claude.com/docs/connectors/building/lazy-authentication) | Sign-in starts only from an HTTP `401`, never from a `200` tool error. It shows the CIMD validation steps (check the document's `client_id` equals its URL, exact `redirect_uri` match, name the host on the consent screen). Claude caches discovery for about 5 minutes. |
| [Claude docs, Add a custom connector](https://claude.com/docs/connectors/custom/remote-mcp) | On Team and Enterprise plans an Owner adds the connector under Organization settings > Connectors, and each member clicks Connect. The OAuth client choice is "Claude's published identity" (CIMD), "Register automatically" (DCR) or your own client. Auth settings can't be edited later; the connector has to be removed and re-added. |
| MCP TypeScript SDK v2 (`@modelcontextprotocol/server` 2.2.0 on npm; repo docs `serving/web-standard.md`, `serving/authorization.md`, `serving/sessions-state-scaling.md`) | `createMcpHandler(factory)` builds a fresh server per request, which suits Vercel. `requireBearerAuth` and `oauthMetadataResponse` handle the resource-server side. The v1 authorization-server helpers are frozen in `server-legacy`, and the docs say to use a dedicated identity provider. There are `hostHeaderValidationResponse` and `originValidationResponse` guards. Inspector is `@modelcontextprotocol/inspector` 2.8.0. |
| [Vercel, Bypass Deployment Protection](https://vercel.com/docs/deployment-protection/methods-to-bypass-deployment-protection) and [Protection Bypass for Automation](https://vercel.com/docs/deployment-protection/methods-to-bypass-deployment-protection/protection-bypass-automation) | A bypass secret works for all deployments of one project, and a project can have several secrets, each revocable. It can be sent as a header or query parameter. `x-vercel-set-bypass-cookie=true` sets a cookie "using a redirect with a `Set-Cookie` header" (`SameSite=Lax`). |
| [Vercel for GitHub](https://vercel.com/docs/git/vercel-for-github) | Vercel uses GitHub's Deployments API and posts a commit status per project. |
| [Vercel, Ignored Build Step](https://vercel.com/docs/project-configuration/project-settings#ignored-build-step) | The command runs in the project's Root Directory with the build-time system environment variables. Exit `1` builds and exit `0` cancels the build. |
| [GitHub, About merge methods](https://docs.github.com/articles/about-pull-request-merge-squashing) and [Merging a pull request](https://docs.github.com/en/pull-requests/how-tos/merge-and-close-pull-requests/merging-a-pull-request) | Squash merges credit **the user who created the pull request** as author of the squashed commit (§5). |

Claude's connector requirements from those pages:
- Callbacks: `https://claude.ai/api/mcp/auth_callback`, plus Claude Code's loopback redirects `http://localhost:<any>/callback` and `http://127.0.0.1:<any>/callback`, matched with the port ignored.
- PKCE S256 on every request.
- Discovery starts from a `401` whose `WWW-Authenticate` header has `resource_metadata`. The `resource` field must equal the MCP URL exactly, and Claude uses only the first entry of `authorization_servers`.
- The token endpoint takes `application/x-www-form-urlencoded`.
- Endpoints get 10 s (30 s for a refresh). Claude refreshes on a `401` and up to 5 minutes before expiry.
- An invalid refresh token must get `invalid_grant`.
- Claude adds `offline_access` if the authorization server metadata lists it.
- Claude's traffic comes from `160.79.104.0/21`.

## 3. Architecture

```
Claude (claude.ai / Desktop / Code)
   │  Streamable HTTP + Bearer token
   ▼
avi-websites-mcp  (Vercel project, root mcp/, Node runtime, one Hono app)
   ├─ OAuth authorization server   /authorize /token /register /.well-known/*
   │     └─ Google OIDC (sign-in)  /auth/google/callback
   ├─ MCP endpoint                 /mcp          (SDK v2 createMcpHandler, stateless)
   ├─ Browser pages                /p/:change    preview gateway
   │                               /upload/:token one-time image upload
   ├─ Upstash Redis                one-time markers, refresh-token families, rate limits
   └─ GitHub App client (Octokit) ──► this repo: branches, commits, PRs, merge
                                         │
                                         ▼
                              Vercel for GitHub builds a preview per site project
                              and posts deployment and commit statuses back to GitHub
```

- **Stack.** TypeScript on Node 22. Hono for routing, which Vercel runs with zero config.
  `@modelcontextprotocol/server` v2, `jose` for JWT and JWE, `zod` v4, `@octokit/app`,
  `@upstash/redis`, and `sharp` for images.
- **Stateless MCP.** Each HTTP request builds a fresh `McpServer` through `createMcpHandler`, with no
  MCP sessions (the 2026-07-28 transport has none). Tools finish in seconds. None of them wait for
  a build; Claude polls `get_preview`.
- **The truth lives in GitHub.** Changes, their state, preview status and the audit trail are all
  read from GitHub (branches, PRs, labels, commits, deployment statuses). Redis holds only
  short-lived auth and anti-replay records (§4.4).
- **Why a small authorization server of our own.** Google can't be Claude's authorization server
  directly. It supports neither CIMD nor DCR, ignores `resource`, and issues Google API tokens
  rather than tokens for this server. The SDK no longer ships authorization-server helpers. So the
  MCP server runs a minimal, spec-shaped authorization server (about 5 endpoints, built on `jose`)
  and uses Google only to find out who the user is.
  - Rejected: pointing Claude at Google with a pre-registered client. That means hourly
    reconnects (Google access tokens, no refresh token for this flow), tokens that are really
    Google API tokens, and no control over their lifetime.
  - Rejected: a hosted identity provider (Auth0, WorkOS, and so on). It would work, but adds a vendor
    and a bill for about 10 users.

## 4. Auth flow

### 4.1 Discovery

- `POST /mcp` without a valid token returns `401` with
  `WWW-Authenticate: Bearer resource_metadata="<BASE>/.well-known/oauth-protected-resource/mcp", scope="websites"`.
  `initialize` and `tools/list` also need a token, because every tool acts as a person.
- `/.well-known/oauth-protected-resource/mcp` (and the path-less copy) serves
  `{ resource: "<BASE>/mcp", authorization_servers: ["<BASE>"], scopes_supported: ["websites"], bearer_methods_supported: ["header"] }`.
- `/.well-known/oauth-authorization-server` serves:
  - `issuer`, `authorization_endpoint`, `token_endpoint` and `registration_endpoint`;
  - `response_types_supported: ["code"]` and `grant_types_supported: ["authorization_code","refresh_token"]`;
  - `code_challenge_methods_supported: ["S256"]` and `token_endpoint_auth_methods_supported: ["none"]`;
  - `client_id_metadata_document_supported: true`;
  - `authorization_response_iss_parameter_supported: true`;
  - `scopes_supported: ["websites","offline_access"]`.

### 4.2 Client identification (no client database)

- **CIMD (preferred).** A `client_id` that is an `https://` URL is fetched with a 3 s timeout and a
  10 KB cap, `https` only, with the host checked against `ALLOWED_CLIENT_ID_HOSTS` (default
  `claude.ai`). This guards against SSRF. The document's `client_id` must equal the URL, and the
  document is cached in memory for 5 minutes. The first time a URL is used, the server logs it.
- **DCR (fallback, for older clients and the Inspector).** `POST /register` validates the
  requested `redirect_uris` against the global allowlist below. It returns
  `client_id = "dcr_" + <signed JWT of the registered metadata>`, which is self-contained, so
  nothing is stored. There is no secret (`token_endpoint_auth_method: "none"`).
- **Redirect-URI allowlist, enforced for both paths on top of the client's own list:**
  - `https://claude.ai/api/mcp/auth_callback`;
  - loopback `http://localhost:*/callback` and `http://127.0.0.1:*/callback`, with the port
    ignored (for Claude Code);
  - with `DEV_MODE` only, `http://localhost:*/oauth/callback` (for the Inspector);
  - anything in `EXTRA_REDIRECT_URIS`.

  Every other match is exact.

### 4.3 Sign-in sequence

1. **`GET /authorize`.** The server checks `client_id`, `redirect_uri`, `response_type=code`,
   `code_challenge` (S256), `state`, `resource == <BASE>/mcp` and `scope`. On any mismatch it shows
   an error page and does **not** redirect.
2. **Consent page.** This is required by the confused-deputy rule. It says: "*Claude
   (claude.ai → `claude.ai`)* wants to edit AviLabs websites on your behalf. You'll sign in with
   Google next." It shows the redirect host, plus an extra warning when the redirect is loopback.
   Approving is a POST with a CSRF token.
3. **Redirect to Google** (`openid email profile`, with `prompt=select_account` and `hd=<domain>`
   as a hint). Google's `state` is a JWE that carries Claude's request, Google PKCE verifier,
   a `nonce`, a 10-minute expiry and a transaction id. The transaction id is also set in a
   `__Host-` cookie, which prevents login CSRF.
4. **`GET /auth/google/callback`.** The server checks the cookie against the state, then swaps
   the code at Google (confidential client, with the secret) and verifies the ID token: `iss`,
   `aud`, `exp`, `nonce`. The account is accepted only if **all** of these hold:
   - `email_verified === true`;
   - the email's domain equals `ALLOWED_EMAIL_DOMAIN`;
   - `hd === ALLOWED_EMAIL_DOMAIN`, which proves a Workspace-managed account;
   - if `ALLOWED_EMAILS` is non-empty, the email is on it (compared case-insensitively). The list
     only **narrows** the domain; an empty list means the whole domain.

   Anyone else gets a "not allowed" page, and the attempt is logged. The same callback also
   serves the browser pages' sign-in (§8, §9); `state` records which flow it belongs to.
5. **Redirect to Claude's `redirect_uri`** with `code`, `state` and `iss=<BASE>`. The `code` is a
   JWE that is valid for 60 s and holds the user (`sub`, `email`, `name`), `client_id`,
   `redirect_uri`, `code_challenge`, `resource`, `scope` and a `jti`.
6. **`POST /token` (form-urlencoded), `grant_type=authorization_code`.** The server decrypts the
   code and checks expiry, `client_id`, `redirect_uri`, the PKCE `code_verifier` against the
   challenge, and `resource`. It marks the code used with `SET code:<jti> NX`; a second use gets
   `invalid_grant`. It returns:
   - **Access token.** A JWT signed with HS256 and a key id, with `iss=<BASE>`,
     `aud=<BASE>/mcp`, `sub`, `email`, `name`, `client_id`, `scope` and `exp` = **15 minutes**.
   - **Refresh token**, only if `offline_access` was requested. It's an opaque value,
     `<family>.<jti>.<mac>`.
7. **`grant_type=refresh_token`.** The server checks the MAC and that the family's current `jti`
   matches `rt:<family>`. It then **rotates**, issuing a new `jti` and invalidating the old one. If
   an old `jti` is used again, the whole family is deleted (reuse detection) and the answer is
   `invalid_grant`. It also re-checks the email against the current `ALLOWED_EMAIL_DOMAIN` and
   `ALLOWED_EMAILS` on every refresh, so removing someone takes effect within 15 minutes. Refresh
   tokens expire after 7 days idle and 30 days absolute; after that the user signs in with Google
   again.
8. **`/mcp`.** `requireBearerAuth` runs with a verifier that checks signature, `iss`, `aud` and
   `exp`, and that `revoked:<email>` isn't set. Tools receive `{ email, name, sub }` through
   `ctx.http.authInfo`, and nothing from Google is ever passed through.

Signing and encryption keys come from `TOKEN_SECRETS`, a comma-separated list: the first key
signs, and all of them verify, so keys can be rotated.

### 4.4 Redis (Upstash, via the Vercel Marketplace)

Every key expires on its own. No content, no change data and no Google tokens are stored.

| Key | Value | TTL | Purpose |
|---|---|---|---|
| `code:<jti>` | `1`, set only if absent | 120 s | Authorization codes are single-use. |
| `rt:<family>` | `{ jti, sub, email, client_id, scope, createdAt }` | 7 days idle, capped at 30 days | Refresh-token rotation and reuse detection. |
| `upload:<jti>` | `1`, set only if absent | 20 min | Upload links are single-use (§9). |
| `revoked:<email>` | `1` | 30 days | Kill switch, set with `npm run revoke -- <email>`. |
| `rl:<email>:<window>` | counter | 10 min | Rate limits (§7.7). |

## 5. GitHub model

- **GitHub App**, installed only on this repo. Repository permissions:
  - Contents: read and write;
  - Pull requests: read and write;
  - Metadata: read;
  - Commit statuses, Checks and Deployments: read.

  The server caches the installation token for up to 50 minutes.
- **A change is one branch plus one PR.**
  - Branch: `mcp/<site-id>/<yyyymmdd>-<short-slug>-<4 hex>`.
  - PR: labelled `mcp` and `site:<site-id>`, titled "`[cura.aero] <summary>`".
  - PR body: a human summary, plus a machine block `<!-- mcp:{"site":"cura.aero","createdBy":"…"} -->`.
  - `change_id` is the PR number. Write tools take an optional `change_id` to add to an open
    change, so several edits can share one preview.
- **Writing.** The server creates blobs, a tree based on the branch head, a commit and then a
  fast-forward ref update, all through the Git Data API. That puts several files (a landing page
  plus its images) in one commit.
  - **Author:** the marketer's Google name and email.
  - **Committer:** the App's bot identity, set **explicitly**: `<app-slug>[bot]` with the
    `<id>+<app-slug>[bot]@users.noreply.github.com` address. GitHub's commit API copies the author
    into an empty committer field, so the committer has to be given.
  - A trailer `Changed-Via: avi-websites-mcp (<tool>)` goes on every commit.
  - A **server signature trailer** goes on every commit too:
    `Mcp-Signature: <hex HMAC-SHA256>`. It's computed over `tree SHA + "\n" + parent SHA + "\n" +
    author email`, keyed with `COMMIT_SIGNING_SECRET`. The publish gate relies on this (§7.6).
    GitHub's own "Verified" mark is welcome but not required.
- **Never main.** `main` has **no ruleset or branch protection** (no GitHub Pro), so its
  protection is the server's own code:
  - the server only creates or updates refs that match `refs/heads/mcp/`;
  - it refuses a ref update that isn't a fast-forward;
  - `main` changes only through the PR merge API in `publish`, sent with `sha = headSha`.

  Anything else that changes `main` is **detected** by `.github/workflows/main-guard.yml` (§7.8).
- **Merge method: squash.** GitHub credits the **PR author** as the author of a squashed commit,
  and the PR author here is the App. So on `main` the commit is authored by the bot. The server
  writes the squash message itself:

  ```
  [cura.aero] Update home hero text (#123)

  <summary, then the list of files>

  Co-authored-by: Jane Doe <jane@avilabs.is>        ← one per distinct marketer author
  Published-by: Jane Doe <jane@avilabs.is>
  Changed-Via: avi-websites-mcp
  ```

  The marketer is still the author of every commit on the PR branch, and GitHub shows
  co-authors on the squashed commit. If strict authorship on `main` matters more than a single
  commit, rebase merging would keep the marketer as author; that's a one-line change.
- **Durable audit trail in GitHub.** Every write tool also adds a PR comment ("`update_text` by
  Jane Doe: 3 strings in `content/pages/home.json`").

## 6. Tools

Every result carries `structuredContent` plus a short text block that ends with **Next:**, telling
Claude what to do next. Errors are tool errors (`isError: true`) with a stable `code` and a plain
explanation Claude can pass on. Tool annotations: read tools have `readOnlyHint`; `publish`,
`undo` and `discard_change` have `destructiveHint`, so Claude asks the user for approval.

In the table, `site` is a site id such as `cura.aero`, and `ref` is `main` (default) or a
`change_id`.

| Tool | Inputs | Output / behaviour |
|---|---|---|
| `list_sites` | none | `[{ site, name, productionUrl, capabilities: ["pages","landing","articles","images"] }]` and the signed-in user. **Next:** `get_site_guide`. |
| `get_site_guide` | `site` | Markdown, built from the repo at `main` on each call and cached by blob SHA. It covers: what can be edited (from the site config); the Rich markup whitelist and link and image rules (from the site README's "Editing content"); the **landing section catalog** (the README's "Landing pages" section, plus a field summary generated from `content/landing.schema.json`); the article format (README "Adding an article"); image limits and how to get images in; and the change → preview → publish workflow. |
| `list_pages` | `site`, `ref?` | `[{ id, kind: page\|landing\|article\|shared, file, url, title, draft?, internal? }]`. `internal` marks pages behind basic auth. The list comes from the repo tree and the config. |
| `get_page_content` | `site`, `id` or `file`, `ref?` | `{ file, blobSha, kind, url, content, editable: [{ pointer, value, type: rich\|text\|href\|image\|icon }] }`. `content` is the JSON or Markdown, truncated above 60 KB, in which case `editable` is still complete. For an article it also returns `frontmatter` and `body`. **Next:** `update_text` or `update_article`. |
| `update_text` | `site`, `file`, `edits: [{ pointer, oldValue, newValue }]` (1–50), `summary`, `change_id?` | Replaces **existing string values only** in a JSON content file and commits them. Returns `{ change_id, prUrl, branch, applied: n }`. **Next:** "`get_preview(change_id)` in 1–2 minutes." |
| `create_article` | `site`, `slug`, `title`, `description`, `date`, `author?`, `image?`, `body` (Markdown), `draft` (default `false`), `change_id?` | Builds the frontmatter with the `yaml` library and validates it with the **site's own `parseArticle`**. Refuses if the file already exists on `main`; inside the same open change it may be replaced. Returns `{ change_id, file, url }`. |
| `update_article` | `site`, `slug`, `oldBodySha256?`, any of the `create_article` fields, `summary`, `change_id?` | Changes an existing article's frontmatter fields or replaces its body, validated with `parseArticle`. When the body is replaced, `oldBodySha256` must match the current body (a stale-edit check). The slug and file name can't change. |
| `create_landing_page` | `site`, `slug`, `page` (the JSON object), `change_id?` | Validates with the **site's own `parseLanding`** (§7.3), then writes `content/landing/<slug>.json`. It follows the same exists-on-main rule. `draft` defaults to `false`: if `page.draft` is missing, the server sets it to `false`. Returns `{ change_id, file, url, draft }`. |
| `upload_image` | `site`, `folder` (`landing/<slug>` or `news`), `name`, `dataBase64`, `change_id?` | For small or generated images. Runs the image pipeline (§7.5) and commits the file. Returns `{ change_id, path: "/images/landing/<slug>/<name>.webp", width, height, bytes }`. **Next:** "use `path` as `src`". |
| `get_image_upload_link` | `site`, `folder`, `name`, `change_id?` | For photos the user has on their computer. Creates the change if needed and returns `{ change_id, uploadUrl, expiresAt, path }`. `path` is known in advance, because the output is always `.webp`. **Next:** "Give the user the link; when they say it's done, check `get_preview(change_id).files`, then use `path`." |
| `get_preview` | `change_id`, `path?` | Reads GitHub deployments and statuses for the PR head SHA. Returns `{ state: queued\|building\|ready\|failed\|skipped, headSha, previewLink: "<BASE>/p/<change_id>?path=<path>", files: [...], checks: [{ name, state }], approval: required\|approved\|not_required, publishable: bool, reason? }`. **Next:** depends on the state: wait and call again; open the link and review; fix the failure (with the failing check's name and summary); or `publish`. |
| `publish` | `change_id`, `confirm: true` | Runs the publish gates (§7.6), then squash-merges with the message from §5. Returns `{ mergedSha, liveUrls }`. **Next:** "production deploys in 1–2 minutes; `list_changes` shows it". |
| `undo` | `change_id` (a published change) | Opens a **new** change that puts every file the squashed commit touched back to its state in that commit's parent. Files the change added are deleted. The marketer is the author. It refuses if any of those files changed on `main` since. Returns `{ change_id, revertsChange }`. **Next:** `get_preview`, then `publish`, through the same gates. |
| `discard_change` | `change_id`, `confirm: true` | Closes an unpublished PR and deletes its branch. |
| `list_changes` | `site?`, `state: open\|published\|all` (default open), `mine?`, `limit ≤ 30` | `[{ change_id, title, site, author, state, createdAt, updatedAt, previewState, prUrl }]`, taken from PRs labelled `mcp`. |

## 7. Guardrails (in server code, not in the prompt)

### 7.1 Per-site path allowlist

- Each site config lists **writable globs**. For cura: `content/**/*.json`, `content/**/*.md`,
  `public/images/landing/*/**` and `public/images/news/**`.
- It also lists **protected globs**, which win over writable ones. For cura:
  `content/landing.schema.json`, since the rules themselves live in `content/`.
- Everything else is refused: `app/`, `lib/`, `styles/`, `components/`, `public/*` outside the
  image folders, `package*.json`, `next.config.ts`, `proxy.ts`, `.github/` and other sites.
- Paths are normalized first. The server rejects `..`, a leading `/` or `\`, `%` escapes, a
  control character, a leading dot in any segment, and case tricks. It also checks a size limit
  per file type: JSON ≤ 256 KB, Markdown ≤ 100 KB, image ≤ 1.5 MB after processing.
- **At publish** the PR's full file list is checked against the same allowlist again. So is every
  commit, which must carry a valid `Mcp-Signature` trailer (§5) and have exactly one parent.
  Someone pushing to an `mcp/` branch by hand therefore blocks publishing.

### 7.2 `update_text`: strings only, never structure

- The file must already exist and be a JSON content file. Each pointer (RFC 6901) must resolve to
  an existing **string**. `oldValue` must equal the current value, which protects against a stale
  edit. Pointers can't add or delete keys or array items.
- After applying the edits, a deep **shape equality check** compares the old and new documents:
  same keys, same array lengths, same types. Anything else fails.
- Each edited value is validated by field type, which comes from the key name through the site
  config:

  | Key | Rule |
  |---|---|
  | `href` | `safeHref` |
  | `src` or `photos[]` | `safeImageSrc`, and the file must exist on the change's branch |
  | `icon` | `safeIconName` |
  | `hubspotMeetingUrl` | `safeHubspotMeetingUrl` |
  | anything matching a read-only pointer | refused. For cura: `gaId`, `url`, the `header` block of `site.json`, anything under `jsonLd`, `canonical`, `openGraph.url` |
  | anything else | Rich: the whitelist pattern, taken from the site's own schema (§7.3), plus a 2,000-character cap |

- In `content/site.json`, only the footer strings are writable (§17).
- Then the **whole file** is re-validated: a landing file with `parseLanding`, any other JSON file
  by running every string in it through the Rich whitelist, as the site's `rich.test.ts` does.

### 7.3 Reusing the site's rules without forking them

- **Rules code.** It's imported from the site at MCP build time:
  `sites/cura.aero/lib/{rich,safe-url,articles,landing,landing-routes,redirects,env}.ts`. It's
  bundled with esbuild, with `ajv` and `yaml` resolved from `mcp/node_modules`; a unit test checks
  their versions match `sites/cura.aero/package.json`. The Vercel project keeps "Include files
  outside the root directory" turned on (the default). The site code isn't edited or copied.
- **Rules data** is read **from the repo at the change's branch head** at request time:
  `content/landing.schema.json` and the tree (for route directories, `public/` names and existing
  images).
- **`parseLanding` needs a filesystem root.** For each validation the server writes a throwaway
  copy under `/tmp/rules/<tree-sha>/`, containing:
  - the schema file;
  - empty directories for `app/**`, which is what `reservedPaths` scans;
  - the top-level `public/` names;
  - empty placeholder files for the images on the branch plus those in the same commit (only
    their existence is checked).

  Then it calls the site's own `parseLanding` or `getCatalog`. So slug collisions, image folders,
  unique ids and link validation are the site's code, word for word.
- **The Rich whitelist for page JSON** uses the site schema's `$defs/rich/pattern`, which lives in
  the repo as data. A test also checks that the pattern names exactly the site's `RICH_CLASSES`.
- **The server redeploys when the rules change.** The ignored build step in §12 rebuilds it when
  `mcp/`, `sites/*/lib/` or any `sites/*/content/landing.schema.json` changes.
- **Drift check, as a safety net.** At build, the MCP records the git blob SHA of each imported
  rules file. Before any write, it compares them with `main`. If they differ, for example while the
  redeploy is still building, it refuses with `code: rules_outdated`, so it never validates with
  old rules.
- **The site's own Vercel build is the last gate.** `next build` runs `tsc` and validates every
  landing file. `publish` requires that build to have passed (§7.6).

### 7.4 Slugs and new files

- Slugs use the site's `SLUG_RE`. For a landing page the site's `reservedPaths` also apply, and
  for an article the check is against existing articles.
- `create_*` never overwrites a file that exists on `main`.

### 7.5 Image pipeline (`sharp`)

This is shared by `upload_image` and the upload page.

- **Input.** At most **3 MB** after decoding, because Vercel caps a request body at 4.5 MB. The
  type is detected from the file's magic bytes, not the name or MIME type: JPEG, PNG, WebP or AVIF
  only. **SVG is refused**, because an SVG served from the site's origin can run script. At most
  40 megapixels, and one frame only.
- **Output.** Always **WebP**. The longest edge is capped at 2400 px. The file is auto-rotated and
  **all metadata is stripped**, including EXIF and GPS. Photos use quality 80; images with
  transparency are lossless. The output must be ≤ 1.5 MB after up to 2 quality steps, or the
  upload fails.
- **File names** are lowercase, keeping `[a-z0-9-]`, and end in `.webp`. The name must not collide
  with a file already on the branch.
- The folder must be one of the site's image folders. For `landing/<slug>`, the slug must pass the
  slug rule.

### 7.6 Publish gates (all must pass; the reason is returned otherwise)

1. The PR is open, labelled `mcp`, is for this site, and has a conflict-free mergeable state.
2. The PR diff passes the allowlist. Every commit has exactly one parent and a valid
   `Mcp-Signature` trailer: the HMAC is recomputed from the commit's own tree SHA, parent SHA and
   author email, and compared in constant time. A missing or invalid trailer blocks the merge and
   names the commit. GitHub's "Verified" mark is reported but not required.
3. The site's **Vercel preview deployment for the current head SHA** is `success`. It's looked up
   by GitHub deployment environment (config, for example `Preview – cura-aero`), falling back to
   the commit status context (for example `Vercel – cura-aero`).
4. Every **other check** on the head SHA (commit statuses and check runs) is `success`,
   `neutral` or `skipped`. Other sites' Vercel projects are informational only, so a change to one
   site never waits for, or fails on, another site's build. There is no list of required checks,
   because there's no ruleset.
5. **If `REQUIRE_APPROVAL=true`:** at least one `APPROVED` review whose `commit_id` is the head
   SHA, from a user other than the App, with no later `CHANGES_REQUESTED` from the same reviewer.
   Otherwise `publish` refuses and names the PR. GitHub doesn't enforce reviews (there's no
   ruleset); this switch is enforced by the server. Default: off.
6. The squash merge is sent with `sha = headSha`, so a push after the check makes the merge fail
   instead of publishing something unchecked.

**Draft warning.** A change can contain draft pages: a landing file or article whose `draft` is
`true`. In that case `get_preview` and `publish` both list those pages with the warning "these
pages are drafts and won't be visible on the live site after publishing". `publish` still merges;
the warning is part of its result.

### 7.7 Other guardrails

- **Host and Origin validation** with the SDK helpers on `/mcp`.
- **Per-user limits in Redis:** 60 tool calls, 20 writes and 10 upload links per 10 minutes.
- **Error text** never includes secrets, tokens or raw GitHub error bodies.
- **Browser pages** (`/p`, `/upload`, consent) send
  `Content-Security-Policy: default-src 'self'; frame-ancestors 'none'`,
  `Referrer-Policy: no-referrer` and `Cache-Control: no-store`.

### 7.8 Detecting changes to `main` that bypass the server

Without branch protection, anyone with write access could push to `main` directly.
`.github/workflows/main-guard.yml` is the one file outside `mcp/`, approved for this purpose. It
makes such a push visible:

- **Trigger and permissions.** It runs on every push to `main`, with `contents: read` and
  `pull-requests: read` only.
- **What it checks.** It walks the pushed commits along `main`'s first-parent history, from the
  new head back to the previous one. For each commit it asks the API
  (`GET /repos/{repo}/commits/{sha}/pulls`) whether that commit is the **merge or squash commit
  of a merged PR**. It retries a few times, because GitHub can take seconds to associate a fresh
  merge commit.
  - A merge commit's second-parent commits (the PR's own commits) belong to that PR and aren't
    checked separately.
  - Rebase merges aren't used here and would be reported.
- **What fails.** Any other commit fails the run, with an error and a job summary naming each
  offending commit (SHA, subject, author, committer) and the pusher. So does a force push, `main`
  being created or deleted by a push, history that doesn't lead back to the previous head, or an
  API error.
- **Who is notified.** GitHub emails a failed run to **the user who triggered it**, which for a
  push is the pusher. A direct push by the repository owner therefore emails the owner. A push by
  someone else emails that person, and the failure also shows as a red ✗ on the commit and in the
  Actions tab. Notifying the owner in every case would need `issues: write` (to open an issue),
  which this workflow deliberately doesn't have.
- **It detects, it doesn't prevent.** The fix for a bad push is a revert.

The script is tested in `mcp/test/main-guard.test.ts`, which runs it as written against a fake
`gh`.

## 8. Previews: the sign-in gateway

`get_preview` returns `<BASE>/p/<change_id>?path=/claims-automation`. The link itself isn't
secret.

1. The browser opens the link. Without a valid preview session cookie (`__Host-mcp_session`,
   8 hours, signed, `HttpOnly`, `Secure`, `SameSite=Lax`) the gateway sends the user through the
   same Google sign-in and allowlist (§4.3, step 4).
2. The gateway reads the PR's latest successful preview URL from GitHub. If it isn't ready, it
   shows a "still building, refresh in a minute" page.
3. It answers `302` to
   `<previewUrl><path>?x-vercel-protection-bypass=<secret>&x-vercel-set-bypass-cookie=true`.
   Vercel sets its bypass cookie with a redirect, and the user lands on the preview. Draft pages
   show there with their "Draft, not live" badge.
4. **Stripping the secret from the URL.** Vercel's documented behaviour is a redirect that sets
   the cookie. The first rollout check (§15) confirms that this redirect lands on the URL
   **without** the two parameters, so the secret isn't in the address bar or a bookmark. If Vercel
   kept them, I'd switch to the stricter reverse-proxy option instead of shipping it that way. In
   that option the secret never leaves the server; it needs a wildcard domain.
5. **Secret handling.** Each site project gets its **own named bypass secret**
   ("marketing-previews"). It's separate from any automation secret, can be revoked on its own,
   lives only in the MCP's env vars, and is never shown to Claude. It unlocks previews of that one
   site project only, not production and not other projects.
6. **Rotation** is one README section, "Rotate a preview secret": create a new secret in the site's
   Vercel project, paste it into `PREVIEW_BYPASS_SECRET_<SITE>` in the MCP project, redeploy, then
   revoke the old secret. Existing bypass cookies stop working when the old secret is revoked.

## 9. Upload page (one-time link)

Claude can't reliably turn a photo from chat into base64 tool input, so real photos go through a
browser page.

- **The link.** `get_image_upload_link` returns `<BASE>/upload/<token>`. The token is a JWE that
  holds `{ site, change_id, branch, folder, name, email, jti, exp: 15 min }`. It's single-use
  through `upload:<jti>`.
- **Opening the page** requires the Google browser session (§8), and the signed-in email must
  equal the token's email. So a forwarded link is useless to anyone else.
- **The page** is plain HTML with a little script. It accepts JPEG, PNG, WebP and AVIF, and HEIC
  where the browser can decode it (Safari). It **downsizes in the browser** (canvas, longest edge
  3000 px, JPEG quality 0.9) so the upload stays under Vercel's 4.5 MB body limit, then POSTs it.
  The server runs the same pipeline as `upload_image` (§7.5) and commits
  `public/images/landing/<slug>/<name>.webp` to the change's branch, with the marketer as author.
- **The result** page says "Done, go back to Claude" and shows a thumbnail. The PR gets a comment,
  and `get_preview(change_id).files` now lists the image.
- **Nothing is stored** between the upload and the commit; the request itself is the commit.

## 10. Per-site config

`mcp/src/sites/cura-aero/config.ts`:

```ts
export const curaAero: SiteConfig = {
  id: "cura.aero",
  name: "Cura",
  root: "sites/cura.aero",
  productionUrl: "https://cura.aero",
  vercel: { previewEnvironment: "Preview – cura-aero", statusContext: "Vercel – cura-aero",
            bypassSecretEnv: "PREVIEW_BYPASS_SECRET_CURA_AERO" },
  writable: ["content/**/*.json", "content/**/*.md", "public/images/landing/*/**", "public/images/news/**"],
  protected: ["content/landing.schema.json"],
  imageFolders: { landing: "public/images/landing/{slug}", news: "public/images/news" },
  internalRouteGroups: ["(docs)", "(deck)"],          // list_pages marks these internal
  readOnlyPointers: {
    "content/site.json": { allowOnly: ["/footer/copyright", "/footer/address", "/footer/parent/label"] },
    "*": ["**/jsonLd/**", "**/canonical", "**/openGraph/url", "/gaId", "/url"],
  },
  fieldRules: { href: "href", src: "image", photos: "image", icon: "icon", hubspotMeetingUrl: "hubspot" },
  guide: { readme: "README.md", sections: ["Editing content", "Adding an article", "Drafts", "Landing pages"] },
  capabilities: {
    pages: { dir: "content/pages" },
    landing: { dir: "content/landing", urlPrefix: "/", schema: "content/landing.schema.json" },
    articles: { dir: "content/articles", urlPrefix: "/news/" },
  },
  rules: curaRules,   // adapter over the site's lib/*.ts, see §7.3
};
```

- A new site gets a config and a `rules` adapter. A site without landing pages or articles leaves
  those capabilities out, and the tools refuse them for that site.
- The site's rules paths are also covered by the ignored build step in §12.
- avilabs.is is static HTML today and isn't a target yet (§17).

## 11. Logging

- **One JSON line per tool call** on stdout (Vercel runtime logs):
  `{ ts, requestId, event: "tool", user: email, clientHost, tool, site, changeId, files, outcome: ok|refused|error, code, durationMs, argsDigest }`.
  Large arguments (content, base64) are logged only as size and SHA-256.
- **Other events:** sign-in allowed or denied (email and reason), token refresh, refresh-token
  reuse detected, preview opened, and upload done.
- **Never logged:** tokens, codes, secrets, image data or full content.
- **Durable trail** in GitHub: branch commit authorship, a PR comment for each action, and the
  squash commit's trailers.

## 12. Deployment and the ignored build step

- **Vercel project** `avi-websites-mcp`, with root directory `mcp/`, Node 22 and Fluid compute. It
  uses the default function timeout; nothing runs long.
- **Rebuild only when it matters.** `mcp/vercel.json`:

  ```json
  { "ignoreCommand": "sh scripts/should-build.sh" }
  ```

  `mcp/scripts/should-build.sh` runs in `mcp/`, as Vercel runs it in the root directory:

  ```sh
  #!/bin/sh
  # Vercel Ignored Build Step: exit 1 = build, exit 0 = skip.
  # Build when mcp/, any site's lib/, or any site's landing schema changed since the last
  # deployment of this branch. If that base commit is unknown or not in the clone, build.
  base="${VERCEL_GIT_PREVIOUS_SHA:-}"
  if [ -z "$base" ] || ! git cat-file -e "$base^{commit}" 2>/dev/null; then exit 1; fi
  if git diff --quiet "$base" HEAD -- . \
       ':(top,glob)sites/*/lib/**' \
       ':(top,glob)sites/*/content/landing.schema.json'; then
    exit 0
  fi
  exit 1
  ```

  - `git diff --quiet` exits `1` when something changed, so the script builds.
  - Any git error (for example a shallow clone without the base) also falls through to `exit 1`,
    so the failure mode is "build", never "skip".
  - A unit test runs the script against a temporary git repo for each case.
  - The README documents the same command for pasting into the dashboard, in case the project is
    set up there instead.

## 13. Environment variables

| Variable | Purpose |
|---|---|
| `PUBLIC_BASE_URL` | For example `https://avi-websites-mcp.vercel.app`. It's the issuer, and the MCP resource is `<BASE>/mcp`. |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | Google OAuth web client, with redirect `<BASE>/auth/google/callback` (plus the localhost one for dev). |
| `ALLOWED_EMAIL_DOMAIN` | For example `avilabs.is`. Checked against the email domain, `hd` and `email_verified`. |
| `ALLOWED_EMAILS` | Optional comma-separated list that narrows the domain. Empty means the whole domain. |
| `TOKEN_SECRETS` | Comma-separated keys of at least 32 bytes each (base64). The first one signs and encrypts; all of them verify. |
| `ACCESS_TOKEN_TTL_SECONDS` | Default `900`. |
| `REFRESH_IDLE_DAYS`, `REFRESH_MAX_DAYS` | Defaults `7` and `30`. |
| `GITHUB_APP_ID`, `GITHUB_APP_PRIVATE_KEY`, `GITHUB_INSTALLATION_ID`, `GITHUB_REPO` | GitHub App access. `GITHUB_REPO` is `owner/name`. |
| `COMMIT_SIGNING_SECRET` | At least 32 bytes. The key for the `Mcp-Signature` commit trailer (§5). Rotating it blocks publishing of open changes made before the rotation. |
| `REQUIRE_APPROVAL` | `true` makes `publish` wait for an approving PR review. Default `false`. |
| `PREVIEW_BYPASS_SECRET_CURA_AERO` | The "marketing-previews" bypass secret of cura's Vercel project. The name comes from the site config. |
| `KV_REST_API_URL`, `KV_REST_API_TOKEN` | Upstash Redis. The Vercel Marketplace integration sets these. |
| `ALLOWED_CLIENT_ID_HOSTS` | Default `claude.ai`. |
| `EXTRA_REDIRECT_URIS` | Optional. |
| `DEV_MODE` | `1` only locally: allows the Inspector redirect, `http://localhost` as the base URL, and `npm run dev:token`. The server refuses to start if it's set while `VERCEL_ENV=production`. |
| `DRY_RUN` | `1`: validate and log intended commits without writing to GitHub. |

## 14. Layout, tests and local testing

```
mcp/
  MCP-PLAN.md  README.md  package.json  tsconfig.json  vercel.json  .env.example
  src/
    app.ts                 Hono app: routes; exported for Vercel
    auth/                  metadata, authorize, consent, google, token, register, cimd, redirect-uris, tokens (jose), session
    store/redis.ts         the keys in §4.4
    mcp/                   server factory + tools/*.ts (one file per tool)
    github/                app client, changes (branch/commit/PR/squash), previews (deployments/statuses/reviews)
    guardrails/            paths, pointer-edit, field-rules, rich, images, rules-sandbox, drift, publish-gates
    web/                   preview gateway, upload page, consent and error pages
    sites/                 index.ts, types.ts, cura-aero/{config.ts, rules.ts}
    log.ts
  scripts/should-build.sh  ignored build step (§12)
  scripts/dev-token.ts     mints a local access token (DEV_MODE only)
  scripts/revoke.ts        sets revoked:<email>
  test/                    vitest, one file per guardrail area + fixtures
```

**Unit tests** use vitest (it resolves `ajv` and `yaml` for the imported site modules), a mocked
GitHub client and an in-memory Redis fake:

- **Paths.** The allowlist accepts content and image folders. It refuses the schema file,
  traversal, encoded tricks, `app/`, `package.json`, `.github/` and other sites' paths.
- **`update_text`.** Missing pointers, non-string targets, `oldValue` mismatches, structural
  changes, `~0` and `~1` escapes, read-only pointers (including `site.json` outside the footer
  strings), and per-field rules (a bad href, a missing image, bad markup).
- **Site rules reuse.** The real `claims-automation.json` and `landing-catalog.json` pass through
  the sandbox. So do these failures: a reserved slug, an image in the wrong folder, a missing
  image, an image that is part of the same commit, two cta-bands, and an unknown field. Articles
  go through `parseArticle`, including `update_article` with its stale-body check. There are also
  checks that the dependency versions match and that drift detection works.
- **Images.** Magic-byte sniffing, SVG refusal, the size and pixel limits, EXIF and GPS removal,
  resizing, WebP-only output, and file-name cleanup.
- **Upload link.**
  - Token expiry and single use.
  - An email mismatch against the browser session.
  - Folder and name rules.
  - The file lands on the change's branch with the right author.
- **Git safety.**
  - Refs are only ever `mcp/…`, and non-fast-forward updates are refused.
  - The author is the marketer and the committer is the bot, both set explicitly.
  - Squash merges are sent with `sha`, and their message carries the `Co-authored-by` and
    `Published-by` trailers.
- **Publish gates.** Each gate is checked on its own: pending, failed, a success for an older
  SHA, a failing unrelated check, a diff outside the allowlist, a conflict, and commits with a
  **missing, invalid (wrong key, altered tree, parent or author) and valid `Mcp-Signature`
  trailer**. There's also the draft warning when a change contains draft pages. With `REQUIRE_APPROVAL`: no review, an approval of an older SHA, an
  approval later followed by changes requested, and a valid approval.
- **Undo** against a squashed commit. Added files are deleted and modified files restored, and it
  refuses when a file changed since.
- **Auth.**
  - Metadata documents, and the `401` challenge shape.
  - PKCE S256.
  - Code expiry and replay.
  - Refresh rotation and reuse revocation.
  - Token `aud`, `iss` and `exp`, and the revoked-email check.
  - Email domain, `hd`, `email_verified`, and `ALLOWED_EMAILS` narrowing (empty list = whole
    domain; case-insensitive).
  - Redirect-URI matching, including loopback on any port.
  - CIMD: host allowlist, `client_id` self-match and size limit.
  - Stateless DCR round trip.
  - The `state` and cookie binding.
- **main-guard.** The workflow script, run as written with a fake `gh`. It covers squash and merge
  commits, several PRs in one push, a direct push, a direct commit on top of a merge, a PR branch
  commit pushed straight to `main`, force pushes, recreating and deleting `main`, broken history,
  and API failure. It also checks the permissions and that no `${{ }}` expressions go into the
  script.
- **Build script.** `should-build.sh` builds for a change in `mcp/`, in a site's `lib/`, or in a
  site's `landing.schema.json`, and when the base is unknown. It skips for a content-only change.
- **Logging.** Tokens and base64 never appear in a log line.

**Local testing with the MCP Inspector:**

1. Copy `.env.example` to `.env.local`. Set `DEV_MODE=1`,
   `PUBLIC_BASE_URL=http://localhost:3000` and `DRY_RUN=1`. Alternatively, point `GITHUB_REPO` at a
   sandbox repo (§17). Redis can be a free Upstash database or the in-memory fake
   (`REDIS=memory`, DEV_MODE only).
2. Run `npm run dev` (Hono on Node, port 3000).
3. Run `npx @modelcontextprotocol/inspector`, choose Streamable HTTP, and enter
   `http://localhost:3000/mcp`. Then either:
   - **Fast path:** `npm run dev:token -- you@avilabs.is` prints a 15-minute access token. Paste
     it into Inspector's Authentication → Bearer token.
   - **Full OAuth:** use Inspector's OAuth flow, which goes through DCR, the consent page, Google
     and the token endpoint. This needs `http://localhost:3000/auth/google/callback` on the
     Google client.
4. To test Claude end to end, deploy a Vercel preview of `avi-websites-mcp`, or use a
   `cloudflared` tunnel with `PUBLIC_BASE_URL` set to it, and add that URL as a custom connector.

## 15. Rollout

1. **Set up the accounts.**
   - A GitHub App with the permissions in §5, installed on this repo only. `main` gets **no
     ruleset**. Squash merging must be allowed in the repository settings.
   - `.github/workflows/main-guard.yml` is merged with this project, so Actions is enabled.
   - A Google OAuth client with an Internal consent screen.
   - The Vercel project `avi-websites-mcp` (root `mcp/`), with Upstash Redis from the Marketplace.
   - The bypass secret "marketing-previews" on cura's Vercel project.
2. **Verify on a test PR before anyone uses the server:**
   - the bypass redirect lands on a URL without the secret (§8, step 4);
   - the GitHub deployment environment and status context names Vercel posts for cura (they go
     into the config);
   - the squash commit shows the marketer as co-author;
   - `should-build.sh` skips on a content-only commit and builds on a `lib/` change;
   - main-guard passes for the squash merge of the test PR.
3. **Test with the Inspector** (`DRY_RUN`, then the sandbox), then on the real repo with one
   person.
4. **Connect Claude.** An Organization Owner adds the connector in claude.ai with the OAuth client
   set to "Use Claude's published identity" (CIMD). The server logs the CIMD URL on first
   sign-in.
5. **Recommended outside `mcp/`**, done in the Vercel dashboard and not by this project: turn on
   "skip deployments when there are no changes to the root directory" for each **site** project,
   so an MCP change or another site's change doesn't rebuild every site.

## 16. Out of scope for this project

- Changes under `sites/`.
- A `.github/workflows` check running the site's `npm test`. The server already enforces the same
  Rich whitelist check before committing, and the site build is the final gate. It can be added
  later. (`main-guard.yml`, §7.8, is the one approved file outside `mcp/`.)
- Editing avilabs.is, grounded, impax and plan3.

## 17. Decisions

**Your answers:**

| # | Decision |
|---|---|
| Q1 | **Upstash Redis via the Vercel Marketplace** for single-use codes, refresh rotation, one-time upload links, revocation and rate limits (§4.4). |
| Q3 | **`ALLOWED_EMAILS` narrows.** The user must be in `ALLOWED_EMAIL_DOMAIN` **and** on the list; an empty list means the whole domain. |
| Q4 | **The sign-in gateway**, with the secret dropped from the URL by Vercel's cookie redirect. That is verified in rollout; if it fails I switch to the reverse proxy. Rotation is one README section (§8). |
| Q5 | **A signed one-time upload link.** Photos are downsized in the browser, then resized and cleaned by the server, and committed to the change's branch (§9). |
| Q9 | **No ruleset on `main`** (no GitHub Pro; this replaces the earlier answer). `main` is protected by the server's code, and `main-guard.yml` detects anything else (§5, §7.8). **Squash merges**, with the commit on `main` authored by the App and the marketer as co-author (§5). **`REQUIRE_APPROVAL`**, default off, makes `publish` wait for an approving review (§7.6). |
| Build | The MCP redeploys when `mcp/`, `sites/*/lib/` or `sites/*/content/landing.schema.json` change. `vercel.json` sets the `ignoreCommand`, and the README documents it (§12). |

**Approval changes (2026-09-30):**

| # | Change |
|---|---|
| A1 | The GitHub App also has **Checks: read**. Nothing else is needed. Labels and PR comments are covered by Pull requests: write. |
| A2 | Every server commit carries the **`Mcp-Signature` HMAC trailer**. Gate 2 accepts a commit on a valid trailer; GitHub's "Verified" is optional (§5, §7.6). |
| A3 | New articles and landing pages default to **`draft: false`**. `get_preview` and `publish` warn about any draft pages in the change (§7.6). |
| A4 | ~~GitHub Pro and a ruleset on `main`~~ **Withdrawn:** there is no ruleset. Publish gate 4 no longer reads "checks required by main's ruleset". Detection is by `.github/workflows/main-guard.yml` (§7.8). |

**My recommended defaults, for the questions you left to me:**

| # | Default |
|---|---|
| Q2 | CIMD client ids are accepted only from `claude.ai` (`ALLOWED_CLIENT_ID_HOSTS`). Other clients, such as the Inspector, use DCR within the redirect-URI allowlist. The exact Claude CIMD URL is logged on first use. |
| Q6 | SVG uploads are refused. |
| Q7 | Internal (basic-auth) page content is editable, and marked `internal` in `list_pages`. In `content/site.json`, only the three footer strings are editable. |
| Q8 | `update_article` is added (§6). |
| Q10 | The server ignores other projects' Vercel statuses. Turning on "skip unaffected" for the site projects is a recommended dashboard step (§15.5). |
| Q11 | Every allowed marketer can edit and publish every configured site. A per-site `editors` list can be added to the config later. |
| Q12 | `discard_change` is added (§6). |
| Q13 | No log drain for now. The audit log is Vercel runtime logs plus the durable GitHub trail. A drain can be added later without code changes. |
| Q14 | Access tokens last 15 minutes; refresh tokens 7 days idle and 30 days maximum. |
| Q15 | `undo` goes through the same preview and publish gates, with no bypass. |
| Q16 | Local testing starts with `DRY_RUN=1`. A sandbox repo (`avi-websites-sandbox`, same App installed) is recommended for end-to-end tests once you create it. |
| Q17 | cura.aero is the only site for now; the config shape is designed for the others. |
| Q18 | No site-test workflow in `.github/` (it's outside `mcp/`); the server does the whitelist check (§16). |

## 18. Implementation notes

Where the code differs from the plan above, and why:

| Area | Difference |
|---|---|
| Tools | A 16th tool, **`check_upload(upload_id)`**. An upload link can be made before a change exists (images come before the landing page that uses them), so the first upload creates the change. `check_upload` tells Claude which change it went into. |
| Tests | **`node:test`** instead of vitest, as in the sites. A vitest dependency (`source-map-js`) returned 404 from the registry at install time, and Node 22 runs TypeScript directly. |
| Build | The build writes **Vercel's Build Output API** itself (`scripts/build.mjs`): an esbuild bundle plus sharp's runtime packages. This keeps control over how the site's rule files resolve their dependencies. The site rules are bundled by `scripts/gen-rules.mjs`, which forces `ajv`/`yaml` to resolve from `mcp/node_modules`. |
| Paths | Writable paths must be **lowercase** (`[a-z0-9._-]` per segment). Otherwise `content/Landing.schema.json` would be a different file on Linux, but would collide with the real schema on a case-insensitive (macOS) checkout. |
| `update_text` | Edits are applied **in place in the JSON text**, so the file keeps its formatting and a one-word edit is a one-line diff. The result is re-parsed and must equal the structurally checked edit. For the whole-file check, a non-landing file checks every tag against the schema's Rich pattern (the site's `rich.test.ts` rule); edited values must match the full pattern. |
| Tokens | Refresh tokens are `<family>.<jti>.<key id>.<mac>`. The key id lets `TOKEN_SECRETS` rotate. |
| DRY_RUN | Uses an **in-memory copy of the checkout** as GitHub, so the whole flow (PRs, previews, publish, undo) runs locally. Every tool result is prefixed with a dry-run note. `REDIS=memory` (DEV_MODE only) replaces Redis. |
| Gate 4 | Checks from other Vercel projects (other sites) are informational. There's no required-checks list, since there's no ruleset. |
| main-guard | GitHub emails a failed run to the pusher, not always the owner (§7.8). |
