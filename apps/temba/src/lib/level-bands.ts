export const LEVEL_BANDS = [
  "D3",
  "D2",
  "D1",
  "C3",
  "C2",
  "C1",
  "B3",
  "B2",
  "B1",
  "A",
] as const;

export type LevelBand = (typeof LEVEL_BANDS)[number];

export type SelfDeclareChoice = LevelBand | "unknown";

export const SELF_DECLARE_CHOICES = [...LEVEL_BANDS, "unknown"] as const;
