# cura.aero → Next.js migration plan

> **How this runs:** this document is written to `sites/cura.aero/MIGRATION-PLAN.md` first, then
> implemented in the order in §14, with a commit after each page passes its diff.
> Nothing outside `sites/cura.aero/` is touched at any step.
>
> **Revision 2 (review changes):**
> 1. `<Rich>` is a strict whitelist parser. All content is treated as untrusted.
> 2. Articles are plain Markdown with YAML frontmatter.
> 3. Internal pages sit behind basic auth set in environment variables, and the client-side deck gate is removed.

## Context

`sites/cura.aero` is 10 hand-written HTML pages plus one shared `style.css`, deployed to Vercel as a static site.
Marketing copy, layout and scripts are all mixed together in each file, and there is no way to add articles.
The goal is a Next.js (App Router, TypeScript) project that:

- looks the same page by page,
- keeps every URL and all tracking working,
- moves all copy into `content/`,
- adds a Markdown articles section.

Content files will later be written by an automated tool from marketing input. **All content is untrusted input** (see §6).

### What the audit found

- The pages come in **three unrelated visual families**:
  - **Marketing:** `index`, `evidence-automation`, `book-demo`. They use `style.css`, GA, the site header and the site footer.
  - **Internal documents:** `evidence-package`, `workflow`, `update`, `value-props`, `aha`, `non-connected-value`. Each has a document header and its own inline CSS. Only two of them load `style.css`.
  - **Slide deck:** `aireuropa`. It has the Plus Jakarta Sans font and fully separate CSS.
- `aireuropa.html` and `aha.html` do not share a layout. The page made for one airline is `non-connected-value.html` ("Prepared for Riyadh Air"). The templates follow the three real families.
- Only 3 pages have GA, the favicon and full SEO meta.

### Decisions

| Topic | Decision |
|---|---|
| Templates | Marketing, Doc and Deck templates, plus Article and News-list templates. Each existing page keeps its current look exactly. |
| Internal pages | All 6 doc routes and `/aireuropa` sit behind basic auth. They also get `noindex, nofollow`. |
| Articles | `content/articles/<slug>.md` with YAML frontmatter. List at `/news`, articles at `/news/[slug]`. Not linked, noindex, not in the sitemap, and each article has a `draft` flag. |
| Fixes | Broken `index3.html` logo links go to `/`. The book-demo footer "AviLabs" link goes to avilabs.is. The Unsplash CTA photos are self-hosted. The integrations label is "Omnichannel" on both desktop and mobile. |
| Next.js | 16.3.7, the current `latest`, pinned exactly. React 19. |

---

## 1. Page list

| Current file | New route | Template | Access | Robots | Scripts that must keep working |
|---|---|---|---|---|---|
| `index.html` | `/` | Marketing | public | index,follow | GA, header hide-on-scroll, fade-up, hero workflow animation (branching) |
| `book-demo.html` | `/book-demo` | Marketing | public | index,follow | GA, HubSpot Meetings embed, header, fade-up |
| `evidence-automation.html` | `/evidence-automation` | Marketing | public | index,follow | GA, header, fade-up, 3 linear workflow animations |
| `evidence-package.html` | `/evidence-package` | Doc | **basic auth** | noindex,nofollow | fade-up, 2 linear workflow animations |
| `workflow.html` | `/workflow` | Doc | **basic auth** | noindex,nofollow | fade-up, 4-way branching workflow and a mobile-only stacked flow |
| `update.html` | `/update` | Doc | **basic auth** | noindex,nofollow | none |
| `value-props.html` | `/value-props` | Doc | **basic auth** | noindex,nofollow | fade-up, image placeholder that hides once the image loads |
| `aha.html` | `/aha` | Doc ("overview" header variant) | **basic auth** | noindex,nofollow | none |
| `non-connected-value.html` | `/non-connected-value` | Doc | **basic auth** | noindex,nofollow | fade-up |
| `aireuropa.html` | `/aireuropa` | Deck | **basic auth** | noindex,nofollow | slide nav: keys, dots, Back/Next, flow sub-steps. The client password gate is **removed**. |
| (new) | `/news` | News list | public | noindex (until launch) | GA |
| (new) | `/news/[slug]` | Article | public | noindex (until launch) | GA |

## 2. URL mapping and redirects

All redirects are permanent (308) and live in `next.config.ts` `redirects()`. Next applies config redirects **before** the proxy, so an old `.html` URL for an internal page redirects first and then asks for credentials.

| Old URL | New URL |
|---|---|
| `/index.html` | `/` |
| `/book-demo.html` | `/book-demo` |
| `/evidence-automation.html` | `/evidence-automation` |
| `/evidence-package.html` | `/evidence-package` |
| `/workflow.html` | `/workflow` |
| `/update.html` | `/update` |
| `/value-props.html` | `/value-props` |
| `/aha.html` | `/aha` |
| `/non-connected-value.html` | `/non-connected-value` |
| `/aireuropa.html` | `/aireuropa` |
| `/assets/:path*` | `/images/:path*` (keeps old og:image and JSON-LD logo URLs working in social caches) |
| `/values/:path*` | `/images/values/:path*` (then basic auth, see §6) |
| `/cura_logo.svg` | `/images/cura_logo.svg` |

- Page redirects are an explicit list, not a `*.html` wildcard, so unknown URLs still return 404.
- `/style.css` goes away because it is not a page.
- Canonical URLs, `og:url`, JSON-LD URLs and sitemap entries all move to the new extensionless URLs.

## 3. Templates and components

Components only handle layout and behaviour. Every visible string comes from `content/`: headings, labels, alt text, aria-labels, button text, footer lines and slide copy. Credentials never do.

### Templates (`templates/`)

- **`MarketingTemplate`** is the site `Header` (logo link, nav items, CTA, all from content), then the page body, then the site `Footer`.
  - Used by home, book-demo, evidence-automation, news and articles.
  - The header differs per page today: home has an empty nav, evidence-automation has Home and How it works, book-demo has "Back to site". So nav and CTA come from each page's content file.
- **`DocTemplate`** is a `.wf-doc`/`.container` wrapper with a `DocHeader` (logo, doc label, doc date), a `DocTitle` (chip, h1, lead) and an optional `DocFooter`.
  - An `overview` variant gives aha its sticky header with the "Internal" badge and hero banner.
- **`DeckTemplate`** is the Cura logo `<symbol>`, the slide stage and the bottom nav.
  - Slides are typed entries in content: `title`, `stats`, `silos`, `flow`, `table`, `pack`, `mono`, `cards`, `learning`, `list`, `quote`.
  - A future airline deck only needs a new JSON file plus its route added to the auth list (§6).
- **`ArticleTemplate`** and **`NewsListTemplate`** are new designs. They use the existing site tokens (chip, h1, container, header and footer) and add a small prose stylesheet.

### Shared components (`components/`)

- `site/`: `Header`, `ScrollHideHeader` (client), `Footer`, `Analytics` (GA snippet), `CtaBand` (home and evidence-automation).
- `shared/`:
  - `FadeUpObserver` (client).
  - `Rich`: the safe inline-markup renderer, see §6.
  - `SafeLink`: renders content hrefs only after they pass the URL allowlist.
- `workflow/`: `Workflow` renders nodes, badges, connectors and forks from data. Three client animation wrappers copy today's timings line for line:
  - `HomeFlow`: branching, the last node stays running.
  - `LinearFlow`: `runFlow`.
  - `BranchFlow`: 4-way fork plus the mobile flow.
  - All three respect `prefers-reduced-motion`.
- `evidence/`: `CompareCards`, `SourceLegend`, `MailPair`, `LearningPanel`, `StepList`. Both evidence pages share these.
- `home/`: `Hero`, `ProblemTags`, `Insight`, `WhatWeDo`, `Capabilities`, `IntegrationsHub` (SVG geometry in the component, labels from content), `AviLabsFamily`.
- `docs/`: `FactCards`, `VpRows`, `VpCardGrid` + `VpIcon` (icon map), `CategoryCards`, `StandaloneFlow`, `Phases`, `Timeline`.
- `deck/`: `Deck` (client: slide state, keyboard, dots, flow sub-steps), `CuraLogoSymbol`, and one component per slide type.

## 4. Content file structure

```
content/
  site.json                  brand name, GA id, org address, footer lines, AviLabs link, default OG image, Organization/WebSite JSON-LD
  pages/
    home.json                seo, header, hero (+ workflow nodes), problem, insight, whatWeDo, capabilities[8],
                             integrations {hubLabels, mobileLabels, logos}, avilabs, cta {title, button, photos}
    book-demo.json           seo, header, intro, points[], hubspotMeetingUrl
    evidence-automation.json seo, header nav, hero (+ workflow), pain, compare, howItWorks, practice, learning, cta
    evidence-package.json    seo, docHeader, title, facts[3], stages, practice, reference steps[18]
    workflow.json            seo, docHeader, title, facts[3], flow (spine + 4 branches), mobileFlow
    update.json              seo, docHeader, title, phases[3], timeline, footer
    value-props.json         seo, docHeader, title, categories[{label, title, intro, items[{title, benefits[], body[], image}]}], footer
    aha.json                 seo, header badge/label, hero, sections[{num, chip, title, intro, count, cards[]}], footer
    non-connected-value.json seo, docHeader, title, regulations[], categories[], flow, footer
    aireuropa.json           seo, slides[]            (no gate, no password)
  shared/
    evidence-sources.json    stage 1/2 copy and flows, source legend, request/reply letters. Used by both evidence pages.
  articles/
    <slug>.md                YAML frontmatter + plain Markdown body
```

- **Typing:** `lib/content-types.ts` holds the interfaces. `lib/content.ts` imports each JSON and assigns it to its interface, so a content file with the wrong shape fails `tsc` and the build.
- **Inline markup:** strings may use the whitelist in §6. HTML entities become real characters. `<Rich>` also decodes a fixed set of named entities (`&mdash; &middot; &rarr; &hellip; &amp; &nbsp; &ldquo; &rdquo;`) plus numeric ones, as text.
- **Workflow schema:** `{ nodes: [ {icon, title, lead?, actor?, actorCura?, badges?: {done, prog}, body? | list?, headOnly?, draft?, cond?} | {branch: [[node…], …]} ] }`
  - `icon` must be a plain Material Icons name (`^[a-z0-9_]+$`). Anything else renders no icon.

### Article frontmatter (`content/articles/<slug>.md`)

```yaml
---
title: "…"            # required, string
description: "…"      # required, string
date: 2026-10-01      # required, ISO date
author: "…"           # optional
image: /images/news/x.jpg   # optional, must be under /images/
draft: true           # required, boolean
---
Plain Markdown body. No HTML, JSX, imports or exports.
```

`<slug>` must match `^[a-z0-9]+(-[a-z0-9]+)*$`. Any other filename fails the build.

## 5. Styling approach (the key to "looks identical")

- `style.css` becomes `styles/site.css` **verbatim**. The only edit is the background URL, which becomes `/images/cura-mountains.jpg`.
- Each page's inline `<style>` block moves verbatim into `styles/pages/<page>.css`, imported only by that page.
  - The deck gets `styles/deck.css`, without the now-unused `#gate` / `html.locked` rules.
- **Route groups:**
  - `app/(site)` imports `site.css` and the Onest and Material Icons links.
  - `app/(docs)` loads fonts only. `evidence-package` and `workflow` also import `site.css`, as today.
  - `app/(deck)` loads Plus Jakarta Sans.
- **Isolation:** page CSS files clash with each other (for example `.page-header` and `.vp-card` differ per page). Links between pages are plain `<a>` (full page loads), so:
  - no route's CSS carries over into another;
  - GA still sends one page_view per page, exactly as today.
- **Fonts:** Google Fonts `<link>` tags stay as they are. next/font would rename font families and does not handle Material Icons Round.
- **Early scripts:** the inline `js` class script runs at the top of `<body>`, before content, as today. `<html>` gets `suppressHydrationWarning` because the script changes its class.

## 6. Security

### 6a. `<Rich>`: whitelist parser, no `dangerouslySetInnerHTML`

`lib/rich.ts` has a small hand-written tokenizer, with no dependency. It turns a string into a tree. `<Rich>` maps the tree to React elements, so all text is escaped by React.

- **Allowed tags:** `br`, `strong`, `b`, `em`, `span`. Nothing else.
- **Allowed attributes:** only `class` on `span`, and only if every class is in the allowlist: `orange hi hi-orange hi-white text-bold wf-lead ev-quiet`. Classes outside the list are dropped. A `span` with no allowed class is rendered as its children only.
- **Anything else is stripped:**
  - unknown or disallowed tags such as `<script>`, `<img>`, `<a>`, `<style>` and `<iframe>` lose the tag;
  - their inner text is kept as plain escaped text;
  - `<script>` and `<style>` contents are dropped entirely;
  - comments, doctype and processing instructions are dropped;
  - every attribute other than an allowed `class` is dropped, including `on*`, `style` and `href`.
- **Malformed input:** unclosed tags are closed at the end, stray closing tags are ignored, and nesting depth is capped (16). Malformed input never throws. It degrades to text.
- **Tests:** unit tests in `lib/rich.test.ts` run with Node's built-in runner (`node --test`, native TS type stripping, Node ≥ 22.18) and add no test dependency. They cover:
  - XSS payloads: `<script>`, `<img onerror>`, `<svg onload>`, `javascript:`, entity-encoded tags, uppercase and odd-spaced tags, `<span class="x" onclick>`;
  - nesting;
  - unclosed and stray tags;
  - every string currently in `content/`, round-tripped through the parser.

### 6b. Other places content reaches the page

| Sink | Protection |
|---|---|
| hrefs (nav, CTAs, footer, article links) | `SafeLink` allowlist: `/…` relative, `#anchor`, `https:`, `mailto:`. Anything else is dropped and rendered as text. External links get `rel="noopener noreferrer"`. |
| Image `src` (content and frontmatter) | Must start with `/images/` and must not contain `..`. Otherwise no image is rendered. |
| JSON-LD `<script type="application/ld+json">` | Serialised with `JSON.stringify`, then `<`, `>`, `&`, U+2028 and U+2029 are escaped to `\uXXXX`, so content cannot close the script tag. |
| GA id interpolated into the inline snippet | Must match `^G-[A-Z0-9]{4,20}$`. Otherwise the snippet is not rendered at all. |
| HubSpot meeting URL (`data-src`) | Must start with `https://meetings.hubspot.com/`. |
| Workflow icon names, slide types, template variants | Enum or regex checked. Unknown values render nothing. |
| Metadata (title, description, OG) | Goes through the Next Metadata API, which escapes it. |
| Markdown articles | See §9: no raw HTML, sanitised URLs. |

`dangerouslySetInnerHTML` is used in exactly two places:

- the GA snippet and the `js` class script, which are fixed code, with only the validated GA id interpolated;
- JSON-LD, escaped as above.

### 6c. Basic auth for internal pages

- `proxy.ts` at the project root. `proxy.ts` is Next 16's name for `middleware.ts`, with the same API.
- **`config.matcher` covers:**
  - `/evidence-package`, `/workflow`, `/update`, `/value-props`, `/aha`, `/non-connected-value`, `/aireuropa`;
  - `/images/values/:path*`, the product screenshots that only value-props uses.
- **Credentials:** `INTERNAL_USER` and `INTERNAL_PASSWORD` environment variables only. They are never in content, code or git. Local development uses `.env.local`, which the repo's `.env*` rule already ignores.
- **Check:**
  - parse `Authorization: Basic …`;
  - compare user and password with a constant-time comparison (a hand-written XOR loop, since the edge runtime has no `timingSafeEqual`).
- **On failure:** `401` with `WWW-Authenticate: Basic realm="Cura internal", charset="UTF-8"`.
- **Fails closed:** if either env var is missing or empty, every protected route returns `401`, never open. A startup warning is logged.
- **On success:** the response gets `X-Robots-Tag: noindex, nofollow` and `Cache-Control: private, no-store`, on top of the noindex meta.
- **Image optimizer bypass:**
  - The value-props screenshots use `unoptimized`, so the browser fetches `/images/values/N.png` directly and sends its cached credentials.
  - `images.localPatterns` only allows `/images/*`, `/images/cta/**` and `/images/news/**`. This blocks `/_next/image?url=/images/values/…` from getting around the proxy.
- **Removed:** the client deck gate (form, `locked` pre-paint script, localStorage key and password) is gone from code and content.
- **Test:** a `node --test` test checks that every folder under `app/(docs)` and `app/(deck)` has a matching matcher entry, so a new internal page can't be left public by accident.
- **Vercel setup (your action):** add `INTERNAL_USER` and `INTERNAL_PASSWORD` in Vercel → Project → Settings → Environment Variables for Production and Preview. Until they are set, the internal pages return 401, because auth fails closed.

## 7. Forms, scripts and tracking

- **GA (G-83QLM5X9DK):**
  - The inline snippet is copied exactly, including the check that it only runs on `cura.aero` and `www.cura.aero`.
  - It is rendered in the `(site)` layout, so it covers the 3 marketing pages as today, plus news and articles.
  - Doc and deck pages stay without GA, as today.
  - No `@next/third-parties`.
- **HubSpot Meetings (book-demo):**
  - The `.meetings-iframe-container` div, with the validated `data-src`, is server-rendered.
  - `MeetingsEmbedCode.js` loads through `next/script` (`afterInteractive`).
  - This is the only form on the site.
- **Behaviour ports:** header hide-on-scroll, fade-up, the workflow animations, deck navigation and the value-props image placeholder all move into small client components. Their logic and timings are copied line for line. The deck's keydown handler no longer checks `locked`.

## 8. Images

- `assets/*` moves to `public/images/*` and `values/*.png` to `public/images/values/`. Both are moved with `git mv` so history is kept. The unused `cura_logo.svg` moves to `public/images/`.
- The four Unsplash CTA photos are downloaded, at the same 440×440 crops, to `public/images/cta/`.
- **next/image is used for every `<img>`,** with intrinsic width and height from the files.
  - Header logos get `priority`. Everything else stays lazy.
  - SVGs are served unoptimized automatically.
  - Where the CSS sets only one dimension, the image gets `width/height: auto`. The screenshot diff checks this.
  - `images.localPatterns` is restricted as in §6c.
  - The value-props screenshots use `unoptimized` because they sit behind auth. They are served byte-identical to today.
- **Not next/image, because it can't apply:**
  - the `.whatwedo` CSS background,
  - the `<image href>` inside the integrations SVG,
  - inline SVG icons,
  - the deck's logo `<symbol>`.

## 9. Articles and news

- **Dependencies:**
  - `yaml` parses the frontmatter. `lib/articles.ts` splits the frontmatter itself, so no gray-matter.
  - `react-markdown` renders the body.
- **Validation at build:** each article's frontmatter is checked against the schema in §4 (types, ISO date, `/images/` path, slug regex). An invalid article fails the build with the file name and field in the error.
- **Rendering:** `react-markdown` builds React elements directly, with no `dangerouslySetInnerHTML`.
  - `skipHtml: true`: raw HTML in Markdown is dropped.
  - No `rehype-raw`.
  - The default `urlTransform` strips `javascript:`, `data:` and similar URLs. Links also go through `SafeLink`.
  - `allowedElements`: p, h2–h4, ul, ol, li, blockquote, strong, em, a, code, pre, hr, img.
  - Images must be under `/images/`. They render with next/image `fill` inside a fixed-ratio figure.
- **Drafts:** `draft: true` articles are left out of production builds. Dev mode still shows them.
- **Routes:**
  - `/news/[slug]` pre-builds every published article (`generateStaticParams`, `dynamicParams = false`).
  - `/news` lists title, date and description, newest first.
  - Both are noindex and not in the sitemap or nav until launch.
- One example article ships with `draft: true`.

## 10. SEO: meta, robots, sitemap, favicon

- **Per-page meta:** each page's `seo` block feeds the Metadata API. This covers:
  - title and description,
  - canonical,
  - robots,
  - author "AviLabs",
  - Open Graph (type, site_name, title, description, url, image, image:alt, locale),
  - Twitter (card, title, description, image).
  - The theme colour `#051457` is set through the `viewport` export.
- **Values:** copied as they are today, except that URLs become extensionless, asset URLs move to `/images/…` and internal pages get noindex.
- **JSON-LD:** the home graph (Organization, WebSite, SoftwareApplication) and the book-demo graph (WebPage, BreadcrumbList) come from content, escaped as in §6b.
- **robots.txt:** static `public/robots.txt`, byte-for-byte unchanged.
- **sitemap.xml:** static `public/sitemap.xml` with the same 3 entries, the same changefreq and priority, and the new URLs.
- **Favicon:** `public/images/favicon.png` through `metadata.icons` on all pages.

## 11. Project layout

```
sites/cura.aero/
  app/
    layout.tsx                 root: <html lang="en">, <body>; nothing visual
    (site)/layout.tsx          site.css, fonts, GA, js-class script, FadeUpObserver
    (site)/page.tsx            /
    (site)/book-demo/page.tsx
    (site)/evidence-automation/page.tsx
    (site)/news/page.tsx
    (site)/news/[slug]/page.tsx
    (docs)/layout.tsx          fonts, js-class script, FadeUpObserver
    (docs)/{evidence-package,workflow,update,value-props,aha,non-connected-value}/page.tsx
    (deck)/layout.tsx          Plus Jakarta Sans
    (deck)/aireuropa/page.tsx
  proxy.ts                     basic auth for internal routes
  templates/  components/  styles/  content/
  lib/  content.ts  content-types.ts  rich.ts  safe-url.ts  articles.ts  basic-auth.ts
        rich.test.ts  safe-url.test.ts  basic-auth.test.ts  internal-routes.test.ts
  public/  images/…  robots.txt  sitemap.xml
  next.config.ts  tsconfig.json  package.json  package-lock.json
  vercel.json                  { "framework": "nextjs" }
  .gitignore                   .next/, next-env.d.ts, *.tsbuildinfo
  .env.example                 INTERNAL_USER=, INTERNAL_PASSWORD= (names only, no values)
  README.md                    dev/build/test commands, where content lives, how to add an article, a deck or an internal page
  MIGRATION-PLAN.md
```

## 12. Dependencies (minimal)

- **Runtime:** `next@16.3.7` (pinned), `react`, `react-dom`, `react-markdown`, `yaml`.
- **Dev:** `typescript`, `@types/react`, `@types/react-dom`, `@types/node`.
- **Not added:** no MDX packages, gray-matter, sanitizer library, test framework, Tailwind, ESLint, CSS-in-JS or analytics package.
- **Scripts:**
  - `dev`, `build`, `start`;
  - `typecheck` (`tsc --noEmit`);
  - `test` (`node --test lib/*.test.ts`).
- `engines.node >= 22.18`.
- Screenshot and diff tools for checking are run with `npx` from the scratchpad and never added to the project.

## 13. Intentional differences from today (everything else matches)

1. `.html` URLs redirect to extensionless URLs. Canonical, og:url and sitemap URLs change to match.
2. Asset URLs move from `/assets/…` and `/values/…` to `/images/…`, with redirects.
3. **The 6 internal doc pages and `/aireuropa` need a browser basic-auth login.** `evidence-package` and `workflow` were public before. The aireuropa password form is gone, and the browser's login prompt replaces it.
4. Noindex (meta and `X-Robots-Tag`) is on all internal pages.
5. The favicon now appears on every page.
6. The logo on value-props and non-connected-value links to `/` (it was a broken link to `index3.html`).
7. The book-demo footer "AviLabs" link goes to avilabs.is (it was `#`).
8. The CTA photos are served from `/images/cta/` instead of hotlinked from Unsplash.
9. The mobile integrations list says "Omnichannel" (it said "Email Ingestion").
10. Public PNG and JPG images are served through next/image optimization (WebP), so there are tiny compression differences.
11. The deck's unused `data-theme="light"` attribute on `<html>` is dropped.

## 14. Implementation order and commits

Work happens on the current branch `cura-nextjs`. Commits end with the Co-Authored-By trailer. Nothing is pushed.

1. **Plan:** write `MIGRATION-PLAN.md`. **Commit:** "Cura: add Next.js migration plan".
2. **Baseline:**
   - Serve the current static folder locally.
   - Capture Playwright screenshots of all 10 pages at 1440px and 390px, with `prefers-reduced-motion` on so animations settle at once.
   - For the deck, capture every slide with the gate unlocked through localStorage.
   - Dump each page's `<head>` tags.
   - All of this goes to the scratchpad. No commit.
3. **Scaffold:**
   - package.json, lockfile, tsconfig, next.config.ts (redirects, images), vercel.json, .gitignore, .env.example;
   - the root layout and the three group layouts;
   - `git mv` of the images into `public/images` and the downloaded CTA photos;
   - robots.txt and sitemap.xml;
   - `site.css`.

   The old `.html` files stay in place until step 7. **Commit:** "Cura: scaffold Next.js project".
4. **Core and security:**
   - `lib/rich.ts`, `safe-url.ts`, `basic-auth.ts` and `proxy.ts`, with their tests;
   - shared components: Header, Footer, Rich, SafeLink, FadeUp, Workflow and the animation wrappers.

   `npm test` and `npm run typecheck` must pass. **Commit:** "Cura: content renderer, auth proxy and shared components".
5. **Pages, one at a time,** in this order: home → book-demo → evidence-automation → evidence-package → workflow → update → value-props → aha → non-connected-value → aireuropa.
   - Write the content JSON, the page CSS and the sections.
   - Build, then screenshot-diff and head-diff against the baseline.
   - Internal pages are captured with basic-auth credentials from a local `.env.local`.
   - **Commit per page once its diff passes:** "Cura: migrate <page>". Each commit also removes that page's old `.html` file.
6. **Articles:** Markdown loader and validation, the article and news templates, the example draft, and tests for frontmatter validation. **Commit:** "Cura: Markdown articles and news list".
7. **Clean up:**
   - remove `style.css` and any leftovers;
   - update the README;
   - run the full verification in §15.

   **Commit:** "Cura: remove static site, update README".

If a page's diff can't be brought within threshold, I stop and report instead of committing it.

## 15. Verification

- `npm run build`, `npm run typecheck` and `npm test` all pass.
- **Visual:**
  - Run `next start` and take the same screenshots at the same widths.
  - Pixel-diff each against the baseline.
  - Any area over the threshold must be explained by §13, otherwise it gets fixed.
- **Meta:** diff the old and new `<head>` tags per page. Only the changes listed in §13 may differ.
- **Redirects:** `curl -I` every old URL and expect a 308 with the right `Location`. Unknown `.html` URLs return 404.
- **Auth, with curl on each protected route and `/images/values/1.png`:**
  - no credentials → 401 with `WWW-Authenticate`;
  - wrong credentials → 401;
  - right credentials → 200 with `X-Robots-Tag` and `Cache-Control: private, no-store`;
  - env vars unset → 401 (fails closed);
  - `/_next/image?url=/images/values/1.png…` → rejected;
  - public routes are unaffected.
- **Sanitizer:** the unit tests pass. A content file seeded with XSS payloads renders them as text or strips them (checked in the built HTML), then is reverted.
- **robots.txt and sitemap.xml:** fetch both and check the content.
- **Behaviour, by hand:**
  - HubSpot calendar iframe loads.
  - Deck: arrows, space, Home and End keys, dots, and the flow slide's sub-steps.
  - Header hides on scroll.
  - Fade-ups and every workflow animation play.
  - The value-props placeholder hides.
- **GA:** check the snippet does nothing on localhost. After deploy, check that `gtag/js?id=G-83QLM5X9DK` loads on cura.aero and page_views show in GA Realtime.
- **Vercel, after you push:**
  - Confirm the project Root Directory is `sites/cura.aero`.
  - Set the two env vars.
  - Deploy a preview and re-run the redirect, auth and GA checks there before merging.

## 16. Risks and watch-outs

- **Client-side navigation:** switching to `next/link` later would leak page CSS between routes and would need route-change GA tracking. That's a later decision.
- **Integrations hub:** the SVG geometry is tuned to the current label widths. Longer labels in `home.json` also need a pill-width change in `IntegrationsHub`.
- **Basic auth UX:** browsers cache basic-auth credentials per session, and there is no logout. That's fine for internal viewers. Sharing a deck with an external airline means sharing the credentials, so consider per-audience credentials later.
- **New internal pages:** adding one means adding its route to `proxy.ts`. The internal-routes test fails the build if that step is missed.

---

## Implementation notes (where the build differs from the plan)

- **TypeScript 6.0.3**, not 7.x: 7.0 is the new native compiler and was released days before this
  work. 6.0.3 is the last release of the JavaScript compiler, which Next's build-time type check uses.
- **Content loading:** each page imports and types its own JSON file. `lib/content.ts` holds only
  the shared files (`site.json`, `shared/evidence-sources.json`), so each page can be committed on
  its own.
- **Enum-like fields** (card tones, slide types, flow kinds) are typed as `string`, because JSON
  imports widen string literals. They are checked when rendered (unknown values render nothing).
  Deck slides are also validated at build time (`lib/deck.ts`), so a malformed deck fails the build.
- **Content classes kept out of the whitelist:** instead of adding `ev-hash`, `ev-quiet-inline` and
  `wf-actor--cura` to the Rich whitelist, those pieces are structured fields: `integrity.hash`, a
  step item's `source`, and a workflow node's `actorHandoff`.
- **canonical and og:url** are rendered as plain `<link>`/`<meta>` tags (`SeoLinks`), because the
  Metadata API normalises `https://cura.aero/` to `https://cura.aero`.
- **next/image sizing:** `styles/next-image.css` has one zero-specificity rule,
  `:where(img[data-nimg]) { width: auto; height: auto }`. next/image always writes width/height
  attributes, which would distort images where the old CSS set only one dimension. Intrinsic
  sizes are read from the files at build time (`lib/image-size.ts`, no dependency).
- **Material Icons** loads only on the pages that used it before. update, aha and
  non-connected-value never loaded it.
- **The `js` class** that gates the fade-up reveal is set by a `beforeInteractive` script in the
  root layout, so it is in `<head>` as before. It now runs on every page, which has no visual effect
  where no CSS uses it.
- **Viewport meta** is `initial-scale=1` (Next's default) instead of `1.0`. They mean the same thing.
- **`/assets`** on its own also redirects, to `/images`, which is a 404.
- **`next dev`** writes `AGENTS.md` and `CLAUDE.md` into this folder. They are not part of the site.

### Verification results

- **Screenshots** (1440px and 390px, reduced motion, every deck slide and flow sub-step):
  - book-demo, workflow, update and aha: 0 px difference.
  - evidence-package, value-props and non-connected-value: 5 to 41 px (antialiasing).
  - aireuropa: 0 px in 35 of 36 states, 13 px in one.
  - home and evidence-automation: identical except the CTA photos, which were still being
    downloaded, and the re-encoded arrow on home (§13 item 10).
- **Head tags:** only the §13 changes (URLs, robots, favicon) and the viewport spelling.
- **Redirects, basic auth (including failing closed), the image optimizer block, robots.txt,
  sitemap.xml and GA placement:** all checked against a production build.
- **Hostile content:** checked in built HTML, then reverted:
  - XSS strings seeded into a JSON content file;
  - a hostile Markdown article.

  They rendered as escaped text or were stripped.
