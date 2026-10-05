import { requestRowMeta } from "./request-meta";

export const GROUP_REQUIRE_APPROVAL_LABEL = "Require approval";

export const GROUP_REQUIRE_APPROVAL_HELP =
  "When on, people request to join and you decide on this tab. Turning it off does not admit pending requests.";

export const GROUP_REQUESTS_TITLE = "Requests";

export const GROUP_REQUESTS_DESCRIPTION =
  "Approve to admit as a Group member, reject to refuse (they may re-request), or leave pending.";

export const GROUP_REQUESTS_ERROR_TITLE = "Join requests could not be loaded";

export const GROUP_REQUESTS_EMPTY = {
  title: "No pending requests",
  description: "Group join requests will show up here.",
};

export const GROUP_REQUEST_APPROVED_TOAST = "Request approved";

export const GROUP_REQUEST_REJECTED_TOAST = "Request rejected";

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
  request: { createdAt: Date | string; isCommunityMember: boolean | null },
  communityName: string | null,
  now?: Date,
) {
  return requestRowMeta(
    request.createdAt,
    [
      request.isCommunityMember === false
        ? `Not yet a ${communityName ?? "Community"} Member`
        : null,
    ],
    now,
  );
}

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
