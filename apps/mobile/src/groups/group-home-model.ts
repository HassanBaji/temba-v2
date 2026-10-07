import type {
  GroupHomeData,
  GroupLeaderboardEntryData,
  GroupPlayedGameData,
} from "@repo/domain/group-data";
import {
  filterGroupMembersByName,
  groupHomeMetaLine,
  groupHomeShowsMemberSearch,
  groupMemberFormMarks,
  groupMemberRoleCaption,
  groupPlayedMarkVariant,
  groupPlayedOpponentLine,
  groupPlayedScoreLine,
  groupPlayedTeamLabel,
  groupStandingRecordLabel,
  levelCellView,
  type LevelCellView,
} from "@repo/domain/group-home-chrome";
import {
  groupDisplayName,
  groupHomeBanner,
  groupHomeCanJoin,
  groupHomeJoinDoor,
  groupJoinDisabled,
  groupJoinLabel,
  type GroupHomeBanner,
  type GroupJoinDoor,
} from "@repo/domain/group-join";
import {
  levelOverrideCaption,
  levelOverrideReasonLabel,
} from "@repo/domain/level-slider";
import { displayLabelFromStoredBand } from "@repo/domain/level-bands";
import type { FormMark } from "@repo/domain/member-form-marks";
import type { ResultMarkVariant } from "@repo/domain/result-mark";
import { RESULT_MARK_LABEL } from "@repo/domain/result-mark";

import { mediaUrl } from "../lib/media-url";

export type GroupHomeHeader = {
  name: string;
  imageUri: string | null;
  meta: string;
};

export function groupHomeHeader(
  data: GroupHomeData,
  apiOrigin: string,
): GroupHomeHeader {
  return {
    name: groupDisplayName(data.name),
    imageUri: mediaUrl(data.imageUrl, apiOrigin),
    meta: groupHomeMetaLine({
      sport: data.sport,
      memberCount: data.standing.memberCount,
      createdAt: data.createdAt,
    }),
  };
}

export type GroupJoinCta = {
  label: string;
  disabled: boolean;
  door: GroupJoinDoor | null;
};

export function groupJoinCta(
  data: GroupHomeData,
  pending: boolean,
): GroupJoinCta | null {
  if (!groupHomeCanJoin(data.joinMode)) {
    return null;
  }
  return {
    label: groupJoinLabel(data.joinMode, pending, "home"),
    disabled: groupJoinDisabled(data.joinMode, pending),
    door: groupHomeJoinDoor(data),
  };
}

export function groupBanner(data: GroupHomeData): GroupHomeBanner | null {
  return groupHomeBanner({
    isCommunityArchived: data.isCommunityArchived,
    hasCommunityMembership: data.communityMembership != null,
    communityId: data.communityId,
    communityName: data.community?.name ?? null,
    joinMode: data.joinMode,
  });
}

export type StandingRowView = {
  key: string;
  position: number;
  name: string;
  record: string;
  level: LevelCellView;
  isViewer: boolean;
  accessibilityLabel: string;
};

export function standingRowView(
  entry: GroupLeaderboardEntryData,
): StandingRowView {
  const name = entry.isViewer ? "You" : (entry.name ?? "Member");
  const record = groupStandingRecordLabel(entry.wins, entry.losses);
  const level = levelCellView(entry.levelBand, entry.levelProvisional);
  return {
    key: entry.userId,
    position: entry.position,
    name,
    record,
    level,
    isViewer: entry.isViewer,
    accessibilityLabel: `${entry.position}. ${name}. ${record} wins and losses. ${
      level.kind === "label"
        ? `Level ${level.label}`
        : "Level still Provisional"
    }`,
  };
}

export const LEVEL_PROVISIONAL_NOTE =
  "Hatched level means the Rating is still Provisional";

export function standingStats(data: GroupHomeData) {
  return [
    { value: data.totalGamesPlayed, label: "games played" },
    { value: data.standing.awaitingScoreCount, label: "awaiting score" },
  ];
}

export const STANDING_NOT_MEMBER_COPY = {
  title: "Join to see your Standing",
  description: "Join this Group to get a Standing among its members.",
};

export const STANDING_NO_RESULTS_COPY = {
  title: "Standings appear after the first result",
  description: null,
};

export type PlayedTrailing =
  | { kind: "cancelled" }
  | { kind: "score"; text: string }
  | { kind: "enter" };

export type PlayedRowView = {
  id: string;
  mark: ResultMarkVariant;
  title: string;
  subtitle: string;
  trailing: PlayedTrailing;
  accessibilityLabel: string;
};

export function playedRowView(game: GroupPlayedGameData): PlayedRowView {
  const viewerMembers =
    game.viewerSlot === 2 ? game.slot2Members : game.slot1Members;
  const otherMembers =
    game.viewerSlot === 2 ? game.slot1Members : game.slot2Members;
  const mark = groupPlayedMarkVariant(game.outcome);
  const title = groupPlayedTeamLabel(viewerMembers);
  const subtitle = groupPlayedOpponentLine(otherMembers, game.displayTime);
  const scoreLine = groupPlayedScoreLine(game.scoredSets, game.viewerSlot);
  const trailing: PlayedTrailing = game.cancelled
    ? { kind: "cancelled" }
    : scoreLine
      ? { kind: "score", text: scoreLine }
      : { kind: "enter" };
  const trailingLabel =
    trailing.kind === "cancelled"
      ? "Cancelled"
      : trailing.kind === "score"
        ? trailing.text
        : "No score yet, enter it";
  return {
    id: game.id,
    mark,
    title,
    subtitle,
    trailing,
    accessibilityLabel: `${RESULT_MARK_LABEL[mark]}. ${title}. ${subtitle}. ${trailingLabel}`,
  };
}

export const PLAYED_EMPTY_COPY = "No Game history yet.";
export const SCHEDULED_EMPTY_COPY =
  "No upcoming Games scheduled for this Group.";
export const GAMES_EMPTY_TITLE = "No Games yet";
export const MEMBERS_EMPTY_COPY = {
  title: "No members yet",
  description: "People who join this Group will show up here.",
};
export const MEMBERS_NO_MATCH_COPY = "No members match that name.";

export const MEMBERS_SET_LEVEL_HINT =
  "Select a member to set their Level. Hatched Levels are still Provisional.";

export type MemberRowView = {
  key: string;
  name: string;
  imageUri: string | null;
  isViewer: boolean;
  caption: string | null;
  formMarks: FormMark[];
  level: LevelCellView;
  levelText: string | null;
  selectable: boolean;
  accessibilityLabel: string;
};

function levelSpokenLabel(view: LevelCellView, levelText: string | null) {
  if (view.kind === "label") {
    return `Level ${levelText ? `${view.label} ${levelText}` : view.label}`;
  }
  return view.label && levelText
    ? `Level ${view.label} ${levelText}, still Provisional`
    : "Level still Provisional";
}

export function memberRowView(
  entry: GroupLeaderboardEntryData,
  apiOrigin: string,
  canSetLevel = false,
): MemberRowView {
  const name = entry.name ?? "Member";
  const caption = [
    groupMemberRoleCaption(entry),
    canSetLevel && entry.levelOverride
      ? levelOverrideCaption(entry.levelOverride)
      : null,
  ]
    .filter(Boolean)
    .join(" · ");
  const level = levelCellView(entry.levelBand, entry.levelProvisional);
  return {
    key: entry.userId,
    name,
    imageUri: mediaUrl(entry.image, apiOrigin),
    isViewer: entry.isViewer,
    caption: caption || null,
    formMarks: groupMemberFormMarks(entry.formMarks),
    level,
    levelText: entry.level,
    selectable: canSetLevel && !entry.isViewer,
    accessibilityLabel: [
      entry.isViewer ? `${name}, you` : name,
      caption || null,
      levelSpokenLabel(level, entry.level),
    ]
      .filter(Boolean)
      .join(". "),
  };
}

export function memberList(
  leaderboard: readonly GroupLeaderboardEntryData[],
  query: string,
  apiOrigin: string,
  canSetLevel = false,
) {
  const members = leaderboard.map((entry) =>
    memberRowView(entry, apiOrigin, canSetLevel),
  );
  const showSearch = groupHomeShowsMemberSearch(members.length);
  return {
    showSearch,
    rows: showSearch ? filterGroupMembersByName(members, query) : members,
    isEmpty: members.length === 0,
  };
}

export type MemberSheetView = {
  name: string;
  summary: string;
  letter: string | null;
  level: string | null;
  provisionalNote: string | null;
  latestSet: string | null;
};

export function firstName(name: string) {
  return name.trim().split(/\s+/)[0] ?? name;
}

function matchCountLabel(count: number) {
  return `${count} Rated ${count === 1 ? "Match" : "Matches"}`;
}

export function memberSheetView(
  entry: GroupLeaderboardEntryData,
): MemberSheetView {
  const name = entry.name ?? "Member";
  const override = entry.levelOverride;
  const reason = override?.reason
    ? `. ${levelOverrideReasonLabel(override.reason)}`
    : "";
  return {
    name,
    summary: [
      override ? levelOverrideCaption(override) : null,
      matchCountLabel(entry.ratedMatchCount),
    ]
      .filter(Boolean)
      .join(" · "),
    letter: entry.levelBand
      ? displayLabelFromStoredBand(entry.levelBand)
      : null,
    level: entry.level,
    provisionalNote: entry.levelProvisional
      ? `This Level is still Provisional. Set it by hand if you know ${firstName(name)} plays at a different Level.`
      : null,
    latestSet: override ? `${levelOverrideCaption(override)}${reason}` : null,
  };
}
