import { and, eq } from "drizzle-orm";
import { z } from "zod";

import { type Locale } from "@repo/i18n/locale";

import { gamePlayers, gameTeamPlayers } from "@repo/db";
import { isPartnerRequiredGame } from "@repo/domain/tournament-rounds";

import { protectedProcedure } from "#src/trpc";
import { resolveAppUser } from "#src/auth/resolve-app-user";
import { type db } from "#src/db";
import {
  assertGameNotFrozen,
  gameAdminUserIds,
  type GameRow,
  requireGame,
  requireNotChallengeGame,
} from "#src/games/access";
import { assertPoolDrawNotPosted } from "#src/games/assert-pool-draw-not-posted";
import { leaveRegisteredSeat } from "#src/games/leave-registered-seat";
import { notify } from "#src/notifications/notify";

type DbClient = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];
type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

/** Before the draw, leaving a partner-required Game removes the whole Game team. */
async function partnerRemovedWithLeaver(
  tx: Tx,
  game: GameRow,
  userId: string,
): Promise<string | null> {
  if (!isPartnerRequiredGame(game)) {
    return null;
  }
  const player = await tx.query.gamePlayers.findFirst({
    where: and(eq(gamePlayers.gameId, game.id), eq(gamePlayers.userId, userId)),
    columns: { id: true },
  });
  if (!player) {
    return null;
  }
  const link = await tx.query.gameTeamPlayers.findFirst({
    where: eq(gameTeamPlayers.gamePlayerId, player.id),
    columns: { gameTeamId: true },
  });
  if (!link) {
    return null;
  }
  const occupants = await tx.query.gameTeamPlayers.findMany({
    where: eq(gameTeamPlayers.gameTeamId, link.gameTeamId),
    with: { gamePlayer: { columns: { userId: true } } },
  });
  const partner = occupants.find(
    (occupant) => occupant.gamePlayer.userId !== userId,
  );
  return partner?.gamePlayer.userId ?? null;
}

async function notifyGameLeft(
  tx: Tx,
  game: GameRow,
  leaverUserId: string,
  partnerUserId: string | null,
) {
  const adminIds = await gameAdminUserIds(tx, game);
  await notify(tx, {
    type: "game_player_left",
    recipients: adminIds.map((userId) => ({ userId, audience: "admin" })),
    excludeUserIds: [leaverUserId],
    actorUserId: leaverUserId,
    partnerUserId,
    groupId: game.groupId,
    gameId: game.id,
  });
}

export async function leaveGame(
  database: DbClient,
  args: { gameId: string; userId: string; now?: Date; locale?: Locale },
) {
  const game = await requireGame(database, args.gameId);
  requireNotChallengeGame(game, args.locale);
  assertPoolDrawNotPosted(game);
  // Once played, the roster is the record of who played: only the Organizer
  // changes it, through kick and add.
  await assertGameNotFrozen(
    database,
    game,
    args.now ?? new Date(),
    args.locale,
    "This Game has been played. Ask the organizer to remove you.",
  );
  await database.transaction(async (tx) => {
    const partnerUserId = await partnerRemovedWithLeaver(tx, game, args.userId);
    await leaveRegisteredSeat(tx, game, args.userId);
    await notifyGameLeft(tx, game, args.userId, partnerUserId);
  });
  return { ok: true as const };
}

export const leave = protectedProcedure
  .input(z.object({ gameId: z.string().uuid() }))
  .mutation(async ({ ctx, input }) => {
    const appUser = await resolveAppUser(ctx.userId);
    return leaveGame(ctx.db, {
      gameId: input.gameId,
      userId: appUser.id,
      locale: ctx.locale,
    });
  });
