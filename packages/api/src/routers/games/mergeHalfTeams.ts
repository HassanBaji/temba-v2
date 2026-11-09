import { TRPCError } from "@trpc/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";

import { gamePlayers, gameTeamPlayers, gameTeams } from "@repo/db";

import {
  isPartnerRequiredGame,
  isDrawnTournament,
} from "@repo/domain/tournament-rounds";
import { messagesFor } from "@repo/i18n/messages";
import { DEFAULT_LOCALE, type Locale } from "@repo/i18n/locale";
import { protectedProcedure } from "#src/trpc";
import { resolveAppUser } from "#src/auth/resolve-app-user";
import { type db } from "#src/db";
import { assertGameOrganizer, requireGame } from "#src/games/access";
import { assertPoolDrawNotPosted } from "#src/games/assert-pool-draw-not-posted";
import { clearMatchSlotsForGameTeam } from "#src/games/clear-match-slots-for-game-team";
import type { SeatPosition } from "#src/games/utils";

type DbClient = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];
type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

async function requireHalfTeam(
  database: DbClient,
  gameId: string,
  gameTeamId: string,
  locale: Locale = DEFAULT_LOCALE,
) {
  const team = await database.query.gameTeams.findFirst({
    where: and(eq(gameTeams.id, gameTeamId), eq(gameTeams.gameId, gameId)),
    with: {
      players: {
        columns: { id: true, gamePlayerId: true, position: true },
      },
    },
  });
  if (!team) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: messagesFor(locale).game.errors.gameTeamNotOnGame,
    });
  }
  if (team.players.length !== 1) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: messagesFor(locale).tournament.errors.notHalfTeams,
    });
  }
  const link = team.players[0];
  if (!link || (link.position !== "left" && link.position !== "right")) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: messagesFor(locale).tournament.errors.notHalfTeams,
    });
  }
  const player = await database.query.gamePlayers.findFirst({
    where: eq(gamePlayers.id, link.gamePlayerId),
    columns: { id: true, userId: true },
  });
  if (!player?.userId) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: messagesFor(locale).tournament.errors.notHalfTeams,
    });
  }
  return {
    team,
    link,
    player: { id: player.id, userId: player.userId },
  };
}

export async function mergeHalfTeams(
  database: DbClient,
  args: {
    gameId: string;
    organizerUserId: string;
    firstGameTeamId: string;
    secondGameTeamId: string;
    firstPosition: SeatPosition;
    secondPosition: SeatPosition;
    locale?: Locale;
  },
) {
  const locale = args.locale ?? DEFAULT_LOCALE;
  const game = await requireGame(database, args.gameId, locale);
  await assertGameOrganizer(database, game, args.organizerUserId, locale);

  if (game.cancelledAt) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: messagesFor(locale).tournament.errors.mergeCancelled,
    });
  }
  if (!isDrawnTournament(game.format, game.poolCount, game.tournamentShape)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: messagesFor(locale).tournament.errors.mergeFriendly,
    });
  }
  if (game.registrationMode !== "individual") {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: messagesFor(locale).tournament.errors.mergeIndividual,
    });
  }
  if (isPartnerRequiredGame(game)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: messagesFor(locale).tournament.errors.partnerRequired,
    });
  }
  assertPoolDrawNotPosted(game, locale);

  if (args.firstGameTeamId === args.secondGameTeamId) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: messagesFor(locale).tournament.errors.pickTwoHalfTeams,
    });
  }
  if (args.firstPosition === args.secondPosition) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: messagesFor(locale).tournament.halfTeams.samePosition,
    });
  }

  const first = await requireHalfTeam(
    database,
    game.id,
    args.firstGameTeamId,
    locale,
  );
  const second = await requireHalfTeam(
    database,
    game.id,
    args.secondGameTeamId,
    locale,
  );
  if (first.player.userId === second.player.userId) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: messagesFor(locale).tournament.errors.notHalfTeams,
    });
  }

  const now = new Date();
  await database.transaction(async (tx: Tx) => {
    await tx
      .delete(gameTeamPlayers)
      .where(eq(gameTeamPlayers.id, first.link.id));
    await tx
      .delete(gameTeamPlayers)
      .where(eq(gameTeamPlayers.id, second.link.id));
    await tx.insert(gameTeamPlayers).values({
      gameTeamId: first.team.id,
      gamePlayerId: first.player.id,
      position: args.firstPosition,
    });
    await tx.insert(gameTeamPlayers).values({
      gameTeamId: first.team.id,
      gamePlayerId: second.player.id,
      position: args.secondPosition,
    });
    await clearMatchSlotsForGameTeam(tx, second.team.id);
    await tx.delete(gameTeams).where(eq(gameTeams.id, second.team.id));
    await tx
      .update(gameTeams)
      .set({ teamId: null, updatedAt: now })
      .where(eq(gameTeams.id, first.team.id));
  });

  return { ok: true as const, gameTeamId: first.team.id };
}

export const mergeHalfTeamsInputSchema = z.object({
  gameId: z.string().uuid(),
  firstGameTeamId: z.string().uuid(),
  secondGameTeamId: z.string().uuid(),
  firstPosition: z.enum(["left", "right"]),
  secondPosition: z.enum(["left", "right"]),
});

export const mergeHalfTeamsProcedure = protectedProcedure
  .input(mergeHalfTeamsInputSchema)
  .mutation(async ({ ctx, input }) => {
    const appUser = await resolveAppUser(ctx.userId);
    return mergeHalfTeams(ctx.db, {
      gameId: input.gameId,
      organizerUserId: appUser.id,
      firstGameTeamId: input.firstGameTeamId,
      secondGameTeamId: input.secondGameTeamId,
      firstPosition: input.firstPosition,
      secondPosition: input.secondPosition,
      locale: ctx.locale,
    });
  });
