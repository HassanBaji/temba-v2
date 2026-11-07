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
import { sportLabel } from "@repo/domain/sport";
import { memberCountLabel } from "@repo/domain/member-count-label";
import type { FormMark } from "@repo/domain/member-form-marks";
import type { Locale } from "@repo/i18n/locale";
import { messagesFor } from "@repo/i18n/messages";

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
  locale: Locale,
): GroupRowView {
  const m = messagesFor(locale).mobileGroup.list;
  const name = groupDisplayName(row.name, locale);
  const meta = groupRowMetaLine({
    memberCount: row.memberCount,
    standingPosition: row.standingPosition,
    locale,
  });
  const nextGameWeekday = row.nextGameStartTime
    ? groupNextGameWeekday(row.nextGameStartTime, locale)
    : null;
  return {
    id: row.id,
    name,
    imageUri: mediaUrl(row.imageUrl, apiOrigin),
    meta,
    nextGameWeekday,
    formMarks: row.formMarks,
    accessibilityLabel: nextGameWeekday
      ? m.rowNextGame(name, meta, nextGameWeekday)
      : m.rowNoGame(name, meta),
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
  sport: string | null;
  sportLabel: string | null;
};

export function publicGroupRowView(
  row: GroupPublicRowData,
  pendingGroupId: string | null,
  apiOrigin: string,
  locale: Locale,
): PublicGroupRowView {
  const pending = pendingGroupId === row.id;
  return {
    id: row.id,
    name: groupDisplayName(row.name, locale),
    imageUri: mediaUrl(row.imageUrl, apiOrigin),
    subtitle: row.venueName,
    meta: publicGroupMetaLine({
      memberCountLabel: memberCountLabel(row.memberCount, locale),
      requiresApproval: row.requiresApproval,
      locale,
    }),
    joinLabel: groupJoinLabel(row.joinMode, pending, "row", locale),
    joinDisabled: groupJoinDisabled(row.joinMode, pending),
    joinOutlined: row.joinMode !== "join",
    door: publicGroupJoinDoor(row),
    sport: row.sport,
    sportLabel: sportLabel(row.sport, locale),
  };
}
