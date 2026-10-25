import { TRPCError } from "@trpc/server";
import { asc, eq } from "drizzle-orm";
import { z } from "zod";

import {
  MatchStatusEnum,
  gameCourts,
  gamePlayers,
  gameTeamPlayers,
  gameTeams,
  games,
  matchResultConfirmations,
  matches,
} from "@repo/db";

import {
  FOOTBALL_BIBS,
  FOOTBALL_TEAMS_METHODS,
  type FootballBib,
  type FootballTeamsMethod,
  footballBibName,
  footballSidesProblem,
} from "@repo/domain/football-lineup";
import { protectedProcedure } from "#src/trpc";
import { resolveAppUser } from "#src/auth/resolve-app-user";
import { type db } from "#src/db";
import { assertGameOrganizer, requireGame } from "#src/games/access";
import {
  assertFootballGame,
  assertGameNotCancelled,
  footballMatch,
  footballScoreOf,
  footballScoreSet,
  footballSides,
} from "#src/games/football-lineup";

type DbClient = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];
type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

function refuse(message: string): never {
  throw new TRPCError({ code: "BAD_REQUEST", message });
}

function assertCoversRoster(
  registered: readonly string[],
  slot1: readonly string[],
  slot2: readonly string[],
) {
  const placed = [...slot1, ...slot2];
  if (new Set(placed).size !== placed.length) {
    refuse("A player can be on one team only");
  }
  const roster = new Set(registered);
  if (placed.some((userId) => !roster.has(userId))) {
    refuse("Only registered players can be placed on a team");
  }
}

async function upsertSide(
  tx: Tx,
  args: {
    gameId: string;
    sideIndex: 1 | 2;
    existingId: string | null;
    bib: FootballBib;
  },
) {
  const now = new Date();
  if (args.existingId) {
    await tx
      .update(gameTeams)
      .set({ bib: args.bib, updatedAt: now })
      .where(eq(gameTeams.id, args.existingId));
    await tx
      .delete(gameTeamPlayers)
      .where(eq(gameTeamPlayers.gameTeamId, args.existingId));
    return args.existingId;
  }
  const [inserted] = await tx
    .insert(gameTeams)
    .values({ gameId: args.gameId, sideIndex: args.sideIndex, bib: args.bib })
    .returning({ id: gameTeams.id });
  if (!inserted) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Failed to create the team",
    });
  }
  return inserted.id;
}

/**
 * The Organizer publishes the two football teams: every registered player on
 * exactly one side, each side in its bib colour. Publishing again replaces the
 * split until a Score is in. The first publish creates the Game's one Match.
 */
export async function publishFootballTeams(
  database: DbClient,
  args: {
    gameId: string;
    userId: string;
    method: FootballTeamsMethod;
    bibs: { slot1: FootballBib; slot2: FootballBib };
    slot1: string[];
    slot2: string[];
  },
) {
  const game = await requireGame(database, args.gameId);
  assertFootballGame(game);
  assertGameNotCancelled(game);
  await assertGameOrganizer(database, game, args.userId);
  if (args.bibs.slot1 === args.bibs.slot2) {
    refuse("Pick two different bib colours");
  }

  const roster = await database.query.gamePlayers.findMany({
    where: eq(gamePlayers.gameId, game.id),
    columns: { id: true, userId: true },
  });
  const registered = roster.flatMap((row) => (row.userId ? [row.userId] : []));
  assertCoversRoster(registered, args.slot1, args.slot2);
  const problem = footballSidesProblem(
    {
      slot1: args.slot1,
      slot2: args.slot2,
      unplaced: registered.length - args.slot1.length - args.slot2.length,
    },
    {
      slot1: footballBibName(args.bibs.slot1, 1),
      slot2: footballBibName(args.bibs.slot2, 2),
    },
  );
  if (problem) {
    refuse(problem);
  }

  const existingMatch = await footballMatch(database, game.id);
  if (existingMatch) {
    const scored =
      existingMatch.status === MatchStatusEnum.COMPLETED ||
      footballScoreOf(await footballScoreSet(database, existingMatch.id)) !=
        null;
    if (scored) {
      refuse("The score is in, so the teams are fixed");
    }
  }

  const gamePlayerIdByUser = new Map(
    roster.flatMap((row) => (row.userId ? [[row.userId, row.id]] : [])),
  );
  const sides = await footballSides(database, game.id);

  await database.transaction(async (tx) => {
    const slot1Id = await upsertSide(tx, {
      gameId: game.id,
      sideIndex: 1,
      existingId: sides.slot1?.id ?? null,
      bib: args.bibs.slot1,
    });
    const slot2Id = await upsertSide(tx, {
      gameId: game.id,
      sideIndex: 2,
      existingId: sides.slot2?.id ?? null,
      bib: args.bibs.slot2,
    });
    const links = [
      ...args.slot1.map((userId) => ({ userId, gameTeamId: slot1Id })),
      ...args.slot2.map((userId) => ({ userId, gameTeamId: slot2Id })),
    ].map((link) => ({
      gameTeamId: link.gameTeamId,
      gamePlayerId: gamePlayerIdByUser.get(link.userId)!,
    }));
    if (links.length > 0) {
      await tx.insert(gameTeamPlayers).values(links);
    }

    const now = new Date();
    await tx
      .update(games)
      .set({ footballTeamsMethod: args.method, updatedAt: now })
      .where(eq(games.id, game.id));

    if (existingMatch) {
      await tx
        .update(matches)
        .set({
          slot1GameTeamId: slot1Id,
          slot2GameTeamId: slot2Id,
          updatedAt: now,
        })
        .where(eq(matches.id, existingMatch.id));
      await tx
        .delete(matchResultConfirmations)
        .where(eq(matchResultConfirmations.matchId, existingMatch.id));
      return;
    }
    const pitch = await tx.query.gameCourts.findFirst({
      where: eq(gameCourts.gameId, game.id),
      columns: { courtId: true },
      orderBy: asc(gameCourts.createdAt),
    });
    const durationInMinutes =
      game.windowStart && game.windowEnd
        ? Math.round(
            (game.windowEnd.getTime() - game.windowStart.getTime()) / 60_000,
          )
        : null;
    await tx.insert(matches).values({
      gameId: game.id,
      courtId: pitch?.courtId ?? null,
      startTime: game.windowStart,
      endTime: game.windowEnd,
      durationInMinutes,
      slot1GameTeamId: slot1Id,
      slot2GameTeamId: slot2Id,
    });
  });

  return { ok: true as const };
}

export const publishFootballTeamsProcedure = protectedProcedure
  .input(
    z.object({
      gameId: z.string().uuid(),
      method: z.enum(FOOTBALL_TEAMS_METHODS),
      bibs: z.object({
        slot1: z.enum(FOOTBALL_BIBS),
        slot2: z.enum(FOOTBALL_BIBS),
      }),
      slot1: z.array(z.string().uuid()).max(40),
      slot2: z.array(z.string().uuid()).max(40),
    }),
  )
  .mutation(async ({ ctx, input }) => {
    const appUser = await resolveAppUser(ctx.userId);
    return publishFootballTeams(ctx.db, { ...input, userId: appUser.id });
  });
