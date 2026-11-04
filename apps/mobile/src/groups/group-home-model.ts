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
import {
  DEFAULT_FOOTBALL_BIBS,
  footballBibName,
  type FootballBib,
} from "@repo/domain/football-lineup";
import { formatDayMonth, formatMonth } from "@repo/domain/format-game-start";
import {
  GROUP_PLAYED_FILTERS,
  groupPlayedStatus,
  type GroupPlayedCounts,
  type GroupPlayedFilter,
  type GroupPlayedStatus,
} from "@repo/domain/group-played-filter";
import { shortPlayerName } from "@repo/domain/player-name";
import { zonedParts } from "@repo/domain/product-timezone";
import type { MatchOutcome, ResultMarkVariant } from "@repo/domain/result-mark";
import { resultMarkLabel } from "@repo/domain/result-mark";
import {
  paddedForm,
  standingRecordLabel,
  standingShowsDraws,
} from "@repo/domain/season-standing";
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

export type PlayedCell = { value: string; strong: boolean };

export type PlayedSide = {
  key: string;
  name: string;
  /** Football draws the side's bib swatch; padel names the pair. */
  bib: FootballBib | null;
  isViewerSide: boolean;
  strong: boolean;
  cells: PlayedCell[];
};

export type PlayedCardView = {
  id: string;
  status: GroupPlayedStatus;
  isFootball: boolean;
  title: string;
  whenLine: string;
  result: { mark: MatchOutcome; label: string } | null;
  sides: [PlayedSide, PlayedSide] | null;
  cancelledLine: string | null;
  accessibilityLabel: string;
};

const NO_SCORE = "–";

function pairName(
  members: readonly { name: string; isViewer: boolean }[],
  locale: Locale,
) {
  const m = messagesFor(locale);
  const names = [...members]
    .sort((left, right) => Number(right.isViewer) - Number(left.isViewer))
    .map((member) =>
      member.isViewer ? m.common.you : shortPlayerName(member.name),
    );
  if (names.length === 0) {
    return null;
  }
  return names.length === 2
    ? m.mobileGroup.games.pair(names[0]!, names[1]!)
    : names.join(m.group.metaSeparator);
}

function playedSides(
  game: GroupPlayedGameData,
  isFootball: boolean,
  status: GroupPlayedStatus,
  locale: Locale,
): [PlayedSide, PlayedSide] {
  const m = messagesFor(locale);
  const side = (index: 1 | 2): PlayedSide => {
    const isViewerSide = game.viewerSlot === index;
    const strong = game.viewerSlot == null || isViewerSide;
    const members = index === 1 ? game.slot1Members : game.slot2Members;
    const bib = index === 1 ? game.slot1Bib : game.slot2Bib;
    const ownGames = (set: GroupPlayedGameData["scoredSets"][number]) =>
      index === 1 ? set.slot1GamesWon : set.slot2GamesWon;
    const otherGames = (set: GroupPlayedGameData["scoredSets"][number]) =>
      index === 1 ? set.slot2GamesWon : set.slot1GamesWon;
    const scored = status === "finished";
    const cells: PlayedCell[] = !scored
      ? [{ value: NO_SCORE, strong: false }]
      : isFootball
        ? game.scoredSets
            .slice(0, 1)
            .map((set) => ({ value: String(ownGames(set)), strong }))
        : game.scoredSets.map((set) => ({
            value: String(ownGames(set)),
            strong: ownGames(set) > otherGames(set),
          }));
    return {
      key: `slot${index}`,
      name: isFootball
        ? footballBibName(bib, index, locale)
        : (pairName(members, locale) ?? m.group.home.openSeats),
      bib: isFootball ? (bib ?? DEFAULT_BIB[index]) : null,
      isViewerSide,
      strong,
      cells,
    };
  };
  const slot1 = side(1);
  const slot2 = side(2);
  return !isFootball && game.viewerSlot === 2 ? [slot2, slot1] : [slot1, slot2];
}

const DEFAULT_BIB = {
  1: DEFAULT_FOOTBALL_BIBS.slot1,
  2: DEFAULT_FOOTBALL_BIBS.slot2,
} as const;

function playedTitle(
  game: GroupPlayedGameData,
  sides: [PlayedSide, PlayedSide] | null,
  isFootball: boolean,
  locale: Locale,
) {
  const m = messagesFor(locale);
  if (game.hasCustomName && game.name) {
    return game.name;
  }
  const hasTeams =
    isFootball || game.slot1Members.length > 0 || game.slot2Members.length > 0;
  if (sides && hasTeams) {
    return m.mobileGroup.games.versus(sides[0].name, sides[1].name);
  }
  return game.name ?? game.venueName ?? m.mobileGroup.games.played;
}

export function playedCardView(
  game: GroupPlayedGameData,
  locale: Locale,
): PlayedCardView {
  const m = messagesFor(locale);
  const copy = m.mobileGroup.games;
  const status = groupPlayedStatus(game);
  const isFootball = game.sport === "football";
  const sides =
    status === "cancelled"
      ? null
      : playedSides(game, isFootball, status, locale);
  const title = playedTitle(game, sides, isFootball, locale);
  const place = isFootball
    ? game.venueName
    : (game.courtName ?? game.venueName);
  const whenLine = [
    formatDayMonth(game.displayTime, locale, { weekday: "short" }),
    place,
  ]
    .filter(Boolean)
    .join(m.group.metaSeparator);
  const result =
    status === "finished" && game.outcome
      ? { mark: game.outcome, label: resultMarkLabel(game.outcome, locale) }
      : null;
  const cancelledLine =
    status === "cancelled"
      ? [
          game.venueName,
          game.playersAllowed
            ? copy.joined(game.joinedCount, game.playersAllowed)
            : copy.joinedOpen(game.joinedCount),
        ]
          .filter(Boolean)
          .join(m.group.metaSeparator)
      : null;
  const statusLabel =
    status === "cancelled"
      ? copy.cancelled
      : status === "needs_score"
        ? copy.noScoreYet
        : result?.label;
  return {
    id: game.id,
    status,
    isFootball,
    title,
    whenLine,
    result,
    sides,
    cancelledLine,
    accessibilityLabel: copy.card(
      [
        title,
        whenLine,
        statusLabel,
        ...(status === "finished" && sides
          ? sides.map((side) =>
              copy.sideSpoken(
                side.isViewerSide ? `${side.name}, ${copy.you}` : side.name,
                side.cells.map((cell) => cell.value).join(" "),
              ),
            )
          : []),
        cancelledLine,
      ].filter((part): part is string => Boolean(part)),
    ),
  };
}

export type PlayedListItem =
  | { kind: "month"; key: string; label: string; count: string }
  | { kind: "game"; key: string; card: PlayedCardView };

/** The Played cards under a header per month, newest first as the server sends them. */
export function playedListItems(
  games: readonly GroupPlayedGameData[],
  locale: Locale,
  now = new Date(),
): PlayedListItem[] {
  const copy = messagesFor(locale).mobileGroup.games;
  const thisYear = zonedParts(now).year;
  const items: PlayedListItem[] = [];
  let currentKey: string | null = null;
  let header: Extract<PlayedListItem, { kind: "month" }> | null = null;
  let count = 0;
  for (const game of games) {
    const date = new Date(game.displayTime);
    const { year, month } = zonedParts(date);
    const key = `${year}-${month}`;
    if (key !== currentKey) {
      if (header) {
        header.count = copy.monthCount(count);
      }
      currentKey = key;
      count = 0;
      const monthName = formatMonth(date, "long", locale);
      header = {
        kind: "month",
        key: `month-${key}`,
        label: year === thisYear ? monthName : `${monthName} ${year}`,
        count: "",
      };
      items.push(header);
    }
    count += 1;
    items.push({
      kind: "game",
      key: game.id,
      card: playedCardView(game, locale),
    });
  }
  if (header) {
    header.count = copy.monthCount(count);
  }
  return items;
}

export type PlayedFilterChip = {
  filter: GroupPlayedFilter;
  label: string;
  count: string;
  selected: boolean;
  /** Games waiting on a score get a dot while another filter is on. */
  dot: boolean;
  accessibilityLabel: string;
};

export function playedFilterChips(
  counts: GroupPlayedCounts,
  selected: GroupPlayedFilter,
  locale: Locale,
): PlayedFilterChip[] {
  const copy = messagesFor(locale).mobileGroup.games;
  return GROUP_PLAYED_FILTERS.map((filter) => ({
    filter,
    label: copy.filters[filter],
    count: String(counts[filter]),
    selected: filter === selected,
    dot: filter === "needs_score" && filter !== selected && counts[filter] > 0,
    accessibilityLabel: copy.filterSpoken(copy.filters[filter], counts[filter]),
  }));
}

export function playedRecordLine(
  counts: GroupPlayedCounts,
  sport: string | null,
  locale: Locale,
) {
  const copy = messagesFor(locale).mobileGroup.games;
  const { wins, draws, losses } = counts.record;
  if (wins + draws + losses === 0) {
    return null;
  }
  const shownDraws = standingShowsDraws(sport, [{ draws }]) ? draws : null;
  return {
    text: copy.record(wins, shownDraws, losses),
    accessibilityLabel: copy.recordSpoken(wins, shownDraws, losses),
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
): MemberRowView {
  const m = messagesFor(locale);
  const name = entry.name ?? m.mobileGroup.unnamedMember;
  const caption = [
    groupMemberTableCaption(entry, locale),
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

export function memberList(
  leaderboard: readonly GroupLeaderboardEntryData[],
  query: string,
  apiOrigin: string,
  locale: Locale,
  canSetLevel = false,
  canRemovePlayers = false,
  canAppointOrganizers = false,
) {
  const members = sortGroupMembers(leaderboard).map((entry) =>
    memberRowView(
      entry,
      apiOrigin,
      locale,
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
