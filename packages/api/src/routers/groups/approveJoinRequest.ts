import { TRPCError } from "@trpc/server";
import { DEFAULT_LOCALE, type Locale } from "@repo/i18n/locale";
import { and, eq } from "drizzle-orm";
import { z } from "zod";

import {
  gamePlayers,
  games,
  groupJoinRequests,
  GroupJoinRequestStatusEnum,
  groupMembers,
  type GroupJoinRequestHeldSeat,
} from "@repo/db";

import { isSeatHoldLive } from "@repo/domain/invites";

import { protectedProcedure } from "#src/trpc";
import { resolveAppUser } from "#src/auth/resolve-app-user";
import { type db } from "#src/db";
import { isRegistrationOpen } from "#src/games/access";
import { admitIndividualUser } from "#src/games/invites";
import {
  isIndividualSeatGame,
  listGameSides,
  vacantPositionsFromSides,
} from "#src/games/seats";
import { assertGroupApprover } from "#src/groups/helpers/is-group-approver";
import { requireGroup } from "#src/groups/helpers/require-group";
import { notifyGroupJoined } from "#src/notifications/notify-group-joined";
import { notifyGroupJoinDecided } from "#src/notifications/notify-requests";

type DbClient = typeof db;
type Tx = Parameters<Parameters<DbClient["transaction"]>[0]>[0];

export type HeldSeatOutcome = "registered" | "waitlisted" | "lapsed" | null;

/**
 * Seats the approved requester on the Game their Seat hold names. The hold
 * is best effort: a seat that went meanwhile falls back to any vacant one,
 * a full Game to its Waitlist, and a refusal leaves the approval standing.
 */
async function seatHeldGame(
  tx: Tx,
  request: {
    userId: string;
    heldGameId: string | null;
    seatHeldUntil: Date | null;
    heldSeat: GroupJoinRequestHeldSeat | null;
  },
  locale: Locale,
  now: Date,
): Promise<HeldSeatOutcome> {
  if (!request.heldGameId) {
    return null;
  }
  if (!isSeatHoldLive(request.seatHeldUntil, now)) {
    return "lapsed";
  }
  const game = await tx.query.games.findFirst({
    where: eq(games.id, request.heldGameId),
  });
  if (
    !game ||
    !isRegistrationOpen(game, now) ||
    game.registrationMode === "team_only"
  ) {
    return "lapsed";
  }
  const held = request.heldSeat;
  let seat: { sideIndex: number; position: "left" | "right" } | undefined;
  if (isIndividualSeatGame(game)) {
    const vacant = vacantPositionsFromSides(await listGameSides(tx, game));
    const wanted =
      held?.kind === "position"
        ? vacant.find(
            (entry) =>
              entry.sideIndex === held.sideIndex &&
              entry.position === held.position,
          )
        : undefined;
    seat = wanted ?? vacant[0];
  }
  try {
    return await tx.transaction(async (savepoint) => {
      const admitted = await admitIndividualUser(
        savepoint,
        game,
        request.userId,
        locale,
        now,
        seat,
      );
      if (held?.kind === "football" && !admitted.waitlisted) {
        await savepoint
          .update(gamePlayers)
          .set({
            footballRole: held.role,
            footballPosition: held.position,
            updatedAt: now,
          })
          .where(
            and(
              eq(gamePlayers.gameId, game.id),
              eq(gamePlayers.userId, request.userId),
            ),
          );
      }
      return admitted.waitlisted ? "waitlisted" : "registered";
    });
  } catch (error) {
    if (error instanceof TRPCError) {
      return "lapsed";
    }
    throw error;
  }
}

export async function approveJoinRequest(
  database: DbClient,
  args: { requestId: string; userId: string; locale?: Locale; now?: Date },
) {
  const locale = args.locale ?? DEFAULT_LOCALE;
  const now = args.now ?? new Date();
  const request = await database.query.groupJoinRequests.findFirst({
    where: eq(groupJoinRequests.id, args.requestId),
  });

  if (!request) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Join request not found",
    });
  }

  const group = await requireGroup(database, request.groupId);

  await assertGroupApprover(database, group, args.userId);

  if (request.status !== "pending") {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Join request is not pending",
    });
  }

  const heldSeat = await database.transaction(async (tx) => {
    const [updated] = await tx
      .update(groupJoinRequests)
      .set({
        status: GroupJoinRequestStatusEnum.APPROVED,
        decidedBy: args.userId,
        updatedAt: now,
      })
      .where(eq(groupJoinRequests.id, request.id))
      .returning();

    if (!updated) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to approve join request",
      });
    }

    const existing = await tx.query.groupMembers.findFirst({
      where: and(
        eq(groupMembers.groupId, group.id),
        eq(groupMembers.userId, request.userId),
      ),
      columns: { id: true },
    });
    if (!existing) {
      await tx.insert(groupMembers).values({
        groupId: group.id,
        userId: request.userId,
      });
      await notifyGroupJoined(tx, {
        group,
        joinerUserId: request.userId,
        decidedByUserId: args.userId,
      });
    }
    const heldSeat = await seatHeldGame(tx, request, locale, now);
    await notifyGroupJoinDecided(tx, {
      group,
      requesterUserId: request.userId,
      deciderUserId: args.userId,
      approved: true,
      gameId:
        heldSeat === "registered" || heldSeat === "waitlisted"
          ? request.heldGameId
          : null,
    });
    return heldSeat;
  });

  return { ok: true as const, heldSeat };
}

export const approveJoinRequestProcedure = protectedProcedure
  .input(z.object({ requestId: z.string().uuid() }))
  .mutation(async ({ ctx, input }) => {
    const appUser = await resolveAppUser(ctx.userId);
    return approveJoinRequest(ctx.db, {
      requestId: input.requestId,
      userId: appUser.id,
      locale: ctx.locale,
    });
  });
