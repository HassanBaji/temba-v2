/**
 * The Standing table (design "Seasons" 1a–1c): win 3, draw 1, loss 0 to every
 * player on the side, from the completed Matches in the lens — a Season's
 * window, or all-time. Ties break on wins, then head-to-head points among the
 * tied, then score difference, then fewer games played, then name.
 *
 * A member with fewer than `minRankedGames` results is listed below the
 * ranked rows without a position.
 */

import { MATCH_STATUS } from "./match-status";
import { matchOutcome } from "./match-outcome";
import {
  outcomeForSlot,
  seatedUserSlotOnMatch,
  type MatchSlotOccupants,
} from "./match-slots";
import type { ResultMarkVariant } from "./result-mark";
import { setWinsForGames } from "./set-wins-for-games";
import { SEASON_MIN_RANKED_GAMES, SEASON_POINTS } from "./group-season";

export type SeasonStandingMatch = MatchSlotOccupants & {
  status: string | null;
  /** When the Match was played; decides which Season it counts toward. */
  playedAt: Date;
  sets: readonly {
    slot1GamesWon: number | null;
    slot2GamesWon: number | null;
  }[];
};

/** Set difference reads padel; score difference reads football. */
export type StandingDiffUnit = "sets" | "games";

export function standingDiffUnit(
  sport: string | null | undefined,
): StandingDiffUnit {
  return sport === "football" ? "games" : "sets";
}

export const STANDING_FORM_LIMIT = 5;

export type SeasonStandingRecord = {
  played: number;
  wins: number;
  draws: number;
  losses: number;
  points: number;
  diff: number;
  /** Up to five latest results in the lens, oldest first, newest last. */
  form: ResultMarkVariant[];
};

export type SeasonStandingRow<T> = T &
  SeasonStandingRecord & {
    /** 1-based among ranked rows; `null` while unranked. */
    position: number | null;
    ranked: boolean;
  };

function emptyRecord(): SeasonStandingRecord {
  return {
    played: 0,
    wins: 0,
    draws: 0,
    losses: 0,
    points: 0,
    diff: 0,
    form: [],
  };
}

function slotDiff(
  match: SeasonStandingMatch,
  slot: 1 | 2,
  unit: StandingDiffUnit,
): number {
  if (unit === "sets") {
    const { slot1SetWins, slot2SetWins } = matchOutcome(match.sets);
    return slot === 1
      ? slot1SetWins - slot2SetWins
      : slot2SetWins - slot1SetWins;
  }
  let diff = 0;
  for (const set of match.sets) {
    if (!setWinsForGames(set.slot1GamesWon, set.slot2GamesWon)) {
      continue;
    }
    const own = slot === 1 ? set.slot1GamesWon : set.slot2GamesWon;
    const other = slot === 1 ? set.slot2GamesWon : set.slot1GamesWon;
    diff += (own ?? 0) - (other ?? 0);
  }
  return diff;
}

function pointsFor(outcome: "won" | "lost" | "draw") {
  return outcome === "won"
    ? SEASON_POINTS.win
    : outcome === "draw"
      ? SEASON_POINTS.draw
      : SEASON_POINTS.loss;
}

function byName(a: { name: string | null }, b: { name: string | null }) {
  return (a.name ?? "").localeCompare(b.name ?? "", undefined, {
    sensitivity: "base",
  });
}

function compareRecords(
  a: SeasonStandingRecord & { name: string | null },
  b: SeasonStandingRecord & { name: string | null },
) {
  return (
    b.points - a.points ||
    b.wins - a.wins ||
    b.diff - a.diff ||
    a.played - b.played ||
    byName(a, b)
  );
}

/** Points each tied member took from completed Matches against the others. */
function headToHeadPoints(
  matches: readonly SeasonStandingMatch[],
  userIds: readonly string[],
): Map<string, number> {
  const points = new Map(userIds.map((id) => [id, 0]));
  for (const match of matches) {
    const { result } = matchOutcome(match.sets);
    if (result === "none") {
      continue;
    }
    const onSlot1 = userIds.filter(
      (id) => seatedUserSlotOnMatch(match, id) === 1,
    );
    const onSlot2 = userIds.filter(
      (id) => seatedUserSlotOnMatch(match, id) === 2,
    );
    if (onSlot1.length === 0 || onSlot2.length === 0) {
      continue;
    }
    for (const id of onSlot1) {
      const outcome = outcomeForSlot(1, result);
      points.set(
        id,
        (points.get(id) ?? 0) + (outcome ? pointsFor(outcome) : 0),
      );
    }
    for (const id of onSlot2) {
      const outcome = outcomeForSlot(2, result);
      points.set(
        id,
        (points.get(id) ?? 0) + (outcome ? pointsFor(outcome) : 0),
      );
    }
  }
  return points;
}

/**
 * Sorts rows on points and wins, then settles each run of rows tied on both
 * by head-to-head, difference, games played and name.
 */
function sortRows<T extends { userId: string; name: string | null }>(
  rows: (T & SeasonStandingRecord)[],
  matches: readonly SeasonStandingMatch[],
): (T & SeasonStandingRecord)[] {
  const sorted = [...rows].sort(compareRecords);
  const settled: (T & SeasonStandingRecord)[] = [];
  let index = 0;
  while (index < sorted.length) {
    const lead = sorted[index]!;
    let end = index + 1;
    while (
      end < sorted.length &&
      sorted[end]!.points === lead.points &&
      sorted[end]!.wins === lead.wins
    ) {
      end += 1;
    }
    const tied = sorted.slice(index, end);
    if (tied.length > 1) {
      const h2h = headToHeadPoints(
        matches,
        tied.map((row) => row.userId),
      );
      tied.sort(
        (a, b) =>
          (h2h.get(b.userId) ?? 0) - (h2h.get(a.userId) ?? 0) ||
          compareRecords(a, b),
      );
    }
    settled.push(...tied);
    index = end;
  }
  return settled;
}

/**
 * The table for one lens. Feed it the completed-or-not Matches of the Group's
 * Games inside the lens, cancelled Games already dropped: only a completed
 * Match counts, a Walkover is a cancelled Match and counts for nothing.
 */
export function seasonStandingTable<
  T extends { userId: string; name: string | null },
>(
  matches: readonly SeasonStandingMatch[],
  members: readonly T[],
  options: { diffUnit?: StandingDiffUnit; minRankedGames?: number } = {},
): SeasonStandingRow<T>[] {
  const unit = options.diffUnit ?? "sets";
  const minRanked = options.minRankedGames ?? SEASON_MIN_RANKED_GAMES;
  const completed = [...matches]
    .filter((match) => match.status === MATCH_STATUS.COMPLETED)
    .sort((a, b) => a.playedAt.getTime() - b.playedAt.getTime());

  const records = new Map<string, SeasonStandingRecord>();
  for (const member of members) {
    records.set(member.userId, emptyRecord());
  }

  for (const match of completed) {
    const { result } = matchOutcome(match.sets);
    for (const [userId, record] of records) {
      const slot = seatedUserSlotOnMatch(match, userId);
      if (slot == null) {
        continue;
      }
      const outcome = outcomeForSlot(slot, result);
      if (!outcome) {
        continue;
      }
      record.played += 1;
      record.points += pointsFor(outcome);
      record.diff += slotDiff(match, slot, unit);
      if (outcome === "won") {
        record.wins += 1;
      } else if (outcome === "draw") {
        record.draws += 1;
      } else {
        record.losses += 1;
      }
      record.form.push(outcome);
      if (record.form.length > STANDING_FORM_LIMIT) {
        record.form.shift();
      }
    }
  }

  const rows = members.map((member) => ({
    ...member,
    ...records.get(member.userId)!,
  }));
  const ranked = sortRows(
    rows.filter((row) => row.played >= minRanked),
    completed,
  );
  const unranked = sortRows(
    rows.filter((row) => row.played < minRanked),
    completed,
  );
  return [
    ...ranked.map((row, index) => ({
      ...row,
      position: index + 1,
      ranked: true,
    })),
    ...unranked.map((row) => ({ ...row, position: null, ranked: false })),
  ];
}

/** `"No games yet"` or `"Fewer than 3 games"`, the UNRANKED divider's note. */
export function unrankedNote(minRankedGames = SEASON_MIN_RANKED_GAMES) {
  if (minRankedGames <= 1) {
    return "No games yet";
  }
  return `Fewer than ${minRankedGames} games`;
}

/** The footer under the table, by sport. */
export function standingRulesLine(
  diffUnit: StandingDiffUnit,
  minRankedGames = SEASON_MIN_RANKED_GAMES,
) {
  const difference =
    diffUnit === "sets" ? "set difference" : "score difference";
  return `Win ${SEASON_POINTS.win}, draw ${SEASON_POINTS.draw}, loss ${SEASON_POINTS.loss}, to every player on the team. Only games with a confirmed final score count. Ties: wins, then head-to-head, then ${difference}, then fewer games played. ${rankedAfterLine(minRankedGames)}`;
}

function rankedAfterLine(minRankedGames: number) {
  return minRankedGames <= 1
    ? "One game ranks you."
    : `Play ${minRankedGames} games to be ranked.`;
}

/** `"5–2–1"`: wins, draws, losses. */
export function standingRecordLabel(record: {
  wins: number;
  draws: number;
  losses: number;
}) {
  return `${record.wins}–${record.draws}–${record.losses}`;
}

/** The form strip padded to five marks, oldest first. */
export function paddedForm(
  form: readonly ResultMarkVariant[],
): ResultMarkVariant[] {
  const padded: ResultMarkVariant[] = [...form];
  while (padded.length < STANDING_FORM_LIMIT) {
    padded.push("not-played");
  }
  return padded;
}

/** 1-based position of a member among the rows, `null` when unranked or absent. */
export function seasonStandingPosition(
  rows: readonly { userId: string; position: number | null }[],
  userId: string,
): number | null {
  return rows.find((row) => row.userId === userId)?.position ?? null;
}
