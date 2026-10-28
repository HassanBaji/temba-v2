import { Image, type ImageProps } from "expo-image";

import { mediaCacheKey } from "./media-cache-key";

export type CachedImageProps = Omit<ImageProps, "source" | "cachePolicy"> & {
  uri: string;
};

/** A remote image kept in memory and on disk across launches and re-signed URLs. */
export function CachedImage({ uri, ...props }: CachedImageProps) {
  return (
    <Image
      {...props}
      source={{ uri, cacheKey: mediaCacheKey(uri) }}
      cachePolicy="memory-disk"
    />
  );
}
