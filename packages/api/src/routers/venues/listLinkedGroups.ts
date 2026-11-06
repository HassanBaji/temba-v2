import { and, asc, count, desc, eq, inArray, isNull } from "drizzle-orm";
import { z } from "zod";

import {
  groupLinkRequests,
  GroupLinkRequestStatusEnum,
  groupMembers,
  groups,
} from "@repo/db";

import { resolveAppUser } from "#src/auth/resolve-app-user";
import { type db } from "#src/db";
import { protectedProcedure } from "#src/trpc";
import { requireVenue } from "#src/venues/helpers/require-venue";
import { requireVenueManager } from "#src/venues/helpers/require-venue-manager";

type DbClient = typeof db;

const DECLINED_REQUESTS_LIMIT = 20;

/** The Venue's Club Groups and its open and declined Group link requests. */
export async function listLinkedGroups(
  database: DbClient,
  args: {
    venueId: string;
    actor: {
      userId: string;
      publicMetadata: Record<string, unknown> | undefined;
    };
  },
) {
  const venue = await requireVenue(database, args.venueId);
  await requireVenueManager(database, {
    venueId: venue.id,
    ...args.actor,
  });

  const clubGroups = await database
    .select({
      id: groups.id,
      name: groups.name,
      type: groups.type,
      sport: groups.sport,
    })
    .from(groups)
    .where(and(eq(groups.venueId, venue.id), isNull(groups.deletedAt)))
    .orderBy(asc(groups.name), asc(groups.id));

  const memberCounts =
    clubGroups.length > 0
      ? await database
          .select({ groupId: groupMembers.groupId, memberCount: count() })
          .from(groupMembers)
          .where(
            inArray(
              groupMembers.groupId,
              clubGroups.map((group) => group.id),
            ),
          )
          .groupBy(groupMembers.groupId)
      : [];
  const memberCountByGroupId = new Map(
    memberCounts.map((row) => [row.groupId, Number(row.memberCount)]),
  );

  const requestColumns = {
    id: true,
    status: true,
    createdAt: true,
    updatedAt: true,
  } as const;
  const requestWith = {
    group: { columns: { id: true, name: true, sport: true } },
  } as const;
  const pending = await database.query.groupLinkRequests.findMany({
    where: and(
      eq(groupLinkRequests.venueId, venue.id),
      eq(groupLinkRequests.status, GroupLinkRequestStatusEnum.PENDING),
    ),
    columns: requestColumns,
    with: requestWith,
    orderBy: [asc(groupLinkRequests.createdAt)],
  });
  const declined = await database.query.groupLinkRequests.findMany({
    where: and(
      eq(groupLinkRequests.venueId, venue.id),
      eq(groupLinkRequests.status, GroupLinkRequestStatusEnum.REJECTED),
    ),
    columns: requestColumns,
    with: requestWith,
    orderBy: [desc(groupLinkRequests.updatedAt)],
    limit: DECLINED_REQUESTS_LIMIT,
  });

  return {
    venue: { id: venue.id, archived: venue.archivedAt !== null },
    groups: clubGroups.map((group) => ({
      ...group,
      memberCount: memberCountByGroupId.get(group.id) ?? 0,
      canUnlink: true,
    })),
    pendingRequests: pending,
    declinedRequests: declined,
  };
}

export const listLinkedGroupsProcedure = protectedProcedure
  .input(z.object({ venueId: z.string().uuid() }))
  .query(async ({ ctx, input }) => {
    const appUser = await resolveAppUser(ctx.userId);
    return listLinkedGroups(ctx.db, {
      venueId: input.venueId,
      actor: {
        userId: appUser.id,
        publicMetadata: await ctx.getPublicMetadata(),
      },
    });
  });
