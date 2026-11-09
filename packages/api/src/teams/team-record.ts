import { and, eq, inArray, or } from "drizzle-orm";

import { gameTeams, matches, MatchStatusEnum } from "@repo/db";
import { matchOutcome } from "@repo/domain/match-outcome";

import { type db } from "#src/db";

type DbClient = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];

export type TeamResult = "won" | "lost" | "draw";

export type TeamRecord = {
  gamesPlayed: number;
  wins: number;
  draws: number;
  losses: number;
};

/** One completed Match of a Team, read from the Team's side. */
export type TeamMatch = {
  matchId: string;
  gameId: string;
  playedAt: Date;
  venueId: string | null;
  venueName: string | null;
  /** The Game's Side size on football; null on padel. */
  sideSize: number | null;
  /** The Team on the other slot, when that Game team is bound to one. */
  opponentTeamId: string | null;
  opponentSideName: string | null;
  sets: { us: number | null; them: number | null }[];
  /** Null for a completed Match with no scored set: played, neither won nor lost. */
  result: TeamResult | null;
};

export type TeamRival = {
  teamId: string;
  played: number;
  wins: number;
  draws: number;
  losses: number;
  lastResult: TeamResult | null;
  lastPlayedAt: Date;
  /** The set scores of the latest Match, from this Team's side. */
  lastSets: TeamMatch["sets"];
};

/** A Rival is an opponent of two or more completed Matches. */
export const RIVAL_MIN_MATCHES = 2;

export const TEAM_FORM_LENGTH = 10;

type TeamRecordMatch = {
  slot1GameTeamId: string | null;
  slot2GameTeamId: string | null;
  sets: readonly {
    slot1GamesWon: number | null;
    slot2GamesWon: number | null;
  }[];
};

function teamSlot(
  match: Pick<TeamRecordMatch, "slot1GameTeamId" | "slot2GameTeamId">,
  teamGameTeamIds: ReadonlySet<string>,
): 1 | 2 | null {
  if (teamGameTeamIds.has(match.slot1GameTeamId ?? "")) {
    return 1;
  }
  if (teamGameTeamIds.has(match.slot2GameTeamId ?? "")) {
    return 2;
  }
  return null;
}

function resultForSlot(
  sets: TeamRecordMatch["sets"],
  slot: 1 | 2,
): TeamResult | null {
  const { result } = matchOutcome(sets);
  if (result === "none") {
    return null;
  }
  if (result === "draw") {
    return "draw";
  }
  return result === `slot${slot}` ? "won" : "lost";
}

/**
 * Record of one Team across its completed Matches. A Match with no scored
 * set is played, neither won, drawn nor lost.
 */
export function teamRecordFromMatches(
  teamMatches: readonly Pick<TeamMatch, "result">[],
): TeamRecord {
  const record: TeamRecord = { gamesPlayed: 0, wins: 0, draws: 0, losses: 0 };
  for (const match of teamMatches) {
    record.gamesPlayed += 1;
    if (match.result === "won") {
      record.wins += 1;
    } else if (match.result === "draw") {
      record.draws += 1;
    } else if (match.result === "lost") {
      record.losses += 1;
    }
  }
  return record;
}

/** The last ten results, newest last. Unscored Matches have no result to show. */
export function teamFormFromMatches(
  teamMatches: readonly Pick<TeamMatch, "result">[],
): TeamResult[] {
  return teamMatches
    .map((match) => match.result)
    .filter((result): result is TeamResult => result != null)
    .slice(-TEAM_FORM_LENGTH);
}

/** The same last ten results, each with the day it was played. */
export function teamFormGamesFromMatches(
  teamMatches: readonly Pick<TeamMatch, "result" | "playedAt">[],
): { result: TeamResult; playedAt: Date }[] {
  return teamMatches
    .flatMap((match) =>
      match.result == null
        ? []
        : [{ result: match.result, playedAt: match.playedAt }],
    )
    .slice(-TEAM_FORM_LENGTH);
}

/**
 * Opponent Teams by completed Matches, head-to-head from this Team's side.
 * Rivals are played twice or more, most played first. The closest is the
 * most recent opponent played once.
 */
export function teamRivalsFromMatches(
  teamMatches: readonly (Pick<
    TeamMatch,
    "opponentTeamId" | "playedAt" | "result"
  > &
    Partial<Pick<TeamMatch, "sets">>)[],
): { rivals: TeamRival[]; closest: TeamRival | null } {
  const byOpponent = new Map<string, TeamRival>();
  for (const match of teamMatches) {
    if (match.opponentTeamId == null) {
      continue;
    }
    const entry = byOpponent.get(match.opponentTeamId) ?? {
      teamId: match.opponentTeamId,
      played: 0,
      wins: 0,
      draws: 0,
      losses: 0,
      lastResult: null,
      lastPlayedAt: match.playedAt,
      lastSets: [],
    };
    entry.played += 1;
    if (match.result === "won") {
      entry.wins += 1;
    } else if (match.result === "draw") {
      entry.draws += 1;
    } else if (match.result === "lost") {
      entry.losses += 1;
    }
    if (match.playedAt.getTime() >= entry.lastPlayedAt.getTime()) {
      entry.lastPlayedAt = match.playedAt;
      entry.lastResult = match.result;
      entry.lastSets = match.sets ?? [];
    }
    byOpponent.set(match.opponentTeamId, entry);
  }

  const newestFirst = (a: TeamRival, b: TeamRival) =>
    b.lastPlayedAt.getTime() - a.lastPlayedAt.getTime();
  const opponents = [...byOpponent.values()];
  const rivals = opponents
    .filter((entry) => entry.played >= RIVAL_MIN_MATCHES)
    .sort((a, b) => b.played - a.played || newestFirst(a, b));
  const closest =
    opponents
      .filter((entry) => entry.played < RIVAL_MIN_MATCHES)
      .sort(newestFirst)[0] ?? null;
  return { rivals, closest };
}

/**
 * Completed Matches of non-cancelled Games for each Team, oldest first, read
 * from that Team's side. A Match awaiting confirmation and a Walkover (a
 * cancelled Match) do not count. There are no stored counters.
 */
export async function loadTeamMatches(
  database: DbClient,
  teamIds: readonly string[],
): Promise<Map<string, TeamMatch[]>> {
  const byTeam = new Map<string, TeamMatch[]>(
    teamIds.map((teamId) => [teamId, []]),
  );
  if (teamIds.length === 0) {
    return byTeam;
  }

  const gameTeamRows = await database.query.gameTeams.findMany({
    where: inArray(gameTeams.teamId, [...teamIds]),
    columns: { id: true, teamId: true },
  });
  const gameTeamIds = gameTeamRows.map((row) => row.id);
  if (gameTeamIds.length === 0) {
    return byTeam;
  }

  const completed = await database.query.matches.findMany({
    where: and(
      eq(matches.status, MatchStatusEnum.COMPLETED),
      or(
        inArray(matches.slot1GameTeamId, gameTeamIds),
        inArray(matches.slot2GameTeamId, gameTeamIds),
      ),
    ),
    columns: {
      id: true,
      gameId: true,
      startTime: true,
      createdAt: true,
      slot1GameTeamId: true,
      slot2GameTeamId: true,
    },
    with: {
      game: {
        columns: {
          cancelledAt: true,
          windowStart: true,
          venueId: true,
          sideSize: true,
        },
        with: { venue: { columns: { name: true } } },
      },
      sets: {
        columns: { setNumber: true, slot1GamesWon: true, slot2GamesWon: true },
      },
      slot1GameTeam: { columns: { teamId: true, name: true } },
      slot2GameTeam: { columns: { teamId: true, name: true } },
    },
  });

  const gameTeamIdsByTeam = new Map<string, Set<string>>();
  for (const row of gameTeamRows) {
    if (row.teamId == null) {
      continue;
    }
    const ids = gameTeamIdsByTeam.get(row.teamId) ?? new Set<string>();
    ids.add(row.id);
    gameTeamIdsByTeam.set(row.teamId, ids);
  }

  for (const match of completed) {
    if (!match.game || match.game.cancelledAt != null) {
      continue;
    }
    const sets = [...match.sets].sort((a, b) => a.setNumber - b.setNumber);
    for (const [teamId, ids] of gameTeamIdsByTeam) {
      const slot = teamSlot(match, ids);
      if (slot === null) {
        continue;
      }
      const opponent = slot === 1 ? match.slot2GameTeam : match.slot1GameTeam;
      byTeam.get(teamId)?.push({
        matchId: match.id,
        gameId: match.gameId,
        playedAt: match.startTime ?? match.game.windowStart ?? match.createdAt,
        venueId: match.game.venueId ?? null,
        venueName: match.game.venue?.name ?? null,
        sideSize: match.game.sideSize ?? null,
        opponentTeamId: opponent?.teamId ?? null,
        opponentSideName: opponent?.name ?? null,
        sets: sets.map((set) =>
          slot === 1
            ? { us: set.slot1GamesWon, them: set.slot2GamesWon }
            : { us: set.slot2GamesWon, them: set.slot1GamesWon },
        ),
        result: resultForSlot(sets, slot),
      });
    }
  }

  for (const list of byTeam.values()) {
    list.sort((a, b) => a.playedAt.getTime() - b.playedAt.getTime());
  }
  return byTeam;
}

async function loadOneTeamMatches(database: DbClient, teamId: string) {
  return (await loadTeamMatches(database, [teamId])).get(teamId) ?? [];
}

export async function loadTeamRecord(
  database: DbClient,
  teamId: string,
): Promise<TeamRecord> {
  return teamRecordFromMatches(await loadOneTeamMatches(database, teamId));
}

export async function loadTeamRivals(database: DbClient, teamId: string) {
  return teamRivalsFromMatches(await loadOneTeamMatches(database, teamId));
}

export async function loadTeamForm(
  database: DbClient,
  teamId: string,
): Promise<TeamResult[]> {
  return teamFormFromMatches(await loadOneTeamMatches(database, teamId));
}
