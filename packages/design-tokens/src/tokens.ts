/**
 * Palette v2 (ADR-0084). The focused surface is Lifted: one step off the page
 * (#f4f4f4 with a #e6e6e6 hairline) instead of inverting to black. The
 * `dim`, `dimrule`, `raised` and `hatchStrokeOnInk` roles are what sits on that
 * lifted surface; `onControlMuted`, `controlRule`, `controlRaised` and
 * `hatchStrokeOnControl` are what sits on a solid control.
 */
export const colors = {
  ink: "#000000",
  paper: "#ffffff",
  rule: "#e6e6e6",
  // Row highlight: your row in a table or team list.
  wash: "#f4f4f4",
  // 4.63:1 on wash and on focus, 5.10:1 on paper (WCAG AA)
  muted: "#6e6e6e",
  // Muted on the lifted surface.
  dim: "#6e6e6e",
  // Rule on the lifted surface, and the border of a raised control on it.
  dimrule: "#e0e0e0",
  // A control or chip that sits on the lifted surface.
  raised: "#ffffff",
  // Control boundaries (WCAG 1.4.11): 3.36:1 on paper, 3.06:1 on wash
  inputBorder: "#8c8c8c",
  surfaceRaised: "#fafafa",
  // faint (#9a9a9a) is deliberately absent: 2.56:1 on wash
  hatchStroke: "#e6e6e6",
  hatchStrokeOnInk: "#d4d4d4",
  // The one colour outside black and white: a destructive action, never chrome.
  danger: "#b42318",
  // The focused surface (`Surface tone="ink"`), the text on it and its hairline.
  focus: "#f4f4f4",
  onFocus: "#000000",
  focusEdge: "#e6e6e6",
  // Solid: primary buttons, the active segment, a selected chip, your own avatar.
  control: "#000000",
  onControl: "#ffffff",
  controlEdge: "#000000",
  // 6.40:1 on control
  onControlMuted: "#8e8e8e",
  controlRule: "#2e2e2e",
  controlRaised: "#1c1c1c",
  hatchStrokeOnControl: "#333333",
  // The solid button on the focused surface, such as its Vote button.
  focusControl: "#000000",
  onFocusControl: "#ffffff",
  sheet: "#ffffff",
  scrim: "rgba(10, 10, 10, 0.5)",
} as const;

export type ColorRole = keyof typeof colors;
export type Palette = Record<ColorRole, string>;

/**
 * The same roles with dark values (ADR-0064). Nothing here is #ffffff: ink is
 * #e6e6e6, and the focused surface lifts to #141414 instead of inverting.
 * Depths run 000 page, 0f sheet, 14 focus, 1c raised, 26 control.
 */
export const darkColors: Palette = {
  ink: "#e6e6e6",
  paper: "#000000",
  rule: "#2e2e2e",
  wash: "#1c1c1c",
  // 6.41:1 on paper, 5.20:1 on wash
  muted: "#8e8e8e",
  // 5.62:1 on focus, 4.62:1 on control
  dim: "#8e8e8e",
  dimrule: "#3a3a3a",
  raised: "#262626",
  // 4.12:1 on paper, 3.61:1 on focus
  inputBorder: "#6e6e6e",
  surfaceRaised: "#0f0f0f",
  hatchStroke: "#2e2e2e",
  hatchStrokeOnInk: "#3a3a3a",
  // 7.54:1 on paper
  danger: "#f97066",
  focus: "#141414",
  onFocus: "#e6e6e6",
  focusEdge: "#3a3a3a",
  control: "#262626",
  onControl: "#e6e6e6",
  controlEdge: "#3a3a3a",
  // 4.62:1 on control
  onControlMuted: "#8e8e8e",
  controlRule: "#3a3a3a",
  controlRaised: "#262626",
  hatchStrokeOnControl: "#3a3a3a",
  focusControl: "#262626",
  onFocusControl: "#e6e6e6",
  sheet: "#0f0f0f",
  scrim: "rgba(0, 0, 0, 0.72)",
};

export type ColorScheme = "light" | "dark";

export const palettes: Record<ColorScheme, Palette> = {
  light: colors,
  dark: darkColors,
};

/**
 * Light with the focused surface still inverted to black, as before Palette v2
 * (ADR-0084). The mobile App reads it because its screens use the ink tone for
 * both the focused surface and solid controls; it moves to `palettes` when
 * those screens are redrawn, and this goes.
 */
export const invertedFocusColors: Palette = {
  ...colors,
  dim: "#8e8e8e",
  dimrule: "#2e2e2e",
  raised: "#1c1c1c",
  hatchStrokeOnInk: "#333333",
  focus: "#000000",
  onFocus: "#ffffff",
  focusEdge: "#000000",
  focusControl: "#ffffff",
  onFocusControl: "#000000",
};

export const invertedFocusPalettes: Record<ColorScheme, Palette> = {
  light: invertedFocusColors,
  dark: darkColors,
};

export const spacing = {
  surface: 22,
  section: 26,
  compact: 18,
} as const;

export const radii = {
  slot: 5,
  sm: 8,
  md: 10,
  lg: 12,
  card: 14,
  surface: 16,
  sheet: 20,
} as const;

export const typeScale = {
  eyebrow: { size: 12, lineHeight: 16 },
  meta: { size: 13, lineHeight: 18 },
  body: { size: 15, lineHeight: 22 },
  lead: { size: 17, lineHeight: 24 },
  title: { size: 19, lineHeight: 26 },
  h2: { size: 24, lineHeight: 30 },
  h1: { size: 28, lineHeight: 34 },
  h1Lg: { size: 32, lineHeight: 33.6 },
  display: { size: 36, lineHeight: 38 },
  hero: { size: 48, lineHeight: 46.08 },
} as const;

export const numerals = {
  levelBand: 88,
  heroTime: 56,
  record: 52,
  statTotal: 34,
  figure: 22,
} as const;

export const expanded = {
  weight: 700,
  width: 115,
  letterSpacingEm: -0.03,
} as const;

export const sizes = {
  touchTarget: 44,
  bottomTabs: 56,
  topBar: 68,
  railWidth: 240,
  contentWidth: 704,
  wideWidth: 1024,
  columnWidth: 420,
  iconRow: 16,
  iconAction: 20,
  iconTab: 21,
} as const;

export const hatch = {
  angle: 45,
  stroke: 1,
  period: 5,
} as const;

export const resultMark = {
  viewBox: 100,
  arc: "M6,50 C18,16 82,16 94,50",
  drawStrike: "M81,19 L19,81",
  wonDisc: { cx: 50, cy: 50, r: 44 },
  wonArcStroke: 5,
  outlineDisc: { cx: 50, cy: 50, r: 43 },
  outlineStroke: 3,
  notPlayedArcStroke: 2,
  notPlayedRingStroke: 1.5,
} as const;

export const motion = {
  levelDrawMs: 800,
  levelDrawEasing: "ease-out",
  hoverMs: 150,
  reducedTransitionMs: 100,
} as const;

/**
 * Football bib colours. These are data, not chrome: a team wears the colour
 * its Organizer picks. These and the Mark coins in `marks.ts` (ADR-0056) are
 * the two places colour appears.
 * `on` is the ink that reads on the fill.
 */
export const bibColors = {
  black: { fill: "#0a0a0a", on: "#ffffff" },
  white: { fill: "#ffffff", on: "#0a0a0a" },
  red: { fill: "#c8102e", on: "#ffffff" },
  navy: { fill: "#0b2a6f", on: "#ffffff" },
  sky: { fill: "#6cb4ee", on: "#0a0a0a" },
  green: { fill: "#1b7f3b", on: "#ffffff" },
  yellow: { fill: "#f2c300", on: "#0a0a0a" },
  orange: { fill: "#e8730c", on: "#0a0a0a" },
  purple: { fill: "#5b2a86", on: "#ffffff" },
  pink: { fill: "#e85c9a", on: "#0a0a0a" },
  grey: { fill: "#8e8e8e", on: "#0a0a0a" },
} as const;
