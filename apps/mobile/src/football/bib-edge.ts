import {
  bibColors,
  type ColorScheme,
  type Palette,
} from "@repo/design-tokens";

/**
 * The hairline a bib fill gets. The bib that matches the page (white in
 * light, black in dark) takes the control boundary so it still reads.
 */
export function bibEdge(
  fill: string,
  colors: Palette,
  scheme: ColorScheme,
): string {
  const pageBib = scheme === "dark" ? bibColors.black : bibColors.white;
  return fill === pageBib.fill ? colors.inputBorder : fill;
}
