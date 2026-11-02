import type { ProfileChecklistInput } from "@repo/domain/profile-checklist";
import { hasFullName } from "@repo/domain/user-display-name";

/** The slice of a Clerk `UserResource` the checklist reads, structurally. */
export type ChecklistUserLike = {
  firstName: string | null;
  lastName: string | null;
  hasImage: boolean;
  primaryEmailAddress: {
    verification: { status: string | null };
  } | null;
};

/**
 * The checklist's inputs come from two places: the Clerk user (name, photo,
 * email — the same source the header reads) and `users.onboardingState`
 * (the sports questionnaire).
 */
export function profileChecklistInputFrom(
  user: ChecklistUserLike,
  onboardingCompletedAt: Date | null,
): ProfileChecklistInput {
  return {
    hasName: hasFullName(user),
    hasPhoto: user.hasImage,
    hasVerifiedEmail:
      user.primaryEmailAddress?.verification.status === "verified",
    sportsDone: onboardingCompletedAt != null,
  };
}
