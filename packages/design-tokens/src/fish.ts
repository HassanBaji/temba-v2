/**
 * Tier band fish (ADR-0067), transcribed from the owner's Ratings prototype.
 * Monochrome glyphs: the body paints ink, and the Shark's eye, gills and
 * mouth are cut-outs painted in the surface colour behind it. Every viewBox
 * is 5 by 3, so one width and height fits all four.
 */

export type FishBand = "shark" | "hamour" | "kanaad" | "safi";

export type FishCutout = {
  d: string;
  paint: "fill" | "stroke";
  strokeWidth?: number;
};

export type FishGlyph = {
  viewBox: string;
  body: string;
  cutouts: readonly FishCutout[];
};

export const fishSizes = {
  row: { width: 40, height: 24 },
  card: { width: 90, height: 54 },
} as const;

export type FishSize = keyof typeof fishSizes;

export const fishGlyphs: Record<FishBand, FishGlyph> = {
  shark: {
    viewBox: "3 19 90 54",
    body: "M88 47 C80 42 68 38.5 57 38 L46 21 C46.5 29 44.5 35 41 40 C34 41.5 28 43.5 24 44.5 L20 42 L19 45.6 C14 41 9 34 5 26 C6 36 9 44 13 48.5 L8.5 60 C12.5 56 17 52.5 20 50.5 C26 51.5 30 52.5 33 53 L31 58.5 L38 54.5 C44 56 50 57 55 57.2 L47 69 C54 66 60 62 64 56.5 C72 55.5 80 53 84 50.5 C86 49.5 87.5 48.3 88 47 Z",
    cutouts: [
      {
        d: "M76.6 46.6 A1.4 1.4 0 1 0 79.4 46.6 A1.4 1.4 0 1 0 76.6 46.6 Z",
        paint: "fill",
      },
      {
        d: "M66.5 45.5 L65.5 52 M69.3 45.8 L68.3 52.3 M72.1 46.3 L71.1 52.6",
        paint: "stroke",
        strokeWidth: 1.2,
      },
      {
        d: "M80.5 52.8 Q77 52.2 74.5 49.8",
        paint: "stroke",
        strokeWidth: 1.3,
      },
    ],
  },
  hamour: {
    viewBox: "3 19 90 54",
    body: "M80 48 C76 40 68 34.5 60 32.5 L57 26 C50 24.5 42 26 34 30 C31 33.5 29 38 27 42 L17 36 C12 42 12 54 17 60 L27 54 C29 58 31 62 33 65 L42 61 C46 62.5 50 63 54 63 L58 69 L64 63 C71 62.5 78 59 82 53 L74 51 Z",
    cutouts: [],
  },
  kanaad: {
    viewBox: "-2 16 100 60",
    body: "M86 48.5 C81 44 74 41 68 40 L64 34.5 C60 37 56 38.5 52 39.5 L49 32 C47.5 36 46 39 43 41 L40.5 39.6 L39 42.2 L36.5 40.8 L35 43.3 L32.5 42 L31 44.5 L24 46.5 C19 44 14 39 10 32 C13 40 15.5 45 16 48 C15.5 51 13 56 10 64 C14 57 19 52 24 49.5 L31 51.5 L32.5 54 L35 52.7 L36.5 55.2 L39 53.8 L40.5 56.4 L43 55 C46 57 47.5 60 49 64 L52 56.5 C62 57.5 76 55 86 48.5 Z",
    cutouts: [],
  },
  safi: {
    viewBox: "-19.5 5.5 135 81",
    body: "M80 49 C76 43 70 38 62 36 L59 30.5 L56.5 34.2 L53.5 29.6 L51 33.6 L48 29.6 L45.5 33.8 L42.5 30.3 L40 34.6 L37 31.8 C33 34 29 40 26 44.5 L15 36 C17.5 41 19 45 19.5 48 C19 51 17.5 55 15 60 L26 51.5 C29 56 33 62 37 64.2 L40 61.4 L42.5 65.7 L45.5 62.2 L48 66.4 L51 62.4 L54 62.2 L57 66.5 L60 61.5 C68 60 76 56 80 49 Z",
    cutouts: [],
  },
};
