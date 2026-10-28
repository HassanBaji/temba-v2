import { type Sport } from "./sport";

/**
 * The Onboarding questionnaire's order: which sports the User plays, one
 * step per picked sport, then a summary. Picking one sport shortens the
 * flow. Both the web and mobile questionnaires walk this list.
 */
export type OnboardingQuestion = "sports" | Sport | "ready";

export type PickedSports = Record<Sport, boolean>;

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

export function onboardingProgress(
  picked: PickedSports,
  current: OnboardingQuestion,
) {
  const questions = onboardingQuestions(picked);
  return { step: questions.indexOf(current) + 1, total: questions.length };
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
