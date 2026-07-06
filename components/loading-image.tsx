"use client";

import clsx from "clsx";
import Image, { type ImageProps } from "next/image";
import { useState } from "react";

type LoadingImageProps = ImageProps & {
  wrapperClassName?: string;
  skeletonClassName?: string;
};

export function LoadingImage({
  alt,
  className,
  fill,
  onError,
  onLoad,
  skeletonClassName,
  src,
  wrapperClassName,
  ...props
}: LoadingImageProps) {
  const srcKey =
    typeof src === "string" ? src : "src" in src ? src.src : String(src);
  const [loadedSrcKey, setLoadedSrcKey] = useState<string | null>(null);
  const isLoaded = loadedSrcKey === srcKey;

  return (
    <div
      className={clsx(
        "relative overflow-hidden",
        fill ? "h-full w-full" : "",
        wrapperClassName,
      )}
    >
      <div
        aria-hidden="true"
        className={clsx(
          "absolute inset-0 bg-[image:var(--gradient-loading-neutral)] bg-[length:220%_100%] animate-[shimmer_1.8s_ease-in-out_infinite] transition-opacity duration-300",
          isLoaded ? "pointer-events-none opacity-0" : "opacity-100",
          skeletonClassName,
        )}
      />
      <Image
        {...props}
        alt={alt}
        fill={fill}
        src={src}
        onError={(event) => {
          setLoadedSrcKey(srcKey);
          onError?.(event);
        }}
        onLoad={(event) => {
          setLoadedSrcKey(srcKey);
          onLoad?.(event);
        }}
        className={clsx(
          "transition-opacity duration-500",
          isLoaded ? "opacity-100" : "opacity-0",
          className,
        )}
      />
    </div>
  );
}
