# impax.aero

The Airline ImPax Report: a monthly research report by AviLabs on airline delays, cancellations and the
impact on passengers. A plain static site with hand-written HTML, CSS and JS. There's no build step:
what's in this folder is what goes live.

## Deploying (S3)

The live site is the S3 bucket `s3://impax-aero-prod/` (AWS profile `avilabs-prod`). This folder is the
source. `impax-aero-prod/` in here is an **old local snapshot** of the bucket from September 2026: don't
edit it, and don't deploy it.

**Who runs what:** the user runs AWS commands and `curl` against the live site in their own terminal.
Claude's Bash calls for these have been declined. So Claude prepares the commands, explains what they
do, and reads the output the user pastes back.

1. **Log in.** `aws sso login` opens a browser, so the user has to run it, for example with `! aws sso login` in
   the prompt:
   ```sh
   export AWS_PROFILE=avilabs-prod
   aws sso login
   aws sts get-caller-identity   # check the session works
   ```
2. **Dry run.** `./deploy.sh` lists what would be uploaded and changes nothing. Show the user that list.
3. **Upload only after the user says yes** to that list: `./deploy.sh --go`. Publishing is public and
   immediate, so a yes for an earlier deploy doesn't cover a new one.
4. **Wait for CloudFront.** Pages refresh within about 5 minutes and CSS/JS within an hour, thanks to the
   cache headers (see below). We can't clear the cache ourselves.
5. **Check it's live:** `curl -sI https://impax.aero/report.html` (look at `last-modified`), and open the
   page.

Use `./deploy.sh`, not a bare `aws s3 sync .`. The October 2026 deploy used a bare sync, which uploaded
`.DS_Store` and sent `llms.txt` without a UTF-8 content type.

`deploy.sh` runs `aws s3 sync` without `--delete`, so it never removes files from the bucket. It skips
dotfiles, `impax-aero-prod/`, `CLAUDE.md`, `deploy.sh`, `test.txt` and `report_updater.html` (an internal
tool used locally). It uploads `llms.txt` with `text/plain; charset=utf-8`. Never add `--delete` or remove
objects without the user's explicit OK for those specific files.

**What's in the bucket (checked 3 November 2026):**
- `impax-aero-prod/` **is live** as a folder in the bucket: an old duplicate of the whole site at
  `impax.aero/impax-aero-prod/`. `robots.txt` blocks it from search engines. Removing it needs the user's OK.
- `test.txt` and `report_updater.html` are live. `CLAUDE.md` and `deploy.sh` are not.
- `.DS_Store` was uploaded by a bare sync and then deleted.

**CloudFront sits in front of the bucket** (confirmed 3 November 2026: `via: … cloudfront.net`, `x-cache`).
**We can't invalidate it:** the `Webmaster` SSO role has no CloudFront permissions (`AccessDenied` on
`cloudfront:ListDistributions`). Instead, `deploy.sh` sets `Cache-Control` on every upload: pages
(`.html/.xml/.txt`) `max-age=300`, CSS/JS `max-age=3600`, everything else `max-age=86400`. So a deploy
shows up within about 5 minutes for pages and an hour for CSS/JS. This only holds if the CloudFront cache
policy's minimum TTL is lower; an admin with CloudFront access can check.
- `aws s3 sync` doesn't notice header-only changes. To apply new headers to files that are already in the
  bucket, run `./deploy.sh --refresh-headers` (dry run), then `./deploy.sh --refresh-headers --go`. That
  re-uploads every public file.
- **Because CSS/JS is cached for an hour,** give a JS file a new name when its change must show at once.
  The monthly `charts<Month><yy>.js` files already work this way.
- If something must be gone from the cache immediately, ask an AWS admin to invalidate `/*` on the
  impax.aero distribution.
- Check with `curl -sI https://impax.aero/report.html`: `last-modified` should match the upload time,
  and `cache-control` should be `public, max-age=300`.

**Versioning is on** (responses carry `x-amz-version-id`), so an overwritten file can be restored from an
earlier version: `aws s3api list-object-versions --bucket impax-aero-prod --prefix report.html`, then
`aws s3api get-object --bucket impax-aero-prod --key report.html --version-id <ID> report.html`, then deploy.

**Fixed 3 November 2026:** `october25.html` used to be a copy of `october24.html`. It was rebuilt from the
`september25.html` template, the original October 2025 copy and `src/chartsOctober25.js`, with tables from
the workbook via the updater (Archive mode), and deployed.

**Google Drive:** Claude's sandbox can't read files under `~/Library/CloudStorage/GoogleDrive-*`
("Operation timed out"). The user runs the updater with the workbook themselves.

**Archive mode matters:** a page saved in *Current report* mode gets `canonical = report.html`. For any
`<month><yy>.html`, check `grep 'rel="canonical"'` before deploying.

**Rollback:** before a big deploy, back up the live bucket:
`aws s3 sync s3://impax-aero-prod/ ~/impax-backups/$(date +%F)/`. To undo, copy the old files back from there.

## Files

| Path | What |
|---|---|
| `index.html` | Homepage: latest report card, the list of all monthly reports, SEO head and structured data. |
| `report.html` | The **current** month's report. |
| `<month><yy>.html` | Archived reports, e.g. `september26.html`. Archives from 2025 onwards are copies of `report.html` from that month. |
| `src/charts<Month><yy>.js` | That month's ApexCharts data: sentiment (chart3–7), airlines vs. disruption by region (chart1) and by tier (chart9), ImPax vs. total disruption by region (chart22) and by tier (chart23). |
| `src/bigChart<Month><yy>.js` | The ImPax trend chart (chart111). From October 2026, each month gets its own file with a rolling Oct–Oct window. `bigChart26.js` stays as it is for the older 2026 archives. |
| `src/style10.css` | Stylesheet shared by every page. Add new classes. Don't change existing selectors without checking all pages. |
| `report_updater.html` | Local tool: fills the carrier tables from `GLOBAL MASTER.xlsx` and rebuilds the report's SEO metadata (see below). |
| `sitemap.xml`, `robots.txt`, `llms.txt` | Written by hand. Update them every month. |
| `img/og.jpg` | 1200×630 social share image, used by every page. |

## The monthly report

The user pastes the month's copy (overview, region texts, key metrics, sample reviews) and tables
(sentiment themes, tier/region metrics). Before writing anything:

1. **Archive last month.** In `report_updater.html`, upload `report.html` alone, choose **Archive copy**
   and save the download as `<month><yy>.html`. That gives the archive its own canonical URL. A plain
   `cp report.html september26.html` also works, but leaves the canonical pointing at `report.html`.
2. **Copy** `src/charts<Last><yy>.js` → `src/charts<Month><yy>.js`. Make the new `bigChart` file with the window
   moved on by one month, and point the two `<script src>` tags in `report.html` at the new files.
3. **Update `report.html`:**
   - Hero date, `#report h3`, Quick Insights, "Top 10 Carriers | Month".
   - Global overview text, airline counts and the four global stats.
   - For each region: text, airline counts, four stats, positive and negative review (and its `[Tier, Class]` tag).
   - Section order in the page is APAC, Europe, North America, ME&A, LATAM. Region ids are `apac`, `europe`,
     `northamerica`, `middleeastandafrica`, `latinaamerica`. The review tab numbers follow the same order (1–5).
4. **Update the charts.**
   - Sentiment charts take the top 5 themes rounded to whole percentages.
   - `% of Airlines` = region or tier airlines ÷ total airlines.
   - `% of Global Disruption` = disrupted flights ÷ global disrupted flights.
   - **Check the pasted percentages against the counts.** In October 2026 the Tier 1 row had stale
     percentages (20.2% / 67.7% instead of 16.9% / 60.2%). Use the values that match the counts and tell the user.
5. **Tables:** the user runs `report_updater.html` with the workbook and `report.html` on **Current
   report**. That fills the 7 carrier tables, sets the month labels and refreshes the SEO metadata. If
   there's no workbook for the month, the tables still show last month's rows: say so.
6. **Homepage (`index.html`):**
   - "Latest" card: month, both paragraphs.
   - Add a new `reportLink` at the top of the 2026 list. Each link has hidden text (`<span class="linkText">View Report<span class="visually-hidden"> for Month YYYY</span></span>`).
   - Move last month's link from `report.html` to its archive file.
   - Update the `hasPart` list in the JSON-LD the same way.
7. **`sitemap.xml` and `llms.txt`:** add the archive URL, update `lastmod` and the "Latest report" line.
8. **Check:** VS Code Problems panel (Biome) clean; `node --check` on the new chart files. Then deploy (above).

Never put a previous month's numbers under the new month's heading. If data is missing, leave a
`// TODO(Month YYYY)` comment in the chart file and tell the user what's missing.

## SEO

- `index.html` and `report.html` have a title, description, canonical URL, Open Graph/Twitter tags and
  JSON-LD. On `report.html` the head is **generated by `report_updater.html`** (`IMPAX_SEO.apply`): it
  reads the month and figures from the page and rebuilds the title, description and `#impax-seo` JSON-LD
  (Report, Dataset with 26 figures, breadcrumb). Update the page first, then run the updater, and don't
  hand-edit those tags.
- The updater saves with `outerHTML`, not `XMLSerializer`, which escapes `&`/`<` inside `<script>` blocks.
  Keep it that way.
- Older archives (before October 2026) have no SEO head. Running one through the updater in Archive mode adds it.

## Gotchas

- **Google Analytics:** `function gtag() { dataLayer.push(arguments); }` must use `arguments`. Biome
  suggests `...args`, but that breaks gtag.js. Keep the `biome-ignore` comment above it.
- `src/buttons.js` binds the copy-link buttons only if they exist (they're commented out on every page).
  Before 3 November 2026 the missing buttons threw an error, so the sticky region menu never worked.
  Keep the null checks.
- Headless Chrome with `--dump-dom` doesn't really scroll. To test scroll code, override `pageYOffset`
  and dispatch `scroll` events.
- `.latestReports a span` in `style10.css` makes any span inside homepage links `display: block; 16px`.
  Use `span.linkText` for text inside those links.
- `.bgWideHero h1` adds padding. The homepage `h1.heroTitle` resets it.
- Copy uses UK spelling ("analyses", "neighbouring") and `ME&amp;A` in HTML. Reviews are quoted
  verbatim, typos included.
