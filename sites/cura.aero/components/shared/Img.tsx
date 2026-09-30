import Image from "next/image";
import { imageSize } from "@/lib/image-size";
import { safeImageSrc } from "@/lib/safe-url";

type Props = {
  src: string;
  alt: string;
  className?: string;
  /** Overrides the intrinsic size read from the file (only where the old markup set it). */
  width?: number;
  height?: number;
  /** Header logos load eagerly, as they did before; everything else is lazy. */
  eager?: boolean;
  unoptimized?: boolean;
  /** Rendered width hint, for images far larger than they are shown. */
  sizes?: string;
};

/** next/image for a content image path. Paths outside /images/ render nothing. */
export function Img({ src, alt, className, width, height, eager, unoptimized, sizes }: Props) {
  const safe = safeImageSrc(src);
  if (!safe) return null;
  const size = width && height ? { width, height } : imageSize(safe);
  return (
    <Image
      src={safe}
      alt={alt}
      width={size.width}
      height={size.height}
      className={className}
      loading={eager ? "eager" : "lazy"}
      unoptimized={unoptimized}
      sizes={sizes}
    />
  );
}
