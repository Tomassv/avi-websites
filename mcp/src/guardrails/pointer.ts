import { ToolError } from "./errors.ts";

/**
 * RFC 6901 JSON pointers, and the string-only edit that update_text performs: a pointer must
 * name an existing string, and the edited document must keep exactly the same shape.
 */

export function parsePointer(pointer: string): string[] {
  if (pointer === "") return [];
  if (!pointer.startsWith("/")) throw new ToolError("pointer_invalid", `"${pointer}" is not a JSON pointer (it must start with /)`);
  return pointer
    .slice(1)
    .split("/")
    .map((s) => {
      if (/~[^01]/.test(s) || s.endsWith("~")) throw new ToolError("pointer_invalid", `"${pointer}" has an invalid ~ escape`);
      return s.replace(/~1/g, "/").replace(/~0/g, "~");
    });
}

export function formatPointer(segments: (string | number)[]): string {
  return segments.map((s) => "/" + String(s).replace(/~/g, "~0").replace(/\//g, "~1")).join("");
}

function child(node: unknown, seg: string): { found: boolean; value?: unknown } {
  if (Array.isArray(node)) {
    if (!/^(0|[1-9][0-9]*)$/.test(seg)) return { found: false };
    const i = Number(seg);
    return i < node.length ? { found: true, value: node[i] } : { found: false };
  }
  if (node && typeof node === "object" && Object.hasOwn(node, seg)) {
    return { found: true, value: (node as Record<string, unknown>)[seg] };
  }
  return { found: false };
}

export function getAt(doc: unknown, pointer: string): { found: boolean; value?: unknown } {
  let node: unknown = doc;
  for (const seg of parsePointer(pointer)) {
    const c = child(node, seg);
    if (!c.found) return { found: false };
    node = c.value;
  }
  return { found: true, value: node };
}

/** Every string in a document, with its pointer. */
export function* strings(doc: unknown, path: (string | number)[] = []): Generator<{ pointer: string; segments: (string | number)[]; value: string }> {
  if (typeof doc === "string") yield { pointer: formatPointer(path), segments: path, value: doc };
  else if (Array.isArray(doc)) for (const [i, v] of doc.entries()) yield* strings(v, [...path, i]);
  else if (doc && typeof doc === "object") for (const [k, v] of Object.entries(doc)) yield* strings(v, [...path, k]);
}

/** Same keys (in any order), same array lengths, same value types, all the way down. */
export function sameShape(a: unknown, b: unknown): boolean {
  if (Array.isArray(a) || Array.isArray(b)) {
    if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return false;
    return a.every((v, i) => sameShape(v, b[i]));
  }
  if (a === null || b === null) return a === b;
  if (typeof a !== typeof b) return false;
  if (typeof a === "object") {
    const ka = Object.keys(a as object).sort();
    const kb = Object.keys(b as object).sort();
    if (ka.length !== kb.length || ka.some((k, i) => k !== kb[i])) return false;
    return ka.every((k) => sameShape((a as Record<string, unknown>)[k], (b as Record<string, unknown>)[k]));
  }
  if (typeof a !== "string" && a !== b) return false; // numbers and booleans are never edited
  return true;
}

export type StringEdit = { pointer: string; oldValue: string; newValue: string };

/**
 * Applies string replacements to a copy of `doc`. Each pointer must resolve to an existing
 * string equal to `oldValue`. Throws a ToolError naming the first bad edit.
 */
export function applyStringEdits(doc: unknown, edits: StringEdit[]): unknown {
  const copy = structuredClone(doc);
  const seen = new Set<string>();
  for (const e of edits) {
    if (seen.has(e.pointer)) throw new ToolError("pointer_duplicate", `${e.pointer} is edited twice in one call`);
    seen.add(e.pointer);
    const segments = parsePointer(e.pointer);
    if (!segments.length) throw new ToolError("pointer_invalid", "the document root can't be replaced");
    const parentPath = segments.slice(0, -1);
    const key = segments[segments.length - 1];
    let parent: unknown = copy;
    for (const seg of parentPath) {
      const c = child(parent, seg);
      if (!c.found) throw new ToolError("pointer_not_found", `${e.pointer} doesn't exist in this file`);
      parent = c.value;
    }
    const current = child(parent, key);
    if (!current.found) throw new ToolError("pointer_not_found", `${e.pointer} doesn't exist in this file`);
    if (typeof current.value !== "string") {
      throw new ToolError("pointer_not_string", `${e.pointer} is not a text value, so it can't be edited with update_text`);
    }
    if (current.value !== e.oldValue) {
      throw new ToolError("stale_value", `${e.pointer} has changed: its current value is ${JSON.stringify(current.value)}. Read the page again.`);
    }
    if (typeof e.newValue !== "string") throw new ToolError("pointer_not_string", `${e.pointer}: the new value must be text`);
    if (Array.isArray(parent)) parent[Number(key)] = e.newValue;
    else (parent as Record<string, unknown>)[key] = e.newValue;
  }
  if (!sameShape(doc, copy)) throw new ToolError("structure_changed", "the edit would change the structure of the file");
  return copy;
}
