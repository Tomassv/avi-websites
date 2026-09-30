import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { EncryptJWT, SignJWT, errors as joseErrors, jwtDecrypt, jwtVerify, decodeProtectedHeader } from "jose";
import type { Config, Key } from "../config.ts";

/**
 * Every token the server issues:
 * - access tokens: HS256 JWTs bound to this server as audience (RFC 8707), 15 minutes;
 * - sealed values (JWE, dir + A256GCM): authorization codes, Google `state`, browser sessions,
 *   upload links, DCR client ids. Each carries a `typ`, so one kind can't stand in for another;
 * - refresh tokens: opaque `<family>.<jti>.<mac>`, checked against the store (§4.4).
 */
export type User = { sub: string; email: string; name: string };

export type AccessClaims = User & { clientId: string; scope: string; exp: number; jti: string };

const ISS = (cfg: Config) => cfg.baseUrl;
const rand = (n = 16) => randomBytes(n).toString("base64url");

function keyFor(keys: Key[], kid: string | undefined): Key | undefined {
  return keys.find((k) => k.kid === kid);
}

export async function signAccessToken(cfg: Config, user: User, clientId: string, scope: string): Promise<{ token: string; exp: number }> {
  const [key] = cfg.keys.jwt;
  const exp = Math.floor(Date.now() / 1000) + cfg.accessTtl;
  const token = await new SignJWT({ email: user.email, name: user.name, client_id: clientId, scope })
    .setProtectedHeader({ alg: "HS256", kid: key.kid, typ: "at+jwt" })
    .setIssuer(ISS(cfg))
    .setAudience(cfg.resource)
    .setSubject(user.sub)
    .setIssuedAt()
    .setExpirationTime(exp)
    .setJti(rand())
    .sign(key.bytes);
  return { token, exp };
}

export class TokenError extends Error {}

export async function verifyAccessToken(cfg: Config, token: string): Promise<AccessClaims> {
  let kid: string | undefined;
  try {
    kid = decodeProtectedHeader(token).kid;
  } catch {
    throw new TokenError("malformed token");
  }
  const key = keyFor(cfg.keys.jwt, kid);
  if (!key) throw new TokenError("unknown key");
  try {
    const { payload } = await jwtVerify(token, key.bytes, {
      algorithms: ["HS256"],
      issuer: ISS(cfg),
      audience: cfg.resource,
      typ: "at+jwt",
      requiredClaims: ["exp", "sub", "jti"],
    });
    const { email, name, client_id, scope } = payload as Record<string, unknown>;
    if (typeof email !== "string" || typeof client_id !== "string" || typeof scope !== "string") throw new TokenError("missing claims");
    return { sub: payload.sub!, email, name: typeof name === "string" ? name : email, clientId: client_id, scope, exp: payload.exp!, jti: payload.jti! };
  } catch (e) {
    if (e instanceof TokenError) throw e;
    throw new TokenError(e instanceof joseErrors.JWTExpired ? "expired" : "invalid token");
  }
}

/** Encrypts a payload of a given kind, valid for `ttlSeconds` (0 = no expiry). */
export async function seal(cfg: Config, typ: string, payload: Record<string, unknown>, ttlSeconds: number): Promise<string> {
  const [key] = cfg.keys.seal;
  const jwt = new EncryptJWT({ ...payload, typ }).setProtectedHeader({ alg: "dir", enc: "A256GCM", kid: key.kid }).setIssuedAt();
  if (ttlSeconds > 0) jwt.setExpirationTime(Math.floor(Date.now() / 1000) + ttlSeconds);
  return jwt.encrypt(key.bytes);
}

/** Decrypts a sealed value of the expected kind, or returns null (wrong kind, expired, forged). */
export async function unseal<T extends Record<string, unknown>>(cfg: Config, typ: string, token: string | null | undefined): Promise<T | null> {
  if (!token || token.length > 8192) return null;
  let kid: string | undefined;
  try {
    kid = decodeProtectedHeader(token).kid;
  } catch {
    return null;
  }
  const key = keyFor(cfg.keys.seal, kid);
  if (!key) return null;
  try {
    const { payload } = await jwtDecrypt(token, key.bytes, { keyManagementAlgorithms: ["dir"], contentEncryptionAlgorithms: ["A256GCM"] });
    return payload.typ === typ ? (payload as T) : null;
  } catch {
    return null;
  }
}

// ── Refresh tokens ──

function mac(key: Key, data: string): string {
  return createHmac("sha256", key.bytes).update(data).digest("base64url");
}

export function newRefreshToken(cfg: Config, family = rand()): { token: string; family: string; jti: string } {
  const jti = rand();
  const [key] = cfg.keys.mac;
  return { token: `${family}.${jti}.${key.kid}.${mac(key, `${family}.${jti}`)}`, family, jti };
}

export function parseRefreshToken(cfg: Config, token: string): { family: string; jti: string } | null {
  const parts = token.split(".");
  if (parts.length !== 4) return null;
  const [family, jti, kid, sig] = parts;
  const key = keyFor(cfg.keys.mac, kid);
  if (!key) return null;
  const expected = Buffer.from(mac(key, `${family}.${jti}`));
  const given = Buffer.from(sig);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;
  return { family, jti };
}

export function randomId(n = 16): string {
  return rand(n);
}
