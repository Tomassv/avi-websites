import type { Config } from "../config.ts";

/**
 * Who may sign in: a verified Google account in ALLOWED_EMAIL_DOMAIN, managed by that
 * Workspace (`hd`), and on ALLOWED_EMAILS when that list isn't empty. The list only narrows.
 */
export type GoogleIdentity = { email?: unknown; email_verified?: unknown; hd?: unknown };

export function checkAllowed(cfg: Config, id: GoogleIdentity): { ok: true; email: string } | { ok: false; reason: string } {
  if (typeof id.email !== "string" || !id.email.includes("@")) return { ok: false, reason: "no email address" };
  const email = id.email.toLowerCase();
  if (id.email_verified !== true) return { ok: false, reason: "email not verified" };
  const domain = email.slice(email.lastIndexOf("@") + 1);
  if (domain !== cfg.allowedDomain) return { ok: false, reason: "email outside the allowed domain" };
  if (typeof id.hd !== "string" || id.hd.toLowerCase() !== cfg.allowedDomain) return { ok: false, reason: "not a Workspace account of the allowed domain" };
  return isListed(cfg, email) ? { ok: true, email } : { ok: false, reason: "not on ALLOWED_EMAILS" };
}

/** The re-check on every refresh: domain and list only (Google isn't asked again). */
export function isListed(cfg: Config, email: string): boolean {
  const e = email.toLowerCase();
  if (e.slice(e.lastIndexOf("@") + 1) !== cfg.allowedDomain) return false;
  return cfg.allowedEmails.length === 0 || cfg.allowedEmails.includes(e);
}
