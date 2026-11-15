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
import { consult, refuseIfFrozen } from "#src/soft-archive";
import { protectedProcedure } from "#src/trpc";
import { requireVenue } from "#src/venues/helpers/require-venue";
import { requireVenueManager } from "#src/venues/helpers/require-venue-manager";

type DbClient = typeof db;

export async function sendGroupLinkRequest(
  database: DbClient,
  args: {
    venueId: string;
    groupId: string;
    actor: {
      userId: string;
      publicMetadata: Record<string, unknown> | undefined;
    };
    locale?: Locale;
  },
) {
  const locale = args.locale ?? DEFAULT_LOCALE;
  const venue = await requireVenue(database, args.venueId, locale);
  await requireVenueManager(database, {
    venueId: venue.id,
    ...args.actor,
    locale,
  });
  refuseIfFrozen(consult({ archivedAt: venue.archivedAt }), "host", {
    frozenMessage: messagesFor(locale).group.errors.linkArchivedVenue,
    notFoundMessage: messagesFor(locale).venue.errors.notFound,
  });

  const group = await database.query.groups.findFirst({
    where: eq(groups.id, args.groupId),
    columns: { id: true, venueId: true },
  });
  if (!group) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: messagesFor(locale).group.errors.notFound,
    });
  }
  if (group.venueId) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: messagesFor(locale).group.errors.looseOnlyLink,
    });
  }

  const pending = await database.query.groupLinkRequests.findFirst({
    where: and(
      eq(groupLinkRequests.groupId, group.id),
      eq(groupLinkRequests.venueId, venue.id),
      eq(groupLinkRequests.status, GroupLinkRequestStatusEnum.PENDING),
    ),
    columns: { id: true },
  });
  if (pending) {
    throw new TRPCError({
      code: "CONFLICT",
      message: messagesFor(locale).group.errors.pendingLinkRequest,
    });
  }

  try {
    const [created] = await database
      .insert(groupLinkRequests)
      .values({
        groupId: group.id,
        venueId: venue.id,
        requestedBy: args.actor.userId,
      })
      .returning({
        id: groupLinkRequests.id,
        groupId: groupLinkRequests.groupId,
        venueId: groupLinkRequests.venueId,
        status: groupLinkRequests.status,
      });
    if (!created) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to create Group link request",
      });
    }
    return created;
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "23505"
    ) {
      throw new TRPCError({
        code: "CONFLICT",
        message: messagesFor(locale).group.errors.pendingLinkRequest,
      });
    }
    throw error;
  }
}

export const sendGroupLinkRequestProcedure = protectedProcedure
  .input(
    z.object({
      venueId: z.string().uuid(),
      groupId: z.string().uuid(),
    }),
  )
  .mutation(async ({ ctx, input }) => {
    const appUser = await resolveAppUser(ctx.userId);
    return sendGroupLinkRequest(ctx.db, {
      ...input,
      actor: {
        userId: appUser.id,
        publicMetadata: await ctx.getPublicMetadata(),
      },
      locale: ctx.locale,
    });
  });
