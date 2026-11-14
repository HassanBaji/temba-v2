import { TRPCError } from "@trpc/server";
import { and, eq, isNull } from "drizzle-orm";
import { z } from "zod";

import {
  gamePlayers,
  games,
  groupJoinRequests,
  GroupJoinRequestStatusEnum,
  groupMembers,
  groupTierPoints,
} from "@repo/db";
import { messagesFor } from "@repo/i18n/messages";
import { DEFAULT_LOCALE, type Locale } from "@repo/i18n/locale";

import { protectedProcedure } from "#src/trpc";
import { resolveAppUser } from "#src/auth/resolve-app-user";
import { type db } from "#src/db";
import { isAppointedOrganizer } from "#src/groups/helpers/appointed-organizers";
import { assertGroupApprover } from "#src/groups/helpers/is-group-approver";
import { requireGroup } from "#src/groups/helpers/require-group";

type DbClient = typeof db;
type Tx = Parameters<Parameters<DbClient["transaction"]>[0]>[0];

const UNDOABLE_STATUSES: string[] = [
  GroupJoinRequestStatusEnum.APPROVED,
  GroupJoinRequestStatusEnum.REJECTED,
  GroupJoinRequestStatusEnum.BLOCKED,
];

/** A seat on any Game of the Group that was not cancelled, played or still to play. */
async function hasGroupGameSeat(tx: Tx, groupId: string, userId: string) {
  const [seat] = await tx
    .select({ id: gamePlayers.id })
    .from(gamePlayers)
    .innerJoin(games, eq(games.id, gamePlayers.gameId))
    .where(
      and(
        eq(games.groupId, groupId),
        isNull(games.cancelledAt),
        eq(gamePlayers.userId, userId),
      ),
    )
    .limit(1);
  return seat != null;
}

export async function undoJoinRequestDecision(
  database: DbClient,
  args: { requestId: string; userId: string; locale?: Locale },
) {
  const locale = args.locale ?? DEFAULT_LOCALE;
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

  if (!UNDOABLE_STATUSES.includes(request.status)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: messagesFor(locale).group.errors.joinRequestNotDecided,
    });
  }

  await database.transaction(async (tx) => {
    if (request.status === "approved") {
      const membership = await tx.query.groupMembers.findFirst({
        where: and(
          eq(groupMembers.groupId, group.id),
          eq(groupMembers.userId, request.userId),
        ),
        columns: { id: true },
      });
      if (membership) {
        if (await hasGroupGameSeat(tx, group.id, request.userId)) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: messagesFor(locale).group.errors.alreadyPlayed,
          });
        }
        if (await isAppointedOrganizer(tx, group, request.userId)) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: messagesFor(locale).group.errors.isOrganizer,
          });
        }
        await tx.delete(groupMembers).where(eq(groupMembers.id, membership.id));
        await tx
          .delete(groupTierPoints)
          .where(
            and(
              eq(groupTierPoints.groupId, group.id),
              eq(groupTierPoints.userId, request.userId),
            ),
          );
      }
    }

    await tx
      .update(groupJoinRequests)
      .set({
        status: GroupJoinRequestStatusEnum.PENDING,
        decidedBy: null,
        updatedAt: new Date(),
      })
      .where(eq(groupJoinRequests.id, request.id));
  });

  return { ok: true as const };
}

export const undoJoinRequestDecisionProcedure = protectedProcedure
  .input(z.object({ requestId: z.string().uuid() }))
  .mutation(async ({ ctx, input }) => {
    const appUser = await resolveAppUser(ctx.userId);
    return undoJoinRequestDecision(ctx.db, {
      requestId: input.requestId,
      userId: appUser.id,
      locale: ctx.locale,
    });
  });
