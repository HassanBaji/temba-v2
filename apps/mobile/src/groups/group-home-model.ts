import type {
  GroupHomeData,
  GroupLeaderboardEntryData,
  GroupPlayedGameData,
  GroupStandingRowData,
} from "@repo/domain/group-data";
import {
  groupHomeMetaLine,
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
  groupMemberSortCaption,
  groupMembersLens,
  groupMemberTableCaption,
  type GroupMemberSort,
  type GroupMembersLensInput,
} from "@repo/domain/group-members-table";
import {
  levelOverrideCaption,
  levelOverrideReasonLabel,
} from "@repo/domain/level-slider";
import { displayLabelFromStoredBand } from "@repo/domain/level-bands";
import type { ResultMarkVariant } from "@repo/domain/result-mark";
import { resultMarkLabel } from "@repo/domain/result-mark";
import { paddedForm, standingRecordLabel } from "@repo/domain/season-standing";
import type { Locale } from "@repo/i18n/locale";
import { messagesFor } from "@repo/i18n/messages";

import { mediaUrl } from "../lib/media-url";

export type GroupHomeHeader = {
  name: string;
  imageUri: string | null;
  meta: string;
};

export function groupHomeHeader(
  data: GroupHomeData,
  apiOrigin: string,
  locale: Locale,
): GroupHomeHeader {
  return {
    name: groupDisplayName(data.name, locale),
    imageUri: mediaUrl(data.imageUrl, apiOrigin),
    meta: groupHomeMetaLine({
      sport: data.sport,
      memberCount: data.standing.memberCount,
      createdAt: data.createdAt,
      locale,
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
  locale: Locale,
): GroupJoinCta | null {
  if (!groupHomeCanJoin(data.joinMode)) {
    return null;
  }
  return {
    label: groupJoinLabel(data.joinMode, pending, "home", locale),
    disabled: groupJoinDisabled(data.joinMode, pending),
    door: groupHomeJoinDoor(data),
  };
}

export function groupBanner(
  data: GroupHomeData,
  locale: Locale,
): GroupHomeBanner | null {
  return groupHomeBanner({
    isCommunityArchived: data.isCommunityArchived,
    hasCommunityMembership: data.communityMembership != null,
    communityId: data.communityId,
    communityName: data.community?.name ?? null,
    joinMode: data.joinMode,
    locale,
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

export function standingRowView(
  entry: GroupStandingRowData,
  locale: Locale,
): StandingRowView {
  const m = messagesFor(locale);
  const name = entry.isViewer
    ? m.common.you
    : (entry.name ?? m.mobileGroup.unnamedMember);
  const spokenName = entry.unclaimed
    ? m.mobileGroup.standing.nameNotOnTemba(name)
    : name;
  const record = standingRecordLabel(entry);
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
    accessibilityLabel: entry.ranked
      ? m.mobileGroup.standing.rankedRow(
          entry.position ?? 0,
          spokenName,
          entry.played,
          record,
          entry.points,
        )
      : m.mobileGroup.standing.unrankedRow(
          spokenName,
          entry.played,
          record,
          entry.points,
        ),
  };
}

export function standingStats(data: GroupHomeData, locale: Locale) {
  const m = messagesFor(locale).mobileGroup.standing.stats;
  return [
    { value: data.totalGamesPlayed, label: m.gamesPlayed },
    { value: data.standing.awaitingScoreCount, label: m.awaitingScore },
  ];
}

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

export function playedRowView(
  game: GroupPlayedGameData,
  locale: Locale,
): PlayedRowView {
  const m = messagesFor(locale).mobileGroup.games;
  const viewerMembers =
    game.viewerSlot === 2 ? game.slot2Members : game.slot1Members;
  const otherMembers =
    game.viewerSlot === 2 ? game.slot1Members : game.slot2Members;
  const mark = groupPlayedMarkVariant(game.outcome);
  const title = groupPlayedTeamLabel(viewerMembers, locale);
  const subtitle = groupPlayedOpponentLine(
    otherMembers,
    game.displayTime,
    locale,
  );
  const scoreLine = groupPlayedScoreLine(game.scoredSets, game.viewerSlot);
  const trailing: PlayedTrailing = game.cancelled
    ? { kind: "cancelled" }
    : scoreLine
      ? { kind: "score", text: scoreLine }
      : { kind: "enter" };
  const trailingLabel =
    trailing.kind === "cancelled"
      ? m.cancelled
      : trailing.kind === "score"
        ? trailing.text
        : m.noScoreYet;
  return {
    id: game.id,
    mark,
    title,
    subtitle,
    trailing,
    accessibilityLabel: m.row(
      resultMarkLabel(mark, locale),
      title,
      subtitle,
      trailingLabel,
    ),
  };
}

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

function levelSpokenLabel(
  view: LevelCellView,
  levelText: string | null,
  locale: Locale,
) {
  const m = messagesFor(locale).mobileGroup.members;
  if (view.kind === "label") {
    return m.levelSpoken(levelText ? `${view.label} ${levelText}` : view.label);
  }
  return view.label && levelText
    ? m.levelSpokenProvisional(`${view.label} ${levelText}`)
    : m.levelStillProvisional;
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
  locale: Locale,
  canSetLevel = false,
  canRemovePlayers = false,
  canAppointOrganizers = false,
  sort: GroupMemberSort = "level",
): MemberRowView {
  const m = messagesFor(locale);
  const name = entry.name ?? m.mobileGroup.unnamedMember;
  const caption = [
    groupMemberSortCaption(entry, sort, locale),
    entry.phoneMasked,
    canSetLevel && entry.levelOverride
      ? levelOverrideCaption({ ...entry.levelOverride, locale })
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
      entry.isViewer ? m.mobileGroup.members.rowYou(name) : name,
      entry.unclaimed ? m.group.addPlayer.notOnTembaYet : null,
      caption || null,
      levelSpokenLabel(level, entry.level, locale),
    ]
      .filter(Boolean)
      .join(". "),
  };
}

/** The sort and filter a viewer picked; `null` means the default. */
export type MemberLens = Omit<GroupMembersLensInput, "query" | "locale">;

const LEVEL_ORDER: MemberLens = {
  sort: "level",
  filter: "all",
  showLevel: true,
  canManage: false,
  now: new Date(0),
};

export function memberList(
  leaderboard: readonly GroupLeaderboardEntryData[],
  query: string,
  apiOrigin: string,
  locale: Locale,
  canSetLevel = false,
  canRemovePlayers = false,
  canAppointOrganizers = false,
  lens: MemberLens = LEVEL_ORDER,
) {
  const unnamed = messagesFor(locale).mobileGroup.unnamedMember;
  const view = groupMembersLens(
    leaderboard.map((entry) => ({ ...entry, name: entry.name ?? unnamed })),
    { ...lens, query, locale },
  );
  return {
    ...view,
    showSearch: view.showControls,
    isEmpty: leaderboard.length === 0,
    rows: view.rows.map((entry) =>
      memberRowView(
        entry,
        apiOrigin,
        locale,
        canSetLevel,
        canRemovePlayers,
        canAppointOrganizers,
        view.sort,
      ),
    ),
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

export function memberSheetView(
  entry: GroupLeaderboardEntryData,
  locale: Locale,
  apiOrigin = "",
): MemberSheetView {
  const m = messagesFor(locale).mobileGroup;
  const name = entry.name ?? m.unnamedMember;
  const override = entry.levelOverride;
  const caption = override
    ? levelOverrideCaption({ ...override, locale })
    : null;
  return {
    name,
    imageUri: mediaUrl(entry.image, apiOrigin),
    caption: groupMemberTableCaption(entry, locale),
    unclaimed: entry.unclaimed,
    phoneMasked: entry.phoneMasked,
    summary: [caption, m.members.ratedMatches(entry.ratedMatchCount)]
      .filter(Boolean)
      .join(" · "),
    letter: entry.levelBand
      ? displayLabelFromStoredBand(entry.levelBand)
      : null,
    level: entry.level,
    provisionalNote: entry.levelProvisional
      ? m.members.provisionalNote(firstName(name))
      : null,
    latestSet: caption
      ? override?.reason
        ? m.members.latestSetWithReason(
            caption,
            levelOverrideReasonLabel(override.reason, locale),
          )
        : caption
      : null,
  };
}
