import { TRPCError } from "@trpc/server";
import { and, eq, isNull } from "drizzle-orm";
import { z } from "zod";

import {
  gameInviteLinks,
  gameLevelRangeRequests,
  GameLevelRangeRequestStatusEnum,
  gameMemberInvites,
  type GroupJoinRequestHeldSeat,
} from "@repo/db";

import {
  type FootballPosition,
  type FootballRole,
} from "@repo/domain/football-lineup";
import { isFootballGame } from "@repo/domain/game-shape";
import {
  footballPositionSchema,
  footballRoleSchema,
} from "@repo/validators/football";

import { protectedProcedure } from "#src/trpc";
import { resolveAppUser } from "#src/auth/resolve-app-user";
import { type db } from "#src/db";
import {
  canViewGame,
  isGameOrganizer,
  isRegistrationOpen,
  requireGame,
} from "#src/games/access";
import { userAlreadyOnGame } from "#src/games/helpers/user-already-on-game";
import { userAlreadyWaitlisted } from "#src/games/helpers/user-already-waitlisted";
import { asRequestStatus } from "#src/games/level-range-requests";
import {
  displayedLevelPassesRange,
  displayedLevelTenthsForUser,
  gameHasLevelRange,
} from "#src/games/user-allowed-by-level-range";
import { notifyLevelRangeRequested } from "#src/notifications/notify-requests";

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

async function inviteTokenMatchesGame(
  database: DbClient,
  gameId: string,
  inviteToken: string,
) {
  const link = await database.query.gameInviteLinks.findFirst({
    where: eq(gameInviteLinks.token, inviteToken),
    columns: { gameId: true },
  });
  return link?.gameId === gameId;
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
    return inviteTokenMatchesGame(database, game.id, inviteToken);
  }
  return false;
}

function refuseIfNotOpenForRequests(
  game: Awaited<ReturnType<typeof requireGame>>,
  now: Date,
) {
  if (game.cancelledAt || !isRegistrationOpen(game, now)) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "This Game is not open for registration",
    });
  }
}

export type RequestLevelRangeArgs = {
  gameId: string;
  userId: string;
  inviteToken?: string;
  /** The seat the requester picked; approval seats them there (ADR-0057). */
  sideIndex?: number;
  position?: "left" | "right" | "either";
  football?: { role: FootballRole; position: FootballPosition };
};

function heldSeatOf(
  game: { sport: string | null },
  args: RequestLevelRangeArgs,
): GroupJoinRequestHeldSeat | null {
  if (args.football && isFootballGame(game)) {
    return { kind: "football", ...args.football };
  }
  if (args.sideIndex != null && args.position) {
    return {
      kind: "position",
      sideIndex: args.sideIndex,
      position: args.position,
    };
  }
  return null;
}

export async function requestLevelRange(
  database: DbClient,
  args: RequestLevelRangeArgs,
) {
  const game = await requireGame(database, args.gameId);
  const now = new Date();
  const heldSeat = heldSeatOf(game, args);

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

  refuseIfNotOpenForRequests(game, now);

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
    if (heldSeat) {
      await database
        .update(gameLevelRangeRequests)
        .set({ heldSeat, updatedAt: now })
        .where(eq(gameLevelRangeRequests.id, existing.id));
    }
    return {
      id: existing.id,
      status: asRequestStatus(existing.status),
    };
  }

  return database.transaction(async (tx) => {
    const [request] =
      existing?.status === "rejected"
        ? await tx
            .update(gameLevelRangeRequests)
            .set({
              status: GameLevelRangeRequestStatusEnum.PENDING,
              decidedBy: null,
              heldSeat,
              updatedAt: new Date(),
            })
            .where(eq(gameLevelRangeRequests.id, existing.id))
            .returning()
        : await tx
            .insert(gameLevelRangeRequests)
            .values({
              gameId: game.id,
              userId: args.userId,
              status: GameLevelRangeRequestStatusEnum.PENDING,
              heldSeat,
            })
            .returning();
    if (!request) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to create Level range request",
      });
    }
    await notifyLevelRangeRequested(tx, {
      game,
      requesterUserId: args.userId,
    });
    return {
      id: request.id,
      status: asRequestStatus(request.status),
    };
  });
}

export const requestLevelRangeProcedure = protectedProcedure
  .input(
    z.object({
      gameId: z.string().uuid(),
      inviteToken: z.string().min(1).optional(),
      sideIndex: z.number().int().min(1).optional(),
      position: z.enum(["left", "right", "either"]).optional(),
      football: z
        .object({ role: footballRoleSchema, position: footballPositionSchema })
        .optional(),
    }),
  )
  .mutation(async ({ ctx, input }) => {
    const appUser = await resolveAppUser(ctx.userId);
    return requestLevelRange(ctx.db, {
      gameId: input.gameId,
      userId: appUser.id,
      inviteToken: input.inviteToken,
      sideIndex: input.sideIndex,
      position: input.position,
      football: input.football,
    });
  });
