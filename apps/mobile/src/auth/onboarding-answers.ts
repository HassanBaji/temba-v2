import {
  FOOTBALL_POSITION_CHOICES,
  type FootballPosition,
  type FootballRole,
} from "@repo/domain/football-lineup";
import {
  footballSelfPlacementLabel,
  selfDeclareChoiceFromFootballPlacement,
  type FootballSelfPlacement,
} from "@repo/domain/football-self-placement";
import {
  selfDeclareChoiceFromDisplay,
  type AssignableDisplayLevelBand,
} from "@repo/domain/level-bands";
import {
  preferredPositionProfileLine,
  type PreferredPosition,
} from "@repo/domain/preferred-position";

import type { RouterInputs } from "../trpc/react";
import { pickedSportList, type PickedSports } from "./onboarding-step";

export type PadelLevelChoice = AssignableDisplayLevelBand | "unknown";

export type OnboardingAnswers = {
  picked: PickedSports;
  padelSide: PreferredPosition;
  padelLevel: PadelLevelChoice | "";
  footballRole: FootballRole;
  footballPosition: FootballPosition;
  footballPlacement: FootballSelfPlacement;
};

type CompleteOnboardingInput = Exclude<
  RouterInputs["users"]["completeOnboarding"],
  void | undefined
>;

export function completeOnboardingInput(
  answers: OnboardingAnswers,
): CompleteOnboardingInput {
  const input: CompleteOnboardingInput = {
    sports: pickedSportList(answers.picked),
  };
  if (answers.picked.padel) {
    input.padel = {
      preferredPosition: answers.padelSide,
      choice: selfDeclareChoiceFromDisplay(answers.padelLevel || "unknown"),
    };
  }
  if (answers.picked.football) {
    input.football = {
      role: answers.footballRole,
      position:
        answers.footballRole === "keeper" ? null : answers.footballPosition,
      choice: selfDeclareChoiceFromFootballPlacement(answers.footballPlacement),
    };
  }
  return input;
}

function footballPositionLabel(position: FootballPosition) {
  return (
    FOOTBALL_POSITION_CHOICES.find((choice) => choice.value === position)
      ?.label ?? position
  );
}

/** One line per picked sport for the "You're set" card. */
export function onboardingSummary(answers: OnboardingAnswers) {
  const lines: { sport: string; line: string }[] = [];
  if (answers.picked.padel) {
    const level =
      !answers.padelLevel || answers.padelLevel === "unknown"
        ? "Level from results"
        : answers.padelLevel;
    lines.push({
      sport: "Padel",
      line: `${level}, ${(preferredPositionProfileLine(answers.padelSide) ?? "either side").toLowerCase()}`,
    });
  }
  if (answers.picked.football) {
    const slot =
      answers.footballRole === "keeper"
        ? "Keeper"
        : footballPositionLabel(answers.footballPosition);
    lines.push({
      sport: "Football",
      line: `${slot}, ${footballSelfPlacementLabel(answers.footballPlacement).toLowerCase()}`,
    });
  }
  return lines;
}
