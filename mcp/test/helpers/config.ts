import { loadConfig } from "../../src/config.ts";

const b64 = (c: string) => Buffer.from(c.repeat(32)).toString("base64");

/** A complete, valid configuration for tests. */
export function testConfig(over: Record<string, string | undefined> = {}) {
  return loadConfig({
    PUBLIC_BASE_URL: "https://mcp.example.com",
    GOOGLE_CLIENT_ID: "google-client",
    GOOGLE_CLIENT_SECRET: "google-secret",
    ALLOWED_EMAIL_DOMAIN: "avilabs.is",
    TOKEN_SECRETS: b64("t"),
    COMMIT_SIGNING_SECRET: b64("c"),
    GITHUB_APP_ID: "1",
    GITHUB_APP_PRIVATE_KEY: "key",
    GITHUB_INSTALLATION_ID: "2",
    GITHUB_REPO: "avilabs/avi-websites",
    KV_REST_API_URL: "https://kv.example.com",
    KV_REST_API_TOKEN: "kv",
    ...over,
  });
}
