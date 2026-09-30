import sharp, { type Metadata, type WebpOptions } from "sharp";
import { ToolError } from "./errors.ts";

/**
 * The image pipeline shared by upload_image and the upload page. Input type comes from the
 * file's bytes, never its name. Output is always WebP: resized, auto-rotated, metadata (EXIF,
 * GPS) stripped. SVG is refused: served from the site's origin it could run script.
 */
export const MAX_INPUT_BYTES = 3 * 1024 * 1024;
export const MAX_OUTPUT_BYTES = 1.5 * 1024 * 1024;
export const MAX_PIXELS = 40_000_000;
export const MAX_EDGE = 2400;

export type ImageType = "jpeg" | "png" | "webp" | "avif";

export function sniffImage(buf: Buffer): ImageType | "svg" | "other" {
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "jpeg";
  if (buf.length >= 8 && buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "png";
  if (buf.length >= 12 && buf.toString("ascii", 0, 4) === "RIFF" && buf.toString("ascii", 8, 12) === "WEBP") return "webp";
  if (buf.length >= 12 && buf.toString("ascii", 4, 8) === "ftyp" && /^avi[fs]$/.test(buf.toString("ascii", 8, 12))) return "avif";
  const head = buf.subarray(0, 512).toString("utf8").replace(/^﻿/, "").trimStart().toLowerCase();
  if (head.startsWith("<svg") || (head.startsWith("<?xml") && head.includes("<svg")) || head.startsWith("<!doctype svg")) return "svg";
  return "other";
}

/** "Hero Photo (1).JPG" → "hero-photo-1.webp". */
export function imageFileName(name: string): string {
  const base = name
    .replace(/\.[A-Za-z0-9]{2,5}$/, "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60)
    .replace(/-+$/, "");
  if (!base) throw new ToolError("invalid_name", `"${name}" doesn't give a usable file name; use letters and digits`);
  return `${base}.webp`;
}

export type ProcessedImage = { data: Buffer; width: number; height: number; bytes: number };

export async function processImage(input: Buffer): Promise<ProcessedImage> {
  if (input.length === 0) throw new ToolError("invalid_image", "the image is empty");
  if (input.length > MAX_INPUT_BYTES) {
    throw new ToolError("too_large", `the image is ${input.length} bytes; the limit is ${MAX_INPUT_BYTES}. Use get_image_upload_link for large photos.`);
  }
  const type = sniffImage(input);
  if (type === "svg") throw new ToolError("unsupported_image", "SVG images can't be uploaded; use PNG, JPEG, WebP or AVIF");
  if (type === "other") throw new ToolError("unsupported_image", "only JPEG, PNG, WebP and AVIF images can be uploaded");

  let meta: Metadata;
  try {
    meta = await sharp(input, { limitInputPixels: MAX_PIXELS, failOn: "error" }).metadata();
  } catch (e) {
    const msg = String((e as Error).message);
    if (/pixel limit/i.test(msg)) throw new ToolError("too_large", `the image is larger than ${MAX_PIXELS / 1e6} megapixels`);
    throw new ToolError("invalid_image", "the image couldn't be read");
  }
  if ((meta.pages ?? 1) > 1) throw new ToolError("unsupported_image", "animated images can't be uploaded");

  const alpha = Boolean(meta.hasAlpha);
  const attempts: WebpOptions[] = alpha
    ? [{ lossless: true }, { quality: 85, alphaQuality: 90 }, { quality: 70, alphaQuality: 80 }]
    : [{ quality: 80 }, { quality: 70 }, { quality: 60 }];

  for (const options of attempts) {
    const { data, info } = await sharp(input, { limitInputPixels: MAX_PIXELS, failOn: "error" })
      .rotate() // apply EXIF orientation; metadata is not copied to the output
      .resize({ width: MAX_EDGE, height: MAX_EDGE, fit: "inside", withoutEnlargement: true })
      .webp({ ...options, effort: 4 })
      .toBuffer({ resolveWithObject: true });
    if (data.length <= MAX_OUTPUT_BYTES) return { data, width: info.width, height: info.height, bytes: data.length };
  }
  throw new ToolError("too_large", `the image is still larger than ${MAX_OUTPUT_BYTES} bytes after compression`);
}
