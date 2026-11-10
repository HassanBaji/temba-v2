import { TRPCError } from "@trpc/server";
import { and, eq } from "drizzle-orm";

import {
  gameLevelRangeRequests,
  GameLevelRangeRequestStatusEnum,
} from "@repo/db";
import { messagesFor } from "@repo/i18n/messages";
import { DEFAULT_LOCALE, type Locale } from "@repo/i18n/locale";

import { type db } from "#src/db";
import {
  assertGameOrganizer,
  isRegistrationOpen,
  requireGame,
} from "#src/games/access";
import { userAlreadyOnGame } from "#src/games/helpers/user-already-on-game";
import { userAlreadyWaitlisted } from "#src/games/helpers/user-already-waitlisted";
import {
  displayedLevelPassesRange,
  displayedLevelTenthsForUser,
  gameHasLevelRange,
  userAllowedByLevelRange,
} from "#src/games/user-allowed-by-level-range";

type DbClient = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];

export function asRequestStatus(status: string) {
  if (status === "approved" || status === "rejected" || status === "pending") {
    return status;
  }
  return "pending" as const;
}

export async function upsertApprovedLevelRangeWaiver(
  database: DbClient,
  args: { gameId: string; userId: string; decidedBy: string },
) {
  const existing = await database.query.gameLevelRangeRequests.findFirst({
    where: and(
      eq(gameLevelRangeRequests.gameId, args.gameId),
      eq(gameLevelRangeRequests.userId, args.userId),
    ),
    columns: { id: true },
  });
  const now = new Date();
  if (existing) {
    await database
      .update(gameLevelRangeRequests)
      .set({
        status: GameLevelRangeRequestStatusEnum.APPROVED,
        decidedBy: args.decidedBy,
        updatedAt: now,
      })
      .where(eq(gameLevelRangeRequests.id, existing.id));
    return;
  }
  await database.insert(gameLevelRangeRequests).values({
    gameId: args.gameId,
    userId: args.userId,
    status: GameLevelRangeRequestStatusEnum.APPROVED,
    decidedBy: args.decidedBy,
  });
}

export async function requirePendingLevelRangeRequest(
  database: DbClient,
  requestId: string,
  actorUserId: string,
  action: "approve" | "reject",
  locale: Locale = DEFAULT_LOCALE,
) {
  const request = await database.query.gameLevelRangeRequests.findFirst({
    where: eq(gameLevelRangeRequests.id, requestId),
  });
  if (!request) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: messagesFor(locale).game.errors.levelRequestNotFound,
    });
  }
  const game = await requireGame(database, request.gameId, locale);
  await assertGameOrganizer(database, game, actorUserId, locale);

  if (game.cancelledAt) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: messagesFor(locale).game.errors.levelRequestClosed[action],
    });
  }

  if (request.status !== "pending") {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: messagesFor(locale).game.errors.levelRequestNotPending,
    });
  }

  return request;
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
  const now = new Date();
  const openForRequests = !game.cancelledAt && isRegistrationOpen(game, now);
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

  return {
    viewerLevelTenths: tenths,
    viewerPassesLevelRange,
    levelRangeRequest: request
      ? { id: request.id, status: asRequestStatus(request.status) }
      : null,
    canRequestLevelRange,
  };
}
