import { bibColors, type ColorScheme, type Palette } from "@repo/design-tokens";

/**
 * Whether a bib fill sinks into the surface under it. In dark the black bib
 * sinks into both the page and the lifted focus, though it is the exact fill
 * of neither; in light a bib sinks only into a surface of its own colour.
 */
export function bibBlendsIn(
  fill: string,
  surface: string,
  scheme: ColorScheme,
): boolean {
  return scheme === "dark" ? fill === bibColors.black.fill : fill === surface;
}

/**
 * The hairline a bib fill gets. The bib that matches the page (white in
 * light, black in dark) takes the control boundary so it still reads.
 */
export function bibEdge(
  fill: string,
  colors: Palette,
  scheme: ColorScheme,
): string {
  return bibBlendsIn(fill, colors.paper, scheme) ? colors.inputBorder : fill;
}
