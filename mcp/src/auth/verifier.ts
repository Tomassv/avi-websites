import { OAuthError, OAuthErrorCode, type AuthInfo, type OAuthTokenVerifier } from "@modelcontextprotocol/server";
import type { Config } from "../config.ts";
import type { Store } from "../store/store.ts";
import { isListed } from "./allowlist.ts";
import { TokenError, verifyAccessToken, type User } from "./tokens.ts";

/**
 * Checks bearer tokens on /mcp for the SDK's requireBearerAuth: our signature, issuer, this
 * server as audience, expiry, and that the user is still allowed and not revoked.
 */
export function mcpVerifier(cfg: Config, store: Store): OAuthTokenVerifier {
  return {
    async verifyAccessToken(token: string): Promise<AuthInfo> {
      let claims;
      try {
        claims = await verifyAccessToken(cfg, token);
      } catch (e) {
        throw new OAuthError(OAuthErrorCode.InvalidToken, e instanceof TokenError ? e.message : "invalid token");
      }
      if (!isListed(cfg, claims.email) || (await store.get(`revoked:${claims.email}`))) {
        throw new OAuthError(OAuthErrorCode.InvalidToken, "this account is no longer allowed");
      }
      const user: User = { sub: claims.sub, email: claims.email, name: claims.name };
      return {
        token,
        clientId: claims.clientId,
        scopes: claims.scope.split(" "),
        expiresAt: claims.exp,
        resource: new URL(cfg.resource),
        extra: { user },
      };
    },
  };
}

export function userOf(auth: AuthInfo | undefined): User | null {
  const u = auth?.extra?.user as User | undefined;
  return u && typeof u.email === "string" ? u : null;
}
