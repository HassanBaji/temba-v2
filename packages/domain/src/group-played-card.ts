/**
 * The Group Games tab Played cards (design "Group games 1d"), shared by the
 * web and mobile Apps: a title that falls back to the team names, goals per
 * bib for football, games per set for padel, month headers, the filter chips
 * and the viewer's record.
 */

import type { Locale } from "@repo/i18n/locale";
import { messagesFor } from "@repo/i18n/messages";

import {
  DEFAULT_FOOTBALL_BIBS,
  footballBibName,
  type FootballBib,
} from "./football-lineup";
import { formatDayMonth, formatMonth } from "./format-game-start";
import type { GroupPlayedGameData } from "./group-data";
import {
  GROUP_PLAYED_FILTERS,
  groupPlayedStatus,
  type GroupPlayedCounts,
  type GroupPlayedFilter,
  type GroupPlayedStatus,
} from "./group-played-filter";
import { shortPlayerName } from "./player-name";
import { zonedParts } from "./product-timezone";
import { resultMarkLabel, type MatchOutcome } from "./result-mark";
import { standingShowsDraws } from "./season-standing";

export type GroupPlayedCell = { value: string; strong: boolean };

export type GroupPlayedSide = {
  key: string;
  name: string;
  /** Football draws the side's bib swatch; padel names the pair. */
  bib: FootballBib | null;
  isViewerSide: boolean;
  strong: boolean;
  cells: GroupPlayedCell[];
};

export type GroupPlayedCard = {
  id: string;
  status: GroupPlayedStatus;
  isFootball: boolean;
  title: string;
  whenLine: string;
  result: { mark: MatchOutcome; label: string } | null;
  sides: [GroupPlayedSide, GroupPlayedSide] | null;
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
    ? m.group.played.pair(names[0]!, names[1]!)
    : names.join(m.group.metaSeparator);
}

function playedSides(
  game: GroupPlayedGameData,
  isFootball: boolean,
  status: GroupPlayedStatus,
  locale: Locale,
): [GroupPlayedSide, GroupPlayedSide] {
  const m = messagesFor(locale);
  const side = (index: 1 | 2): GroupPlayedSide => {
    const isViewerSide = game.viewerSlot === index;
    const strong = game.viewerSlot == null || isViewerSide;
    const members = index === 1 ? game.slot1Members : game.slot2Members;
    const bib = index === 1 ? game.slot1Bib : game.slot2Bib;
    const ownGames = (set: GroupPlayedGameData["scoredSets"][number]) =>
      index === 1 ? set.slot1GamesWon : set.slot2GamesWon;
    const otherGames = (set: GroupPlayedGameData["scoredSets"][number]) =>
      index === 1 ? set.slot2GamesWon : set.slot1GamesWon;
    const scored = status === "finished";
    const cells: GroupPlayedCell[] = !scored
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
  sides: [GroupPlayedSide, GroupPlayedSide] | null,
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
    return m.group.played.versus(sides[0].name, sides[1].name);
  }
  return game.name ?? game.venueName ?? m.group.played.untitled;
}

export function groupPlayedCard(
  game: GroupPlayedGameData,
  locale: Locale,
): GroupPlayedCard {
  const m = messagesFor(locale);
  const copy = m.group.played;
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

export type GroupPlayedListItem =
  | { kind: "month"; key: string; label: string; count: string }
  | { kind: "game"; key: string; card: GroupPlayedCard };

/** The Played cards under a header per month, newest first as the server sends them. */
export function groupPlayedListItems(
  games: readonly GroupPlayedGameData[],
  locale: Locale,
  now = new Date(),
): GroupPlayedListItem[] {
  const copy = messagesFor(locale).group.played;
  const thisYear = zonedParts(now).year;
  const items: GroupPlayedListItem[] = [];
  let currentKey: string | null = null;
  let header: Extract<GroupPlayedListItem, { kind: "month" }> | null = null;
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
      card: groupPlayedCard(game, locale),
    });
  }
  if (header) {
    header.count = copy.monthCount(count);
  }
  return items;
}

export type GroupPlayedFilterChip = {
  filter: GroupPlayedFilter;
  label: string;
  count: string;
  selected: boolean;
  /** Games waiting on a score get a dot while another filter is on. */
  dot: boolean;
  accessibilityLabel: string;
};

export function groupPlayedFilterChips(
  counts: GroupPlayedCounts,
  selected: GroupPlayedFilter,
  locale: Locale,
): GroupPlayedFilterChip[] {
  const copy = messagesFor(locale).group.played;
  return GROUP_PLAYED_FILTERS.map((filter) => ({
    filter,
    label: copy.filters[filter],
    count: String(counts[filter]),
    selected: filter === selected,
    dot: filter === "needs_score" && filter !== selected && counts[filter] > 0,
    accessibilityLabel: copy.filterSpoken(copy.filters[filter], counts[filter]),
  }));
}

export function groupPlayedRecordLine(
  counts: GroupPlayedCounts,
  sport: string | null,
  locale: Locale,
) {
  const copy = messagesFor(locale).group.played;
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
