import { type Sport } from "@repo/domain/sport";

export type OnboardingQuestionnaireState = {
  provisioning: boolean;
  onboardingCompletedAt: Date | null;
};

export type OnboardingPhase =
  | "loading"
  | "provisioning"
  | "questions"
  | "complete";

export type OnboardingQuestion = "sports" | Sport | "ready";

export type PickedSports = Record<Sport, boolean>;

export const PROVISIONING_POLL_MS = 2000;
export const PROVISIONING_TIMEOUT_MS = 10 * PROVISIONING_POLL_MS;

export function onboardingPhaseFromState(
  state: OnboardingQuestionnaireState | undefined,
): OnboardingPhase {
  if (!state) {
    return "loading";
  }
  if (state.provisioning) {
    return "provisioning";
  }
  return state.onboardingCompletedAt ? "complete" : "questions";
}

export function canReachTabs(phase: OnboardingPhase): boolean {
  return phase === "complete";
}

export function pickedSportList(picked: PickedSports): Sport[] {
  const sports: Sport[] = [];
  if (picked.padel) {
    sports.push("padel");
  }
  if (picked.football) {
    sports.push("football");
  }
  return sports;
}

/** The questions in order; one per picked sport, so picking one sport shortens the flow. */
export function onboardingQuestions(
  picked: PickedSports,
): OnboardingQuestion[] {
  return ["sports", ...pickedSportList(picked), "ready"];
}

export function adjacentQuestion(
  picked: PickedSports,
  current: OnboardingQuestion,
  direction: "next" | "back",
): OnboardingQuestion | null {
  const questions = onboardingQuestions(picked);
  const index = questions.indexOf(current);
  if (index === -1) {
    return null;
  }
  return questions[index + (direction === "next" ? 1 : -1)] ?? null;
}

export function sportsContinueLabel(picked: PickedSports) {
  const sports = pickedSportList(picked);
  if (sports.length === 0) {
    return "Pick at least one";
  }
  if (sports.length === 2) {
    return "Continue with both";
  }
  return `Continue with ${sports[0]}`;
}

export function findGamesLabel(picked: PickedSports) {
  const sports = pickedSportList(picked);
  return sports.length === 1 ? `Find ${sports[0]} games` : "Find games";
}
