import { sizes } from "@repo/design-tokens";

export type ButtonSize = "sm" | "default" | "lg" | "icon";

const HEIGHTS: Record<ButtonSize, number> = {
  sm: 36,
  default: 44,
  lg: 52,
  icon: 44,
};

export function buttonGeometry(size: ButtonSize) {
  const height = HEIGHTS[size];
  const hitSlop = Math.max(0, Math.ceil((sizes.touchTarget - height) / 2));
  return { height, hitSlop };
}
