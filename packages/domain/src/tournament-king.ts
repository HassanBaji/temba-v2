import { messagesFor } from "@repo/i18n/messages";
import type { Locale } from "@repo/i18n/locale";

import { firstName } from "./game-card";
import {
  GAME_WINDOW_FINISH_SLOTS,
  timeSlotFromMinutes,
  timeSlotMinutes,
} from "./game-window";
import { shortPlayerName } from "./player-name";

export const KING_OF_THE_COURT_SHAPE = "king_of_the_court";

export const KING_TEAMS_PER_COURT = 2;
export const KING_COURT_MIN = 2;
export const KING_COURT_MAX = 6;
export const KING_COURT_CHIPS = [3, 4, 5, 6] as const;
export const KING_DEFAULT_COURTS = 4;
export const KING_PLAY_MINUTE_CHIPS = [90, 120, 180] as const;
/** Post unlocks once the top three are placed. */
export const KING_FINAL_ORDER_MIN = 3;
export const KING_FINAL_ORDER_CHANGE_MS = 24 * 60 * 60 * 1000;

export function isKingOfTheCourt(
  format: string | null | undefined,
  tournamentShape: string | null | undefined,
) {
  return (
    format === "friendly_tournament" &&
    tournamentShape === KING_OF_THE_COURT_SHAPE
  );
}

export function clampKingCourts(courts: number) {
  if (!Number.isFinite(courts)) {
    return KING_DEFAULT_COURTS;
  }
  return Math.min(KING_COURT_MAX, Math.max(KING_COURT_MIN, Math.round(courts)));
}

export function kingTeamCount(courts: number) {
  return clampKingCourts(courts) * KING_TEAMS_PER_COURT;
}

/** The courts a field fills; an odd team out starts alone on the bottom court. */
export function kingCourtCount(teamCount: number | null | undefined) {
  if (teamCount == null || teamCount < 1) {
    return 0;
  }
  return Math.ceil(teamCount / KING_TEAMS_PER_COURT);
}

/** The court a position in the drawn order lands on: two a court, from Court 1 down. */
export function kingCourtOfPosition(position: number) {
  return Math.floor(position / KING_TEAMS_PER_COURT) + 1;
}

export type KingCourt<Team> = { court: number; teams: Team[] };

/** Splits a drawn order into courts, two teams a court, Court 1 first. */
export function kingCourtsFromOrder<Team>(order: readonly Team[]) {
  const courts: KingCourt<Team>[] = [];
  order.forEach((team, position) => {
    const court = kingCourtOfPosition(position);
    const entry = courts[court - 1] ?? { court, teams: [] };
    entry.teams.push(team);
    courts[court - 1] = entry;
  });
  return courts;
}

type DrawnTeam = {
  id: string;
  startCourt?: number | null;
  sideIndex: number | null;
};

function bySide(left: DrawnTeam, right: DrawnTeam) {
  return (
    (left.sideIndex ?? Number.MAX_SAFE_INTEGER) -
      (right.sideIndex ?? Number.MAX_SAFE_INTEGER) ||
    left.id.localeCompare(right.id)
  );
}

/** The posted starting courts in court order, or null before the draw is posted. */
export function postedStartingOrder<Team extends DrawnTeam>(
  teams: readonly Team[],
): Team[] | null {
  const drawn = teams.filter((team) => team.startCourt != null);
  if (drawn.length === 0) {
    return null;
  }
  return [...drawn].sort(
    (left, right) =>
      (left.startCourt ?? 0) - (right.startCourt ?? 0) || bySide(left, right),
  );
}

export function startingCourtsOf<Team extends DrawnTeam>(
  teams: readonly Team[],
): KingCourt<Team>[] {
  const courts: KingCourt<Team>[] = [];
  for (const team of postedStartingOrder(teams) ?? []) {
    const court = team.startCourt ?? 0;
    const entry = courts.find((item) => item.court === court);
    if (entry) {
      entry.teams.push(team);
    } else {
      courts.push({ court, teams: [team] });
    }
  }
  return courts;
}

/** Where a team goes from a court: winning on Court 1 and losing on the last court stay put. */
export function kingCourtMoves(court: number, courtCount: number) {
  return {
    win: Math.max(1, court - 1),
    winStays: court <= 1,
    lose: Math.min(courtCount, court + 1),
    loseStays: court >= courtCount,
  };
}

export type KingCourtTag = "kings" | "bottom" | null;

export function kingCourtTag(court: number, courtCount: number): KingCourtTag {
  if (court === 1) {
    return "kings";
  }
  return court === courtCount ? "bottom" : null;
}

export function swapPositions<T>(
  order: readonly T[],
  first: number,
  second: number,
) {
  const next = [...order];
  const a = next[first];
  const b = next[second];
  if (a === undefined || b === undefined) {
    return next;
  }
  next[first] = b;
  next[second] = a;
  return next;
}

/** Post unlocks from the top three, or from every team in a smaller field. */
export function canPostFinalOrder(placed: number, teamCount: number) {
  return placed >= Math.min(KING_FINAL_ORDER_MIN, teamCount) && placed > 0;
}

export function finalOrderStillOpen(
  finalOrderPostedAt: Date | string | null | undefined,
  now: Date,
) {
  if (finalOrderPostedAt == null) {
    return true;
  }
  const posted = new Date(finalOrderPostedAt).getTime();
  return now.getTime() - posted < KING_FINAL_ORDER_CHANGE_MS;
}

type PlacedTeam = {
  id: string;
  finalPlace?: number | null;
  sideIndex: number | null;
};

/** The posted order, first place first, then the teams left unplaced. */
export function kingFinalOrderOf<Team extends PlacedTeam>(
  teams: readonly Team[],
) {
  const placed = teams
    .filter((team) => team.finalPlace != null)
    .sort(
      (left, right) =>
        (left.finalPlace ?? 0) - (right.finalPlace ?? 0) || bySide(left, right),
    );
  const unplaced = teams.filter((team) => team.finalPlace == null).sort(bySide);
  return { placed, unplaced, king: placed[0] ?? null };
}

type Member = { id: string; name: string };

/** "Layla & Mariam": first names, as the Games card names the king. */
export function kingFirstNames(members: readonly Member[]) {
  return members.map((member) => firstName(member.name)).join(" & ");
}

export function kingFullNames(members: readonly Member[]) {
  return members.map((member) => member.name).join(" & ");
}

/** The viewer's pair as "You & Khalid J", or the pair by short names. */
export function kingPairName(
  members: readonly Member[],
  viewerUserId: string | null,
  locale: Locale,
) {
  const viewer = members.find((member) => member.id === viewerUserId);
  if (!viewer) {
    return members.map((member) => shortPlayerName(member.name)).join(" & ");
  }
  const partner = members.find((member) => member.id !== viewerUserId);
  return messagesFor(locale).tournamentKing.finished.you(
    partner ? shortPlayerName(partner.name) : null,
  );
}

export function kingPlayMinutesLabel(minutes: number, locale: Locale) {
  return messagesFor(locale).tournamentKing.create.hoursMinutes(
    Math.floor(minutes / 60),
    minutes % 60,
  );
}

/** The shuffle the draw sheet starts from, before the Organizer swaps anything. */
export function shuffledOrder<T>(
  items: readonly T[],
  random: () => number = Math.random,
): T[] {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(random() * (index + 1));
    const current = result[index];
    const other = result[swap];
    if (current === undefined || other === undefined) {
      continue;
    }
    result[index] = other;
    result[swap] = current;
  }
  return result;
}

/** The finish slot a play time gives from a start slot, or null past the last finish. */
export function kingFinishSlot(startTime: string, playMinutes: number) {
  const start = timeSlotMinutes(startTime);
  if (start == null) {
    return null;
  }
  const slot = timeSlotFromMinutes(start + playMinutes);
  return GAME_WINDOW_FINISH_SLOTS.includes(slot) ? slot : null;
}

export function kingSlotPlayMinutes(startTime: string, finishTime: string) {
  const start = timeSlotMinutes(startTime);
  const finish = timeSlotMinutes(finishTime);
  return start == null || finish == null || finish <= start
    ? null
    : finish - start;
}
