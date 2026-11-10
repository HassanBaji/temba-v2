import { TRPCError } from "@trpc/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";

import { groupLinkRequests, GroupLinkRequestStatusEnum } from "@repo/db";
import { messagesFor } from "@repo/i18n/messages";
import { DEFAULT_LOCALE, type Locale } from "@repo/i18n/locale";

import { resolveAppUser } from "#src/auth/resolve-app-user";
import { type db } from "#src/db";
import { protectedProcedure } from "#src/trpc";
import { requireVenueManager } from "#src/venues/helpers/require-venue-manager";

type DbClient = typeof db;

export async function cancelGroupLinkRequest(
  database: DbClient,
  args: {
    requestId: string;
    actor: {
      userId: string;
      publicMetadata: Record<string, unknown> | undefined;
    };
    locale?: Locale;
  },
) {
  const locale = args.locale ?? DEFAULT_LOCALE;
  const request = await database.query.groupLinkRequests.findFirst({
    where: eq(groupLinkRequests.id, args.requestId),
    columns: { id: true, venueId: true, status: true },
  });
  if (!request) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: messagesFor(locale).group.errors.linkRequestNotFound,
    });
  }
  await requireVenueManager(database, {
    venueId: request.venueId,
    ...args.actor,
    locale,
  });

  const [cancelled] = await database
    .update(groupLinkRequests)
    .set({
      status: GroupLinkRequestStatusEnum.CANCELLED,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(groupLinkRequests.id, request.id),
        eq(groupLinkRequests.status, GroupLinkRequestStatusEnum.PENDING),
      ),
    )
    .returning({ id: groupLinkRequests.id });
  if (!cancelled) {
    throw new TRPCError({
      code: "CONFLICT",
      message: messagesFor(locale).group.errors.linkRequestNotPending,
    });
  }

  return { ok: true as const, id: cancelled.id };
}

export const cancelGroupLinkRequestProcedure = protectedProcedure
  .input(z.object({ requestId: z.string().uuid() }))
  .mutation(async ({ ctx, input }) => {
    const appUser = await resolveAppUser(ctx.userId);
    return cancelGroupLinkRequest(ctx.db, {
      requestId: input.requestId,
      actor: {
        userId: appUser.id,
        publicMetadata: await ctx.getPublicMetadata(),
      },
      locale: ctx.locale,
    });
  });
