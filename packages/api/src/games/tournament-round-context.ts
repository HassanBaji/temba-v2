import { TRPCError } from "@trpc/server";
import { and, asc, eq } from "drizzle-orm";

import {
  MatchStatusEnum,
  gameCourts,
  gameTeams,
  matches,
  tournamentDraftMatches,
} from "@repo/db";

import { matchOutcome } from "@repo/domain/match-outcome";

import type {
  MadeRound,
  PairingPool,
  RoundPairing,
  RoundSlotState,
} from "@repo/domain/tournament-pairing";
import { pointsForOutcome } from "@repo/domain/tournament-round-state";
import { hasPools, isDrawnTournament } from "@repo/domain/tournament-rounds";
import {
  poolRoundSlots,
  type RoundSlot,
} from "@repo/domain/tournament-schedule";
import {
  resolveRoundCount,
  suggestedRoundCount,
} from "@repo/domain/tournament-sizing";
import { messagesFor } from "@repo/i18n/messages";
import { DEFAULT_LOCALE, type Locale } from "@repo/i18n/locale";

import { type db } from "#src/db";
import { type GameRow } from "#src/games/access";

type DbClient = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];

export type PostedPoolMatch = typeof matches.$inferSelect & {
  sets: { slot1GamesWon: number | null; slot2GamesWon: number | null }[];
};

export type TournamentRoundContext = {
  game: GameRow;
  pools: PairingPool[];
  poolOf: Map<string, number>;
  suggested: number;
  roundCount: number;
  courtIds: string[];
  slots: Map<number, RoundSlot[]>;
  drafts: Map<number, RoundPairing[]>;
  posted: Map<number, PostedPoolMatch[]>;
};

/**
 * Refuses unless the Game is a drawn Pool tournament whose draw is posted and
 * not cancelled: the only state in which Rounds are made.
 */
export function assertMakesPoolRounds(
  game: GameRow,
  locale: Locale = DEFAULT_LOCALE,
) {
  if (
    !isDrawnTournament(game.format, game.poolCount, game.tournamentShape) ||
    !hasPools(game.format, game.poolCount)
  ) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: messagesFor(locale).tournament.errors.roundsPoolOnly,
    });
  }
  if (game.cancelledAt) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: messagesFor(locale).tournament.errors.cancelled,
    });
  }
  if (game.drawPostedAt == null) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: messagesFor(locale).tournament.errors.postDrawFirst,
    });
  }
}

export async function loadTournamentRoundContext(
  database: DbClient,
  game: GameRow,
): Promise<TournamentRoundContext> {
  const [teamRows, courtRows, draftRows, matchRows] = await Promise.all([
    database.query.gameTeams.findMany({
      where: eq(gameTeams.gameId, game.id),
      columns: { id: true, sideIndex: true, poolIndex: true },
    }),
    database.query.gameCourts.findMany({
      where: eq(gameCourts.gameId, game.id),
      with: { court: { columns: { id: true, name: true } } },
    }),
    database.query.tournamentDraftMatches.findMany({
      where: eq(tournamentDraftMatches.gameId, game.id),
      orderBy: [
        asc(tournamentDraftMatches.roundNumber),
        asc(tournamentDraftMatches.position),
      ],
    }),
    database.query.matches.findMany({
      where: eq(matches.gameId, game.id),
      with: {
        sets: {
          columns: { slot1GamesWon: true, slot2GamesWon: true },
          orderBy: (table, { asc: ascending }) => [ascending(table.setNumber)],
        },
      },
      orderBy: [asc(matches.startTime), asc(matches.createdAt)],
    }),
  ]);

  const byPool = new Map<number, typeof teamRows>();
  for (const team of teamRows) {
    if (team.poolIndex == null) {
      continue;
    }
    const list = byPool.get(team.poolIndex) ?? [];
    list.push(team);
    byPool.set(team.poolIndex, list);
  }
  const pools: PairingPool[] = [...byPool.entries()]
    .sort(([left], [right]) => left - right)
    .map(([poolIndex, teams]) => ({
      poolIndex,
      gameTeamIds: [...teams]
        .sort(
          (left, right) =>
            (left.sideIndex ?? Number.MAX_SAFE_INTEGER) -
              (right.sideIndex ?? Number.MAX_SAFE_INTEGER) ||
            left.id.localeCompare(right.id),
        )
        .map((team) => team.id),
    }));
  const poolOf = new Map<string, number>();
  for (const pool of pools) {
    for (const id of pool.gameTeamIds) {
      poolOf.set(id, pool.poolIndex);
    }
  }

  const poolSizes = pools.map((pool) => pool.gameTeamIds.length);
  const roundCount = resolveRoundCount(poolSizes, game.roundCount) ?? 0;
  const courtIds = courtRows
    .flatMap((row) => (row.court ? [row.court] : []))
    .sort(
      (left, right) =>
        left.name.localeCompare(right.name) || left.id.localeCompare(right.id),
    )
    .map((court) => court.id);
  const slots =
    game.windowStart && game.windowEnd
      ? poolRoundSlots({
          poolSizes,
          roundCount,
          courtIds,
          windowStart: game.windowStart,
          windowEnd: game.windowEnd,
          matchMinutes: game.matchMinutes,
        })
      : new Map<number, RoundSlot[]>();

  const drafts = new Map<number, RoundPairing[]>();
  for (const row of draftRows) {
    const list = drafts.get(row.roundNumber) ?? [];
    list.push({
      slot1GameTeamId: row.slot1GameTeamId,
      slot2GameTeamId: row.slot2GameTeamId,
    });
    drafts.set(row.roundNumber, list);
  }

  const posted = new Map<number, PostedPoolMatch[]>();
  for (const match of matchRows) {
    if (match.knockoutRound != null || match.roundNumber == null) {
      continue;
    }
    const list = posted.get(match.roundNumber) ?? [];
    list.push(match);
    posted.set(match.roundNumber, list);
  }
  const courtOrder = (courtId: string | null) => {
    const index = courtId ? courtIds.indexOf(courtId) : -1;
    return index < 0 ? Number.MAX_SAFE_INTEGER : index;
  };
  for (const list of posted.values()) {
    list.sort(
      (left, right) =>
        (left.startTime?.getTime() ?? 0) - (right.startTime?.getTime() ?? 0) ||
        courtOrder(left.courtId) - courtOrder(right.courtId) ||
        left.id.localeCompare(right.id),
    );
  }

  return {
    game,
    pools,
    poolOf,
    suggested: suggestedRoundCount(poolSizes),
    roundCount,
    courtIds,
    slots,
    drafts,
    posted,
  };
}

export function postedPairings(matchRows: readonly PostedPoolMatch[]) {
  return matchRows.flatMap((match) =>
    match.slot1GameTeamId && match.slot2GameTeamId
      ? [
          {
            slot1GameTeamId: match.slot1GameTeamId,
            slot2GameTeamId: match.slot2GameTeamId,
          },
        ]
      : [],
  );
}

/** Every Round that is drafted or posted, as pairings. */
export function madeRounds(context: TournamentRoundContext): RoundSlotState[] {
  const rounds: RoundSlotState[] = [];
  for (
    let roundNumber = 1;
    roundNumber <= context.roundCount;
    roundNumber += 1
  ) {
    const postedRows = context.posted.get(roundNumber);
    if (postedRows && postedRows.length > 0) {
      rounds.push({
        roundNumber,
        draft: false,
        pairings: postedPairings(postedRows),
      });
      continue;
    }
    const draft = context.drafts.get(roundNumber);
    if (draft && draft.length > 0) {
      rounds.push({ roundNumber, draft: true, pairings: draft });
    }
  }
  return rounds;
}

export function otherRounds(
  context: TournamentRoundContext,
  roundNumber: number,
): MadeRound[] {
  return madeRounds(context).filter(
    (round) => round.roundNumber !== roundNumber,
  );
}

export function assertRoundInRange(
  context: TournamentRoundContext,
  roundNumber: number,
  locale: Locale = DEFAULT_LOCALE,
) {
  if (roundNumber < 1 || roundNumber > context.roundCount) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: messagesFor(locale).tournament.errors.roundsRange(
        context.roundCount,
      ),
    });
  }
}

export function assertRoundNotPosted(
  context: TournamentRoundContext,
  roundNumber: number,
  locale: Locale = DEFAULT_LOCALE,
) {
  if ((context.posted.get(roundNumber)?.length ?? 0) > 0) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: messagesFor(locale).tournament.errors.roundPosted(roundNumber),
    });
  }
}

export async function replaceRoundDraft(
  database: DbClient,
  gameId: string,
  roundNumber: number,
  pairings: readonly RoundPairing[],
) {
  await database
    .delete(tournamentDraftMatches)
    .where(
      and(
        eq(tournamentDraftMatches.gameId, gameId),
        eq(tournamentDraftMatches.roundNumber, roundNumber),
      ),
    );
  if (pairings.length === 0) {
    return;
  }
  await database.insert(tournamentDraftMatches).values(
    pairings.map((pairing, position) => ({
      gameId,
      roundNumber,
      position,
      slot1GameTeamId: pairing.slot1GameTeamId,
      slot2GameTeamId: pairing.slot2GameTeamId,
    })),
  );
}

/** Points so far per Game team, from completed Pool Matches. */
export function teamPoints(
  context: TournamentRoundContext,
): Record<string, number> {
  const points: Record<string, number> = {};
  for (const rows of context.posted.values()) {
    for (const match of rows) {
      if (
        match.status !== MatchStatusEnum.COMPLETED ||
        !match.slot1GameTeamId ||
        !match.slot2GameTeamId
      ) {
        continue;
      }
      const result = matchOutcome(match.sets).result;
      if (result === "none") {
        continue;
      }
      const outcome = result === "draw" ? "draw" : result;
      points[match.slot1GameTeamId] =
        (points[match.slot1GameTeamId] ?? 0) + pointsForOutcome(outcome, 1);
      points[match.slot2GameTeamId] =
        (points[match.slot2GameTeamId] ?? 0) + pointsForOutcome(outcome, 2);
    }
  }
  return points;
}
