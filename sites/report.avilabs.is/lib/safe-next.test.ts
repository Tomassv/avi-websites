import { test } from "node:test";
import assert from "node:assert/strict";
import { safeNext } from "./safe-next.ts";

test("safeNext keeps local paths and drops everything else", () => {
  assert.equal(safeNext("/airlines/play?x=1"), "/airlines/play?x=1");
  for (const bad of ["//evil.com", "/\\evil.com", "/\t/evil.com", "/\n/evil.com", " //evil.com", "https://evil.com", "evil", "", undefined, ["/a"]]) {
    assert.equal(safeNext(bad), "/", String(bad));
  }
});
