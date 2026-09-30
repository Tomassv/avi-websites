import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * The server-signed commit trailer. Every commit the server creates ends with
 * `Mcp-Signature: <hex HMAC-SHA256(tree SHA \n parent SHA \n author email)>`, keyed with
 * COMMIT_SIGNING_SECRET. Publish gate 2 recomputes it from the commit itself, so a commit
 * pushed to an mcp/ branch by anyone else (or an altered one) blocks the merge.
 */
export const SIGNATURE_TRAILER = "Mcp-Signature";

export function commitSignature(secret: Uint8Array, tree: string, parent: string, authorEmail: string): string {
  return createHmac("sha256", secret).update(`${tree}\n${parent}\n${authorEmail}`).digest("hex");
}

/** Appends trailers as a final paragraph (git trailer format). */
export function withTrailers(message: string, trailers: [string, string][]): string {
  return `${message.trimEnd()}\n\n${trailers.map(([k, v]) => `${k}: ${v}`).join("\n")}\n`;
}

/** The value of the last `key:` trailer in the message's final paragraph, if any. */
export function readTrailer(message: string, key: string): string | null {
  const paragraphs = message.trimEnd().split(/\n\s*\n/);
  const last = paragraphs[paragraphs.length - 1] ?? "";
  let value: string | null = null;
  for (const line of last.split("\n")) {
    const m = /^([A-Za-z0-9-]+):\s*(.*)$/.exec(line.trim());
    if (m && m[1].toLowerCase() === key.toLowerCase()) value = m[2].trim();
  }
  return value;
}

export type SignedCommit = { sha: string; tree: string; parents: string[]; authorEmail: string; message: string };

export function verifyCommitSignature(secret: Uint8Array, c: SignedCommit): { ok: true } | { ok: false; reason: string } {
  if (c.parents.length !== 1) return { ok: false, reason: `commit ${c.sha.slice(0, 7)} has ${c.parents.length} parents` };
  const trailer = readTrailer(c.message, SIGNATURE_TRAILER);
  if (!trailer) return { ok: false, reason: `commit ${c.sha.slice(0, 7)} has no ${SIGNATURE_TRAILER} trailer` };
  if (!/^[0-9a-f]{64}$/.test(trailer)) return { ok: false, reason: `commit ${c.sha.slice(0, 7)} has a malformed ${SIGNATURE_TRAILER}` };
  const expected = Buffer.from(commitSignature(secret, c.tree, c.parents[0], c.authorEmail), "hex");
  if (!timingSafeEqual(expected, Buffer.from(trailer, "hex"))) {
    return { ok: false, reason: `commit ${c.sha.slice(0, 7)} has an invalid ${SIGNATURE_TRAILER}` };
  }
  return { ok: true };
}
