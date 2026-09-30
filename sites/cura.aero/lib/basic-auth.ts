/**
 * HTTP Basic auth check for the internal pages (used by proxy.ts).
 * Credentials only ever come from the environment; if they are missing, nothing is accepted.
 */

export const AUTH_REALM = 'Basic realm="Cura internal", charset="UTF-8"';

/** Constant-time string comparison: runtime depends only on the lengths, not the contents. */
export function safeEqual(a: string, b: string): boolean {
  const enc = new TextEncoder();
  const x = enc.encode(a);
  const y = enc.encode(b);
  // Compare against the full length of both so the loop count doesn't leak which is shorter.
  const len = Math.max(x.length, y.length);
  let diff = x.length ^ y.length;
  for (let i = 0; i < len; i++) diff |= (x[i] ?? 0) ^ (y[i] ?? 0);
  return diff === 0;
}

export function decodeBasicAuth(header: string | null | undefined): { user: string; password: string } | null {
  if (!header) return null;
  const m = /^Basic\s+([A-Za-z0-9+/=]+)\s*$/i.exec(header);
  if (!m) return null;
  let decoded: string;
  try {
    const bytes = Uint8Array.from(atob(m[1]), (c) => c.charCodeAt(0));
    decoded = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    return null;
  }
  const sep = decoded.indexOf(":");
  if (sep === -1) return null;
  return { user: decoded.slice(0, sep), password: decoded.slice(sep + 1) };
}

/**
 * True only when both expected credentials are configured (non-empty) and the header matches
 * them. Missing configuration fails closed.
 */
export function isAuthorized(
  header: string | null | undefined,
  expectedUser: string | undefined,
  expectedPassword: string | undefined,
): boolean {
  if (!expectedUser || !expectedPassword) return false;
  const given = decodeBasicAuth(header);
  if (!given) return false;
  // Evaluate both comparisons so timing doesn't reveal which one failed.
  const userOk = safeEqual(given.user, expectedUser);
  const passOk = safeEqual(given.password, expectedPassword);
  return userOk && passOk;
}
