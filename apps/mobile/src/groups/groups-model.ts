import type {
  GroupMineRowData,
  GroupPublicRowData,
} from "@repo/domain/group-data";
import {
  groupDisplayName,
  groupJoinDisabled,
  groupJoinLabel,
  publicGroupJoinDoor,
  publicGroupMetaLine,
  type GroupJoinDoor,
} from "@repo/domain/group-join";
import {
  groupNextGameWeekday,
  groupRowMetaLine,
} from "@repo/domain/groups-list";
import { memberCountLabel } from "@repo/domain/member-count-label";
import type { FormMark } from "@repo/domain/member-form-marks";

import { mediaUrl } from "../lib/media-url";

export type GroupsTab = "mine" | "public";

export function groupPath(groupId: string) {
  return `/groups/${groupId}`;
}

export type GroupRowView = {
  id: string;
  name: string;
  imageUri: string | null;
  meta: string;
  nextGameWeekday: string | null;
  formMarks: FormMark[];
  accessibilityLabel: string;
};

export function groupRowView(
  row: GroupMineRowData,
  apiOrigin: string,
): GroupRowView {
  const name = groupDisplayName(row.name);
  const meta = groupRowMetaLine({
    memberCount: row.memberCount,
    standingPosition: row.standingPosition,
  });
  const nextGameWeekday = row.nextGameStartTime
    ? groupNextGameWeekday(row.nextGameStartTime)
    : null;
  return {
    id: row.id,
    name,
    imageUri: mediaUrl(row.imageUrl, apiOrigin),
    meta,
    nextGameWeekday,
    formMarks: row.formMarks,
    accessibilityLabel: `${name}, ${meta}, ${
      nextGameWeekday ? `next Game ${nextGameWeekday}` : "no Game scheduled"
    }`,
  };
}

export type PublicGroupRowView = {
  id: string;
  name: string;
  imageUri: string | null;
  subtitle: string | null;
  meta: string;
  joinLabel: string;
  joinDisabled: boolean;
  joinOutlined: boolean;
  door: GroupJoinDoor | null;
};

export function publicGroupRowView(
  row: GroupPublicRowData,
  pendingGroupId: string | null,
  apiOrigin: string,
): PublicGroupRowView {
  const pending = pendingGroupId === row.id;
  return {
    id: row.id,
    name: groupDisplayName(row.name),
    imageUri: mediaUrl(row.imageUrl, apiOrigin),
    subtitle: row.communityName,
    meta: publicGroupMetaLine({
      memberCountLabel: memberCountLabel(row.memberCount),
      requiresApproval: row.requiresApproval,
    }),
    joinLabel: groupJoinLabel(row.joinMode, pending, "row"),
    joinDisabled: groupJoinDisabled(row.joinMode, pending),
    joinOutlined: row.joinMode !== "join",
    door: publicGroupJoinDoor(row),
  };
}

export function myGroupsEmptyCopy() {
  return {
    title: "No Groups yet",
    description: "Groups are where you play and where your Standing lives.",
  };
}

export function publicGroupsEmptyCopy() {
  return { title: "No public Groups to join right now", description: null };
}
