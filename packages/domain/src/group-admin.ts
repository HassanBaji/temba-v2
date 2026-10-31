import type { GroupJoinRequestData } from "./group-data";
import { formatPastDay, formatRequestedAt } from "./request-meta";

export const GROUP_REQUIRE_APPROVAL_LABEL = "Require approval";

export const GROUP_REQUESTS_ERROR_TITLE = "Join requests could not be loaded";

export const GROUP_IMAGE_SAVED_TOAST = "Image saved";

export const GROUP_IMAGE_REMOVED_TOAST = "Image removed";

export const GROUP_DELETED_TOAST = "Group deleted";

export function groupDeleteConfirm(groupName: string) {
  return {
    title: `Delete ${groupName}?`,
    description: "This cannot be undone.",
    confirmLabel: "Delete Group",
  };
}

export function groupRemoveImageConfirm(groupName: string) {
  return {
    title: `Remove image for ${groupName}?`,
    description: "The current image will be removed.",
    confirmLabel: "Remove image",
  };
}

export function groupJoinRequestMeta(
  request: Pick<GroupJoinRequestData, "createdAt" | "source" | "invitedBy">,
  communityName: string | null,
  now?: Date,
) {
  const when = formatPastDay(request.createdAt, now);
  if (request.source === "invite_link") {
    return request.invitedBy
      ? `Via invite link from ${request.invitedBy.name}, ${when}`
      : `Via invite link, ${when}`;
  }
  if (request.source === "community") {
    return `Found the Group in ${communityName ?? "the Community"}, ${when}`;
  }
  return formatRequestedAt(request.createdAt, now);
}

export function groupJoinRequestsBannerText(count: number) {
  return count === 1
    ? "1 person wants to join"
    : `${count} people want to join`;
}

export function groupJoinRequestsHeading(count: number) {
  return count === 1 ? "1 wants to join" : `${count} want to join`;
}

export const GROUP_JOIN_REQUESTS_REVIEW_LABEL = "Review";

export const GROUP_JOIN_POLICY_CHANGE_LABEL = "Change";

export function groupJoinPolicyLine(requiresApproval: boolean) {
  return requiresApproval
    ? "Organizers approve new members"
    : "Anyone with the link can join";
}

/** The one-line card that stands in for the requests list when it is empty. */
export function groupJoinRequestsSummary(input: {
  requiresApproval: boolean;
  approvedToday: number;
}) {
  if (!input.requiresApproval) {
    return {
      title: "Anyone with the link can join",
      line: "Joins instantly, no review",
    };
  }
  return {
    title: "No requests waiting",
    line:
      input.approvedToday > 0
        ? `Organizers approve new members, ${input.approvedToday} approved today`
        : "Organizers approve new members",
  };
}

export const GROUP_WHO_CAN_JOIN = {
  title: "Who can join",
  approve: {
    title: "Organizers approve",
    description: "Requests wait on the Members tab until you decide.",
  },
  open: {
    title: "Anyone with the link",
    description:
      "They join instantly. Pending requests are not admitted automatically.",
  },
  doneLabel: "Done",
} as const;

export function groupWhoCanJoinDescription(communityName: string | null) {
  return communityName
    ? `Applies to the invite link and to people who find the Group in ${communityName}.`
    : "Applies to the invite link and to people who find the Group.";
}

export function groupRejectRequestCopy(name: string) {
  return {
    title: `Reject ${name}?`,
    description:
      "They are not notified and can request again. Reject and block stops further requests.",
    rejectLabel: "Reject request",
    blockLabel: "Reject and block",
    cancelLabel: "Cancel",
  };
}

export type GroupJoinRequestDecision = "approved" | "rejected" | "blocked";

export function groupJoinRequestDecidedToast(
  name: string,
  decision: GroupJoinRequestDecision,
) {
  if (decision === "approved") {
    return `${name} added to the Group`;
  }
  return decision === "blocked"
    ? `${name} rejected and blocked`
    : `${name} rejected`;
}

export const GROUP_JOIN_REQUEST_UNDO_LABEL = "Undo";

export const GROUP_JOIN_NOTE_MAX_LENGTH = 280;

export const GROUP_REQUEST_JOIN_SHEET = {
  title: "Request to join",
  description:
    "Organizers approve new members. A short note helps them place you.",
  notePlaceholder: "Add a note (optional)",
  submitLabel: "Send request",
} as const;

export type GroupManageAction = "change_image" | "remove_image" | "delete";

export function groupManageActions(input: {
  canManageImage: boolean;
  imageUrl: string | null;
  canDelete: boolean;
}): GroupManageAction[] {
  const actions: GroupManageAction[] = [];
  if (input.canManageImage) {
    actions.push("change_image");
    if (input.imageUrl) {
      actions.push("remove_image");
    }
  }
  if (input.canDelete) {
    actions.push("delete");
  }
  return actions;
}
