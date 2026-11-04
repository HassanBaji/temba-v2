import type { Locale } from "@repo/i18n/locale";
import { messagesFor } from "@repo/i18n/messages";

import { gameDisplayName } from "./game-custom-name";
import { ratingScopeOf, ratingScopeTag } from "./game-rating-impact";
import type { GameRatingScope } from "./game-rating-scope";
import { formatRelativeDay } from "./format-game-start";
import { shortPlayerName } from "./player-name";
import { sportLabel } from "./sport";

export type HistoryMember = {
  id: string;
  name: string;
  image: string | null;
  isViewer: boolean;
};

export type HistoryRowInput = {
  name: string | null;
  hasCustomName: boolean;
  format: string;
  windowStart: Date | string | null;
  windowEnd: Date | string | null;
  sport: string | null;
  groupName: string | null;
  venue: { name: string };
  displayTime: Date;
  slot1Members: HistoryMember[];
  slot2Members: HistoryMember[];
  scoredSets: { slot1GamesWon: number; slot2GamesWon: number }[];
  viewerSlot: 1 | 2;
  outcome: "won" | "lost" | "draw";
  rated: boolean;
  ratingScope?: GameRatingScope;
};

export const HISTORY_PAGE_SIZE = 20;

export const PENDING_SET_COLUMNS = 3;

/** Seats drawn as stacked avatars on a team row; the label names the rest. */
export const HISTORY_AVATAR_LIMIT = 3;

export function nextHistoryCursor(
  lastPage: readonly { displayTime: Date; matchId: string }[],
): { displayTime: Date; matchId: string } | undefined {
  const last = lastPage.at(-1);
  if (!last || lastPage.length < HISTORY_PAGE_SIZE) {
    return undefined;
  }
  return { displayTime: last.displayTime, matchId: last.matchId };
}

/** Set scores read as us-vs-them off the slot the viewer actually sat on. */
export function viewerSets(row: HistoryRowInput) {
  return row.scoredSets.map((set) =>
    row.viewerSlot === 1
      ? { us: set.slot1GamesWon, them: set.slot2GamesWon }
      : { us: set.slot2GamesWon, them: set.slot1GamesWon },
  );
}

export function setTally(sets: { us: number; them: number }[]) {
  let won = 0;
  let lost = 0;
  for (const set of sets) {
    if (set.us > set.them) {
      won += 1;
    } else if (set.us < set.them) {
      lost += 1;
    }
  }
  return { won, lost };
}

/** The viewer reads as "You", and leads their own team's seats and label. */
export function viewerFirst<T extends { isViewer: boolean }>(members: T[]) {
  const index = members.findIndex((member) => member.isViewer);
  if (index <= 0) {
    return members;
  }
  return [members[index]!, ...members.filter((_, at) => at !== index)];
}

export function historyTeamLabel(members: HistoryMember[], locale: Locale) {
  const messages = messagesFor(locale);
  const names = members.map((member) =>
    member.isViewer ? messages.common.you : shortPlayerName(member.name),
  );
  if (names.length === 0) {
    return messages.game.history.openSeats;
  }
  const named = names.slice(0, 2).join(messages.game.history.nameSeparator);
  const rest = names.length - 2;
  return rest > 0 ? messages.game.history.namesMore(named, rest) : named;
}

function historyDay(row: HistoryRowInput, locale: Locale) {
  return formatRelativeDay(row.displayTime, locale, { sameDayLabel: "Today" });
}

function historyPlace(row: HistoryRowInput, locale: Locale) {
  const venueName = row.venue.name.trim();
  const gameName = row.name?.trim() ? gameDisplayName(row, locale) : null;
  return gameName && gameName !== venueName
    ? messagesFor(locale).game.history.place(venueName, gameName)
    : venueName;
}

function ratingScopeSuffix(row: HistoryRowInput, line: string, locale: Locale) {
  const tag = ratingScopeTag(row, locale);
  return tag ? messagesFor(locale).game.history.withUnrated(line, tag) : line;
}

export function historyMeta(row: HistoryRowInput, locale: Locale) {
  return ratingScopeSuffix(
    row,
    messagesFor(locale).game.history.meta(
      historyDay(row, locale),
      historyPlace(row, locale),
    ),
    locale,
  );
}

/** One set reads as its own score, as football's single set of goals does; more read as the set tally. */
export function historyScoreLine(
  sets: { us: number; them: number }[],
  locale: Locale,
) {
  const m = messagesFor(locale).game.history;
  if (sets.length === 0) {
    return m.noScore;
  }
  if (sets.length === 1) {
    return `${sets[0]!.us}–${sets[0]!.them}`;
  }
  const tally = setTally(sets);
  return m.setsTally(tally.won, tally.lost);
}

export type HistoryTeamRow = {
  side: "mine" | "theirs";
  /** The first seats, viewer first, drawn as stacked avatars. */
  avatars: HistoryMember[];
  label: string;
  note: string;
  /** A team that lost reads muted; on a draw neither side does. */
  lost: boolean;
  /** One entry per scored set, or `null` while the Match has no score. */
  scores: { games: number; lostSet: boolean }[] | null;
};

export type MatchHistoryCardModel = {
  outcome: "won" | "lost" | "draw";
  scored: boolean;
  /** `12–9`, `2–1 in sets`, or `No score yet`. */
  scoreLine: string;
  day: string;
  sport: string | null;
  groupName: string | undefined;
  /** Venue, then the Game name when it differs, then the Rating scope mark. */
  place: string;
  meta: string;
  unrated: boolean;
  /** The viewer's team first, whatever the result. */
  teams: [HistoryTeamRow, HistoryTeamRow];
};

export function matchHistoryCardModel(
  row: HistoryRowInput,
  locale: Locale,
): MatchHistoryCardModel {
  const m = messagesFor(locale).game.history;
  const sets = viewerSets(row);
  const scored = sets.length > 0;
  const won = row.outcome === "won";
  const lost = row.outcome === "lost";

  const myMembers = viewerFirst(
    row.viewerSlot === 1 ? row.slot1Members : row.slot2Members,
  );
  const opponents = row.viewerSlot === 1 ? row.slot2Members : row.slot1Members;

  const mine: HistoryTeamRow = {
    side: "mine",
    avatars: myMembers.slice(0, HISTORY_AVATAR_LIMIT),
    label: historyTeamLabel(myMembers, locale),
    note: won ? m.yourTeamWon : m.yourTeam,
    lost,
    scores: scored
      ? sets.map((set) => ({ games: set.us, lostSet: set.us < set.them }))
      : null,
  };
  const theirs: HistoryTeamRow = {
    side: "theirs",
    avatars: opponents.slice(0, HISTORY_AVATAR_LIMIT),
    label: historyTeamLabel(opponents, locale),
    note: won ? m.lost : lost ? m.won : m.drew,
    lost: won,
    scores: scored
      ? sets.map((set) => ({ games: set.them, lostSet: set.them < set.us }))
      : null,
  };

  return {
    outcome: row.outcome,
    scored,
    scoreLine: historyScoreLine(sets, locale),
    day: historyDay(row, locale),
    sport: sportLabel(row.sport, locale),
    groupName: row.groupName?.trim() ? row.groupName.trim() : undefined,
    place: ratingScopeSuffix(row, historyPlace(row, locale), locale),
    meta: historyMeta(row, locale),
    unrated: ratingScopeOf(row) === "unrated",
    teams: [mine, theirs],
  };
}
