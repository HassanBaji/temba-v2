import type {
  GroupHomeData,
  GroupLeaderboardEntryData,
  GroupStandingRowData,
} from "@repo/domain/group-data";
import {
  groupHomeMetaLine,
  levelCellView,
  type LevelCellView,
  groupMemberOrganizerAction,
  groupMemberIsRemovable,
} from "@repo/domain/group-home-chrome";
import {
  groupDisplayName,
  groupHomeCanJoin,
  groupHomeJoinDoor,
  groupJoinDisabled,
  groupJoinLabel,
  type GroupJoinDoor,
} from "@repo/domain/group-join";
import {
  groupMemberSortCaption,
  groupMembersLens,
  groupMemberTableCaption,
  groupMemberTierView,
  type GroupMemberSort,
  type GroupMembersLensInput,
  type GroupMemberTierView,
} from "@repo/domain/group-members-table";
import {
  levelOverrideCaption,
  levelOverrideWhy,
} from "@repo/domain/level-slider";
import { displayLabelFromStoredBand } from "@repo/domain/level-bands";
import { formatE164 } from "@repo/domain/phone-number";
import type { ResultMarkVariant } from "@repo/domain/result-mark";
import { paddedForm, standingRecordLabel } from "@repo/domain/season-standing";
import { isolate } from "@repo/i18n/bidi";
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

export type StandingRowView = {
  key: string;
  position: number | null;
  ranked: boolean;
  name: string;
  /** `name` is this Group's Member nickname for them. */
  isNickname: boolean;
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
  const tembaName = entry.name ?? m.mobileGroup.unnamedMember;
  const nickname = entry.isViewer ? null : (entry.nickname?.name ?? null);
  const name = entry.isViewer ? m.common.you : (nickname ?? tembaName);
  const shownName = nickname
    ? m.group.nickname.spoken(nickname, tembaName)
    : name;
  const spokenName = entry.unclaimed
    ? m.mobileGroup.standing.nameNotOnTemba(shownName)
    : shownName;
  const record = standingRecordLabel(entry);
  return {
    key: entry.userId,
    position: entry.position,
    ranked: entry.ranked,
    name,
    isNickname: nickname != null,
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

export type MemberRowView = {
  key: string;
  /** The Member nickname when the viewer may see one, else the Temba name. */
  name: string;
  tembaName: string;
  nickname: string | null;
  imageUri: string | null;
  isViewer: boolean;
  unclaimed: boolean;
  caption: string | null;
  level: LevelCellView;
  levelText: string | null;
  /** Set on a tier Group's rows. */
  tier: GroupMemberTierView | null;
  selectable: boolean;
  accessibilityLabel: string;
};

/** The OVR face already carries its number; the Level face adds the Level. */
function levelSpokenLabel(
  view: LevelCellView,
  levelText: string | null,
  locale: Locale,
  carriesValue = false,
) {
  const m = messagesFor(locale).mobileGroup.members;
  if (view.kind === "label") {
    return m.levelSpoken(levelText ? `${view.label} ${levelText}` : view.label);
  }
  if (view.label && levelText) {
    return m.levelSpokenProvisional(`${view.label} ${levelText}`);
  }
  return view.label && carriesValue
    ? m.levelSpokenProvisional(view.label)
    : m.levelStillProvisional;
}

export function memberIsRemovable(
  entry: GroupLeaderboardEntryData,
  canRemovePlayers: boolean,
) {
  return canRemovePlayers && groupMemberIsRemovable(entry);
}

/** A Group approver is sent members' numbers; their own row has nothing to call. */
export function memberIsCallable(entry: GroupLeaderboardEntryData) {
  return !entry.isViewer && entry.phoneNumber != null;
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
  canAdjustTier = false,
  canSetNicknames = false,
): MemberRowView {
  const m = messagesFor(locale);
  const tembaName = entry.name ?? m.mobileGroup.unnamedMember;
  const nickname = entry.nickname?.name ?? null;
  const name = nickname ?? tembaName;
  const tier = groupMemberTierView(entry, locale);
  const details = [
    tier && sort === "tier"
      ? tier.caption
      : groupMemberSortCaption(entry, sort, locale),
    entry.phoneMasked ? isolate(entry.phoneMasked) : null,
    canSetLevel && entry.levelOverride
      ? levelOverrideCaption({ ...entry.levelOverride, locale })
      : null,
  ].filter(Boolean);
  const caption = [nickname ? tembaName : null, ...details]
    .filter(Boolean)
    .join(" · ");
  const spokenName = nickname
    ? m.group.nickname.spoken(nickname, tembaName)
    : name;
  const ovr = entry.ovr ?? null;
  const level = levelCellView(entry.levelBand, entry.levelProvisional, ovr);
  return {
    key: entry.userId,
    name,
    tembaName,
    nickname,
    imageUri: mediaUrl(entry.image, apiOrigin),
    isViewer: entry.isViewer,
    unclaimed: entry.unclaimed,
    caption: caption || null,
    level,
    levelText: entry.level,
    tier,
    selectable:
      (canSetLevel && !entry.isViewer) ||
      (canAdjustTier && entry.tier != null && !entry.isViewer) ||
      memberIsRemovable(entry, canRemovePlayers) ||
      memberOrganizerAction(entry, canAppointOrganizers) != null ||
      memberIsCallable(entry) ||
      canSetNicknames,
    accessibilityLabel: [
      entry.isViewer ? m.mobileGroup.members.rowYou(spokenName) : spokenName,
      entry.unclaimed ? m.group.addPlayer.notOnTembaYet : null,
      ...details,
      tier
        ? sort === "tier"
          ? tier.pointsSpoken
          : tier.spoken
        : ovr == null
          ? levelSpokenLabel(level, entry.level, locale)
          : levelSpokenLabel(level, null, locale, true),
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
  canAdjustTier = false,
  canSetNicknames = false,
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
        canAdjustTier,
        canSetNicknames,
      ),
    ),
  };
}

export type MemberSheetView = {
  name: string;
  nickname: string | null;
  imageUri: string | null;
  caption: string | null;
  unclaimed: boolean;
  phoneMasked: string | null;
  /** The full number, isolated for display, when the viewer may call. */
  phone: string | null;
  phoneHref: string | null;
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
  const callable = memberIsCallable(entry) ? entry.phoneNumber : null;
  return {
    name,
    nickname: entry.nickname?.name ?? null,
    imageUri: mediaUrl(entry.image, apiOrigin),
    caption: groupMemberTableCaption(entry, locale),
    unclaimed: entry.unclaimed,
    phoneMasked: entry.phoneMasked,
    phone: callable ? isolate(formatE164(callable)) : null,
    phoneHref: callable ? `tel:${callable}` : null,
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
    latestSet:
      caption && override
        ? m.members.latestSetWithReason(
            caption,
            levelOverrideWhy({ ...override, locale }),
          )
        : null,
  };
}
