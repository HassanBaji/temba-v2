import {
  selfDeclareChoiceFromDisplay,
  type AssignableDisplayLevelBand,
  type SelfDeclareChoice,
} from "./level-bands";

/**
 * Football self-placement: four plain words instead of the padel letter
 * ladder, since pickup players rarely know a letter. Each one declares a
 * starting football Level that Make teams balances on until football results
 * rate. Pro sits on B, not A: A is earned, never self-placed.
 */
export const FOOTBALL_SELF_PLACEMENTS = [
  "beginner",
  "casual",
  "competitive",
  "pro",
] as const;

export type FootballSelfPlacement = (typeof FOOTBALL_SELF_PLACEMENTS)[number];

export const FOOTBALL_SELF_PLACEMENT_CHOICES: {
  value: FootballSelfPlacement;
  label: string;
  description: string;
  band: AssignableDisplayLevelBand;
}[] = [
  {
    value: "beginner",
    label: "Beginner",
    description: "Still finding your feet. Now and then.",
    band: "D",
  },
  {
    value: "casual",
    label: "Casual",
    description: "Pick-up games, holds a position. 1–2× a week.",
    band: "C",
  },
  {
    value: "competitive",
    label: "Competitive",
    description: "Plays local tournaments, lasts the full match. 2–3× a week.",
    band: "C+",
  },
  {
    value: "pro",
    label: "Pro",
    description:
      "Club or academy background, dictates the game. Several times a week.",
    band: "B",
  },
];

export const DEFAULT_FOOTBALL_SELF_PLACEMENT: FootballSelfPlacement =
  "competitive";

export function footballSelfPlacementLabel(placement: FootballSelfPlacement) {
  return (
    FOOTBALL_SELF_PLACEMENT_CHOICES.find((choice) => choice.value === placement)
      ?.label ?? placement
  );
}

export function selfDeclareChoiceFromFootballPlacement(
  placement: FootballSelfPlacement,
): SelfDeclareChoice {
  const choice = FOOTBALL_SELF_PLACEMENT_CHOICES.find(
    (entry) => entry.value === placement,
  );
  return choice ? selfDeclareChoiceFromDisplay(choice.band) : "unknown";
}
