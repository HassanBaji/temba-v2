"use client";

import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { initials } from "@repo/domain/initials";
import { cn } from "~/lib/utils";

type AvatarSize = "sm" | "default" | "lg";

/** The design's initials tiles: 20, 28, 34 and 44px squares beside the avatar sizes. */
type TileSize = "2xs" | "xs" | "md" | "xl";

const TILE_SIZE: Record<TileSize, string> = {
  "2xs": "size-5 rounded-xs text-eyebrow",
  xs: "size-7 rounded-sm text-eyebrow",
  md: "size-8.5 rounded-md text-eyebrow",
  xl: "size-11 rounded-lg text-body",
};

const TONE = {
  muted: "",
  control: "bg-control text-on-control font-semibold",
  inverse: "bg-focus-control text-on-focus-control font-semibold",
} as const;

export function EntityMonogram({
  name,
  image,
  size = "default",
  tone = "muted",
}: {
  name: string;
  image?: string | null;
  size?: AvatarSize | TileSize;
  /** `control` is the solid black tile; `inverse` is the white tile on ink. */
  tone?: keyof typeof TONE;
}) {
  const src = image && image.length > 0 ? image : undefined;
  const tile = size in TILE_SIZE ? TILE_SIZE[size as TileSize] : null;

  return (
    <Avatar
      aria-hidden="true"
      size={tile ? "default" : (size as AvatarSize)}
      className={cn("rounded-lg", tile)}
    >
      {src ? <AvatarImage alt="" src={src} /> : null}
      <AvatarFallback
        className={cn(
          "rounded-lg",
          tile && "rounded-[inherit] text-[length:inherit] leading-none",
          TONE[tone],
        )}
      >
        {initials(name)}
      </AvatarFallback>
    </Avatar>
  );
}
