import { isDeepStrictEqual } from "node:util";
import { ToolError } from "./errors.ts";
import { applyStringEdits, formatPointer, type StringEdit } from "./pointer.ts";

/**
 * Formatting-preserving string edits: the source text is scanned for the exact position of each
 * string value, and only those characters are replaced. The rest of the file (indentation,
 * inline objects, key order) is untouched, so a one-word edit is a one-line diff. The result
 * is re-parsed and must equal the structurally checked edit from pointer.ts.
 */
type Span = { start: number; end: number };

/** Positions of every string *value* (not keys) in a JSON text, by pointer. */
export function stringSpans(source: string): Map<string, Span> {
  const spans = new Map<string, Span>();
  let i = 0;
  const ws = () => {
    while (i < source.length && " \t\n\r".includes(source[i])) i++;
  };
  const str = (): string => {
    const start = i;
    i++; // opening quote
    while (i < source.length && source[i] !== '"') i += source[i] === "\\" ? 2 : 1;
    i++; // closing quote
    return JSON.parse(source.slice(start, i));
  };
  const value = (path: (string | number)[]): void => {
    ws();
    const c = source[i];
    if (c === '"') {
      const start = i;
      str();
      spans.set(formatPointer(path), { start, end: i });
    } else if (c === "{") {
      i++;
      ws();
      if (source[i] === "}") {
        i++;
        return;
      }
      for (;;) {
        ws();
        const key = str();
        ws();
        i++; // :
        value([...path, key]);
        ws();
        if (source[i++] === "}") return;
      }
    } else if (c === "[") {
      i++;
      ws();
      if (source[i] === "]") {
        i++;
        return;
      }
      for (let n = 0; ; n++) {
        value([...path, n]);
        ws();
        if (source[i++] === "]") return;
      }
    } else {
      while (i < source.length && !",}] \t\n\r".includes(source[i])) i++;
    }
  };
  JSON.parse(source); // reject invalid JSON before scanning
  value([]);
  return spans;
}

export function editJsonText(source: string, edits: StringEdit[]): { text: string; doc: unknown } {
  let original: unknown;
  try {
    original = JSON.parse(source);
  } catch {
    throw new ToolError("invalid_json", "the file isn't valid JSON");
  }
  const expected = applyStringEdits(original, edits);
  const spans = stringSpans(source);
  const ordered = edits.map((e) => ({ e, span: spans.get(e.pointer)! })).sort((a, b) => b.span.start - a.span.start);
  let text = source;
  for (const { e, span } of ordered) text = text.slice(0, span.start) + JSON.stringify(e.newValue) + text.slice(span.end);
  const doc = JSON.parse(text);
  if (!isDeepStrictEqual(doc, expected)) throw new Error("formatting-preserving edit produced a different document");
  return { text, doc };
}
