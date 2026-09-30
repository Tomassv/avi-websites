import type { FieldKind, SiteConfig } from "../sites/types.ts";
import { ToolError } from "./errors.ts";
import { globToRegExp } from "./glob.ts";
import type { RichChecker } from "./rich.ts";

/** Longest text a single update_text value may have. */
export const MAX_TEXT = 2000;

/** Whether a pointer in a file is read-only under the site config. */
export function isReadOnly(site: SiteConfig, file: string, pointer: string): boolean {
  const matches = (globs: string[]) => globs.some((g) => globToRegExp(g).test(pointer));
  const all = site.readOnlyPointers["*"];
  if (Array.isArray(all) && matches(all)) return true;
  const own = site.readOnlyPointers[file];
  if (!own) return false;
  if (Array.isArray(own)) return matches(own);
  return !matches(own.allowOnly);
}

/** The field type of a string, from its key (array items take their array's key). */
export function fieldKind(site: SiteConfig, segments: (string | number)[]): FieldKind {
  for (let i = segments.length - 1; i >= 0; i--) {
    const s = String(segments[i]);
    if (/^\d+$/.test(s)) continue;
    return Object.hasOwn(site.fieldRules, s) ? site.fieldRules[s] : "rich";
  }
  return "rich";
}

export type FieldContext = {
  rich: RichChecker;
  /** Whether a site-relative file (e.g. "public/images/x.webp") exists on the change's branch. */
  fileExists(path: string): boolean;
};

/** Validates one new value for its field type; throws a ToolError that names the pointer. */
export function validateField(site: SiteConfig, kind: FieldKind, pointer: string, value: string, ctx: FieldContext): void {
  const fail = (msg: string): never => {
    throw new ToolError("invalid_value", `${pointer}: ${msg}`);
  };
  if (value.length > MAX_TEXT) fail(`is ${value.length} characters; the limit is ${MAX_TEXT}`);
  const r = site.rules;
  switch (kind) {
    case "href":
      if (!r.safeHref(value)) fail("must be a site path (/…), an anchor (#…), an https:// URL or a mailto: address");
      return;
    case "image":
      if (!r.safeImageSrc(value)) fail("must be an image path under /images/");
      if (!ctx.fileExists(`public${value}`)) fail(`the image ${value} doesn't exist; upload it first`);
      return;
    case "icon":
      if (!r.safeIconName(value)) fail("must be a Material Icons name (lowercase letters, digits, underscores)");
      return;
    case "hubspot":
      if (!r.safeHubspotMeetingUrl(value)) fail("must be a https://meetings.hubspot.com/ link");
      return;
    case "rich":
      if (!ctx.rich.isRich(value)) {
        fail("uses markup outside the whitelist (see get_site_guide); write a literal < or > as &lt; or &gt;");
      }
      return;
  }
}
