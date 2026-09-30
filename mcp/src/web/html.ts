/**
 * Server-rendered pages (consent, errors, preview gateway, upload). No framework; every
 * interpolated value goes through `esc`. Pages send a strict CSP and are never cached.
 */
export function esc(value: unknown): string {
  return String(value ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

export const SECURITY_HEADERS: Record<string, string> = {
  "Content-Security-Policy": "default-src 'self'; img-src 'self' data: blob:; style-src 'unsafe-inline'; script-src 'self'; form-action 'self' https://accounts.google.com; frame-ancestors 'none'; base-uri 'none'",
  "Referrer-Policy": "no-referrer",
  "Cache-Control": "no-store",
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
};

const STYLE = `
:root{--navy:#051457;--orange:#fe6c3b;--cream:#f5ede8;--muted:#5d6784}
*{box-sizing:border-box}body{margin:0;font:16px/1.5 system-ui,-apple-system,sans-serif;background:var(--cream);color:var(--navy)}
main{max-width:520px;margin:10vh auto;padding:32px;background:#fff;border-radius:20px;box-shadow:0 10px 40px rgba(5,20,87,.08)}
h1{font-size:1.4rem;margin:0 0 12px}p{margin:0 0 14px}.muted{color:var(--muted);font-size:.92rem}
.warn{background:#fff4e5;border:1px solid #ffd8a8;padding:10px 14px;border-radius:12px;font-size:.92rem}
button,.btn{display:inline-block;border:0;border-radius:999px;padding:11px 22px;font:600 .95rem system-ui,sans-serif;cursor:pointer;text-decoration:none}
.primary{background:var(--orange);color:#fff}.secondary{background:#eef0f6;color:var(--navy)}
.row{display:flex;gap:10px;flex-wrap:wrap;margin-top:18px}code{background:#f2f3f8;padding:1px 6px;border-radius:6px}
input[type=file]{margin:12px 0}img.thumb{max-width:100%;border-radius:12px;margin-top:10px}
`;

export function page(title: string, body: string, init: { status?: number; headers?: Record<string, string>; scripts?: string[] } = {}): Response {
  const scripts = (init.scripts ?? []).map((s) => `<script src="${esc(s)}" defer></script>`).join("");
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>${esc(title)} · AviLabs websites</title><style>${STYLE}</style>${scripts}</head><body><main>${body}</main></body></html>`;
  return new Response(html, {
    status: init.status ?? 200,
    headers: { "Content-Type": "text/html; charset=utf-8", ...SECURITY_HEADERS, ...(init.headers ?? {}) },
  });
}

export function errorPage(title: string, message: string, status = 400): Response {
  return page(title, `<h1>${esc(title)}</h1><p>${esc(message)}</p><p class="muted">You can close this window.</p>`, { status });
}

export function redirect(location: string, headers: Record<string, string> = {}): Response {
  return new Response(null, { status: 302, headers: { Location: location, "Cache-Control": "no-store", "Referrer-Policy": "no-referrer", ...headers } });
}

// ── Cookies ──

export function readCookie(req: Request, name: string): string | null {
  const header = req.headers.get("cookie") ?? "";
  for (const part of header.split(";")) {
    const i = part.indexOf("=");
    if (i > 0 && part.slice(0, i).trim() === name) return decodeURIComponent(part.slice(i + 1).trim());
  }
  return null;
}

/** A `__Host-` cookie: Secure, Path=/, no Domain, HttpOnly. */
export function hostCookie(name: string, value: string, maxAge: number, sameSite: "Lax" | "Strict" = "Lax"): string {
  return `__Host-${name}=${encodeURIComponent(value)}; Path=/; Secure; HttpOnly; SameSite=${sameSite}; Max-Age=${maxAge}`;
}
