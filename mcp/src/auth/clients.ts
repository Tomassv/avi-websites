import type { Config } from "../config.ts";
import { seal, unseal } from "./tokens.ts";
import { globallyAllowed } from "./redirects.ts";

/**
 * OAuth clients without a client database:
 * - CIMD: the client_id is an https URL whose JSON document describes the client. Fetched with
 *   a host allowlist, a timeout and a size cap (SSRF), and cached for 5 minutes.
 * - DCR: POST /register returns a client_id that is itself a sealed copy of the registration.
 */
export type Client = { clientId: string; name: string; host: string; redirectUris: string[]; kind: "cimd" | "dcr" };

export class ClientError extends Error {}

export type FetchLike = (url: string, init?: RequestInit) => Promise<Response>;

const CIMD_TIMEOUT_MS = 3000;
const CIMD_MAX_BYTES = 10 * 1024;
const CIMD_CACHE_MS = 5 * 60 * 1000;
const cimdCache = new Map<string, { client: Client; at: number }>();

export function clearClientCache() {
  cimdCache.clear();
}

async function fetchCimd(cfg: Config, clientId: string, fetchFn: FetchLike, log: (url: string) => void): Promise<Client> {
  let url: URL;
  try {
    url = new URL(clientId);
  } catch {
    throw new ClientError("client_id is not a valid URL");
  }
  if (url.protocol !== "https:" || url.username || url.password || url.hash || url.port) throw new ClientError("client_id URL must be plain https");
  if (!cfg.allowedClientIdHosts.includes(url.hostname.toLowerCase())) throw new ClientError(`client_id host ${url.hostname} is not allowed`);

  const hit = cimdCache.get(clientId);
  if (hit && Date.now() - hit.at < CIMD_CACHE_MS) return hit.client;

  const res = await fetchFn(clientId, { redirect: "error", signal: AbortSignal.timeout(CIMD_TIMEOUT_MS), headers: { accept: "application/json" } });
  if (!res.ok) throw new ClientError(`client metadata document returned ${res.status}`);
  const text = await res.text();
  if (text.length > CIMD_MAX_BYTES) throw new ClientError("client metadata document is too large");
  let doc: Record<string, unknown>;
  try {
    doc = JSON.parse(text);
  } catch {
    throw new ClientError("client metadata document is not JSON");
  }
  if (doc.client_id !== clientId) throw new ClientError("client metadata document's client_id doesn't match its URL");
  const uris = doc.redirect_uris;
  if (!Array.isArray(uris) || !uris.length || !uris.every((u) => typeof u === "string")) throw new ClientError("client metadata has no redirect_uris");
  const auth = doc.token_endpoint_auth_method;
  if (auth !== undefined && auth !== "none") throw new ClientError("only public clients (token_endpoint_auth_method none) are supported");

  const client: Client = {
    clientId,
    // The document is self-asserted, so the consent screen names the host, not client_name.
    name: url.hostname,
    host: url.hostname,
    redirectUris: uris as string[],
    kind: "cimd",
  };
  cimdCache.set(clientId, { client, at: Date.now() });
  log(clientId);
  return client;
}

export async function resolveClient(cfg: Config, clientId: string, fetchFn: FetchLike = fetch, log: (url: string) => void = () => {}): Promise<Client> {
  if (typeof clientId !== "string" || !clientId) throw new ClientError("client_id is required");
  if (clientId.startsWith("https://")) return fetchCimd(cfg, clientId, fetchFn, log);
  if (clientId.startsWith("dcr_")) {
    const reg = await unseal<{ redirect_uris: string[]; client_name?: string }>(cfg, "dcr", clientId.slice(4));
    if (!reg) throw new ClientError("unknown client_id");
    return { clientId, name: reg.client_name || "Registered client", host: "", redirectUris: reg.redirect_uris, kind: "dcr" };
  }
  throw new ClientError("unknown client_id");
}

/** RFC 7591 registration, stateless. Returns the response body, or throws ClientError. */
export async function registerClient(cfg: Config, body: unknown): Promise<Record<string, unknown>> {
  const b = (body && typeof body === "object" ? body : {}) as Record<string, unknown>;
  const uris = b.redirect_uris;
  if (!Array.isArray(uris) || !uris.length || uris.length > 5 || !uris.every((u) => typeof u === "string")) {
    throw new ClientError("redirect_uris must be a list of 1 to 5 URIs");
  }
  const refused = (uris as string[]).filter((u) => !globallyAllowed(cfg, u));
  if (refused.length) throw new ClientError(`redirect URI not allowed: ${refused.join(", ")}`);
  if (b.token_endpoint_auth_method !== undefined && b.token_endpoint_auth_method !== "none") {
    throw new ClientError("only public clients (token_endpoint_auth_method none) are supported");
  }
  const name = typeof b.client_name === "string" ? b.client_name.slice(0, 80) : undefined;
  const clientId = "dcr_" + (await seal(cfg, "dcr", { redirect_uris: uris, client_name: name }, 0));
  return {
    client_id: clientId,
    client_id_issued_at: Math.floor(Date.now() / 1000),
    redirect_uris: uris,
    client_name: name,
    token_endpoint_auth_method: "none",
    grant_types: ["authorization_code", "refresh_token"],
    response_types: ["code"],
  };
}
