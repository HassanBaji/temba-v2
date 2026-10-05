export const colors = {
  ink: "#0a0a0a",
  paper: "#ffffff",
  rule: "#e5e5e2",
  wash: "#f5f5f5",
  // 4.64:1 on wash, 5.10:1 on paper (WCAG AA)
  muted: "#6e6e6e",
  dim: "#8e8e8e",
  dimrule: "#2e2e2e",
  raised: "#1c1c1c",
  // Control boundaries (WCAG 1.4.11): 3.36:1 on paper, 3.06:1 on wash
  inputBorder: "#8c8c8c",
  surfaceRaised: "#fafaf8",
  // faint (#9a9a9a) is deliberately absent: 2.56:1 on wash
  hatchStroke: "#dcdcdc",
  hatchStrokeOnInk: "#333333",
} as const;

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
} as const;

export const motion = {
  levelDrawMs: 800,
  levelDrawEasing: "ease-out",
  hoverMs: 150,
  reducedTransitionMs: 100,
} as const;
