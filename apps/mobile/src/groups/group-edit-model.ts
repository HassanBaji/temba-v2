import type { GroupHomeData } from "@repo/domain/group-data";
import {
  GROUP_EDIT_COPY,
  groupEditMetaLine,
  type GroupEditFields,
} from "@repo/domain/group-settings";
import { isSport, sportLabel } from "@repo/domain/sport";

export function groupEditPath(groupId: string) {
  return { pathname: "/groups/edit", params: { groupId } } as const;
}

export function groupEditInitialFields(data: GroupHomeData): GroupEditFields {
  return {
    name: data.name ?? "",
    sport: isSport(data.sport) ? data.sport : null,
    visibility: data.type === "private" ? "private" : "public",
    requiresApproval: data.requiresApproval,
  };
}

export function groupEditSubtitle(data: GroupHomeData) {
  return groupEditMetaLine({
    name: data.name,
    sportLabel: sportLabel(data.sport),
    memberCount: data.standing.memberCount,
  });
}

export function groupEditSaveFooter(dirty: boolean) {
  return dirty ? null : GROUP_EDIT_COPY.nothingChanged;
}

export const GROUP_EDIT_NOT_FOUND_COPY = {
  title: "Group not found",
  description: "It may have been deleted, or you may not be able to edit it.",
};

export const GROUP_EDIT_FORBIDDEN_COPY = {
  title: "Only the owner can edit this Group",
  description: "Ask the Group owner to change its settings.",
};
