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

/** Reserved elite display rung. Never assigned from a stored band. */
export const RESERVED_DISPLAY_LEVEL_BAND = "PRO" as const;

export const ASSIGNABLE_DISPLAY_LEVEL_BANDS = [
  "D",
  "D+",
  "C",
  "C+",
  "B",
  "B+",
  "A",
] as const;

export type AssignableDisplayLevelBand =
  (typeof ASSIGNABLE_DISPLAY_LEVEL_BANDS)[number];

const STORED_TO_DISPLAY: Record<LevelBand, AssignableDisplayLevelBand> = {
  D3: "D",
  D2: "D",
  D1: "D+",
  C3: "C",
  C2: "C",
  C1: "C+",
  B3: "B",
  B2: "B",
  B1: "B+",
  A: "A",
};

/** Collapsed display letter writes the lower stored third. */
const DISPLAY_TO_STORED_LOWER: Record<AssignableDisplayLevelBand, LevelBand> = {
  D: "D3",
  "D+": "D1",
  C: "C3",
  "C+": "C1",
  B: "B3",
  "B+": "B1",
  A: "A",
};

export function isAssignableDisplayLevelBand(
  value: string,
): value is AssignableDisplayLevelBand {
  return ASSIGNABLE_DISPLAY_LEVEL_BANDS.some((band) => band === value);
}

export function displayLabelFromStoredBand(
  band: LevelBand,
): AssignableDisplayLevelBand {
  return STORED_TO_DISPLAY[band];
}

export function nextDistinctDisplayRung(
  band: LevelBand,
): AssignableDisplayLevelBand | null {
  const current = STORED_TO_DISPLAY[band];
  const start = LEVEL_BANDS.indexOf(band);
  for (const stored of LEVEL_BANDS.slice(start + 1)) {
    const nextDisplay = STORED_TO_DISPLAY[stored];
    if (nextDisplay !== current) {
      return nextDisplay;
    }
  }
  return null;
}

export function storedBandFromDisplayLabel(
  label: AssignableDisplayLevelBand,
): LevelBand {
  return DISPLAY_TO_STORED_LOWER[label];
}

export function selfDeclareChoiceFromDisplay(
  choice: AssignableDisplayLevelBand | "unknown",
): SelfDeclareChoice {
  if (choice === "unknown") {
    return "unknown";
  }
  return storedBandFromDisplayLabel(choice);
}
