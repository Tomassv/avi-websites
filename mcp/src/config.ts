import { createHash, hkdfSync } from "node:crypto";

/**
 * Environment configuration (MCP-PLAN.md §13), read once per process and validated up front so
 * a missing variable fails loudly at start, not halfway through a sign-in.
 */
export type Key = { kid: string; bytes: Uint8Array };

export type Config = {
  baseUrl: string;
  /** The MCP resource identifier and endpoint: `${baseUrl}/mcp`. */
  resource: string;
  google: { clientId: string; clientSecret: string };
  allowedDomain: string;
  /** Lowercased. Empty = the whole domain. */
  allowedEmails: string[];
  /** Derived keys; index 0 signs and encrypts, all verify and decrypt. */
  keys: { jwt: Key[]; seal: Key[]; mac: Key[] };
  commitSigningKey: Uint8Array;
  accessTtl: number;
  refreshIdleSeconds: number;
  refreshMaxSeconds: number;
  github: { appId: string; privateKey: string; installationId: string; owner: string; repo: string };
  requireApproval: boolean;
  allowedClientIdHosts: string[];
  extraRedirectUris: string[];
  devMode: boolean;
  dryRun: boolean;
  redis: { url: string; token: string } | "memory";
  env: Record<string, string | undefined>;
};

function bytesOf(value: string, name: string): Uint8Array {
  const b = Buffer.from(value.trim(), "base64");
  if (b.length < 32) throw new Error(`${name} must be at least 32 bytes, base64-encoded (openssl rand -base64 32)`);
  return b;
}

function derive(secret: Uint8Array, purpose: string): Key {
  const bytes = new Uint8Array(hkdfSync("sha256", secret, "avi-websites-mcp", purpose, 32));
  const kid = createHash("sha256").update(secret).digest("hex").slice(0, 8);
  return { kid, bytes };
}

export function loadConfig(env: Record<string, string | undefined> = process.env): Config {
  const missing: string[] = [];
  const need = (name: string) => {
    const v = env[name]?.trim();
    if (!v) missing.push(name);
    return v ?? "";
  };
  const devMode = env.DEV_MODE === "1";
  if (devMode && env.VERCEL_ENV === "production") throw new Error("DEV_MODE must not be set in production");
  const dryRun = env.DRY_RUN === "1";

  const baseUrl = need("PUBLIC_BASE_URL").replace(/\/+$/, "");
  const googleClientId = need("GOOGLE_CLIENT_ID");
  const googleClientSecret = need("GOOGLE_CLIENT_SECRET");
  const allowedDomain = need("ALLOWED_EMAIL_DOMAIN").toLowerCase();
  const tokenSecrets = need("TOKEN_SECRETS");
  const commitSecret = need("COMMIT_SIGNING_SECRET");
  const repo = dryRun && !env.GITHUB_REPO ? "dry-run/dry-run" : need("GITHUB_REPO");
  const github = dryRun
    ? { appId: env.GITHUB_APP_ID ?? "", privateKey: env.GITHUB_APP_PRIVATE_KEY ?? "", installationId: env.GITHUB_INSTALLATION_ID ?? "" }
    : { appId: need("GITHUB_APP_ID"), privateKey: need("GITHUB_APP_PRIVATE_KEY"), installationId: need("GITHUB_INSTALLATION_ID") };
  const redis =
    devMode && env.REDIS === "memory"
      ? ("memory" as const)
      : { url: need("KV_REST_API_URL"), token: need("KV_REST_API_TOKEN") };
  if (missing.length) throw new Error(`Missing environment variables: ${missing.join(", ")}`);

  const url = new URL(baseUrl);
  if (url.protocol !== "https:" && !(devMode && url.hostname === "localhost")) {
    throw new Error("PUBLIC_BASE_URL must be https (http://localhost only with DEV_MODE=1)");
  }
  const [owner, name] = repo.split("/");
  if (!owner || !name) throw new Error("GITHUB_REPO must be owner/name");

  const secrets = tokenSecrets.split(",").map((s, i) => bytesOf(s, `TOKEN_SECRETS[${i}]`));
  const keys = {
    jwt: secrets.map((s) => derive(s, "access-token")),
    seal: secrets.map((s) => derive(s, "seal")),
    mac: secrets.map((s) => derive(s, "refresh-mac")),
  };
  const list = (v: string | undefined) => (v ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  const days = (v: string | undefined, d: number) => (v ? Number(v) : d) * 86400;

  return {
    baseUrl,
    resource: `${baseUrl}/mcp`,
    google: { clientId: googleClientId, clientSecret: googleClientSecret },
    allowedDomain,
    allowedEmails: list(env.ALLOWED_EMAILS).map((e) => e.toLowerCase()),
    keys,
    commitSigningKey: bytesOf(commitSecret, "COMMIT_SIGNING_SECRET"),
    accessTtl: env.ACCESS_TOKEN_TTL_SECONDS ? Number(env.ACCESS_TOKEN_TTL_SECONDS) : 900,
    refreshIdleSeconds: days(env.REFRESH_IDLE_DAYS, 7),
    refreshMaxSeconds: days(env.REFRESH_MAX_DAYS, 30),
    github: { ...github, privateKey: github.privateKey.replace(/\\n/g, "\n"), owner, repo: name },
    requireApproval: env.REQUIRE_APPROVAL === "true",
    allowedClientIdHosts: list(env.ALLOWED_CLIENT_ID_HOSTS ?? "claude.ai").map((h) => h.toLowerCase()),
    extraRedirectUris: list(env.EXTRA_REDIRECT_URIS),
    devMode,
    dryRun,
    redis,
    env,
  };
}
