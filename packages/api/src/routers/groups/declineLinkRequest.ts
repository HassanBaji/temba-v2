import { TRPCError } from "@trpc/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";

import {
  groupLinkRequests,
  GroupLinkRequestStatusEnum,
  groups,
} from "@repo/db";
import { messagesFor } from "@repo/i18n/messages";
import { DEFAULT_LOCALE, type Locale } from "@repo/i18n/locale";

import { resolveAppUser } from "#src/auth/resolve-app-user";
import { type db } from "#src/db";
import { protectedProcedure } from "#src/trpc";

type DbClient = typeof db;

export async function declineLinkRequest(
  database: DbClient,
  args: { requestId: string; userId: string; locale?: Locale },
) {
  const locale = args.locale ?? DEFAULT_LOCALE;
  const request = await database.query.groupLinkRequests.findFirst({
    where: eq(groupLinkRequests.id, args.requestId),
    columns: { id: true, groupId: true },
  });
  if (!request) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: messagesFor(locale).group.errors.linkRequestNotFound,
    });
  }

  const group = await database.query.groups.findFirst({
    where: eq(groups.id, request.groupId),
    columns: { createdBy: true },
  });
  if (group?.createdBy !== args.userId) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: messagesFor(locale).group.errors.creatorDecides,
    });
  }

  const [declined] = await database
    .update(groupLinkRequests)
    .set({
      status: GroupLinkRequestStatusEnum.REJECTED,
      decidedBy: args.userId,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(groupLinkRequests.id, request.id),
        eq(groupLinkRequests.status, GroupLinkRequestStatusEnum.PENDING),
      ),
    )
    .returning({ id: groupLinkRequests.id });
  if (!declined) {
    throw new TRPCError({
      code: "CONFLICT",
      message: messagesFor(locale).group.errors.linkRequestNotPending,
    });
  }

  return { ok: true as const, id: declined.id };
}

export const declineLinkRequestProcedure = protectedProcedure
  .input(z.object({ requestId: z.string().uuid() }))
  .mutation(async ({ ctx, input }) => {
    const appUser = await resolveAppUser(ctx.userId);
    return declineLinkRequest(ctx.db, {
      requestId: input.requestId,
      userId: appUser.id,
      locale: ctx.locale,
    });
  });
