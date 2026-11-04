import {
  profileChecklist,
  type ProfileChecklist,
  type ProfileChecklistInput,
  type ProfileTaskId,
} from "@repo/domain/profile-checklist";
import { hasFullName } from "@repo/domain/user-display-name";
import type { Locale } from "@repo/i18n/locale";
import { messagesFor } from "@repo/i18n/messages";

/** The slice of a Clerk user the checklist reads. */
export type ChecklistUser = {
  firstName: string | null;
  lastName: string | null;
  hasImage: boolean;
  primaryEmailAddress: {
    verification: { status: string | null };
  } | null;
};

export type ChecklistOnboardingState = {
  onboardingCompletedAt: Date | null;
};

export function checklistInputFrom(
  user: ChecklistUser,
  state: ChecklistOnboardingState,
): ProfileChecklistInput {
  return {
    hasName: hasFullName(user),
    hasPhoto: user.hasImage,
    hasVerifiedEmail:
      user.primaryEmailAddress?.verification.status === "verified",
    sportsDone: state.onboardingCompletedAt != null,
  };
}

export function checklistFrom(
  user: ChecklistUser | null | undefined,
  state: ChecklistOnboardingState | undefined,
  locale: Locale,
): ProfileChecklist | null {
  if (!user || !state) {
    return null;
  }
  return profileChecklist(checklistInputFrom(user, state), locale);
}

export const COMPLETE_PROFILE_PATH = "/complete-profile";

export function profileTaskPath(task: ProfileTaskId): string {
  return `${COMPLETE_PROFILE_PATH}/${task}`;
}

export function profileTaskShortName(
  task: ProfileTaskId,
  locale: Locale,
): string {
  return messagesFor(locale).mobileHome.tasks.short[task];
}

/** The collapsed Home chip after Skip for now: "Profile 2 OF 5 · Show". */
export function checklistChipLabel(
  list: ProfileChecklist,
  locale: Locale,
): string {
  return messagesFor(locale).mobileHome.tasks.chipLabel(list.done, list.total);
}

export function checklistChipTasks(
  list: ProfileChecklist,
  locale: Locale,
): string {
  const m = messagesFor(locale).mobileHome.tasks;
  return m.shortList(
    list.open.filter((task) => !task.required).map((task) => m.short[task.id]),
  );
}

/** "PROFILE / SPORTS 1 OF 3": the questionnaire without its old summary step. */
export function sportsTaskMeta(
  progress: { step: number; total: number },
  locale: Locale,
) {
  const total = progress.total - 1;
  return {
    step: progress.step,
    total,
    label: messagesFor(locale).mobileHome.tasks.sportsMeta(
      progress.step,
      total,
    ),
  };
}
