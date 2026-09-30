import type { Config } from "../config.ts";

/**
 * Redirect URIs. A requested redirect_uri must be registered by the client AND be on the global
 * allowlist. Loopback URIs (Claude Code) match with the port ignored, per RFC 8252 §7.3.
 */
export const CLAUDE_CALLBACK = "https://claude.ai/api/mcp/auth_callback";

const LOOPBACK_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]"]);

function loopbackKey(uri: string): string | null {
  try {
    const u = new URL(uri);
    if (u.protocol !== "http:" || !LOOPBACK_HOSTS.has(u.hostname) || u.username || u.password || u.hash) return null;
    return `${u.hostname}${u.pathname}${u.search}`;
  } catch {
    return null;
  }
}

/** Whether `requested` matches `registered`: exactly, or as the same loopback URI on any port. */
export function redirectMatches(requested: string, registered: string): boolean {
  if (requested === registered) return true;
  const a = loopbackKey(requested);
  return a !== null && a === loopbackKey(registered);
}

/** The server-wide allowlist every redirect must also be on. */
export function globallyAllowed(cfg: Config, uri: string): boolean {
  if (uri === CLAUDE_CALLBACK || cfg.extraRedirectUris.includes(uri)) return true;
  const key = loopbackKey(uri);
  if (!key) return false;
  const path = key.slice(key.indexOf("/"));
  if (path === "/callback") return true; // Claude Code
  return cfg.devMode && path === "/oauth/callback"; // MCP Inspector
}

export function redirectAllowed(cfg: Config, requested: string, registered: string[]): boolean {
  return globallyAllowed(cfg, requested) && registered.some((r) => redirectMatches(requested, r));
}

export function isLoopback(uri: string): boolean {
  return loopbackKey(uri) !== null;
}
