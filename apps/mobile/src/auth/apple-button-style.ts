import type { ColorScheme } from "@repo/design-tokens";
import type { SurfaceTone } from "@repo/domain/surface-tone";

/**
 * Apple's native button takes one of its own styles, not a Color role, so it
 * reads the surface it sits on: white on a dark surface, black on a light one
 * (Human Interface Guidelines, Sign in with Apple).
 */
export function appleButtonStyle(
  tone: SurfaceTone,
  scheme: ColorScheme,
): "white" | "black" {
  return tone === "ink" || scheme === "dark" ? "white" : "black";
}
