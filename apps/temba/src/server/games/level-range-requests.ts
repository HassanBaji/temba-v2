import { TRPCError } from "@trpc/server";
import { and, eq, isNull } from "drizzle-orm";

import {
  gameInviteLinks,
  gameLevelRangeRequests,
  GameLevelRangeRequestStatusEnum,
  gameMemberInvites,
  ratings,
} from "@repo/db";

import {
  assertGameOrganizer,
  canViewGame,
  isClubGroupGameJoinFrozen,
  isGameOrganizer,
  isRegistrationOpen,
  requireGame,
} from "~/server/games/access";
import { userAlreadyOnGame } from "~/server/games/helpers/user-already-on-game";
import { userAlreadyWaitlisted } from "~/server/games/helpers/user-already-waitlisted";
import { isInviteLinkLive } from "~/server/invites/invite-link-expiry";
import {
  displayedLevelPassesRange,
  displayedLevelTenthsForUser,
  gameHasLevelRange,
  userAllowedByLevelRange,
} from "~/server/games/user-allowed-by-level-range";
import { isProvisional } from "~/server/ratings/level";
import { type db } from "~/server/db";

type DbClient = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];

function asRequestStatus(status: string) {
  if (status === "approved" || status === "rejected" || status === "pending") {
    return status;
  }
  return "pending" as const;
}

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

export async function listLevelRangeRequests(
  database: DbClient,
  args: { gameId: string; userId: string },
) {
  const game = await requireGame(database, args.gameId);
  await assertGameOrganizer(database, game, args.userId);

  const rows = await database.query.gameLevelRangeRequests.findMany({
    where: and(
      eq(gameLevelRangeRequests.gameId, game.id),
      eq(
        gameLevelRangeRequests.status,
        GameLevelRangeRequestStatusEnum.PENDING,
      ),
    ),
    with: {
      user: { columns: { id: true, name: true, image: true } },
    },
    orderBy: (table, { asc }) => [asc(table.createdAt), asc(table.id)],
  });

  return Promise.all(
    rows.map(async (row) => {
      const tenths = await displayedLevelTenthsForUser(
        database,
        row.userId,
        game.sport,
      );
      const ratingSport = game.sport === "football" ? "football" : "padel";
      const rating = await database.query.ratings.findFirst({
        where: and(
          eq(ratings.userId, row.userId),
          eq(ratings.sport, ratingSport),
        ),
        columns: { phi: true },
      });
      return {
        id: row.id,
        createdAt: row.createdAt,
        user: {
          id: row.user.id,
          name: row.user.name,
          image: row.user.image,
        },
        levelTenths: tenths,
        provisional: rating ? isProvisional(rating.phi) : false,
      };
    }),
  );
}

async function requirePendingLevelRangeRequest(
  database: DbClient,
  requestId: string,
  actorUserId: string,
  action: "approve" | "reject",
) {
  const request = await database.query.gameLevelRangeRequests.findFirst({
    where: eq(gameLevelRangeRequests.id, requestId),
  });
  if (!request) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Level range request not found",
    });
  }
  const game = await requireGame(database, request.gameId);
  await assertGameOrganizer(database, game, actorUserId);

  if (game.cancelledAt || (await isClubGroupGameJoinFrozen(database, game))) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: `Cannot ${action} Level range requests for this Game`,
    });
  }

  if (request.status !== "pending") {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Level range request is not pending",
    });
  }

  return request;
}

export async function approveLevelRangeRequest(
  database: DbClient,
  args: { requestId: string; userId: string },
) {
  const request = await requirePendingLevelRangeRequest(
    database,
    args.requestId,
    args.userId,
    "approve",
  );
  const [updated] = await database
    .update(gameLevelRangeRequests)
    .set({
      status: GameLevelRangeRequestStatusEnum.APPROVED,
      decidedBy: args.userId,
      updatedAt: new Date(),
    })
    .where(eq(gameLevelRangeRequests.id, request.id))
    .returning();
  if (!updated) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Failed to approve Level range request",
    });
  }
  return { ok: true as const };
}

export async function rejectLevelRangeRequest(
  database: DbClient,
  args: { requestId: string; userId: string },
) {
  const request = await requirePendingLevelRangeRequest(
    database,
    args.requestId,
    args.userId,
    "reject",
  );
  const [updated] = await database
    .update(gameLevelRangeRequests)
    .set({
      status: GameLevelRangeRequestStatusEnum.REJECTED,
      decidedBy: args.userId,
      updatedAt: new Date(),
    })
    .where(eq(gameLevelRangeRequests.id, request.id))
    .returning();
  if (!updated) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Failed to reject Level range request",
    });
  }
  return { ok: true as const };
}

export async function viewerLevelRangeFields(
  database: DbClient,
  game: Awaited<ReturnType<typeof requireGame>>,
  userId: string,
  organizer: boolean,
) {
  const tenths = await displayedLevelTenthsForUser(
    database,
    userId,
    game.sport,
  );
  const viewerPassesLevelRange = await userAllowedByLevelRange(
    database,
    game,
    userId,
  );
  const request = await database.query.gameLevelRangeRequests.findFirst({
    where: and(
      eq(gameLevelRangeRequests.gameId, game.id),
      eq(gameLevelRangeRequests.userId, userId),
    ),
    columns: { id: true, status: true },
  });
  const alreadyOnGame = await userAlreadyOnGame(database, game.id, userId);
  const isWaitlisted = await userAlreadyWaitlisted(database, game.id, userId);
  const joinFrozen = await isClubGroupGameJoinFrozen(database, game);
  const now = new Date();
  const openForRequests =
    !game.cancelledAt && !joinFrozen && isRegistrationOpen(game, now);
  const inDisplayedRange =
    tenths != null && displayedLevelPassesRange(tenths, game);
  const approved = request?.status === "approved";
  const canRequestLevelRange =
    gameHasLevelRange(game) &&
    !organizer &&
    !alreadyOnGame &&
    !isWaitlisted &&
    !inDisplayedRange &&
    !approved &&
    openForRequests;

  let pendingLevelRangeRequests:
    | Awaited<ReturnType<typeof listLevelRangeRequests>>
    | undefined;
  if (organizer) {
    pendingLevelRangeRequests = await listLevelRangeRequests(database, {
      gameId: game.id,
      userId,
    });
  }

  return {
    viewerLevelTenths: tenths,
    viewerPassesLevelRange,
    levelRangeRequest: request
      ? { id: request.id, status: asRequestStatus(request.status) }
      : null,
    canRequestLevelRange,
    pendingLevelRangeRequests: pendingLevelRangeRequests ?? [],
  };
}
