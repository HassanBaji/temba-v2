import {
  DEFAULT_FOOTBALL_POSITION,
  FOOTBALL_POSITION_CHOICES,
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

export const SPORT_CHOICES: {
  value: Sport;
  title: string;
  description: string;
  meta: string;
}[] = [
  {
    value: "padel",
    title: "Padel",
    description:
      "Doubles, 90 minute slots. A letter Level that follows your results.",
    meta: "Level D to A, side",
  },
  {
    value: "football",
    title: "Football",
    description: "Five or seven a side. Pool first, teams set before kick-off.",
    meta: "Level, role, position",
  },
];

export const PADEL_LEVEL_CHOICES: {
  value: AssignableDisplayLevelBand;
  name: string;
  detail: string;
}[] = [
  {
    value: "D",
    name: "New to padel",
    detail: "Learning the walls and the rules.",
  },
  { value: "D+", name: "Beginner", detail: "Lobs and volleys with intent." },
  {
    value: "C",
    name: "Improver",
    detail: "Overheads and volleys are reliable, errors still creep in.",
  },
  {
    value: "C+",
    name: "Intermediate",
    detail:
      "Plays tournaments, picks the right shot, rarely gives points away.",
  },
  {
    value: "B",
    name: "Advanced",
    detail: "Wins tournaments, finishes points at the net.",
  },
  {
    value: "B+",
    name: "Expert",
    detail: "Top of the local scene, reads the game a step ahead.",
  },
  {
    value: "A",
    name: "Pro",
    detail: "Competes on the national or international circuit.",
  },
];

export const PADEL_SIDE_CHOICES: {
  value: PreferredPosition;
  name: string;
  detail: string;
}[] = [
  { value: "left", name: "Left", detail: "backhand side" },
  { value: "right", name: "Right", detail: "forehand side" },
  { value: "either", name: "Either", detail: "wherever open" },
];

export const FOOTBALL_ROLE_CHOICES: {
  value: FootballRole;
  name: string;
  detail: string;
}[] = [
  { value: "outfield", name: "Player", detail: "outfield" },
  { value: "keeper", name: "Keeper", detail: "two per game" },
];

/** A player who is not sure starts one rung up from the bottom, not at the classic default. */
export const PADEL_NOT_SURE_LEVEL: PadelLevelChoice = "D+";

export const PADEL_NOT_SURE_LABEL = `Not sure, start at ${PADEL_NOT_SURE_LEVEL} and leave side open`;

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
    const level = answers.padelLevel || "Level already set";
    const side =
      preferredPositionProfileLine(answers.padelSide) ?? "Either side";
    lines.push({ sport: "Padel", line: `${level}, ${side.toLowerCase()}` });
  }
  if (answers.picked.football) {
    const slot =
      answers.footballRole === "keeper"
        ? "Keeper"
        : footballPositionLabel(answers.footballPosition);
    const placement = footballSelfPlacementLabel(answers.footballPlacement);
    lines.push({
      sport: "Football",
      line: `${slot}, ${placement.toLowerCase()}`,
    });
  }
  return lines;
}
