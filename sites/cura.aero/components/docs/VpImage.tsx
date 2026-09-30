"use client";

import { useState } from "react";
import Image from "next/image";

/**
 * A value-props screenshot with its "coming soon" placeholder: the placeholder hides once the
 * image loads, and the image hides if it fails. Served unoptimized: the screenshots sit behind
 * basic auth, which the image optimizer can't pass.
 */
export function VpImage({
  src,
  width,
  height,
  alt,
  placeholder,
}: {
  src: string;
  width: number;
  height: number;
  alt: string;
  placeholder: React.ReactNode;
}) {
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  return (
    <>
      {!failed && (
        <Image
          className="vp-img"
          src={src}
          alt={alt}
          width={width}
          height={height}
          loading="lazy"
          unoptimized
          onLoad={() => setLoaded(true)}
          onError={() => setFailed(true)}
        />
      )}
      <div className="vp-media-placeholder" style={loaded ? { display: "none" } : undefined}>
        {placeholder}
      </div>
    </>
  );
}
