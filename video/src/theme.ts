import {
  expanded,
  hatch,
  numerals,
  radii,
  resultMark,
  sizes,
  spacing,
  typeScale,
} from "../../packages/design-tokens/src/tokens";

export { expanded, hatch, numerals, radii, resultMark, sizes, spacing, typeScale };

/**
 * The launch-video palette. It follows the app's Color roles but in pure
 * black and white, so the H.264 encode keeps ink and paper flat.
 */
export const c = {
  paper: "#FFFFFF",
  ink: "#000000",
  muted: "#6E6E6E",
  faint: "#9A9A9A",
  rule: "#E6E6E6",
  wash: "#F4F4F4",
  dim: "#8E8E8E",
  hairline: "#2E2E2E",
  raised: "#1C1C1C",
} as const;

export const FPS = 30;
export const WIDTH = 1080;
export const HEIGHT = 1920;
export const DURATION = 900;

/** Scene boundaries in frames. */
export const scenes = {
  intro: { from: 0, to: 90 },
  group: { from: 90, to: 240 },
  game: { from: 240, to: 390 },
  teams: { from: 390, to: 510 },
  result: { from: 510, to: 660 },
  season: { from: 660, to: 780 },
  end: { from: 780, to: 900 },
} as const;

export const font = {
  sans: "'Archivo', 'Plex Arabic', sans-serif",
  arabic: "'Plex Arabic', 'Archivo', sans-serif",
  display: "'Sora', sans-serif",
} as const;

/** Snappy, no overshoot. */
export const snappy = { damping: 200, stiffness: 170, mass: 0.9 } as const;
/** A small snap for pops: barely any overshoot. */
export const snap = { damping: 16, stiffness: 260, mass: 0.6 } as const;
