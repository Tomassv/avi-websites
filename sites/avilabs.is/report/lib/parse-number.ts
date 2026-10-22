export type ParsedNumber = {
  value: number;
  /** The input wasn't a plain JS number literal (it had separators or spaces). */
  normalized: boolean;
  /** A single "," or "." followed by exactly three digits: read as a thousands separator. */
  ambiguous: boolean;
};

/**
 * Parses the hand-typed numbers in the old report JSON, which mix "2,047.50", "27.602,76",
 * "171 495,2", "21,44" and "5615.58  ". The old pages used parseInt, which read "10 000" as 10.
 *
 * Rules: whitespace is dropped; if both "," and "." appear, the last one is the decimal mark;
 * a separator that appears more than once is a thousands separator; a single separator followed
 * by exactly three digits is a thousands separator (flagged as ambiguous); otherwise it's the
 * decimal mark.
 */
export function parseNumber(input: unknown): ParsedNumber {
  if (typeof input === "number") {
    if (!Number.isFinite(input)) throw new Error(`Not a finite number: ${input}`);
    return { value: input, normalized: false, ambiguous: false };
  }
  const raw = String(input ?? "");
  const s = raw.replace(/[\s  ]/g, "");
  if (s === "") return { value: 0, normalized: raw !== "", ambiguous: false };
  if (!/^-?[\d.,]+$/.test(s)) throw new Error(`Not a number: ${JSON.stringify(raw)}`);

  let ambiguous = false;
  let canonical: string;
  const lastComma = s.lastIndexOf(",");
  const lastDot = s.lastIndexOf(".");

  if (lastComma >= 0 && lastDot >= 0) {
    const [decimal, thousands] = lastComma > lastDot ? [",", "."] : [".", ","];
    canonical = s.split(thousands).join("").replace(decimal, ".");
  } else if (lastComma >= 0 || lastDot >= 0) {
    const sep = lastComma >= 0 ? "," : ".";
    const parts = s.split(sep);
    if (parts.length > 2) {
      canonical = parts.join("");
    } else if (parts[1].length === 3) {
      ambiguous = true;
      canonical = parts.join("");
    } else {
      canonical = parts.join(".");
    }
  } else {
    canonical = s;
  }

  const value = Number(canonical);
  if (!Number.isFinite(value) || canonical === "" || canonical === "-") {
    throw new Error(`Not a number: ${JSON.stringify(raw)}`);
  }
  return { value, normalized: canonical !== raw, ambiguous };
}
