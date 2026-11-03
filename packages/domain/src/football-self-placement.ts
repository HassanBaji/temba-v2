import { messagesFor } from "@repo/i18n/messages";
import type { Locale } from "@repo/i18n/locale";

import {
  selfDeclareChoiceFromDisplay,
  type AssignableDisplayLevelBand,
  type SelfDeclareChoice,
} from "./level-bands";

/**
 * Football self-placement: four plain words instead of the padel letter
 * ladder, since pickup players rarely know a letter. Each one declares a
 * starting football Level that Make teams balances on until football results
 * rate. Pro sits on B-, not A: A is earned, never self-placed.
 */
export const FOOTBALL_SELF_PLACEMENTS = [
  "beginner",
  "casual",
  "competitive",
  "pro",
] as const;

export type FootballSelfPlacement = (typeof FOOTBALL_SELF_PLACEMENTS)[number];

const FOOTBALL_SELF_PLACEMENT_BANDS: Record<
  FootballSelfPlacement,
  AssignableDisplayLevelBand
> = {
  beginner: "D",
  casual: "C-",
  competitive: "C+",
  pro: "B-",
};

export function footballSelfPlacementChoices(locale: Locale): {
  value: FootballSelfPlacement;
  label: string;
  description: string;
  band: AssignableDisplayLevelBand;
}[] {
  const m = messagesFor(locale).football.selfPlacement;
  return FOOTBALL_SELF_PLACEMENTS.map((value) => ({
    value,
    label: m[value].label,
    description: m[value].description,
    band: FOOTBALL_SELF_PLACEMENT_BANDS[value],
  }));
}

export const DEFAULT_FOOTBALL_SELF_PLACEMENT: FootballSelfPlacement =
  "competitive";

export function footballSelfPlacementLabel(
  placement: FootballSelfPlacement,
  locale: Locale,
) {
  return messagesFor(locale).football.selfPlacement[placement].label;
}

export function selfDeclareChoiceFromFootballPlacement(
  placement: FootballSelfPlacement,
): SelfDeclareChoice {
  const band = FOOTBALL_SELF_PLACEMENT_BANDS[placement];
  return band ? selfDeclareChoiceFromDisplay(band) : "unknown";
}
