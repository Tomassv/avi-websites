import { createHash } from "node:crypto";
import { createRemoteJWKSet, jwtVerify } from "jose";
import type { Config } from "../config.ts";

/**
 * Google as the identity provider only: an OIDC authorization-code flow with PKCE, the ID
 * token verified against Google's keys. Nothing from Google is kept or passed on.
 */
export type GoogleProfile = { sub: string; email: string; email_verified: boolean; hd?: string; name?: string; nonce?: string };

export interface GoogleClient {
  authUrl(p: { state: string; codeChallenge: string; nonce: string }): string;
  /** Exchanges the code and returns the verified ID token claims. */
  exchange(code: string, codeVerifier: string): Promise<GoogleProfile>;
}

export const GOOGLE_ISSUERS = ["https://accounts.google.com", "accounts.google.com"];

export function pkceChallenge(verifier: string): string {
  return createHash("sha256").update(verifier).digest("base64url");
}

export function googleClient(cfg: Config, fetchFn: typeof fetch = fetch): GoogleClient {
  const redirectUri = `${cfg.baseUrl}/auth/google/callback`;
  const jwks = createRemoteJWKSet(new URL("https://www.googleapis.com/oauth2/v3/certs"));
  return {
    authUrl({ state, codeChallenge, nonce }) {
      const u = new URL("https://accounts.google.com/o/oauth2/v2/auth");
      u.search = new URLSearchParams({
        client_id: cfg.google.clientId,
        redirect_uri: redirectUri,
        response_type: "code",
        scope: "openid email profile",
        state,
        nonce,
        code_challenge: codeChallenge,
        code_challenge_method: "S256",
        prompt: "select_account",
        hd: cfg.allowedDomain,
      }).toString();
      return u.toString();
    },
    async exchange(code, codeVerifier) {
      const res = await fetchFn("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          code,
          code_verifier: codeVerifier,
          client_id: cfg.google.clientId,
          client_secret: cfg.google.clientSecret,
          redirect_uri: redirectUri,
          grant_type: "authorization_code",
        }),
        signal: AbortSignal.timeout(8000),
      });
      if (!res.ok) throw new Error(`Google token endpoint returned ${res.status}`);
      const { id_token } = (await res.json()) as { id_token?: string };
      if (!id_token) throw new Error("Google returned no ID token");
      const { payload } = await jwtVerify(id_token, jwks, { issuer: GOOGLE_ISSUERS, audience: cfg.google.clientId });
      return payload as unknown as GoogleProfile;
    },
  };
}
