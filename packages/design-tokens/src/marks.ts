import { colors, type Palette } from "./tokens";

/**
 * Mark coins (ADR-0056). Like `bibColors`, these are data, not chrome: a coin
 * is a picture of something a player earned, and its two colours never leave
 * it. Transcribed from `marks/<slug>.svg` in a 120 by 120 viewBox; each
 * element paints one of four tones, so a coin carries only `disc` and `shade`.
 */

export const coinViewBox = 120;

export const coinDisc = { cx: 60, cy: 60, r: 54 } as const;

export const markCoinSizes = {
  row: 20,
  roster: 28,
  cabinet: 44,
  sheet: 64,
  set: 120,
} as const;

export type MarkCoinSize = keyof typeof markCoinSizes;

export type CoinTone = "disc" | "shade" | "ink" | "paper";

export type CoinState = "earned" | "notYet";

export type CoinShape = "circle" | "ellipse" | "rect" | "path" | "polygon";

export type CoinAttrs = {
  cx?: number;
  cy?: number;
  r?: number;
  rx?: number;
  ry?: number;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  d?: string;
  points?: string;
  transform?: string;
  strokeWidth?: number;
  strokeLinecap?: "round";
  strokeLinejoin?: "round";
};

export type CoinElement = {
  shape: CoinShape;
  attrs: CoinAttrs;
  tone: CoinTone;
  /** A stroked element paints no fill. */
  paint: "fill" | "stroke";
};

export type Coin = {
  disc: string;
  shade: string;
  elements: readonly CoinElement[];
};

export const markCoins = {
  dynamo: {
    disc: "#b6f23a",
    shade: "#7fb51a",
    elements: [
      {
        shape: "circle",
        attrs: { cx: 60, cy: 60, r: 54 },
        tone: "disc",
        paint: "fill",
      },
      {
        shape: "path",
        attrs: {
          d: "M26 62 A34 34 0 0 1 78 30",
          strokeWidth: 5,
          strokeLinecap: "round",
        },
        tone: "ink",
        paint: "stroke",
      },
      {
        shape: "polygon",
        attrs: { points: "80,21 88,33 72,36" },
        tone: "ink",
        paint: "fill",
      },
      {
        shape: "path",
        attrs: {
          d: "M94 58 A34 34 0 0 1 42 90",
          strokeWidth: 5,
          strokeLinecap: "round",
        },
        tone: "ink",
        paint: "stroke",
      },
      {
        shape: "polygon",
        attrs: { points: "40,99 32,87 48,84" },
        tone: "ink",
        paint: "fill",
      },
      {
        shape: "path",
        attrs: {
          d: "M66 28 L44 64 H58 L52 92 L78 54 H63 L70 28 Z",
          transform: "translate(5 6)",
        },
        tone: "shade",
        paint: "fill",
      },
      {
        shape: "path",
        attrs: { d: "M66 28 L44 64 H58 L52 92 L78 54 H63 L70 28 Z" },
        tone: "paper",
        paint: "fill",
      },
    ],
  },
  let_him_cook: {
    disc: "#ff8a2a",
    shade: "#c45e0e",
    elements: [
      {
        shape: "circle",
        attrs: { cx: 60, cy: 60, r: 54 },
        tone: "disc",
        paint: "fill",
      },
      {
        shape: "path",
        attrs: {
          d: "M38 56 V40 C26 38 26 20 41 24 C43 10 77 10 79 24 C94 20 94 38 82 40 V56 Z",
          transform: "translate(5 6)",
        },
        tone: "shade",
        paint: "fill",
      },
      {
        shape: "circle",
        attrs: { cx: 60, cy: 74, r: 22, transform: "translate(5 6)" },
        tone: "shade",
        paint: "fill",
      },
      {
        shape: "circle",
        attrs: { cx: 60, cy: 74, r: 22 },
        tone: "paper",
        paint: "fill",
      },
      {
        shape: "path",
        attrs: {
          d: "M38 56 V40 C26 38 26 20 41 24 C43 10 77 10 79 24 C94 20 94 38 82 40 V56 Z",
        },
        tone: "paper",
        paint: "fill",
      },
      {
        shape: "rect",
        attrs: { x: 38, y: 50, width: 44, height: 8, rx: 1.5 },
        tone: "ink",
        paint: "fill",
      },
      {
        shape: "circle",
        attrs: { cx: 50, cy: 70, r: 2.8 },
        tone: "ink",
        paint: "fill",
      },
      {
        shape: "path",
        attrs: { d: "M66 70 H75", strokeWidth: 3, strokeLinecap: "round" },
        tone: "ink",
        paint: "stroke",
      },
      {
        shape: "path",
        attrs: {
          d: "M60 81 C55 76 46 77 44 83 C50 85 56 84 60 83 C64 84 70 85 76 83 C74 77 65 76 60 81 Z",
        },
        tone: "ink",
        paint: "fill",
      },
      {
        shape: "path",
        attrs: { d: "M46 93 Q60 101 74 93 L71 100 Q60 106 49 100 Z" },
        tone: "ink",
        paint: "fill",
      },
      {
        shape: "path",
        attrs: {
          d: "M96 60 V70 M91 65 H101",
          strokeWidth: 3,
          strokeLinecap: "round",
        },
        tone: "ink",
        paint: "stroke",
      },
    ],
  },
  mr_fumble: {
    disc: "#ff8fb8",
    shade: "#d1527f",
    elements: [
      {
        shape: "circle",
        attrs: { cx: 60, cy: 60, r: 54 },
        tone: "disc",
        paint: "fill",
      },
      {
        shape: "path",
        attrs: {
          d: "M30 92 C26 86 34 82 40 84 C42 78 52 78 56 82 C62 76 74 78 76 84 C84 80 92 86 88 92 C84 98 36 98 30 92 Z",
          transform: "translate(5 6)",
        },
        tone: "shade",
        paint: "fill",
      },
      {
        shape: "path",
        attrs: {
          d: "M30 92 C26 86 34 82 40 84 C42 78 52 78 56 82 C62 76 74 78 76 84 C84 80 92 86 88 92 C84 98 36 98 30 92 Z",
        },
        tone: "paper",
        paint: "fill",
      },
      {
        shape: "circle",
        attrs: { cx: 23, cy: 82, r: 3 },
        tone: "paper",
        paint: "fill",
      },
      {
        shape: "circle",
        attrs: { cx: 97, cy: 80, r: 3.5 },
        tone: "paper",
        paint: "fill",
      },
      {
        shape: "polygon",
        attrs: { points: "46,84 60,34 74,84", transform: "rotate(14 60 60)" },
        tone: "ink",
        paint: "fill",
      },
      {
        shape: "path",
        attrs: {
          d: "M55 54 H65 M52 64 H68 M50 74 H70",
          strokeWidth: 2.2,
          transform: "rotate(14 60 60)",
        },
        tone: "paper",
        paint: "stroke",
      },
      {
        shape: "rect",
        attrs: {
          x: 41,
          y: 88,
          width: 7,
          height: 3,
          rx: 1.5,
          transform: "rotate(-20 44 89)",
        },
        tone: "shade",
        paint: "fill",
      },
      {
        shape: "rect",
        attrs: { x: 60, y: 91, width: 7, height: 3, rx: 1.5 },
        tone: "shade",
        paint: "fill",
      },
      {
        shape: "rect",
        attrs: {
          x: 76,
          y: 88,
          width: 7,
          height: 3,
          rx: 1.5,
          transform: "rotate(25 79 89)",
        },
        tone: "shade",
        paint: "fill",
      },
      {
        shape: "circle",
        attrs: { cx: 93, cy: 62, r: 5 },
        tone: "ink",
        paint: "fill",
      },
      {
        shape: "path",
        attrs: {
          d: "M93 57 Q94 51 99 49",
          strokeWidth: 2.2,
          strokeLinecap: "round",
        },
        tone: "ink",
        paint: "stroke",
      },
    ],
  },
  sayed_malek: {
    disc: "#b9a3ff",
    shade: "#7f65d6",
    elements: [
      {
        shape: "circle",
        attrs: { cx: 60, cy: 60, r: 54 },
        tone: "disc",
        paint: "fill",
      },
      {
        shape: "circle",
        attrs: { cx: 58, cy: 66, r: 28, transform: "translate(5 6)" },
        tone: "shade",
        paint: "fill",
      },
      {
        shape: "path",
        attrs: {
          d: "M30 58 C31 36 85 36 86 58 Z",
          transform: "translate(5 6)",
        },
        tone: "shade",
        paint: "fill",
      },
      {
        shape: "circle",
        attrs: { cx: 30, cy: 70, r: 6 },
        tone: "paper",
        paint: "fill",
      },
      {
        shape: "circle",
        attrs: { cx: 86, cy: 70, r: 6 },
        tone: "paper",
        paint: "fill",
      },
      {
        shape: "circle",
        attrs: { cx: 58, cy: 66, r: 28 },
        tone: "paper",
        paint: "fill",
      },
      {
        shape: "path",
        attrs: { d: "M30 58 C31 36 85 36 86 58 Z" },
        tone: "ink",
        paint: "fill",
      },
      {
        shape: "path",
        attrs: {
          d: "M42 70 Q47 75 52 70 M64 70 Q69 75 74 70",
          strokeWidth: 3,
          strokeLinecap: "round",
        },
        tone: "ink",
        paint: "stroke",
      },
      {
        shape: "path",
        attrs: {
          d: "M36 85 C42 77 52 79 58 83 C64 79 74 77 80 85 C74 91 64 89 58 86 C52 89 42 91 36 85 Z",
        },
        tone: "ink",
        paint: "fill",
      },
      {
        shape: "path",
        attrs: {
          d: "M84 22 H96 L84 34 H96",
          strokeWidth: 3,
          strokeLinecap: "round",
          strokeLinejoin: "round",
        },
        tone: "ink",
        paint: "stroke",
      },
      {
        shape: "path",
        attrs: {
          d: "M96 39 H104 L96 47 H104",
          strokeWidth: 2.5,
          strokeLinecap: "round",
          strokeLinejoin: "round",
        },
        tone: "ink",
        paint: "stroke",
      },
    ],
  },
  clutch: {
    disc: "#ff4d3d",
    shade: "#a8261a",
    elements: [
      {
        shape: "circle",
        attrs: { cx: 60, cy: 60, r: 54 },
        tone: "disc",
        paint: "fill",
      },
      {
        shape: "circle",
        attrs: { cx: 65, cy: 72, r: 28 },
        tone: "shade",
        paint: "fill",
      },
      {
        shape: "rect",
        attrs: { x: 54, y: 22, width: 12, height: 10 },
        tone: "ink",
        paint: "fill",
      },
      {
        shape: "rect",
        attrs: { x: 57, y: 30, width: 6, height: 8 },
        tone: "ink",
        paint: "fill",
      },
      {
        shape: "path",
        attrs: { d: "M84 40 L91 33", strokeWidth: 5, strokeLinecap: "round" },
        tone: "ink",
        paint: "stroke",
      },
      {
        shape: "circle",
        attrs: { cx: 60, cy: 66, r: 28 },
        tone: "paper",
        paint: "fill",
      },
      {
        shape: "path",
        attrs: { d: "M60 66 L55 44", strokeWidth: 5, strokeLinecap: "round" },
        tone: "ink",
        paint: "stroke",
      },
      {
        shape: "circle",
        attrs: { cx: 60, cy: 66, r: 5 },
        tone: "ink",
        paint: "fill",
      },
      {
        shape: "circle",
        attrs: { cx: 60, cy: 46, r: 2 },
        tone: "ink",
        paint: "fill",
      },
      {
        shape: "circle",
        attrs: { cx: 80, cy: 66, r: 2 },
        tone: "ink",
        paint: "fill",
      },
      {
        shape: "circle",
        attrs: { cx: 40, cy: 66, r: 2 },
        tone: "ink",
        paint: "fill",
      },
      {
        shape: "circle",
        attrs: { cx: 60, cy: 86, r: 2 },
        tone: "ink",
        paint: "fill",
      },
    ],
  },
  mr_ice: {
    disc: "#8edbff",
    shade: "#3a9bd0",
    elements: [
      {
        shape: "circle",
        attrs: { cx: 60, cy: 60, r: 54 },
        tone: "disc",
        paint: "fill",
      },
      {
        shape: "rect",
        attrs: { x: 37, y: 42, width: 56, height: 54, rx: 10 },
        tone: "shade",
        paint: "fill",
      },
      {
        shape: "rect",
        attrs: { x: 32, y: 36, width: 56, height: 54, rx: 10 },
        tone: "paper",
        paint: "fill",
      },
      {
        shape: "rect",
        attrs: { x: 36, y: 51, width: 22, height: 13, rx: 4 },
        tone: "ink",
        paint: "fill",
      },
      {
        shape: "rect",
        attrs: { x: 62, y: 51, width: 22, height: 13, rx: 4 },
        tone: "ink",
        paint: "fill",
      },
      {
        shape: "rect",
        attrs: { x: 57, y: 55, width: 6, height: 4 },
        tone: "ink",
        paint: "fill",
      },
      {
        shape: "path",
        attrs: {
          d: "M50 75 Q60 82 72 73",
          strokeWidth: 4,
          strokeLinecap: "round",
        },
        tone: "ink",
        paint: "stroke",
      },
      {
        shape: "path",
        attrs: {
          d: "M100 18 V32 M93 25 H107",
          strokeWidth: 3,
          strokeLinecap: "round",
        },
        tone: "ink",
        paint: "stroke",
      },
    ],
  },
  smash_machine: {
    disc: "#ff4fd8",
    shade: "#b81f99",
    elements: [
      {
        shape: "circle",
        attrs: { cx: 60, cy: 60, r: 54 },
        tone: "disc",
        paint: "fill",
      },
      {
        shape: "ellipse",
        attrs: {
          cx: 55,
          cy: 56,
          rx: 22,
          ry: 25,
          transform: "rotate(35 50 60)",
        },
        tone: "shade",
        paint: "fill",
      },
      {
        shape: "rect",
        attrs: {
          x: 45,
          y: 84,
          width: 10,
          height: 20,
          rx: 3,
          transform: "rotate(35 50 60)",
        },
        tone: "ink",
        paint: "fill",
      },
      {
        shape: "polygon",
        attrs: {
          points: "41,72 45,86 55,86 59,72",
          transform: "rotate(35 50 60)",
        },
        tone: "ink",
        paint: "fill",
      },
      {
        shape: "ellipse",
        attrs: {
          cx: 50,
          cy: 50,
          rx: 22,
          ry: 25,
          transform: "rotate(35 50 60)",
        },
        tone: "paper",
        paint: "fill",
      },
      {
        shape: "circle",
        attrs: { cx: 42, cy: 40, r: 2.4, transform: "rotate(35 50 60)" },
        tone: "ink",
        paint: "fill",
      },
      {
        shape: "circle",
        attrs: { cx: 50, cy: 40, r: 2.4, transform: "rotate(35 50 60)" },
        tone: "ink",
        paint: "fill",
      },
      {
        shape: "circle",
        attrs: { cx: 58, cy: 40, r: 2.4, transform: "rotate(35 50 60)" },
        tone: "ink",
        paint: "fill",
      },
      {
        shape: "circle",
        attrs: { cx: 38, cy: 50, r: 2.4, transform: "rotate(35 50 60)" },
        tone: "ink",
        paint: "fill",
      },
      {
        shape: "circle",
        attrs: { cx: 46, cy: 50, r: 2.4, transform: "rotate(35 50 60)" },
        tone: "ink",
        paint: "fill",
      },
      {
        shape: "circle",
        attrs: { cx: 54, cy: 50, r: 2.4, transform: "rotate(35 50 60)" },
        tone: "ink",
        paint: "fill",
      },
      {
        shape: "circle",
        attrs: { cx: 62, cy: 50, r: 2.4, transform: "rotate(35 50 60)" },
        tone: "ink",
        paint: "fill",
      },
      {
        shape: "circle",
        attrs: { cx: 42, cy: 60, r: 2.4, transform: "rotate(35 50 60)" },
        tone: "ink",
        paint: "fill",
      },
      {
        shape: "circle",
        attrs: { cx: 50, cy: 60, r: 2.4, transform: "rotate(35 50 60)" },
        tone: "ink",
        paint: "fill",
      },
      {
        shape: "circle",
        attrs: { cx: 58, cy: 60, r: 2.4, transform: "rotate(35 50 60)" },
        tone: "ink",
        paint: "fill",
      },
      {
        shape: "circle",
        attrs: { cx: 90, cy: 32, r: 9 },
        tone: "ink",
        paint: "fill",
      },
      {
        shape: "path",
        attrs: { d: "M84 29 Q90 35 96 29", strokeWidth: 2 },
        tone: "paper",
        paint: "stroke",
      },
      {
        shape: "path",
        attrs: {
          d: "M98 18 L102 14 M102 32 H108 M98 45 L102 49",
          strokeWidth: 3,
          strokeLinecap: "round",
        },
        tone: "ink",
        paint: "stroke",
      },
    ],
  },
  goal_machine: {
    disc: "#34d17a",
    shade: "#178f4d",
    elements: [
      {
        shape: "circle",
        attrs: { cx: 60, cy: 60, r: 54 },
        tone: "disc",
        paint: "fill",
      },
      {
        shape: "rect",
        attrs: { x: 33, y: 48, width: 64, height: 42 },
        tone: "shade",
        paint: "fill",
      },
      {
        shape: "rect",
        attrs: { x: 28, y: 42, width: 64, height: 42 },
        tone: "paper",
        paint: "fill",
      },
      {
        shape: "path",
        attrs: {
          d: "M36 42 V84 M44 42 V84 M52 42 V84 M60 42 V84 M68 42 V84 M76 42 V84 M84 42 V84 M28 50 H92 M28 58 H92 M28 66 H92 M28 74 H92",
          strokeWidth: 1.6,
        },
        tone: "shade",
        paint: "stroke",
      },
      {
        shape: "path",
        attrs: {
          d: "M26 86 V40 H94 V86",
          strokeWidth: 5,
          strokeLinejoin: "round",
        },
        tone: "ink",
        paint: "stroke",
      },
      {
        shape: "path",
        attrs: { d: "M18 88 H102", strokeWidth: 3, strokeLinecap: "round" },
        tone: "ink",
        paint: "stroke",
      },
      {
        shape: "circle",
        attrs: { cx: 74, cy: 72, r: 15 },
        tone: "ink",
        paint: "fill",
      },
      {
        shape: "polygon",
        attrs: { points: "74.0,66.0 79.7,70.1 77.5,76.9 70.5,76.9 68.3,70.1" },
        tone: "paper",
        paint: "fill",
      },
      {
        shape: "path",
        attrs: {
          d: "M74 66 V58 M79.7 70.1 L88 67 M77.5 76.9 L83 84 M70.5 76.9 L65 84 M68.3 70.1 L60 67",
          strokeWidth: 2,
        },
        tone: "paper",
        paint: "stroke",
      },
    ],
  },
  great_wall: {
    disc: "#22c3b5",
    shade: "#137f75",
    elements: [
      {
        shape: "circle",
        attrs: { cx: 60, cy: 60, r: 54 },
        tone: "disc",
        paint: "fill",
      },
      {
        shape: "path",
        attrs: {
          d: "M33 96 V58 H41 V48 H53 V58 H59 V48 H71 V58 H77 V48 H89 V58 H97 V96 Z",
        },
        tone: "shade",
        paint: "fill",
      },
      {
        shape: "path",
        attrs: {
          d: "M28 90 V52 H36 V42 H48 V52 H54 V42 H66 V52 H72 V42 H84 V52 H92 V90 Z",
        },
        tone: "ink",
        paint: "fill",
      },
      {
        shape: "rect",
        attrs: { x: 31, y: 55, width: 12, height: 9 },
        tone: "paper",
        paint: "fill",
      },
      {
        shape: "rect",
        attrs: { x: 49, y: 55, width: 22, height: 9 },
        tone: "paper",
        paint: "fill",
      },
      {
        shape: "rect",
        attrs: { x: 77, y: 55, width: 12, height: 9 },
        tone: "paper",
        paint: "fill",
      },
      {
        shape: "rect",
        attrs: { x: 31, y: 67, width: 22, height: 9 },
        tone: "paper",
        paint: "fill",
      },
      {
        shape: "rect",
        attrs: { x: 56, y: 67, width: 12, height: 9 },
        tone: "paper",
        paint: "fill",
      },
      {
        shape: "rect",
        attrs: { x: 71, y: 67, width: 18, height: 9 },
        tone: "paper",
        paint: "fill",
      },
      {
        shape: "rect",
        attrs: { x: 31, y: 79, width: 12, height: 8 },
        tone: "paper",
        paint: "fill",
      },
      {
        shape: "rect",
        attrs: { x: 46, y: 79, width: 22, height: 8 },
        tone: "paper",
        paint: "fill",
      },
      {
        shape: "rect",
        attrs: { x: 71, y: 79, width: 18, height: 8 },
        tone: "paper",
        paint: "fill",
      },
    ],
  },
  comeback_king: {
    disc: "#8b5cff",
    shade: "#5a33c2",
    elements: [
      {
        shape: "circle",
        attrs: { cx: 60, cy: 60, r: 54 },
        tone: "disc",
        paint: "fill",
      },
      {
        shape: "path",
        attrs: {
          d: "M40 46 V64 A22 22 0 0 0 84 64 V54",
          strokeWidth: 13,
          strokeLinecap: "round",
          transform: "translate(5 6)",
        },
        tone: "shade",
        paint: "stroke",
      },
      {
        shape: "polygon",
        attrs: { points: "70,56 84,34 98,56", transform: "translate(5 6)" },
        tone: "shade",
        paint: "fill",
      },
      {
        shape: "path",
        attrs: {
          d: "M40 46 V64 A22 22 0 0 0 84 64 V54",
          strokeWidth: 13,
          strokeLinecap: "round",
        },
        tone: "paper",
        paint: "stroke",
      },
      {
        shape: "polygon",
        attrs: { points: "70,56 84,34 98,56" },
        tone: "paper",
        paint: "fill",
      },
      {
        shape: "path",
        attrs: { d: "M46 62 L44 44 L50 51 L55 40 L60 51 L66 44 L64 62 Z" },
        tone: "ink",
        paint: "fill",
      },
      {
        shape: "circle",
        attrs: { cx: 44, cy: 43, r: 2.6 },
        tone: "ink",
        paint: "fill",
      },
      {
        shape: "circle",
        attrs: { cx: 55, cy: 39, r: 3 },
        tone: "ink",
        paint: "fill",
      },
      {
        shape: "circle",
        attrs: { cx: 66, cy: 43, r: 2.6 },
        tone: "ink",
        paint: "fill",
      },
    ],
  },
  underdog: {
    disc: "#3b6cff",
    shade: "#1f42b8",
    elements: [
      {
        shape: "circle",
        attrs: { cx: 60, cy: 60, r: 54 },
        tone: "disc",
        paint: "fill",
      },
      {
        shape: "rect",
        attrs: {
          x: 36,
          y: 86,
          width: 46,
          height: 8,
          rx: 2,
          transform: "translate(5 6)",
        },
        tone: "shade",
        paint: "fill",
      },
      {
        shape: "path",
        attrs: {
          d: "M44 80 C46 70 50 64 55 60 L47 62 C41 64 36 60 38 54 C40 46 46 40 52 36 L52 27 L58 34 C70 34 79 44 79 58 C79 68 77 74 77 80 Z",
          transform: "translate(5 6)",
        },
        tone: "shade",
        paint: "fill",
      },
      {
        shape: "path",
        attrs: {
          d: "M95 76 V42",
          strokeWidth: 7,
          strokeLinecap: "round",
          transform: "translate(5 6)",
        },
        tone: "shade",
        paint: "stroke",
      },
      {
        shape: "polygon",
        attrs: { points: "86,47 95,32 104,47", transform: "translate(5 6)" },
        tone: "shade",
        paint: "fill",
      },
      {
        shape: "rect",
        attrs: { x: 36, y: 86, width: 46, height: 8, rx: 2 },
        tone: "ink",
        paint: "fill",
      },
      {
        shape: "rect",
        attrs: { x: 40, y: 79, width: 38, height: 9, rx: 1 },
        tone: "ink",
        paint: "fill",
      },
      {
        shape: "path",
        attrs: {
          d: "M44 80 C46 70 50 64 55 60 L47 62 C41 64 36 60 38 54 C40 46 46 40 52 36 L52 27 L58 34 C70 34 79 44 79 58 C79 68 77 74 77 80 Z",
        },
        tone: "ink",
        paint: "fill",
      },
      {
        shape: "circle",
        attrs: { cx: 54, cy: 44, r: 2.8 },
        tone: "paper",
        paint: "fill",
      },
      {
        shape: "path",
        attrs: {
          d: "M66 40 L70 46 M70 49 L74 55 M72 59 L76 65",
          strokeWidth: 2.2,
          strokeLinecap: "round",
        },
        tone: "paper",
        paint: "stroke",
      },
      {
        shape: "path",
        attrs: { d: "M95 76 V42", strokeWidth: 7, strokeLinecap: "round" },
        tone: "paper",
        paint: "stroke",
      },
      {
        shape: "polygon",
        attrs: { points: "86,47 95,32 104,47" },
        tone: "paper",
        paint: "fill",
      },
    ],
  },
  good_game: {
    disc: "#ff6b5a",
    shade: "#c23d2e",
    elements: [
      {
        shape: "circle",
        attrs: { cx: 60, cy: 60, r: 54 },
        tone: "disc",
        paint: "fill",
      },
      {
        shape: "rect",
        attrs: {
          x: 15,
          y: 53,
          width: 17,
          height: 19,
          transform: "translate(5 6)",
        },
        tone: "shade",
        paint: "fill",
      },
      {
        shape: "rect",
        attrs: {
          x: 88,
          y: 53,
          width: 17,
          height: 19,
          transform: "translate(5 6)",
        },
        tone: "shade",
        paint: "fill",
      },
      {
        shape: "rect",
        attrs: {
          x: 28,
          y: 46,
          width: 30,
          height: 28,
          rx: 9,
          transform: "translate(5 6)",
        },
        tone: "shade",
        paint: "fill",
      },
      {
        shape: "rect",
        attrs: {
          x: 62,
          y: 46,
          width: 30,
          height: 28,
          rx: 9,
          transform: "translate(5 6)",
        },
        tone: "shade",
        paint: "fill",
      },
      {
        shape: "rect",
        attrs: { x: 15, y: 53, width: 17, height: 19 },
        tone: "paper",
        paint: "fill",
      },
      {
        shape: "rect",
        attrs: { x: 88, y: 53, width: 17, height: 19 },
        tone: "paper",
        paint: "fill",
      },
      {
        shape: "rect",
        attrs: { x: 28, y: 46, width: 30, height: 28, rx: 9 },
        tone: "paper",
        paint: "fill",
      },
      {
        shape: "rect",
        attrs: { x: 62, y: 46, width: 30, height: 28, rx: 9 },
        tone: "paper",
        paint: "fill",
      },
      {
        shape: "path",
        attrs: {
          d: "M47 55 H58 M47 64 H58 M62 55 H73 M62 64 H73",
          strokeWidth: 2.5,
          strokeLinecap: "round",
        },
        tone: "ink",
        paint: "stroke",
      },
      {
        shape: "path",
        attrs: {
          d: "M32 64 Q40 61 44 68 M88 64 Q80 61 76 68",
          strokeWidth: 2.5,
          strokeLinecap: "round",
        },
        tone: "ink",
        paint: "stroke",
      },
      {
        shape: "path",
        attrs: {
          d: "M60 40 V31 M52 38 L47 31 M68 38 L73 31 M60 80 V89 M52 82 L47 89 M68 82 L73 89",
          strokeWidth: 3,
          strokeLinecap: "round",
        },
        tone: "ink",
        paint: "stroke",
      },
    ],
  },
  mvp: {
    disc: "#ffc233",
    shade: "#c98f0a",
    elements: [
      {
        shape: "circle",
        attrs: { cx: 60, cy: 60, r: 54 },
        tone: "disc",
        paint: "fill",
      },
      {
        shape: "path",
        attrs: {
          d: "M30 80 L26 44 L45 58 L60 32 L75 58 L94 44 L90 80 Z",
          transform: "translate(5 6)",
        },
        tone: "shade",
        paint: "fill",
      },
      {
        shape: "rect",
        attrs: {
          x: 29,
          y: 78,
          width: 62,
          height: 12,
          rx: 2,
          transform: "translate(5 6)",
        },
        tone: "shade",
        paint: "fill",
      },
      {
        shape: "path",
        attrs: { d: "M30 80 L26 44 L45 58 L60 32 L75 58 L94 44 L90 80 Z" },
        tone: "paper",
        paint: "fill",
      },
      {
        shape: "rect",
        attrs: { x: 29, y: 78, width: 62, height: 12, rx: 2 },
        tone: "ink",
        paint: "fill",
      },
      {
        shape: "circle",
        attrs: { cx: 26, cy: 43, r: 5 },
        tone: "ink",
        paint: "fill",
      },
      {
        shape: "circle",
        attrs: { cx: 60, cy: 31, r: 6 },
        tone: "ink",
        paint: "fill",
      },
      {
        shape: "circle",
        attrs: { cx: 94, cy: 43, r: 5 },
        tone: "ink",
        paint: "fill",
      },
      {
        shape: "polygon",
        attrs: {
          points:
            "60.0,54.0 62.3,60.0 68.7,60.4 63.7,64.5 65.4,70.7 60.0,67.2 54.6,70.7 56.3,64.5 51.3,60.4 57.7,60.0",
        },
        tone: "ink",
        paint: "fill",
      },
    ],
  },
} as const satisfies Record<string, Coin>;

export type MarkCoinKind = keyof typeof markCoins;

/** The greys a not-yet glyph is drawn in, from the palette on screen. */
export type CoinGreys = Pick<
  Palette,
  "rule" | "muted" | "paper" | "dimrule" | "dim" | "focus"
>;

/**
 * A coin not yet earned keeps its glyph and drops its colour: the disc
 * becomes a Hatch, ink parts turn muted, paper parts take the surface and the
 * shade turns rule grey, so a paper glyph still has an edge against the hatch.
 * It carries no coin colour, so its greys follow the scheme like Hatch does.
 */
function notYetTones(surface: "paper" | "ink", greys: CoinGreys) {
  return surface === "ink"
    ? { shade: greys.dimrule, ink: greys.dim, paper: greys.focus }
    : { shade: greys.rule, ink: greys.muted, paper: greys.paper };
}

/**
 * The colour each tone paints, or `null` when the state drops it. An earned
 * coin is data and keeps the light ink and paper in both schemes (ADR-0055);
 * only a not-yet coin reads `greys`.
 */
export function coinToneColors(
  kind: MarkCoinKind,
  state: CoinState,
  surface: "paper" | "ink" = "paper",
  greys: CoinGreys = colors,
): Record<CoinTone, string | null> {
  if (state === "notYet") {
    return { disc: null, ...notYetTones(surface, greys) };
  }
  const coin = markCoins[kind];
  return {
    disc: coin.disc,
    shade: coin.shade,
    ink: colors.ink,
    paper: colors.paper,
  };
}
