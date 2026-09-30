import { ToolError } from "./errors.ts";

/**
 * The Rich markup whitelist, taken from the site's own landing schema (`$defs/rich/pattern`),
 * which the repo keeps as data. Nothing here restates the list of allowed tags or classes.
 */
export type RichChecker = {
  /** A whole value: only whitelisted tags, and a literal < or > must be written &lt; / &gt;. */
  isRich(value: string): boolean;
  /** Every tag in the value is whitelisted (the site's rich.test.ts rule for existing content). */
  tagsAllowed(value: string): boolean;
};

export function richChecker(schema: unknown): RichChecker {
  const pattern = (schema as { $defs?: { rich?: { pattern?: unknown } } })?.$defs?.rich?.pattern;
  if (typeof pattern !== "string") throw new ToolError("rules_missing", "the site's landing schema has no $defs.rich.pattern");
  const re = new RegExp(pattern, "u");
  return {
    isRich: (value) => re.test(value),
    tagsAllowed: (value) => (value.match(/<[^>]*>?/g) ?? []).every((tag) => re.test(tag)),
  };
}
