import { test } from "node:test";
import assert from "node:assert/strict";
import { safeHref, safeImageSrc, safeHubspotMeetingUrl, isGaId, safeIconName, jsonLdString } from "./safe-url.ts";

test("safeHref allows site paths, anchors, https and mailto", () => {
  for (const ok of ["/", "/book-demo", "/news/my-article", "#how-it-works", "#", "https://avilabs.is", "https://cura.aero/x?y=1", "mailto:hello@cura.aero"]) {
    assert.equal(safeHref(ok), ok, ok);
  }
});

test("safeHref rejects script URLs and other schemes", () => {
  for (const bad of [
    "javascript:alert(1)",
    "JavaScript:alert(1)",
    " javascript:alert(1)",
    "java\tscript:alert(1)",
    "java\nscript:alert(1)",
    "data:text/html,<script>alert(1)</script>",
    "vbscript:x",
    "http://cura.aero",
    "//evil.example",
    "/\\evil.example",
    "\\\\evil.example",
    "https://user:pass@evil.example",
    "mailto:a@b.co?body=<script>",
    "#a\"onmouseover=\"x",
    "/path with space",
    "",
    null,
    42,
  ]) {
    assert.equal(safeHref(bad as string), null, String(bad));
  }
});

test("safeImageSrc only allows /images/ files", () => {
  assert.equal(safeImageSrc("/images/logo-dark.svg"), "/images/logo-dark.svg");
  assert.equal(safeImageSrc("/images/values/1.png"), "/images/values/1.png");
  for (const bad of ["/images/../proxy.ts", "/images//x.png", "https://evil.example/x.png", "/other/x.png", "images/x.png", "/images/x.png?y", "/images/a b.png", "javascript:x"]) {
    assert.equal(safeImageSrc(bad), null, bad);
  }
});

test("safeHubspotMeetingUrl only allows HubSpot meetings over https", () => {
  const ok = "https://meetings.hubspot.com/nicolecaba/cura-demo-call?embed=true";
  assert.equal(safeHubspotMeetingUrl(ok), ok);
  for (const bad of ["http://meetings.hubspot.com/x", "https://meetings.hubspot.com.evil.example/x", "https://evil.example/?meetings.hubspot.com", "javascript:alert(1)"]) {
    assert.equal(safeHubspotMeetingUrl(bad), null, bad);
  }
});

test("isGaId is strict", () => {
  assert.ok(isGaId("G-83QLM5X9DK"));
  for (const bad of ["G-83QLM5X9DK'); alert(1); ('", "UA-123", "g-83qlm5x9dk", "G-", ""]) assert.ok(!isGaId(bad), bad);
});

test("safeIconName only allows ligature names", () => {
  assert.equal(safeIconName("mark_email_unread"), "mark_email_unread");
  assert.equal(safeIconName("<img>"), null);
  assert.equal(safeIconName("Bolt"), null);
});

test("jsonLdString cannot close the script element", () => {
  const out = jsonLdString({ name: "</script><script>alert(1)</script>", x: "a&b  " });
  assert.ok(!out.includes("<") && !out.includes(">") && !out.includes("&"));
  assert.ok(!out.includes(" ") && !out.includes(" "));
  assert.deepEqual(JSON.parse(out), { name: "</script><script>alert(1)</script>", x: "a&b  " });
});

test("safeId only allows plain anchor ids", async () => {
  const { safeId } = await import("./safe-url.ts");
  assert.equal(safeId("claim-intake"), "claim-intake");
  for (const bad of ['x" onmouseover="y', "Claim", "1abc", "a b", ""]) assert.equal(safeId(bad), undefined, bad);
});
