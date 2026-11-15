import { TRPCError } from "@trpc/server";
import { and, asc, eq, isNotNull } from "drizzle-orm";

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
  scheduleRoundSlots,
  sizeTournamentRounds,
  type RoundSlot,
} from "@repo/domain/tournament-schedule";
import {
  resolveRoundCount,
  roundCountRange,
  suggestedRoundCount,
} from "@repo/domain/tournament-sizing";
import { messagesFor } from "@repo/i18n/messages";
import { DEFAULT_LOCALE, type Locale } from "@repo/i18n/locale";

import { type db } from "#src/db";
import { type GameRow } from "#src/games/access";
import { matchTimes } from "#src/games/helpers/match-times";

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
  maxRoundCount: number;
  /** A Knockout Match has a Set, a result or a Walkover. */
  knockoutStarted: boolean;
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
    maxRoundCount: roundCountRange(poolSizes).max,
    knockoutStarted: matchRows.some(
      (match) =>
        match.knockoutRound != null &&
        (match.sets.length > 0 ||
          match.walkoverGameTeamId != null ||
          match.status === MatchStatusEnum.COMPLETED ||
          match.status === MatchStatusEnum.CANCELLED),
    ),
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
      // A cancelled Match was never played, so its pair has not met.
      rounds.push({
        roundNumber,
        draft: false,
        pairings: postedPairings(
          postedRows.filter(
            (match) => match.status !== MatchStatusEnum.CANCELLED,
          ),
        ),
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

export type RoundCancelEffect = "remove" | "void" | "none";

function roundIsUntouched(matchRows: readonly PostedPoolMatch[]) {
  return matchRows.every(
    (match) =>
      match.status === MatchStatusEnum.PENDING &&
      match.sets.length === 0 &&
      match.notFinishedAt == null,
  );
}

/**
 * What cancelling a Round does. A Round nobody has seen played, with no
 * posted Round after it, comes off the schedule and the Rounds after it move
 * up. Any other posted Round stays where it is with its Matches cancelled,
 * so the Rounds players already know keep their numbers.
 */
export function roundCancelEffect(
  context: TournamentRoundContext,
  roundNumber: number,
): RoundCancelEffect {
  const posted = context.posted.get(roundNumber) ?? [];
  if (posted.length === 0) {
    return "remove";
  }
  if (posted.every((match) => match.status === MatchStatusEnum.CANCELLED)) {
    return "none";
  }
  const postedLater = [...context.posted.entries()].some(
    ([number, rows]) => number > roundNumber && rows.length > 0,
  );
  return roundIsUntouched(posted) && !postedLater ? "remove" : "void";
}

/** Adding a Round or taking one off moves the Knockout, so neither is allowed once it has started. */
export function assertKnockoutNotStarted(
  context: TournamentRoundContext,
  locale: Locale = DEFAULT_LOCALE,
) {
  if (context.knockoutStarted) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: messagesFor(locale).tournament.errors.roundsKnockoutStarted,
    });
  }
}

/**
 * Puts the Knockout after `poolRoundCount` Pool Rounds: its Round numbers
 * follow the last Pool Round, and its Courts and times are laid out again the
 * way posting the draw laid them out.
 */
export async function moveKnockoutAfterPoolRounds(
  database: DbClient,
  context: TournamentRoundContext,
  poolRoundCount: number,
) {
  const knockoutRows = await database
    .select()
    .from(matches)
    .where(
      and(
        eq(matches.gameId, context.game.id),
        isNotNull(matches.knockoutRound),
      ),
    )
    .orderBy(asc(matches.knockoutRound), asc(matches.knockoutPosition))
    .for("update");
  if (knockoutRows.length === 0) {
    return;
  }

  type KnockoutRow = (typeof knockoutRows)[number];
  const byKnockoutRound = new Map<number, KnockoutRow[]>();
  for (const row of knockoutRows) {
    const list = byKnockoutRound.get(row.knockoutRound ?? 0) ?? [];
    list.push(row);
    byKnockoutRound.set(row.knockoutRound ?? 0, list);
  }
  const poolSizes = context.pools.map((pool) => pool.gameTeamIds.length);
  const rounds: { roundNumber: number; items: (KnockoutRow | null)[] }[] = [
    ...sizeTournamentRounds(poolSizes, poolRoundCount).roundMatches.map(
      (count, index) => ({
        roundNumber: index + 1,
        items: Array.from({ length: count }, () => null),
      }),
    ),
    ...[...byKnockoutRound.entries()].map(([knockoutRound, items]) => ({
      roundNumber: poolRoundCount + knockoutRound,
      items,
    })),
  ];

  const { windowStart, windowEnd } = context.game;
  const scheduled =
    windowStart && windowEnd
      ? scheduleRoundSlots({
          rounds,
          courtIds: context.courtIds,
          windowStart,
          windowEnd,
          matchMinutes: context.game.matchMinutes,
        })
      : [];
  const slotOf = new Map(
    scheduled.flatMap((slot) => (slot.item ? [[slot.item.id, slot]] : [])),
  );

  const now = new Date();
  for (const row of knockoutRows) {
    const slot = slotOf.get(row.id);
    await database
      .update(matches)
      .set({
        roundNumber: poolRoundCount + (row.knockoutRound ?? 0),
        ...(slot
          ? matchTimes({
              startTime: slot.startTime,
              endTime: slot.endTime,
              durationInMinutes: null,
              courtId: slot.courtId,
              slot1GameTeamId: row.slot1GameTeamId,
              slot2GameTeamId: row.slot2GameTeamId,
            })
          : {}),
        updatedAt: now,
      })
      .where(eq(matches.id, row.id));
  }
}
