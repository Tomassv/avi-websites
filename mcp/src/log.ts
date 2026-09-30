import { createHash } from "node:crypto";

/**
 * Structured audit log: one JSON line per event on stdout (Vercel runtime logs). Tokens,
 * codes, secrets, image data and full content are never logged; large or sensitive
 * arguments are reduced to their size and SHA-256.
 */
export type LogEvent = Record<string, unknown> & { event: string };

export type Logger = (e: LogEvent) => void;

export const stdoutLogger: Logger = (e) => {
  process.stdout.write(JSON.stringify({ ts: new Date().toISOString(), ...e }) + "\n");
};

const SECRET_KEYS = /token|secret|password|authorization|code_verifier|^code$|cookie|signature/i;
const BULKY_KEYS = /^(dataBase64|body|page|content|newValue|oldValue)$/;

function digest(value: unknown): string {
  const s = typeof value === "string" ? value : JSON.stringify(value) ?? "";
  return `${s.length} chars, sha256:${createHash("sha256").update(s).digest("hex").slice(0, 16)}`;
}

/** A copy of tool arguments that is safe to log. */
export function redactArgs(args: unknown, depth = 0): unknown {
  if (depth > 4) return "…";
  if (Array.isArray(args)) return args.slice(0, 20).map((v) => redactArgs(v, depth + 1));
  if (args && typeof args === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(args)) {
      if (SECRET_KEYS.test(k)) out[k] = "[redacted]";
      else if (BULKY_KEYS.test(k)) out[k] = digest(v);
      else out[k] = redactArgs(v, depth + 1);
    }
    return out;
  }
  if (typeof args === "string" && args.length > 200) return digest(args);
  return args;
}
