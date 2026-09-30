/**
 * Validators for every place untrusted content reaches an attribute or script.
 * Each returns the value when it is safe and null (or false) otherwise; callers render
 * nothing (or plain text) for a null.
 */

// C0/C1 control characters, whitespace other than a plain space, and backslashes are never
// valid in the URLs we accept. Browsers strip or reinterpret them, which is how
// "java\tscript:" style bypasses work.
const UNSAFE_CHARS = /[\u0000- \u007f-\u009f\\]/;

/** Links: site-relative paths, same-page anchors, https URLs and mailto addresses. */
export function safeHref(href: unknown): string | null {
  if (typeof href !== "string") return null;
  const value = href.trim();
  if (!value || UNSAFE_CHARS.test(value)) return null;

  if (value.startsWith("#")) return /^#[A-Za-z0-9_-]*$/.test(value) ? value : null;

  if (value.startsWith("/")) {
    // "//host" is protocol-relative, i.e. another origin.
    if (value.startsWith("//")) return null;
    return /^\/[A-Za-z0-9\-._~/%?#=&+]*$/.test(value) ? value : null;
  }

  if (/^mailto:/i.test(value)) {
    return /^mailto:[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/i.test(value) ? value : null;
  }

  if (/^https:\/\//i.test(value)) {
    try {
      const url = new URL(value);
      if (url.protocol !== "https:" || !url.hostname || url.username || url.password) return null;
      return value;
    } catch {
      return null;
    }
  }

  return null;
}

/** True for links that leave the site (rendered with rel="noopener noreferrer"). */
export function isExternalHref(href: string): boolean {
  return /^https:\/\//i.test(href);
}

/** Image sources must be local files under /images/. */
export function safeImageSrc(src: unknown): string | null {
  if (typeof src !== "string") return null;
  if (!/^\/images\/[A-Za-z0-9_\-./]+$/.test(src)) return null;
  if (src.includes("..") || src.includes("//")) return null;
  return src;
}

/** HubSpot meetings embed URL. */
export function safeHubspotMeetingUrl(value: unknown): string | null {
  if (typeof value !== "string" || UNSAFE_CHARS.test(value)) return null;
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.hostname !== "meetings.hubspot.com" || url.username || url.password) {
      return null;
    }
    return value;
  } catch {
    return null;
  }
}

/** Google Analytics 4 measurement id. Interpolated into an inline script, so it is strict. */
export function isGaId(value: unknown): value is string {
  return typeof value === "string" && /^G-[A-Z0-9]{4,20}$/.test(value);
}

/** Material Icons ligature names. */
export function safeIconName(value: unknown): string | null {
  return typeof value === "string" && /^[a-z0-9_]{1,40}$/.test(value) ? value : null;
}

/**
 * JSON for a <script type="application/ld+json"> body. Escapes the characters that could end
 * the script element or be misread as markup, so content can't break out of the tag.
 */
export function jsonLdString(data: unknown): string {
  return JSON.stringify(data)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026")
    .replace(new RegExp(String.fromCharCode(0x2028), "g"), "\\u2028")
    .replace(new RegExp(String.fromCharCode(0x2029), "g"), "\\u2029");
}
