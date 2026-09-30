/**
 * Minimal glob matching for site paths and JSON pointers.
 * `**` matches any number of segments (including none), `*` matches within one segment.
 */
export function globToRegExp(glob: string): RegExp {
  let re = "";
  const parts = glob.split("/");
  parts.forEach((part, i) => {
    const last = i === parts.length - 1;
    if (part === "**") {
      re += last ? ".*" : "(?:[^/]*/)*";
      return;
    }
    re += part.replace(/[.+^${}()|[\]\\?]/g, "\\$&").replace(/\*/g, "[^/]*");
    if (!last) re += "/";
  });
  return new RegExp(`^${re}$`);
}

export function matchesAny(value: string, globs: string[]): boolean {
  return globs.some((g) => globToRegExp(g).test(value));
}
