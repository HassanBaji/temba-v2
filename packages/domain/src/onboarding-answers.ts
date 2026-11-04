import type { Locale } from "@repo/i18n/locale";
import { messagesFor, type Messages } from "@repo/i18n/messages";

import {
  DEFAULT_FOOTBALL_POSITION,
  footballPositionChoices,
  isFootballPosition,
  isFootballRole,
  type FootballPosition,
  type FootballRole,
} from "./football-lineup";
import {
  DEFAULT_FOOTBALL_SELF_PLACEMENT,
  footballSelfPlacementLabel,
  selfDeclareChoiceFromFootballPlacement,
  type FootballSelfPlacement,
} from "./football-self-placement";
import {
  selfDeclareChoiceFromDisplay,
  type AssignableDisplayLevelBand,
  type SelfDeclareChoice,
} from "./level-bands";
import { pickedSportList, type PickedSports } from "./onboarding-flow";
import {
  PREFERRED_POSITIONS,
  isPreferredPosition,
  preferredPositionProfileLine,
  type PreferredPosition,
} from "./preferred-position";
import { isSport, type Sport } from "./sport";

export type PadelLevelChoice = AssignableDisplayLevelBand;

/** What a User has picked so far, held by the questionnaire until Find games. */
export type OnboardingAnswers = {
  picked: PickedSports;
  padelSide: PreferredPosition;
  padelLevel: PadelLevelChoice | "";
  footballRole: FootballRole;
  footballPosition: FootballPosition;
  footballPlacement: FootballSelfPlacement;
};

/** The `users.completeOnboarding` input, written structurally: this Package cannot import the API. */
export type OnboardingSubmission = {
  sports: Sport[];
  padel?: { preferredPosition: PreferredPosition; choice: SelfDeclareChoice };
  football?: {
    role: FootballRole;
    position: FootballPosition | null;
    choice: SelfDeclareChoice;
  };
};

/** The parts of `users.onboardingState` that seed the answers. */
export type OnboardingSeed = {
  sports: readonly string[] | null;
  preferredPosition: string | null;
  preferredFootballRole: string | null;
  preferredFootballPosition: string | null;
};

export function sportChoices(locale: Locale): {
  value: Sport;
  title: string;
  description: string;
  meta: string;
}[] {
  const m = messagesFor(locale);
  return [
    {
      value: "padel",
      title: m.common.padel,
      description: m.onboarding.sport.padel.description,
      meta: m.onboarding.sport.padel.meta,
    },
    {
      value: "football",
      title: m.common.football,
      description: m.onboarding.sport.football.description,
      meta: m.onboarding.sport.football.meta,
    },
  ];
}

const PADEL_LEVEL_KEYS = [
  ["D", "newToPadel"],
  ["D+", "beginner"],
  ["C-", "improver"],
  ["C+", "intermediate"],
  ["B-", "advanced"],
  ["B+", "expert"],
  ["A", "pro"],
] as const satisfies readonly (readonly [
  AssignableDisplayLevelBand,
  keyof Messages["onboarding"]["padelLevel"],
])[];

export function padelLevelChoices(locale: Locale): {
  value: AssignableDisplayLevelBand;
  name: string;
  detail: string;
}[] {
  const m = messagesFor(locale).onboarding.padelLevel;
  return PADEL_LEVEL_KEYS.map(([value, key]) => ({
    value,
    name: m[key].name,
    detail: m[key].detail,
  }));
}

export function padelSideChoices(locale: Locale): {
  value: PreferredPosition;
  name: string;
  detail: string;
}[] {
  const m = messagesFor(locale);
  return PREFERRED_POSITIONS.map((value) => ({
    value,
    name: m.profile.preferredPosition[value],
    detail: m.onboarding.padelSide[value],
  }));
}

export function footballRoleChoices(
  locale: Locale,
): { value: FootballRole; name: string }[] {
  const m = messagesFor(locale).onboarding.footballRole;
  return [
    { value: "outfield", name: m.outfield },
    { value: "keeper", name: m.keeper },
  ];
}

/** A player who is not sure starts one rung up from the bottom, not at the classic default. */
export const PADEL_NOT_SURE_LEVEL: PadelLevelChoice = "D+";

export function padelNotSureLabel(locale: Locale) {
  return messagesFor(locale).onboarding.padelNotSure(PADEL_NOT_SURE_LEVEL);
}

export function initialOnboardingAnswers(
  seed: OnboardingSeed,
): OnboardingAnswers {
  const sports = (seed.sports ?? []).filter(isSport);
  return {
    picked: {
      padel: sports.includes("padel"),
      football: sports.includes("football"),
    },
    padelSide: isPreferredPosition(seed.preferredPosition)
      ? seed.preferredPosition
      : "either",
    padelLevel: "",
    footballRole: isFootballRole(seed.preferredFootballRole)
      ? seed.preferredFootballRole
      : "outfield",
    footballPosition: isFootballPosition(seed.preferredFootballPosition)
      ? seed.preferredFootballPosition
      : DEFAULT_FOOTBALL_POSITION,
    footballPlacement: DEFAULT_FOOTBALL_SELF_PLACEMENT,
  };
}

export function onboardingSubmission(
  answers: OnboardingAnswers,
): OnboardingSubmission {
  const submission: OnboardingSubmission = {
    sports: pickedSportList(answers.picked),
  };
  if (answers.picked.padel) {
    submission.padel = {
      preferredPosition: answers.padelSide,
      choice: selfDeclareChoiceFromDisplay(answers.padelLevel || "unknown"),
    };
  }
  if (answers.picked.football) {
    submission.football = {
      role: answers.footballRole,
      position:
        answers.footballRole === "keeper" ? null : answers.footballPosition,
      choice: selfDeclareChoiceFromFootballPlacement(answers.footballPlacement),
    };
  }
  return submission;
}

function footballPositionLabel(position: FootballPosition, locale: Locale) {
  return (
    footballPositionChoices(locale).find((choice) => choice.value === position)
      ?.label ?? position
  );
}

/** One line per picked sport for the "You're set" card. */
export function onboardingSummary(answers: OnboardingAnswers, locale: Locale) {
  const m = messagesFor(locale);
  const lines: { sport: string; line: string }[] = [];
  if (answers.picked.padel) {
    const level = answers.padelLevel || m.onboarding.summary.levelAlreadySet;
    const side =
      preferredPositionProfileLine(answers.padelSide, locale) ??
      m.profile.preferredPosition.line.either;
    lines.push({
      sport: m.common.padel,
      line: m.onboarding.summary.padelLine(level, side),
    });
  }
  if (answers.picked.football) {
    const slot =
      answers.footballRole === "keeper"
        ? m.onboarding.footballRole.keeper
        : footballPositionLabel(answers.footballPosition, locale);
    const placement = footballSelfPlacementLabel(
      answers.footballPlacement,
      locale,
    );
    lines.push({
      sport: m.common.football,
      line: m.onboarding.summary.footballLine(slot, placement),
    });
  }
  return lines;
}
