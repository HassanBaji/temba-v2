import type {
  GroupHomeData,
  GroupLeaderboardEntryData,
  GroupPlayedGameData,
  GroupStandingRowData,
} from "@repo/domain/group-data";
import {
  filterGroupMembersByName,
  groupHomeMetaLine,
  groupHomeShowsMemberSearch,
  groupPlayedMarkVariant,
  groupPlayedOpponentLine,
  groupPlayedScoreLine,
  groupPlayedTeamLabel,
  levelCellView,
  type LevelCellView,
  groupMemberOrganizerAction,
  groupMemberIsRemovable,
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
  groupMemberTableCaption,
  sortGroupMembers,
} from "@repo/domain/group-members-table";
import {
  levelOverrideCaption,
  levelOverrideReasonLabel,
} from "@repo/domain/level-slider";
import { displayLabelFromStoredBand } from "@repo/domain/level-bands";
import { NOT_ON_TEMBA_YET_LABEL } from "@repo/domain/add-player-by-phone";
import type { ResultMarkVariant } from "@repo/domain/result-mark";
import { RESULT_MARK_LABEL } from "@repo/domain/result-mark";
import { paddedForm, standingRecordLabel } from "@repo/domain/season-standing";

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
  position: number | null;
  ranked: boolean;
  name: string;
  played: number;
  wins: number;
  draws: number;
  losses: number;
  points: number;
  form: ResultMarkVariant[];
  isViewer: boolean;
  unclaimed: boolean;
  accessibilityLabel: string;
};

export function standingRowView(entry: GroupStandingRowData): StandingRowView {
  const name = entry.isViewer ? "You" : (entry.name ?? "Member");
  return {
    key: entry.userId,
    position: entry.position,
    ranked: entry.ranked,
    name,
    played: entry.played,
    wins: entry.wins,
    draws: entry.draws,
    losses: entry.losses,
    points: entry.points,
    form: paddedForm(entry.form),
    isViewer: entry.isViewer,
    unclaimed: entry.unclaimed,
    accessibilityLabel: `${entry.ranked ? `${entry.position}. ` : "Unranked. "}${name}${
      entry.unclaimed ? `, ${NOT_ON_TEMBA_YET_LABEL}` : ""
    }. ${entry.played} played, ${standingRecordLabel(entry)} won drawn lost, ${entry.points} points.`,
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
export type MemberRowView = {
  key: string;
  name: string;
  imageUri: string | null;
  isViewer: boolean;
  unclaimed: boolean;
  caption: string | null;
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

export function memberIsRemovable(
  entry: GroupLeaderboardEntryData,
  canRemovePlayers: boolean,
) {
  return canRemovePlayers && groupMemberIsRemovable(entry);
}

export function memberOrganizerAction(
  entry: GroupLeaderboardEntryData,
  canAppointOrganizers: boolean,
) {
  return canAppointOrganizers ? groupMemberOrganizerAction(entry) : null;
}

export function memberRowView(
  entry: GroupLeaderboardEntryData,
  apiOrigin: string,
  canSetLevel = false,
  canRemovePlayers = false,
  canAppointOrganizers = false,
): MemberRowView {
  const name = entry.name ?? "Member";
  const caption = [
    groupMemberTableCaption(entry),
    entry.phoneMasked,
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
    unclaimed: entry.unclaimed,
    caption: caption || null,
    level,
    levelText: entry.level,
    selectable:
      (canSetLevel && !entry.isViewer) ||
      memberIsRemovable(entry, canRemovePlayers) ||
      memberOrganizerAction(entry, canAppointOrganizers) != null,
    accessibilityLabel: [
      entry.isViewer ? `${name}, you` : name,
      entry.unclaimed ? NOT_ON_TEMBA_YET_LABEL : null,
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
  canRemovePlayers = false,
  canAppointOrganizers = false,
) {
  const members = sortGroupMembers(leaderboard).map((entry) =>
    memberRowView(
      entry,
      apiOrigin,
      canSetLevel,
      canRemovePlayers,
      canAppointOrganizers,
    ),
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
  imageUri: string | null;
  caption: string | null;
  unclaimed: boolean;
  phoneMasked: string | null;
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
  apiOrigin = "",
): MemberSheetView {
  const name = entry.name ?? "Member";
  const override = entry.levelOverride;
  const reason = override?.reason
    ? `. ${levelOverrideReasonLabel(override.reason)}`
    : "";
  return {
    name,
    imageUri: mediaUrl(entry.image, apiOrigin),
    caption: groupMemberTableCaption(entry),
    unclaimed: entry.unclaimed,
    phoneMasked: entry.phoneMasked,
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
