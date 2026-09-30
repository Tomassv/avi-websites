import { test } from "node:test";
import assert from "node:assert/strict";
import sharp from "sharp";
import { imageFileName, processImage, sniffImage, MAX_EDGE, MAX_INPUT_BYTES } from "../src/guardrails/images.ts";
import { ToolError } from "../src/guardrails/errors.ts";

const refused = async (buf: Buffer, code: string, pattern?: RegExp) =>
  assert.rejects(processImage(buf), (e: unknown) => e instanceof ToolError && e.code === code && (!pattern || pattern.test(e.message)));

const photo = (w: number, h: number) =>
  sharp({ create: { width: w, height: h, channels: 3, background: { r: 200, g: 120, b: 40 } } });

test("a photo becomes a resized WebP without metadata", async () => {
  const jpeg = await photo(4000, 3000)
    .jpeg()
    .withExifMerge({ IFD0: { Copyright: "Someone" }, IFD3: { GPSLatitudeRef: "N", GPSLatitude: "64/1 8/1 0/1" } })
    .toBuffer();
  assert.ok((await sharp(jpeg).metadata()).exif, "the fixture has EXIF");
  const out = await processImage(jpeg);
  assert.equal(sniffImage(out.data), "webp");
  assert.equal(Math.max(out.width, out.height), MAX_EDGE);
  const meta = await sharp(out.data).metadata();
  assert.equal(meta.exif, undefined);
  assert.equal(meta.icc, undefined);
  assert.equal(meta.xmp, undefined);
});

test("EXIF orientation is applied", async () => {
  const rotated = await photo(300, 100).jpeg().withMetadata({ orientation: 6 }).toBuffer();
  const out = await processImage(rotated);
  assert.deepEqual([out.width, out.height], [100, 300]);
});

test("small images aren't enlarged; transparency is kept", async () => {
  const png = await sharp({ create: { width: 64, height: 32, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0.5 } } })
    .png()
    .toBuffer();
  const out = await processImage(png);
  assert.deepEqual([out.width, out.height], [64, 32]);
  assert.equal((await sharp(out.data).metadata()).hasAlpha, true);
});

test("WebP and AVIF are accepted", async () => {
  await processImage(await photo(50, 50).webp().toBuffer());
  await processImage(await photo(50, 50).avif().toBuffer());
});

test("the type comes from the bytes: SVG, GIF, text and truncated files are refused", async () => {
  await refused(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>'), "unsupported_image", /SVG/);
  await refused(Buffer.from('<?xml version="1.0"?>\n<svg xmlns="http://www.w3.org/2000/svg"/>'), "unsupported_image", /SVG/);
  await refused(await photo(10, 10).gif().toBuffer(), "unsupported_image");
  await refused(Buffer.from("hello, not an image"), "unsupported_image");
  const jpeg = await photo(200, 200).jpeg().toBuffer();
  await refused(jpeg.subarray(0, 40), "invalid_image");
  await refused(Buffer.alloc(0), "invalid_image");
});

test("size and pixel limits", async () => {
  await refused(Buffer.alloc(MAX_INPUT_BYTES + 1, 0xff), "too_large", /get_image_upload_link/);
  // 8000 x 6000 = 48 MP, over the 40 MP limit; PNG of a flat colour stays small.
  const huge = await sharp({ create: { width: 8000, height: 6000, channels: 3, background: "#fff" } }).png({ compressionLevel: 9 }).toBuffer();
  assert.ok(huge.length < MAX_INPUT_BYTES);
  await refused(huge, "too_large", /megapixels/);
});

test("animated images are refused", async () => {
  const frame = (colour: string) => sharp({ create: { width: 20, height: 20, channels: 3, background: colour } }).png().toBuffer();
  const animated = await sharp([await frame("#f00"), await frame("#0f0")], { join: { animated: true } }).webp().toBuffer();
  assert.equal((await sharp(animated).metadata()).pages, 2);
  await refused(animated, "unsupported_image", /animated/);
});

test("file names", () => {
  assert.equal(imageFileName("Hero Photo (1).JPG"), "hero-photo-1.webp");
  assert.equal(imageFileName("Café déjà vu"), "cafe-deja-vu.webp");
  assert.equal(imageFileName("../../etc/passwd"), "etc-passwd.webp");
  assert.throws(() => imageFileName("..."), (e: unknown) => e instanceof ToolError && e.code === "invalid_name");
  assert.ok(imageFileName("a".repeat(200)).length <= 65);
});
