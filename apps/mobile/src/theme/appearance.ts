import type { ColorScheme } from "@repo/design-tokens";

export const APPEARANCES = ["system", "light", "dark"] as const;
export type Appearance = (typeof APPEARANCES)[number];

export const DEFAULT_APPEARANCE: Appearance = "system";

export function isAppearance(value: unknown): value is Appearance {
  return APPEARANCES.some((appearance) => appearance === value);
}

/** The scheme to draw: the User's choice, else the phone's, else light. */
export function resolveColorScheme(
  appearance: Appearance,
  system: string | null | undefined,
): ColorScheme {
  if (appearance !== "system") {
    return appearance;
  }
  return system === "dark" ? "dark" : "light";
}
