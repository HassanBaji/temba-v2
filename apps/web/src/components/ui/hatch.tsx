import type { SurfaceTone } from "@repo/domain/surface-tone";
import type { ComponentPropsWithoutRef } from "react";

import { cn } from "~/lib/utils";

import { surfaceRadiusClass, type SurfaceRadius } from "./surface";

export type HatchProps = {
  tone?: SurfaceTone;
  radius?: SurfaceRadius;
} & Omit<ComponentPropsWithoutRef<"span">, "children">;

export function Hatch({
  tone = "paper",
  radius,
  className,
  ...props
}: HatchProps) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "hatch",
        tone === "ink" && "hatch-on-ink",
        radius && surfaceRadiusClass[radius],
        className,
      )}
      {...props}
    />
  );
}
