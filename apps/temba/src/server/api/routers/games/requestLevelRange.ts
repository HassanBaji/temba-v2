import { TRPCError } from "@trpc/server";
import { and, eq, isNull } from "drizzle-orm";
import { z } from "zod";

import {
  gameInviteLinks,
  gameLevelRangeRequests,
  GameLevelRangeRequestStatusEnum,
  gameMemberInvites,
} from "@repo/db";

import { protectedProcedure } from "~/server/api/trpc";
import { resolveAppUser } from "~/server/auth/resolve-app-user";
import { type db } from "~/server/db";
import {
  canViewGame,
  isClubGroupGameJoinFrozen,
  isGameOrganizer,
  isRegistrationOpen,
  requireGame,
} from "~/server/games/access";
import { userAlreadyOnGame } from "~/server/games/helpers/user-already-on-game";
import { userAlreadyWaitlisted } from "~/server/games/helpers/user-already-waitlisted";
import { asRequestStatus } from "~/server/games/level-range-requests";
import { isInviteLinkLive } from "~/server/invites/invite-link-expiry";
import {
  displayedLevelPassesRange,
  displayedLevelTenthsForUser,
  gameHasLevelRange,
} from "~/server/games/user-allowed-by-level-range";

type DbClient = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];

async function hasUnusedLookupInvite(
  database: DbClient,
  gameId: string,
  userId: string,
) {
  const invite = await database.query.gameMemberInvites.findFirst({
    where: and(
      eq(gameMemberInvites.gameId, gameId),
      eq(gameMemberInvites.userId, userId),
      isNull(gameMemberInvites.acceptedAt),
      isNull(gameMemberInvites.revokedAt),
    ),
    columns: { id: true },
  });
  return Boolean(invite);
}

async function liveInviteTokenMatchesGame(
  database: DbClient,
  gameId: string,
  inviteToken: string,
) {
  const link = await database.query.gameInviteLinks.findFirst({
    where: eq(gameInviteLinks.token, inviteToken),
    columns: { gameId: true, expiresAt: true },
  });
  if (link?.gameId !== gameId) {
    return false;
  }
  return isInviteLinkLive(link.expiresAt);
}

async function canAuthorizeLevelRangeRequest(
  database: DbClient,
  game: Awaited<ReturnType<typeof requireGame>>,
  userId: string,
  inviteToken?: string,
) {
  if (await canViewGame(database, game, userId)) {
    return true;
  }
  if (await hasUnusedLookupInvite(database, game.id, userId)) {
    return true;
  }
  if (inviteToken) {
    return liveInviteTokenMatchesGame(database, game.id, inviteToken);
  }
  return false;
}

function refuseIfNotOpenForRequests(
  game: Awaited<ReturnType<typeof requireGame>>,
  joinFrozen: boolean,
  now: Date,
) {
  if (game.cancelledAt || joinFrozen || !isRegistrationOpen(game, now)) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "This Game is not open for registration",
    });
  }
}

export async function requestLevelRange(
  database: DbClient,
  args: { gameId: string; userId: string; inviteToken?: string },
) {
  const game = await requireGame(database, args.gameId);
  const now = new Date();
  const joinFrozen = await isClubGroupGameJoinFrozen(database, game);

  if (
    !(await canAuthorizeLevelRangeRequest(
      database,
      game,
      args.userId,
      args.inviteToken,
    ))
  ) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Game not found",
    });
  }

  if (!gameHasLevelRange(game)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "This Game has no Level range",
    });
  }

  if (await isGameOrganizer(database, game, args.userId)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Organizers do not request a Level range exception",
    });
  }

  if (await userAlreadyOnGame(database, game.id, args.userId)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "You are already registered on this Game",
    });
  }
  if (await userAlreadyWaitlisted(database, game.id, args.userId)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "You are already on the waitlist",
    });
  }

  refuseIfNotOpenForRequests(game, joinFrozen, now);

  const existing = await database.query.gameLevelRangeRequests.findFirst({
    where: and(
      eq(gameLevelRangeRequests.gameId, game.id),
      eq(gameLevelRangeRequests.userId, args.userId),
    ),
  });

  if (existing?.status === "approved") {
    return {
      id: existing.id,
      status: asRequestStatus(existing.status),
    };
  }

  const tenths = await displayedLevelTenthsForUser(
    database,
    args.userId,
    game.sport,
  );
  if (tenths != null && displayedLevelPassesRange(tenths, game)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Your Level is already within this Game's range",
    });
  }

  if (existing?.status === "pending") {
    return {
      id: existing.id,
      status: asRequestStatus(existing.status),
    };
  }

  if (existing?.status === "rejected") {
    const [updated] = await database
      .update(gameLevelRangeRequests)
      .set({
        status: GameLevelRangeRequestStatusEnum.PENDING,
        decidedBy: null,
        updatedAt: new Date(),
      })
      .where(eq(gameLevelRangeRequests.id, existing.id))
      .returning();
    if (!updated) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to re-request Level range",
      });
    }
    return {
      id: updated.id,
      status: asRequestStatus(updated.status),
    };
  }

  const [created] = await database
    .insert(gameLevelRangeRequests)
    .values({
      gameId: game.id,
      userId: args.userId,
      status: GameLevelRangeRequestStatusEnum.PENDING,
    })
    .returning();
  if (!created) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Failed to create Level range request",
    });
  }
  return {
    id: created.id,
    status: asRequestStatus(created.status),
  };
}

export const requestLevelRangeProcedure = protectedProcedure
  .input(
    z.object({
      gameId: z.string().uuid(),
      inviteToken: z.string().min(1).optional(),
    }),
  )
  .mutation(async ({ ctx, input }) => {
    const appUser = await resolveAppUser(ctx.userId);
    return requestLevelRange(ctx.db, {
      gameId: input.gameId,
      userId: appUser.id,
      inviteToken: input.inviteToken,
    });
  });
