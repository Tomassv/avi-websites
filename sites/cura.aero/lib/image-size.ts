import fs from "node:fs";
import path from "node:path";

/**
 * Intrinsic size of an image under public/, read from the file header at build time.
 * Content only gives an image path, and next/image needs width and height.
 * Supports PNG, JPEG, WebP, AVIF and SVG (width/height attributes or viewBox).
 */

export type Size = { width: number; height: number };

const cache = new Map<string, Size>();

export function imageSize(publicPath: string): Size {
  const hit = cache.get(publicPath);
  if (hit) return hit;
  const file = path.join(process.cwd(), "public", publicPath);
  const buf = fs.readFileSync(file);
  const size = readSize(buf);
  if (!size) throw new Error(`Can't read image size of ${publicPath}`);
  cache.set(publicPath, size);
  return size;
}

export function readSize(buf: Buffer): Size | null {
  // PNG
  if (buf.length > 24 && buf.readUInt32BE(0) === 0x89504e47) {
    return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
  }
  // JPEG
  if (buf.length > 4 && buf[0] === 0xff && buf[1] === 0xd8) return jpegSize(buf);
  // WebP (RIFF....WEBP)
  if (buf.length > 30 && buf.toString("ascii", 0, 4) === "RIFF" && buf.toString("ascii", 8, 12) === "WEBP") {
    return webpSize(buf);
  }
  // AVIF / HEIF (ftyp box)
  if (buf.length > 12 && buf.toString("ascii", 4, 8) === "ftyp") return avifSize(buf);
  // SVG
  const head = buf.toString("utf8", 0, Math.min(buf.length, 4096));
  if (/<svg[\s>]/i.test(head)) return svgSize(head);
  return null;
}

function jpegSize(buf: Buffer): Size | null {
  let i = 2;
  while (i + 9 < buf.length) {
    if (buf[i] !== 0xff) {
      i++;
      continue;
    }
    const marker = buf[i + 1];
    // SOF0..SOF15, excluding DHT (C4), JPG (C8) and DAC (CC)
    if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
      return { height: buf.readUInt16BE(i + 5), width: buf.readUInt16BE(i + 7) };
    }
    if (marker === 0xd8 || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) {
      i += 2;
      continue;
    }
    i += 2 + buf.readUInt16BE(i + 2);
  }
  return null;
}

function webpSize(buf: Buffer): Size | null {
  const chunk = buf.toString("ascii", 12, 16);
  if (chunk === "VP8 ") {
    return { width: buf.readUInt16LE(26) & 0x3fff, height: buf.readUInt16LE(28) & 0x3fff };
  }
  if (chunk === "VP8L") {
    const b = buf.readUInt32LE(21);
    return { width: (b & 0x3fff) + 1, height: ((b >> 14) & 0x3fff) + 1 };
  }
  if (chunk === "VP8X") {
    return { width: buf.readUIntLE(24, 3) + 1, height: buf.readUIntLE(27, 3) + 1 };
  }
  return null;
}

function avifSize(buf: Buffer): Size | null {
  // The first 'ispe' (image spatial extents) property holds the primary image size.
  const i = buf.indexOf("ispe", 0, "ascii");
  if (i === -1 || i + 16 > buf.length) return null;
  return { width: buf.readUInt32BE(i + 8), height: buf.readUInt32BE(i + 12) };
}

function svgSize(head: string): Size | null {
  const tag = /<svg\b[^>]*>/i.exec(head)?.[0];
  if (!tag) return null;
  const attr = (name: string) => new RegExp(`\\s${name}\\s*=\\s*["']([^"']*)["']`, "i").exec(tag)?.[1];
  const num = (v: string | undefined) => (v && /^\s*[\d.]+\s*(px)?\s*$/.test(v) ? parseFloat(v) : NaN);
  const w = num(attr("width"));
  const h = num(attr("height"));
  if (w > 0 && h > 0) return { width: Math.round(w), height: Math.round(h) };
  const vb = attr("viewBox")?.trim().split(/[\s,]+/).map(Number);
  if (vb && vb.length === 4 && vb[2] > 0 && vb[3] > 0) return { width: Math.round(vb[2]), height: Math.round(vb[3]) };
  return null;
}
