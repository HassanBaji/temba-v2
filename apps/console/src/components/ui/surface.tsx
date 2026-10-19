import type { SurfaceTone } from "@repo/domain/surface-tone";
import type { ComponentPropsWithoutRef, ElementType } from "react";

import { cn } from "~/lib/utils";

export type SurfaceRadius = "slot" | "sm" | "md" | "lg" | "card" | "surface";

export const surfaceRadiusClass: Record<SurfaceRadius, string> = {
  slot: "rounded-xs",
  sm: "rounded-sm",
  md: "rounded-md",
  lg: "rounded-lg",
  card: "rounded-card",
  surface: "rounded-xl",
};

const toneClass: Record<SurfaceTone, string> = {
  ink: "surface-ink bg-ink text-paper",
  paper: "bg-paper text-ink",
};

export type SurfaceProps<T extends ElementType = "div"> = {
  as?: T;
  tone?: SurfaceTone;
  radius?: SurfaceRadius;
} & Omit<ComponentPropsWithoutRef<T>, "as" | "tone" | "radius">;

export function Surface<T extends ElementType = "div">({
  as,
  tone = "paper",
  radius,
  className,
  ...props
}: SurfaceProps<T>) {
  const Component: ElementType = as ?? "div";
  return (
    <Component
      className={cn(
        toneClass[tone],
        radius && surfaceRadiusClass[radius],
        className,
      )}
      {...props}
    />
  );
}
