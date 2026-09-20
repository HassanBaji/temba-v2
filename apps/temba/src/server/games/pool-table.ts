import { MatchStatusEnum } from "@repo/db";

import { poolLabel } from "~/lib/tournament-pool-draw";
import { isPoolTournament } from "~/lib/tournament-rounds";
import { matchOutcome } from "~/server/games/match-outcome";

export type PoolRecordOrderInput = {
  gameTeamId: string;
  played: number;
  won: number;
  setDifference: number;
  gamesDifference: number;
  poolOrder: number;
  headToHead: Readonly<Record<string, number>>;
};

export function comparePoolRecords(
  a: PoolRecordOrderInput,
  b: PoolRecordOrderInput,
): number {
  if (a.played === 0 && b.played !== 0) {
    return 1;
  }
  if (b.played === 0 && a.played !== 0) {
    return -1;
  }
  if (a.played === 0 && b.played === 0) {
    return a.poolOrder - b.poolOrder;
  }
  if (b.won !== a.won) {
    return b.won - a.won;
  }
  const headToHeadA = a.headToHead[b.gameTeamId];
  const headToHeadB = b.headToHead[a.gameTeamId];
  if (
    headToHeadA != null &&
    headToHeadB != null &&
    headToHeadA !== headToHeadB
  ) {
    return headToHeadB - headToHeadA;
  }
  if (b.setDifference !== a.setDifference) {
    return b.setDifference - a.setDifference;
  }
  if (b.gamesDifference !== a.gamesDifference) {
    return b.gamesDifference - a.gamesDifference;
  }
  return a.poolOrder - b.poolOrder;
}

export function sortPoolRecords<T extends PoolRecordOrderInput>(
  records: readonly T[],
): T[] {
  return [...records].sort(comparePoolRecords);
}

export type PoolTableTeamInput = {
  id: string;
  name: string | null;
  sideIndex: number | null;
  poolIndex: number | null;
  members: readonly { id: string; name: string }[];
};

export type PoolTableMatchInput = {
  id: string;
  status: string | null;
  roundNumber: number | null;
  startTime: Date | null;
  slot1GameTeamId: string | null;
  slot2GameTeamId: string | null;
  sets: readonly {
    slot1GamesWon: number | null;
    slot2GamesWon: number | null;
  }[];
};

export type PoolTableRow = {
  position: number;
  gameTeamId: string;
  name: string;
  isViewer: boolean;
  played: number | null;
  won: number | null;
  drawn: number | null;
  lost: number | null;
  isWinner: boolean;
};

export type PoolTableSetScore = {
  slot1GamesWon: number | null;
  slot2GamesWon: number | null;
};

export type PoolTableMatchResult = {
  matchId: string;
  roundNumber: number | null;
  startTime: Date | null;
  status: string | null;
  cancelled: boolean;
  slot1GameTeamId: string;
  slot2GameTeamId: string;
  slot1Name: string;
  slot2Name: string;
  outcome: "slot1" | "slot2" | "draw" | "none";
  scoreLabel: string | null;
  sets: PoolTableSetScore[];
};

export type ViewerRoundResult = {
  matchId: string;
  roundNumber: number | null;
  startTime: Date | null;
  status: string | null;
  cancelled: boolean;
  opponentGameTeamId: string;
  opponentName: string;
  viewerOutcome: "won" | "lost" | "draw" | null;
  scoreLabel: string | null;
  sets: {
    viewerGamesWon: number | null;
    opponentGamesWon: number | null;
  }[];
};

export type ComputedPoolTable = {
  poolIndex: number;
  label: string;
  finished: boolean;
  winnerGameTeamId: string | null;
  rows: PoolTableRow[];
  viewerRounds: ViewerRoundResult[];
  matches: PoolTableMatchResult[];
};

export type ComputedPoolTables = {
  finished: boolean;
  viewerPoolIndex: number | null;
  pools: ComputedPoolTable[];
};

function gameTeamName(team: PoolTableTeamInput) {
  if (team.members.length > 0) {
    return team.members.map((member) => member.name).join(" / ");
  }
  return team.name ?? "Game team";
}

function poolOrderOf(team: PoolTableTeamInput) {
  return team.sideIndex ?? Number.MAX_SAFE_INTEGER;
}

function scoredSetLabel(sets: readonly PoolTableSetScore[]) {
  const parts: string[] = [];
  for (const set of sets) {
    if (set.slot1GamesWon == null || set.slot2GamesWon == null) {
      continue;
    }
    parts.push(`${set.slot1GamesWon}-${set.slot2GamesWon}`);
  }
  return parts.length > 0 ? parts.join(" ") : null;
}

function gamesDifferenceForSlot(
  sets: PoolTableMatchInput["sets"],
  slot: 1 | 2,
) {
  let difference = 0;
  for (const set of sets) {
    if (set.slot1GamesWon == null || set.slot2GamesWon == null) {
      continue;
    }
    if (slot === 1) {
      difference += set.slot1GamesWon - set.slot2GamesWon;
    } else {
      difference += set.slot2GamesWon - set.slot1GamesWon;
    }
  }
  return difference;
}

function isSettledMatch(status: string | null) {
  return (
    status === MatchStatusEnum.COMPLETED || status === MatchStatusEnum.CANCELLED
  );
}

function comparePoolMatches(
  left: PoolTableMatchInput,
  right: PoolTableMatchInput,
) {
  const leftRound = left.roundNumber ?? Number.MAX_SAFE_INTEGER;
  const rightRound = right.roundNumber ?? Number.MAX_SAFE_INTEGER;
  if (leftRound !== rightRound) {
    return leftRound - rightRound;
  }
  const leftTime = left.startTime?.getTime() ?? Number.MAX_SAFE_INTEGER;
  const rightTime = right.startTime?.getTime() ?? Number.MAX_SAFE_INTEGER;
  if (leftTime !== rightTime) {
    return leftTime - rightTime;
  }
  return left.id.localeCompare(right.id);
}

export function computePoolTables(args: {
  format: string;
  poolCount: number | null | undefined;
  gameTeams: readonly PoolTableTeamInput[];
  matches: readonly PoolTableMatchInput[];
  viewerUserId: string;
}): ComputedPoolTables | null {
  if (!isPoolTournament(args.format, args.poolCount)) {
    return null;
  }

  const teamsById = new Map(args.gameTeams.map((team) => [team.id, team]));
  const byPool = new Map<number, PoolTableTeamInput[]>();
  for (const team of args.gameTeams) {
    if (team.poolIndex == null) {
      continue;
    }
    const list = byPool.get(team.poolIndex) ?? [];
    list.push(team);
    byPool.set(team.poolIndex, list);
  }

  const viewerTeam = args.gameTeams.find((team) =>
    team.members.some((member) => member.id === args.viewerUserId),
  );
  const viewerPoolIndex = viewerTeam?.poolIndex ?? null;
  const viewerTeamId = viewerTeam?.id ?? null;

  const matchesByPool = new Map<number, PoolTableMatchInput[]>();
  for (const match of args.matches) {
    const slot1 = match.slot1GameTeamId
      ? teamsById.get(match.slot1GameTeamId)
      : undefined;
    const slot2 = match.slot2GameTeamId
      ? teamsById.get(match.slot2GameTeamId)
      : undefined;
    const poolIndex = slot1?.poolIndex ?? slot2?.poolIndex;
    if (poolIndex == null) {
      continue;
    }
    const list = matchesByPool.get(poolIndex) ?? [];
    list.push(match);
    matchesByPool.set(poolIndex, list);
  }

  const pools = [...byPool.entries()]
    .sort(([left], [right]) => left - right)
    .map(([poolIndex, teams]) => {
      const poolMatches = [...(matchesByPool.get(poolIndex) ?? [])].sort(
        comparePoolMatches,
      );
      const finished =
        poolMatches.length > 0 &&
        poolMatches.every((match) => isSettledMatch(match.status));

      type Accumulator = {
        team: PoolTableTeamInput;
        played: number;
        won: number;
        drawn: number;
        lost: number;
        setDifference: number;
        gamesDifference: number;
        headToHead: Record<string, number>;
      };
      const records = new Map<string, Accumulator>();
      for (const team of teams) {
        records.set(team.id, {
          team,
          played: 0,
          won: 0,
          drawn: 0,
          lost: 0,
          setDifference: 0,
          gamesDifference: 0,
          headToHead: {},
        });
      }

      for (const match of poolMatches) {
        if (match.status !== MatchStatusEnum.COMPLETED) {
          continue;
        }
        const slot1Id = match.slot1GameTeamId;
        const slot2Id = match.slot2GameTeamId;
        if (!slot1Id || !slot2Id) {
          continue;
        }
        const slot1 = records.get(slot1Id);
        const slot2 = records.get(slot2Id);
        if (!slot1 || !slot2) {
          continue;
        }
        const outcome = matchOutcome(match.sets);
        if (outcome.result === "none") {
          continue;
        }
        slot1.played += 1;
        slot2.played += 1;
        slot1.setDifference += outcome.slot1SetWins - outcome.slot2SetWins;
        slot2.setDifference += outcome.slot2SetWins - outcome.slot1SetWins;
        slot1.gamesDifference += gamesDifferenceForSlot(match.sets, 1);
        slot2.gamesDifference += gamesDifferenceForSlot(match.sets, 2);
        if (outcome.result === "draw") {
          slot1.drawn += 1;
          slot2.drawn += 1;
          slot1.headToHead[slot2Id] = 0.5;
          slot2.headToHead[slot1Id] = 0.5;
          continue;
        }
        if (outcome.result === "slot1") {
          slot1.won += 1;
          slot2.lost += 1;
          slot1.headToHead[slot2Id] = 1;
          slot2.headToHead[slot1Id] = 0;
          continue;
        }
        slot2.won += 1;
        slot1.lost += 1;
        slot2.headToHead[slot1Id] = 1;
        slot1.headToHead[slot2Id] = 0;
      }

      const ordered = sortPoolRecords(
        [...records.values()].map((row) => ({
          gameTeamId: row.team.id,
          played: row.played,
          won: row.won,
          setDifference: row.setDifference,
          gamesDifference: row.gamesDifference,
          poolOrder: poolOrderOf(row.team),
          headToHead: row.headToHead,
          drawn: row.drawn,
          lost: row.lost,
          team: row.team,
        })),
      );

      const winnerGameTeamId =
        finished && ordered[0] && ordered[0].played > 0
          ? ordered[0].gameTeamId
          : null;

      const rows: PoolTableRow[] = ordered.map((row, index) => {
        const unplayed = row.played === 0;
        return {
          position: index + 1,
          gameTeamId: row.gameTeamId,
          name: gameTeamName(row.team),
          isViewer: row.gameTeamId === viewerTeamId,
          played: unplayed ? null : row.played,
          won: unplayed ? null : row.won,
          drawn: unplayed ? null : row.drawn,
          lost: unplayed ? null : row.lost,
          isWinner: row.gameTeamId === winnerGameTeamId,
        };
      });

      const matchResults: PoolTableMatchResult[] = poolMatches.flatMap(
        (match) => {
          const slot1Id = match.slot1GameTeamId;
          const slot2Id = match.slot2GameTeamId;
          if (!slot1Id || !slot2Id) {
            return [];
          }
          const slot1 = teamsById.get(slot1Id);
          const slot2 = teamsById.get(slot2Id);
          if (!slot1 || !slot2) {
            return [];
          }
          const completed = match.status === MatchStatusEnum.COMPLETED;
          const cancelled = match.status === MatchStatusEnum.CANCELLED;
          const outcome = completed ? matchOutcome(match.sets).result : "none";
          const sets = match.sets.map((set) => ({
            slot1GamesWon: set.slot1GamesWon,
            slot2GamesWon: set.slot2GamesWon,
          }));
          return [
            {
              matchId: match.id,
              roundNumber: match.roundNumber,
              startTime: match.startTime,
              status: match.status,
              cancelled,
              slot1GameTeamId: slot1Id,
              slot2GameTeamId: slot2Id,
              slot1Name: gameTeamName(slot1),
              slot2Name: gameTeamName(slot2),
              outcome,
              scoreLabel: completed ? scoredSetLabel(sets) : null,
              sets,
            },
          ];
        },
      );

      const viewerRounds: ViewerRoundResult[] =
        viewerTeamId == null || viewerPoolIndex !== poolIndex
          ? []
          : matchResults.flatMap((match) => {
              const viewerIsSlot1 = match.slot1GameTeamId === viewerTeamId;
              const viewerIsSlot2 = match.slot2GameTeamId === viewerTeamId;
              if (!viewerIsSlot1 && !viewerIsSlot2) {
                return [];
              }
              const completed = match.status === MatchStatusEnum.COMPLETED;
              let viewerOutcome: ViewerRoundResult["viewerOutcome"] = null;
              if (completed) {
                if (match.outcome === "draw") {
                  viewerOutcome = "draw";
                } else if (match.outcome === "slot1") {
                  viewerOutcome = viewerIsSlot1 ? "won" : "lost";
                } else if (match.outcome === "slot2") {
                  viewerOutcome = viewerIsSlot2 ? "won" : "lost";
                }
              }
              const sets = match.sets.map((set) =>
                viewerIsSlot1
                  ? {
                      viewerGamesWon: set.slot1GamesWon,
                      opponentGamesWon: set.slot2GamesWon,
                    }
                  : {
                      viewerGamesWon: set.slot2GamesWon,
                      opponentGamesWon: set.slot1GamesWon,
                    },
              );
              const scoreLabel = completed
                ? scoredSetLabel(
                    sets.map((set) => ({
                      slot1GamesWon: set.viewerGamesWon,
                      slot2GamesWon: set.opponentGamesWon,
                    })),
                  )
                : null;
              return [
                {
                  matchId: match.matchId,
                  roundNumber: match.roundNumber,
                  startTime: match.startTime,
                  status: match.status,
                  cancelled: match.cancelled,
                  opponentGameTeamId: viewerIsSlot1
                    ? match.slot2GameTeamId
                    : match.slot1GameTeamId,
                  opponentName: viewerIsSlot1
                    ? match.slot2Name
                    : match.slot1Name,
                  viewerOutcome,
                  scoreLabel,
                  sets,
                },
              ];
            });

      return {
        poolIndex,
        label: poolLabel(poolIndex),
        finished,
        winnerGameTeamId,
        rows,
        viewerRounds,
        matches: matchResults,
      };
    });

  return {
    finished: pools.length > 0 && pools.every((pool) => pool.finished),
    viewerPoolIndex,
    pools,
  };
}
