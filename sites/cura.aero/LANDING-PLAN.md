# Landing-page builder for cura.aero — plan

Everything below is in `sites/cura.aero/`. Approved 2026-09-30.

## Context

Marketing wants new pages without writing code. An automated tool will produce them from a fixed set
of sections, so pages must be data (JSON), checked against a strict schema, rendered with Cura's
existing look, and safe to accept as untrusted input (the same trust model as `content/` today:
`lib/rich.ts`, `lib/safe-url.ts`). Existing pages must render exactly as they do now.

## What exists that we reuse

- `templates/MarketingTemplate.tsx` + `components/site/Header.tsx`, `Footer.tsx`: header and footer.
  GA and fonts come from `app/(site)/layout.tsx`, so a route in `(site)` gets them for free.
- `components/shared/Rich.tsx`, `Img.tsx` (reads the size from the file, enforces `/images/`),
  `SafeLink.tsx`, `SeoLinks.tsx`, `JsonLd.tsx`; `lib/seo.ts` `buildMetadata`/`buildViewport`.
- `components/site/CtaBand.tsx` is used as it is for `cta-band`.
- The book-demo markup in `app/(site)/book-demo/page.tsx` moves into `components/site/BookDemo.tsx`.
  The existing page then uses that component and renders the same HTML (checked by a diff, see
  Verification).
- `lib/articles.ts` sets the pattern for loading, drafts and errors: `SLUG_RE`, errors in the form
  `file: message`, drafts included only when `NODE_ENV !== "production"` (replaced by `showDrafts()`, below), and
  `app/(site)/news/[slug]` with `generateStaticParams` and `dynamicParams = false`.
- `site.css` classes: `.section .container .chip(-orange|-dark) .btn(-primary|-outline-white) .hero
  .hero-eyebrow .hero-sub .problem/.problem-tags .insight* .whatwedo .caps-grid/.cap-card/.cap-num
  .avilabs-stat-* .integrations-logos* .demo* .spotlight*`. `.spotlight` exists but no page uses it.
- `lib/rich.test.ts` already scans every `.json` under `content/` for markup outside the whitelist,
  so landing files are covered automatically. The schema's own strings must not contain `<`, since
  that test scans the schema file too.

## Section catalog

Every section has `type` (required) and an optional `id` (anchor target: `^[a-z][a-z0-9-]{0,59}$`,
the same rule as `safeId`, and unique within the page). "Rich" means the `<Rich>` whitelist applies;
"text" means plain text with no `<` or `>`. Every image is `{src, alt}` with
`src` under `/images/landing/<slug>/`.

| type | Fields (`?` = optional) | Built from |
|---|---|---|
| `hero` | `eyebrow?` Rich · `title` Rich (h1) · `sub?` Rich · `cta?` Link · `secondary?` Link · `image?` | `.hero .hero-text .hero-eyebrow .hero-sub .btn-primary`; secondary link styled like `.ea-link`; image on the right |
| `text` | `chip?` Rich · `title?` Rich · `body` Rich[] (1–8 paragraphs) · `align?` left\|center | `.section .chip h2 p`, capped measure |
| `image` | `image` · `caption?` Rich · `size?` container\|narrow | `.section .container`, 28px radius like the site panels |
| `image-text` | `chip?` · `title` Rich · `body` Rich[] (1–4) · `points?` Rich[] (check list, ≤6) · `cta?` Link · `image` · `imagePosition` left\|right | `.insight-inner` grid + `.insight-photo-wrap`; points use `.demo-points` check styling; `--left` modifier swaps the columns |
| `cards` | `chip?` · `title?` · `sub?` · `columns` 2\|3\|4 · `numbered?` bool · `items` 2–12 × {`icon?` Material icon · `title` Rich · `body?` Rich} | `.caps-grid .cap-card .cap-icon .cap-num`, with 2- and 3-column modifiers |
| `stats` | `chip?` · `title?` · `items` 2–4 × {`value` Rich · `label` Rich} | `.avilabs-stat-val/-label` typography in a row |
| `logos` | `label?` Rich · `items` 2–12 × ({`image`} \| {`text`}) | `.integrations-logos .integrations-logos-label .integrations-logos-row`, unchanged |
| `quote` | `quote` Rich · `name` text · `role?` text · `company?` text · `image?` (portrait) | `.spotlight` navy panel (radius, orange glow) with a large quote |
| `steps` | `chip?` · `title?` · `sub?` · `items` 2–8 × {`title` Rich · `body?` Rich · `tag?` Rich} | numbered vertical list; numbers use `.cap-num`, cards use `.cap-card` borders |
| `faq` | `chip?` · `title?` · `items` 1–20 × {`question` text · `answer` Rich} | native `<details>/<summary>` (no JS); also adds `FAQPage` JSON-LD |
| `cta-band` | `title` Rich · `button` Link · `photos` exactly 4 image paths | `CtaBand` as it is (at most 1 per page, because it hard-codes `id="book-demo"`) |
| `book-demo` | `chip` · `title` Rich · `sub` Rich · `points` Rich[] (≤6) · `hubspotMeetingUrl?` | extracted `BookDemo` component plus the HubSpot script; the URL defaults to the one in `content/pages/book-demo.json`; at most 1 per page |

**Proposed additions** (patterns already on the current pages):

| type | Fields | Built from |
|---|---|---|
| `tags` | `chip?` · `title` Rich · `body?` Rich · `tags` 2–8 Rich | the home "Today's Reality" band: `.problem .problem-tags` |
| `statement` | `chip?` · `title` Rich (use `hi hi-orange` spans) · `cta?` Link | the home navy "What We Do" band: `.whatwedo` |
| `compare` | `chip?` · `title?` · `body?` · `before`/`after` each {`tag` · `title` · `items` 2–8 × {`icon` · `text` Rich}} | the evidence-automation "now vs Cura" cards. The `.ea-compare*` rules are copied into `landing.css` as `.lp-compare*`, because importing `evidence-automation.css` would also restyle `.wf` and `.cta-section h2` |
| `spotlight` | `chip?` · `title` Rich · `body?` Rich · `items` 2–6 × {`icon` · `title` Rich · `body` Rich} · `cta?` Link | the unused `.spotlight` panel in `site.css` |

Not proposed: the animated workflow diagram, because its geometry is tuned per page, and the
integrations hub, because its SVG pill positions are fixed.

## Landing file shape

```jsonc
{
  "$schema": "../landing.schema.json",   // optional, for editor support
  "draft": true,
  "seo": {
    "title": "…",            // 10–70
    "description": "…",      // 50–160
    "ogImage": { "src": "/images/landing/<slug>/og.jpg", "alt": "…" },
    "noindex": false          // optional; true → robots noindex, left out of sitemap
  },
  "header": { "nav": [ { "label": "How it works", "href": "#steps" } ], "cta": { "label": "Book a Demo", "href": "/book-demo" } },
  "sections": [ { "type": "hero", … }, … ]   // 1–30
}
```

The loader expands `seo` into the existing `Seo` type. The canonical URL and `og:url` are
`https://cura.aero/<slug>`. siteName, locale, author, themeColor and the twitter card copy the
values in `home.json`. robots is the same string as home, or `noindex, nofollow`.

## Schema outline: `content/landing.schema.json` (JSON Schema 2020-12)

- The root, every object in `$defs` and every section have `additionalProperties: false` and list
  their `required` fields.
- `$defs`:
  - `rich`: string, `minLength 1`, a `maxLength` for each use, and a `pattern` that only allows the
    whitelist tags (`br`, `strong|b|em`, and `span class` with RICH_CLASSES). It is built from the
    same regex as `lib/rich.test.ts`, so the tool is told about the rule before the build is.
  - `text`: string with no `<` or `>`.
  - `href`: string with the `safeHref` shapes (`/…`, `#…`, `https://…`, `mailto:`).
  - `link`: {`label` rich ≤40, `href`, `newTab?` bool}.
  - `image`: {`src` `^/images/landing/[a-z0-9]+(-[a-z0-9]+)*/[A-Za-z0-9_-]+\.(jpg|jpeg|png|webp|avif|svg)$`, `alt` text ≤200}.
  - `icon`: `^[a-z0-9_]{1,40}$`. `anchorId`: the `safeId` pattern.
  - One `$def` per section type with `type: {const: "…"}`.
- `sections.items` uses `oneOf` of the section defs with `discriminator: {propertyName: "type"}`.
  Errors then point at the right section type instead of listing all 16.
- `maxContains: 1` for `cta-band` and for `book-demo`.
- Length caps: chip 40, h1/h2 title 120, sub/body paragraph 400/1200, card title 80, card body 300,
  FAQ answer 1500, quote 400. The caps count markup characters too.

**Checks the schema can't express** (in `lib/landing.ts`, with errors in the same format):
- The file name is the slug and matches `SLUG_RE`.
- The slug doesn't collide with a reserved path (see below).
- Every image path uses this page's slug folder and the file exists in `public/`.
- `safeHref` and `safeHubspotMeetingUrl` accept every link. These functions decide; the schema
  patterns only approximate them.
- Section `id`s are unique.

**Validator:** `ajv` (2020 build, with the `discriminator` option), added as an exact-pinned
dependency. A hand-written validator would only cover part of JSON Schema and could drift from what
the automated tool checks against. Error messages look like:
`content/landing/fleet-ops.json: sections[3] (image-text).image.src: must be a file in /images/landing/fleet-ops/`.

## Draft visibility (`VERCEL_ENV`, not `NODE_ENV`)

Vercel preview deployments are production builds too (`NODE_ENV=production`), so `NODE_ENV` can't
tell a preview from the live site.

- `lib/env.ts` exports `showDrafts(env = process.env)`, which returns
  `env.VERCEL_ENV !== "production"`. Drafts are hidden **only** on the live site. They are shown
  in local dev, in local `next build` (where `VERCEL_ENV` is unset) and on Vercel previews
  (`"preview"`). This is the only place the rule is written.
- When hidden, drafts are left out of `generateStaticParams` (so they return 404) and out of the
  sitemap.
- `lib/articles.ts`: `includeDrafts()` is replaced by `showDrafts()`.
  - Change in behaviour: a local production build now includes draft articles, as a preview does.
  - The live site behaves as before.
- `/landing-catalog`: calls `notFound()` when `!showDrafts()`.
- **Draft banner.** `components/shared/DraftBanner.tsx` is a small fixed pill ("Draft, not live",
  bottom-left, navy with an orange dot). Its style lives in `styles/landing.css`, plus a copy of
  the rule in `news.css` for articles.
  - It is rendered on draft landing pages, draft articles and `/landing-catalog`.
  - Published pages don't render it, so their HTML is unchanged.
  - A draft that is shown also gets `robots: noindex, nofollow`.
- The sitemap always leaves out drafts and noindex pages, whatever the environment. This keeps the
  original requirement, and a preview sitemap never lists a draft.
- `lib/env.test.ts` checks that production hides drafts, and that preview, development and an unset
  `VERCEL_ENV` show them.

## Routing, drafts, collisions

- `app/(site)/[slug]/page.tsx`: `generateStaticParams` returns the published landing slugs,
  `dynamicParams = false`, `generateMetadata` uses `buildMetadata`, and the page renders
  `MarketingTemplate` + `SeoLinks` + `JsonLd` (WebPage, plus FAQPage when there is a faq section) +
  the sections. It imports `styles/landing.css`. New CSS classes are prefixed `lp-`, and `site.css`
  is not changed.
- Static routes (`/book-demo`, `/workflow`, …) always take precedence over `[slug]`, and unknown
  paths still return 404.
- `lib/landing.ts`: `getLandingPages()` reads and validates **every** file (drafts included), then
  leaves drafts out unless `showDrafts()` is true. This mirrors `getArticles()`.
- **Reserved slugs** come from the code, not from a hand-kept list:
  - every top-level route directory with a `page.tsx` under `app/*/`, across all groups (this
    includes `landing-catalog` and `news`);
  - the first path segment of every redirect source. The redirect list moves to
    `lib/redirects.ts`, which `next.config.ts` imports, so `assets`, `values` and the legacy page
    names are covered;
  - the top-level names in `public/` (`images`, …) and `api`.
- `next.config.ts`: `localPatterns` gains `/images/landing/**`. The existing redirects stay the
  same; they only move to the new module.

## Sitemap

- Delete `public/sitemap.xml` and add `app/sitemap.ts`. It keeps the 3 current entries exactly
  (`https://cura.aero/`, `/book-demo`, `/evidence-automation`, with the same changefreq and priority
  and no lastmod).
- It adds published, indexable landing pages: `changefreq: monthly`, `priority: 0.7`.
- `robots.txt` doesn't change.

## `/landing-catalog`

- `app/(site)/landing-catalog/page.tsx` renders `content/landing-catalog.json`, which is validated
  with the same schema and uses the image folder `/images/landing/landing-catalog/`.
- Every section type appears with sample content and a small `lp-catalog-label` bar above it
  showing the type name and a link to its README entry.
- The page is `noindex, nofollow`, shows the draft banner, and calls `notFound()` when
  `!showDrafts()` (the same behaviour as a draft).
- A test checks that the catalog contains every section type in the schema. The renderer's
  `switch` is exhaustive (`never`), so a new type must be added in all three places.

## Example page

`content/landing/claims-automation.json` is a draft that uses about 13 of the 16 types. Its images
are copied from existing ones (`cura-girl.jpg`, the cta photos and the partner logos) into
`public/images/landing/claims-automation/`.

## Files

New:
- `app/(site)/[slug]/page.tsx`, `app/(site)/landing-catalog/page.tsx`, `app/sitemap.ts`
- `components/landing/Sections.tsx` (one component per type + `LandingSections` switch),
  `components/site/BookDemo.tsx`
- `lib/env.ts` + `lib/env.test.ts`, `components/shared/DraftBanner.tsx`
- `lib/landing.ts`, `lib/landing-routes.ts`, `lib/redirects.ts`,
  `lib/landing.test.ts` (valid files pass; fixtures fail with the expected message, one per rule:
  extra field, missing field, too long, bad markup, image in the wrong folder, reserved slug, two
  cta-bands)
- `content/landing.schema.json`, `content/landing/claims-automation.json`,
  `content/landing-catalog.json`
- `styles/landing.css`, `public/images/landing/…`, `LANDING-PLAN.md`

Changed:
- `lib/content-types.ts` (Landing types)
- `app/(site)/book-demo/page.tsx` (uses `BookDemo`)
- `lib/articles.ts` (uses `showDrafts()`)
- article templates and `styles/news.css` (draft banner on draft articles only)
- `next.config.ts` (imports the redirects, adds the image pattern)
- `package.json` (`ajv`)
- `README.md` ("Landing pages": how to add one, and for each section its fields and a written
  description of what it looks like)

Deleted: `public/sitemap.xml`.

## Verification

1. **Baseline.** Before any change, run `npm run build && npm start` and save the HTML of `/`,
   `/book-demo`, `/evidence-automation` and `/news`. After the change, diff them: the only
   difference allowed is build hashes.
2. `npm test` and `npm run typecheck` pass. `lib/landing.test.ts` covers the schema and each
   collision rule.
3. **Failure messages.** Temporarily break the example (add an unknown field; add a copy named
   `book-demo.json`) and confirm that `npm run build` fails with the file and field (or the
   collision) named. Then undo it.
4. **Live-site build: `VERCEL_ENV=production npm run build && npm start`.**
   - `/claims-automation`, `/landing-catalog` and `/news/example-article` return 404.
   - `/sitemap.xml` returns the same 3 URLs as the current file.
   - Flip the example to `draft: false`: it builds, appears in the sitemap and has no banner. With
     `noindex: true` it builds but is left out of the sitemap. Then revert.
5. **Preview build: `VERCEL_ENV=preview npm run build && npm start`.**
   - All three draft URLs render, with the "Draft, not live" banner and `noindex, nofollow`.
   - The sitemap still lists only the 3 published URLs.
   - Repeat with `VERCEL_ENV` unset; the result should be the same.
   - The baseline HTML diff (step 1) runs against the production build.
6. **Dev server.** Screenshot `/landing-catalog` and `/claims-automation` at desktop and phone width.
   Check that the header and footer are present, GA is present (production host only), the HubSpot
   embed loads, and there are no console errors.

## Implementation notes

Where the build differs from the plan above:

- **Draft banner CSS.** The badge's CSS lives once, in `styles/draft-banner.css`, imported by
  `components/shared/DraftBanner.tsx`. The plan had it copied into `landing.css` and `news.css`.
- **Small component props.** `CtaBand` takes an optional `id` (default `book-demo`). `BookDemo`
  takes optional `id`, `className` and `heading` (`h1`/`h2`). A landing page that has a hero
  therefore doesn't get two h1s. The defaults render `/` and `/book-demo` exactly as before.
- **`$schema` in content files.** The optional field accepts `../landing.schema.json`, used by
  landing files, and `./landing.schema.json`, used by the catalog file one level up.
- **Schema patterns.** The patterns write `<` as `\x3C`, because `lib/rich.test.ts` scans every
  string in `content/`, including the schema.
- **Example images.** `cura-girl.jpg` is really a WebP file, so its copy is named
  `passenger.webp`. The mountain photo was resized to 1600px (about 400 KB).
- **Unchanged pages, verified.** The rendered markup of every existing page matches the pre-change
  build once hashed asset names are ignored.
