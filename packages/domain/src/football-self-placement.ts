import {
  selfDeclareChoiceFromDisplay,
  type AssignableDisplayLevelBand,
  type SelfDeclareChoice,
} from "./level-bands";

/**
 * Football self-placement: three plain words instead of the padel letter
 * ladder, since pickup players rarely know a letter. Each one declares a
 * starting football Level that Make teams balances on until football results
 * rate. Pro sits on B, not A: A is earned, never self-placed.
 */
export const FOOTBALL_SELF_PLACEMENTS = [
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
    value: "casual",
    label: "Casual",
    description: "Pick-up games, still learning the basics",
    band: "D",
  },
  {
    value: "competitive",
    label: "Competitive",
    description: "Plays weekly, holds position, fit for 60 minutes",
    band: "C",
  },
  {
    value: "pro",
    label: "Pro",
    description: "Played at club or academy level",
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
