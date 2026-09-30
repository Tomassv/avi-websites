# cura.aero

Marketing site and internal documents for Cura, the claims resolution platform for airlines.
Next.js 16 (App Router, TypeScript), deployed on Vercel from this folder.

## Commands

```sh
npm install
npm run dev        # http://localhost:3000; drafts are visible
npm run build      # production build (type-checks content too)
npm start          # serve the production build
npm test           # unit tests (node --test, no extra dependencies)
npm run typecheck
```

Node 22.18 or newer.

## Environment

The internal pages sit behind HTTP basic auth (`proxy.ts`). Set both variables, locally in
`.env.local` (see `.env.example`) and in Vercel for Production and Preview:

| Variable | |
|---|---|
| `INTERNAL_USER` | basic-auth user name |
| `INTERNAL_PASSWORD` | basic-auth password |

If either is missing, every internal page returns 401. Public pages are unaffected.

## Where things live

| Path | What |
|---|---|
| `content/` | **All copy.** One JSON file per page in `content/pages/`, shared copy in `content/site.json` and `content/shared/`, articles in `content/articles/`. |
| `app/(site)/` | Public pages: `/`, `/book-demo`, `/evidence-automation`, `/news`. Site CSS, fonts and Google Analytics. |
| `app/(docs)/` | Internal documents (basic auth): `/evidence-package`, `/workflow`, `/update`, `/value-props`, `/aha`, `/non-connected-value`. |
| `app/(deck)/` | Slide decks (basic auth): `/aireuropa`. |
| `templates/` | Page templates: Marketing, Doc, Deck, Article, News list. |
| `components/` | Layout components. They render content; they never contain copy. |
| `styles/` | `site.css` (the original stylesheet), per-page CSS in `styles/pages/`, `deck.css`, `news.css`. |
| `lib/` | Content types and loaders, the markup parser, URL validators, basic auth, article loader. |
| `public/` | Images in `public/images/`, plus `robots.txt` and `sitemap.xml`. |

Old `.html` URLs (and `/assets/*`, `/values/*`) redirect permanently to the new ones; see
`next.config.ts`.

## Editing content

Content files are treated as untrusted input. Text is always escaped; a few inline tags are allowed:

- `<br>`, `<strong>`, `<b>`, `<em>`
- `<span class='…'>` with the classes `orange`, `hi`, `hi-orange`, `hi-white`, `text-bold`, `wf-lead` or `ev-quiet`

Any other tag or attribute is stripped (see `lib/rich.ts`), and `npm test` fails if a content file
uses one. Links may only be site paths (`/…`), anchors (`#…`), `https://` or `mailto:`. Images must
be files under `/images/`. Each content file has a TypeScript type in `lib/content-types.ts`, so a
file with a missing or misspelled field fails the build.

## Adding an article

Create `content/articles/<slug>.md`. The slug is the URL, `/news/<slug>`, and uses lowercase words
joined by hyphens:

```md
---
title: "Article title"
description: "One or two sentences for the list and search results."
date: 2026-10-01
author: AviLabs        # optional
image: /images/news/hero.jpg   # optional, under /images/
draft: true            # true: shown by `npm run dev` only
---

Plain Markdown. Raw HTML is ignored.
```

Set `draft: false` to publish. `/news` is not linked from the site yet, and both news routes are
`noindex` and left out of `sitemap.xml` until the section launches.

## Adding a deck or an internal page

- **Deck:** add `content/pages/<name>.json` shaped like `aireuropa.json` (typed slides, checked at
  build time) and a route in `app/(deck)/<name>/page.tsx` that renders `DeckTemplate`.
- **Internal document:** add a route under `app/(docs)/` using `DocTemplate`.
- **Either way, add the route to the `matcher` in `proxy.ts`.** `npm test` fails if an internal
  route is missing from it.

## Tracking and embeds

- Google Analytics (`gaId` in `content/site.json`) loads on the public pages only, and only on the
  `cura.aero` / `www.cura.aero` hosts.
- `/book-demo` embeds the HubSpot meetings calendar; its URL is in `content/pages/book-demo.json`.
- Links between pages are plain `<a>` tags (full page loads). This keeps each page's CSS separate
  and GA page views working as before, so don't switch them to `next/link` without handling both.
