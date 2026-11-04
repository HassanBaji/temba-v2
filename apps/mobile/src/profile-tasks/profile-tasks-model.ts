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

/** What Settings adds to the checklist: Your details and When you play. */
export type SettingsChecklistExtras = {
  hasDetails: boolean;
  hasPlayWindows: boolean;
};

export type SettingsChecklist = {
  done: number;
  total: number;
  complete: boolean;
  /** "Left: verify email, when you usually play", or "All done." */
  left: string;
  /** Where the card opens: the checklist while it has open tasks, else the first open Settings screen. */
  target: string;
};

export function settingsChecklist(
  list: ProfileChecklist,
  extras: SettingsChecklistExtras,
  locale: Locale,
): SettingsChecklist {
  const messages = messagesFor(locale);
  const m = messages.you.settings;
  const items = m.leftItems;
  const left = [
    ...list.open.map((task) =>
      task.id === "name" ? messages.mobileYou.leftName : items[task.id],
    ),
    ...(extras.hasDetails ? [] : [items.details]),
    ...(extras.hasPlayWindows ? [] : [items.playWindows]),
  ];
  const extraDone =
    (extras.hasDetails ? 1 : 0) + (extras.hasPlayWindows ? 1 : 0);
  return {
    done: list.done + extraDone,
    total: list.total + 2,
    complete: left.length === 0,
    left:
      left.length === 0
        ? m.allDone
        : m.left(messages.mobileHome.tasks.shortList(left)),
    target:
      list.open.length > 0
        ? COMPLETE_PROFILE_PATH
        : extras.hasDetails
          ? "/profile/availability"
          : "/profile/details",
  };
}
