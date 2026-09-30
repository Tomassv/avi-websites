import { test } from "node:test";
import assert from "node:assert/strict";
import { isAuthorized, decodeBasicAuth, safeEqual } from "./basic-auth.ts";

const header = (user: string, pass: string) =>
  "Basic " + btoa(String.fromCharCode(...new TextEncoder().encode(`${user}:${pass}`)));

test("accepts the configured credentials", () => {
  assert.ok(isAuthorized(header("cura", "s3cret"), "cura", "s3cret"));
  assert.ok(isAuthorized(header("cura", "pa:ss:word"), "cura", "pa:ss:word"));
  assert.ok(isAuthorized(header("þór", "lykilorð"), "þór", "lykilorð"));
  assert.ok(isAuthorized(header("cura", "s3cret").replace("Basic", "basic"), "cura", "s3cret"));
});

test("rejects wrong or malformed credentials", () => {
  assert.ok(!isAuthorized(header("cura", "wrong"), "cura", "s3cret"));
  assert.ok(!isAuthorized(header("other", "s3cret"), "cura", "s3cret"));
  assert.ok(!isAuthorized(header("cura", "s3cret "), "cura", "s3cret"));
  assert.ok(!isAuthorized(header("cura", "s3cre"), "cura", "s3cret"));
  assert.ok(!isAuthorized(null, "cura", "s3cret"));
  assert.ok(!isAuthorized("", "cura", "s3cret"));
  assert.ok(!isAuthorized("Bearer abc", "cura", "s3cret"));
  assert.ok(!isAuthorized("Basic !!!notbase64", "cura", "s3cret"));
  assert.ok(!isAuthorized("Basic " + btoa("nocolon"), "cura", "s3cret"));
});

test("fails closed when credentials are not configured", () => {
  assert.ok(!isAuthorized(header("", ""), undefined, undefined));
  assert.ok(!isAuthorized(header("", ""), "", ""));
  assert.ok(!isAuthorized(header("cura", ""), "cura", ""));
  assert.ok(!isAuthorized(header("", "s3cret"), "", "s3cret"));
  assert.ok(!isAuthorized(header("cura", "undefined"), "cura", undefined));
});

test("decodeBasicAuth splits on the first colon", () => {
  assert.deepEqual(decodeBasicAuth(header("a", "b:c")), { user: "a", password: "b:c" });
});

test("safeEqual", () => {
  assert.ok(safeEqual("abc", "abc"));
  assert.ok(!safeEqual("abc", "abd"));
  assert.ok(!safeEqual("abc", "abcd"));
  assert.ok(!safeEqual("", "a"));
  assert.ok(safeEqual("", ""));
});
