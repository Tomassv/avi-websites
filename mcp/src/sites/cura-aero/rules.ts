import * as generated from "../../generated/cura-aero-rules.mjs";
import type { SiteRules } from "../types.ts";

/** cura.aero's own lib/*.ts, bundled by scripts/gen-rules.mjs, behind the SiteRules interface. */
const { rich, safeUrl, articles, landing } = generated;

export const curaRules: SiteRules = {
  SLUG_RE: articles.SLUG_RE,
  RICH_CLASSES: rich.RICH_CLASSES,
  safeHref: safeUrl.safeHref,
  safeImageSrc: safeUrl.safeImageSrc,
  safeIconName: safeUrl.safeIconName,
  safeHubspotMeetingUrl: safeUrl.safeHubspotMeetingUrl,
  richToText: rich.richToText,
  parseArticle: (source, slug, file) => articles.parseArticle(source, slug, file),
  parseLanding: (source, slug, file, options) => landing.parseLanding(source, slug, file, options),
  isValidationError: (e) => e instanceof articles.ArticleError || e instanceof landing.LandingError,
};
