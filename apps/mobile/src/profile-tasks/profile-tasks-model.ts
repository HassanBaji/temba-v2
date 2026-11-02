import {
  profileChecklist,
  type ProfileChecklist,
  type ProfileChecklistInput,
  type ProfileTaskId,
} from "@repo/domain/profile-checklist";
import { hasFullName } from "@repo/domain/user-display-name";

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
): ProfileChecklist | null {
  if (!user || !state) {
    return null;
  }
  return profileChecklist(checklistInputFrom(user, state));
}

export const COMPLETE_PROFILE_PATH = "/complete-profile";

export function profileTaskPath(task: ProfileTaskId): string {
  return `${COMPLETE_PROFILE_PATH}/${task}`;
}

const SHORT_NAMES: Record<ProfileTaskId, string> = {
  name: "Name",
  photo: "Photo",
  email: "Email",
  sports: "Sports",
};

export function profileTaskShortName(task: ProfileTaskId): string {
  return SHORT_NAMES[task];
}

/** The collapsed Home chip after Skip for now: "Profile 2 OF 5 · Show". */
export function checklistChipLabel(list: ProfileChecklist): string {
  return `Profile ${list.done} OF ${list.total} · Show`;
}

export function checklistChipTasks(list: ProfileChecklist): string {
  return list.open
    .filter((task) => !task.required)
    .map((task) => profileTaskShortName(task.id))
    .join(", ");
}

/** "PROFILE / SPORTS 1 OF 3": the questionnaire without its old summary step. */
export function sportsTaskMeta(progress: { step: number; total: number }) {
  return {
    step: progress.step,
    total: progress.total - 1,
    label: `Profile / Sports ${progress.step} of ${progress.total - 1}`,
  };
}
