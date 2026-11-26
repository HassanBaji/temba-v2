import type { CoinElement, CoinTone } from "./marks";
import { colors, type ColorRole } from "./tokens";

/**
 * Series badges (ADR-0106). Like a Mark coin, a badge is data, not chrome: a
 * six-sided coin a player won, whose two colours never leave it. Transcribed
 * from `.scratch/series/design/badge-geometry.md` in a 120 by 120 viewBox.
 * Draw order: the hexagon in `disc`, then the emblem's elements.
 */

export const seriesBadgeViewBox = 120;

/** Painted in `disc` as both fill and stroke: the stroke rounds the six corners. */
export const seriesBadgeHex = {
  points: "60,8 105,34 105,86 60,112 15,86 15,34",
  strokeWidth: 10,
  strokeLinejoin: "round",
} as const;

export const seriesBadgeSizes = {
  line: 22,
  row: 28,
  latest: 38,
  list: 44,
  card: 60,
  page: 76,
  sheet: 84,
  preview: 116,
} as const;

export type SeriesBadgeSize = keyof typeof seriesBadgeSizes;

export const seriesBadgeColours = {
  gold: { disc: "#ffc233", shade: "#c98f0a" },
  red: { disc: "#ff4d3d", shade: "#a8261a" },
  blue: { disc: "#3b6cff", shade: "#1f42b8" },
  green: { disc: "#34d17a", shade: "#178f4d" },
  purple: { disc: "#8b5cff", shade: "#5a33c2" },
  teal: { disc: "#22c3b5", shade: "#137f75" },
} as const satisfies Record<string, { disc: string; shade: string }>;

export type SeriesBadgeColour = keyof typeof seriesBadgeColours;

/**
 * Each emblem is drawn twice: its shadow in `shade`, offset by
 * `translate(4 5)`, then its body in `paper` with `ink` accents. Where the
 * source fills and strokes a shape in one tone, the shape is listed twice,
 * because a `CoinElement` paints a fill or a stroke.
 */
export const seriesEmblems = {
  cup: [
    {
      shape: "path",
      attrs: {
        d: "M41 32 H79 V52 C79 66 71 75 60 75 C49 75 41 66 41 52 Z",
        transform: "translate(4 5)",
      },
      tone: "shade",
      paint: "fill",
    },
    {
      shape: "path",
      attrs: {
        d: "M41 39 C27 39 28 58 43 60",
        strokeWidth: 6,
        strokeLinecap: "round",
        transform: "translate(4 5)",
      },
      tone: "shade",
      paint: "stroke",
    },
    {
      shape: "path",
      attrs: {
        d: "M79 39 C93 39 92 58 77 60",
        strokeWidth: 6,
        strokeLinecap: "round",
        transform: "translate(4 5)",
      },
      tone: "shade",
      paint: "stroke",
    },
    {
      shape: "rect",
      attrs: {
        x: 55,
        y: 73,
        width: 10,
        height: 12,
        transform: "translate(4 5)",
      },
      tone: "shade",
      paint: "fill",
    },
    {
      shape: "rect",
      attrs: {
        x: 43,
        y: 83,
        width: 34,
        height: 9,
        rx: 2,
        transform: "translate(4 5)",
      },
      tone: "shade",
      paint: "fill",
    },
    {
      shape: "path",
      attrs: { d: "M41 32 H79 V52 C79 66 71 75 60 75 C49 75 41 66 41 52 Z" },
      tone: "paper",
      paint: "fill",
    },
    {
      shape: "path",
      attrs: {
        d: "M41 39 C27 39 28 58 43 60",
        strokeWidth: 6,
        strokeLinecap: "round",
      },
      tone: "paper",
      paint: "stroke",
    },
    {
      shape: "path",
      attrs: {
        d: "M79 39 C93 39 92 58 77 60",
        strokeWidth: 6,
        strokeLinecap: "round",
      },
      tone: "paper",
      paint: "stroke",
    },
    {
      shape: "rect",
      attrs: { x: 55, y: 73, width: 10, height: 12 },
      tone: "paper",
      paint: "fill",
    },
    {
      shape: "rect",
      attrs: { x: 43, y: 83, width: 34, height: 9, rx: 2 },
      tone: "ink",
      paint: "fill",
    },
  ],
  crown: [
    {
      shape: "path",
      attrs: {
        d: "M30 78 L26 42 L45 57 L60 30 L75 57 L94 42 L90 78 Z",
        transform:
          "translate(4 5) translate(60 62) scale(0.86) translate(-60 -60)",
      },
      tone: "shade",
      paint: "fill",
    },
    {
      shape: "path",
      attrs: {
        d: "M30 78 L26 42 L45 57 L60 30 L75 57 L94 42 L90 78 Z",
        strokeWidth: 3,
        strokeLinejoin: "round",
        transform:
          "translate(4 5) translate(60 62) scale(0.86) translate(-60 -60)",
      },
      tone: "shade",
      paint: "stroke",
    },
    {
      shape: "rect",
      attrs: {
        x: 29,
        y: 78,
        width: 62,
        height: 12,
        rx: 2,
        transform:
          "translate(4 5) translate(60 62) scale(0.86) translate(-60 -60)",
      },
      tone: "shade",
      paint: "fill",
    },
    {
      shape: "circle",
      attrs: {
        cx: 26,
        cy: 41,
        r: 5,
        transform:
          "translate(4 5) translate(60 62) scale(0.86) translate(-60 -60)",
      },
      tone: "shade",
      paint: "fill",
    },
    {
      shape: "circle",
      attrs: {
        cx: 60,
        cy: 29,
        r: 6,
        transform:
          "translate(4 5) translate(60 62) scale(0.86) translate(-60 -60)",
      },
      tone: "shade",
      paint: "fill",
    },
    {
      shape: "circle",
      attrs: {
        cx: 94,
        cy: 41,
        r: 5,
        transform:
          "translate(4 5) translate(60 62) scale(0.86) translate(-60 -60)",
      },
      tone: "shade",
      paint: "fill",
    },
    {
      shape: "path",
      attrs: {
        d: "M30 78 L26 42 L45 57 L60 30 L75 57 L94 42 L90 78 Z",
        transform: "translate(60 62) scale(0.86) translate(-60 -60)",
      },
      tone: "paper",
      paint: "fill",
    },
    {
      shape: "path",
      attrs: {
        d: "M30 78 L26 42 L45 57 L60 30 L75 57 L94 42 L90 78 Z",
        strokeWidth: 3,
        strokeLinejoin: "round",
        transform: "translate(60 62) scale(0.86) translate(-60 -60)",
      },
      tone: "paper",
      paint: "stroke",
    },
    {
      shape: "rect",
      attrs: {
        x: 29,
        y: 78,
        width: 62,
        height: 12,
        rx: 2,
        transform: "translate(60 62) scale(0.86) translate(-60 -60)",
      },
      tone: "ink",
      paint: "fill",
    },
    {
      shape: "circle",
      attrs: {
        cx: 26,
        cy: 41,
        r: 5,
        transform: "translate(60 62) scale(0.86) translate(-60 -60)",
      },
      tone: "ink",
      paint: "fill",
    },
    {
      shape: "circle",
      attrs: {
        cx: 60,
        cy: 29,
        r: 6,
        transform: "translate(60 62) scale(0.86) translate(-60 -60)",
      },
      tone: "ink",
      paint: "fill",
    },
    {
      shape: "circle",
      attrs: {
        cx: 94,
        cy: 41,
        r: 5,
        transform: "translate(60 62) scale(0.86) translate(-60 -60)",
      },
      tone: "ink",
      paint: "fill",
    },
  ],
  star: [
    {
      shape: "polygon",
      attrs: {
        points:
          "60.0,29.0 68.2,50.7 91.4,51.8 73.3,66.3 79.4,88.7 60.0,76.0 40.6,88.7 46.7,66.3 28.6,51.8 51.8,50.7",
        transform: "translate(4 5)",
      },
      tone: "shade",
      paint: "fill",
    },
    {
      shape: "polygon",
      attrs: {
        points:
          "60.0,29.0 68.2,50.7 91.4,51.8 73.3,66.3 79.4,88.7 60.0,76.0 40.6,88.7 46.7,66.3 28.6,51.8 51.8,50.7",
        strokeWidth: 4,
        strokeLinejoin: "round",
        transform: "translate(4 5)",
      },
      tone: "shade",
      paint: "stroke",
    },
    {
      shape: "polygon",
      attrs: {
        points:
          "60.0,29.0 68.2,50.7 91.4,51.8 73.3,66.3 79.4,88.7 60.0,76.0 40.6,88.7 46.7,66.3 28.6,51.8 51.8,50.7",
      },
      tone: "paper",
      paint: "fill",
    },
    {
      shape: "polygon",
      attrs: {
        points:
          "60.0,29.0 68.2,50.7 91.4,51.8 73.3,66.3 79.4,88.7 60.0,76.0 40.6,88.7 46.7,66.3 28.6,51.8 51.8,50.7",
        strokeWidth: 4,
        strokeLinejoin: "round",
      },
      tone: "paper",
      paint: "stroke",
    },
  ],
  bolt: [
    {
      shape: "polygon",
      attrs: {
        points: "67,26 38,66 56,66 51,96 83,53 64,53",
        transform: "translate(4 5)",
      },
      tone: "shade",
      paint: "fill",
    },
    {
      shape: "polygon",
      attrs: {
        points: "67,26 38,66 56,66 51,96 83,53 64,53",
        strokeWidth: 4,
        strokeLinejoin: "round",
        transform: "translate(4 5)",
      },
      tone: "shade",
      paint: "stroke",
    },
    {
      shape: "polygon",
      attrs: { points: "67,26 38,66 56,66 51,96 83,53 64,53" },
      tone: "paper",
      paint: "fill",
    },
    {
      shape: "polygon",
      attrs: {
        points: "67,26 38,66 56,66 51,96 83,53 64,53",
        strokeWidth: 4,
        strokeLinejoin: "round",
      },
      tone: "paper",
      paint: "stroke",
    },
  ],
  flame: [
    {
      shape: "path",
      attrs: {
        d: "M61 26 C66 42 82 50 82 69 C82 84 72 94 60 94 C48 94 38 84 38 69 C38 59 44 52 49 44 C51 52 55 55 58 55 C56 45 58 34 61 26 Z",
        transform: "translate(4 5)",
      },
      tone: "shade",
      paint: "fill",
    },
    {
      shape: "path",
      attrs: {
        d: "M61 26 C66 42 82 50 82 69 C82 84 72 94 60 94 C48 94 38 84 38 69 C38 59 44 52 49 44 C51 52 55 55 58 55 C56 45 58 34 61 26 Z",
      },
      tone: "paper",
      paint: "fill",
    },
    {
      shape: "path",
      attrs: {
        d: "M60 68 C65 73 68 78 68 83 C68 88 64 91 60 91 C56 91 52 88 52 83 C52 78 56 74 60 68 Z",
      },
      tone: "ink",
      paint: "fill",
    },
  ],
  moon: [
    {
      shape: "path",
      attrs: {
        d: "M70 28 A33 33 0 1 0 92 76 A27 27 0 1 1 70 28 Z",
        transform: "translate(4 5)",
      },
      tone: "shade",
      paint: "fill",
    },
    {
      shape: "path",
      attrs: { d: "M70 28 A33 33 0 1 0 92 76 A27 27 0 1 1 70 28 Z" },
      tone: "paper",
      paint: "fill",
    },
    {
      shape: "polygon",
      attrs: {
        points:
          "79.0,35.0 81.4,40.8 87.6,41.2 82.8,45.2 84.3,51.3 79.0,48.0 73.7,51.3 75.2,45.2 70.4,41.2 76.6,40.8",
      },
      tone: "ink",
      paint: "fill",
    },
  ],
  ball: [
    {
      shape: "circle",
      attrs: { cx: 60, cy: 61, r: 30, transform: "translate(4 5)" },
      tone: "shade",
      paint: "fill",
    },
    {
      shape: "circle",
      attrs: { cx: 60, cy: 61, r: 30 },
      tone: "paper",
      paint: "fill",
    },
    {
      shape: "path",
      attrs: { d: "M31,61 C39,40 81,40 89,61", strokeWidth: 5 },
      tone: "ink",
      paint: "stroke",
    },
  ],
} as const satisfies Record<string, readonly CoinElement[]>;

export type SeriesBadgeEmblem = keyof typeof seriesEmblems;

/**
 * The win count on a badge's bottom trailing corner. It is chrome, so it reads
 * Color roles: fill `ink`, digits `paper`, and a ring in the role of the
 * surface under it.
 */
export const seriesBadgeCount = {
  minWidth: 20,
  height: 20,
  paddingInline: 5,
  radius: 10,
  ring: 2,
  fontSize: 11,
  offsetEnd: 6,
  offsetBottom: 2,
} as const;

export type SeriesBadgeSurface = Extract<
  ColorRole,
  "paper" | "focus" | "sheet"
>;

/**
 * The colour each tone paints. A badge is earned, so it keeps the light ink
 * and paper in both schemes (ADR-0064), as an earned coin does.
 */
export function seriesBadgeToneColors(
  colour: SeriesBadgeColour,
): Record<CoinTone, string> {
  const { disc, shade } = seriesBadgeColours[colour];
  return { disc, shade, ink: colors.ink, paper: colors.paper };
}
