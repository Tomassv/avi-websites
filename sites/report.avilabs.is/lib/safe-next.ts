/** The post-login redirect target, limited to paths on this site. */
export function safeNext(next: unknown): string {
  if (typeof next !== "string" || !next.startsWith("/") || next.startsWith("//") || next.includes("\\") || /[\s\x00-\x1f\x7f]/.test(next)) {
    return "/";
  }
  return next;
}
