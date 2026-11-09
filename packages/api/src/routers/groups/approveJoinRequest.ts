import { TRPCError } from "@trpc/server";
import { DEFAULT_LOCALE, type Locale } from "@repo/i18n/locale";
import { eq } from "drizzle-orm";
import { z } from "zod";

import {
  groupJoinRequests,
  GroupJoinRequestStatusEnum,
  groupMembers,
  type GroupJoinRequestHeldSeat,
} from "@repo/db";

import { isSeatHoldLive } from "@repo/domain/invites";
import { messagesFor } from "@repo/i18n/messages";

import { protectedProcedure } from "#src/trpc";
import { resolveAppUser } from "#src/auth/resolve-app-user";
import { type db } from "#src/db";
import {
  seatRequesterOnGame,
  type HeldSeatOutcome,
} from "#src/games/seat-holds";
import { assertGroupApprover } from "#src/groups/helpers/is-group-approver";
import { requireGroup } from "#src/groups/helpers/require-group";
import { notifyGroupJoined } from "#src/notifications/notify-group-joined";
import { notifyGroupJoinDecided } from "#src/notifications/notify-requests";

type DbClient = typeof db;
type Tx = Parameters<Parameters<DbClient["transaction"]>[0]>[0];
export type { HeldSeatOutcome } from "#src/games/seat-holds";

/** No hold, or a lapsed one, approves the membership alone. */
async function seatHeldGame(
  tx: Tx,
  request: {
    userId: string;
    heldGameId: string | null;
    seatHeldUntil: Date | null;
    heldSeat: GroupJoinRequestHeldSeat | null;
  },
  approverUserId: string,
  locale: Locale,
  now: Date,
): Promise<HeldSeatOutcome> {
  if (!request.heldGameId || !request.seatHeldUntil) {
    return null;
  }
  if (!isSeatHoldLive(request.seatHeldUntil, now)) {
    return "lapsed";
  }
  return seatRequesterOnGame(tx, {
    gameId: request.heldGameId,
    userId: request.userId,
    heldSeat: request.heldSeat,
    approverUserId,
    locale,
    now,
  });
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
      message: messagesFor(locale).group.errors.joinRequestNotFound,
    });
  }

  const group = await requireGroup(database, request.groupId, locale);

  await assertGroupApprover(database, group, args.userId, locale);

  const heldSeat = await database.transaction(async (tx) => {
    const [locked] = await tx
      .select()
      .from(groupJoinRequests)
      .where(eq(groupJoinRequests.id, request.id))
      .for("update");
    if (locked?.status !== "pending") {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: messagesFor(locale).group.errors.joinRequestNotPending,
      });
    }
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

    const [joined] = await tx
      .insert(groupMembers)
      .values({ groupId: group.id, userId: request.userId })
      .onConflictDoNothing({
        target: [groupMembers.groupId, groupMembers.userId],
      })
      .returning({ id: groupMembers.id });
    if (joined) {
      await notifyGroupJoined(tx, {
        group,
        joinerUserId: request.userId,
        decidedByUserId: args.userId,
      });
    }
    const heldSeat = await seatHeldGame(tx, locked, args.userId, locale, now);
    await notifyGroupJoinDecided(tx, {
      group,
      requesterUserId: request.userId,
      deciderUserId: args.userId,
      approved: true,
      gameId:
        heldSeat === "registered" || heldSeat === "waitlisted"
          ? locked.heldGameId
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
