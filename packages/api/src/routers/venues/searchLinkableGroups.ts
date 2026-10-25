import {
  and,
  asc,
  count,
  eq,
  ilike,
  inArray,
  isNull,
  notInArray,
} from "drizzle-orm";
import { z } from "zod";

import {
  groupLinkRequests,
  GroupLinkRequestStatusEnum,
  groupMembers,
  groups,
  GroupTypeEnum,
} from "@repo/db";

import { resolveAppUser } from "#src/auth/resolve-app-user";
import { type db } from "#src/db";
import { protectedProcedure } from "#src/trpc";
import { requireVenue } from "#src/venues/helpers/require-venue";
import { requireVenueManager } from "#src/venues/helpers/require-venue-manager";

type DbClient = typeof db;

const SEARCH_LIMIT = 20;

export async function searchLinkableGroups(
  database: DbClient,
  args: {
    venueId: string;
    query: string;
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

  const pendingRows = await database
    .select({ groupId: groupLinkRequests.groupId })
    .from(groupLinkRequests)
    .where(
      and(
        eq(groupLinkRequests.venueId, venue.id),
        eq(groupLinkRequests.status, GroupLinkRequestStatusEnum.PENDING),
      ),
    );
  const pendingGroupIds = pendingRows.map((row) => row.groupId);

  const rows = await database
    .select({
      id: groups.id,
      name: groups.name,
      sport: groups.sport,
      imageUrl: groups.imageUrl,
    })
    .from(groups)
    .where(
      and(
        isNull(groups.communityId),
        eq(groups.type, GroupTypeEnum.PUBLIC),
        ilike(groups.name, `%${args.query}%`),
        pendingGroupIds.length > 0
          ? notInArray(groups.id, pendingGroupIds)
          : undefined,
      ),
    )
    .orderBy(asc(groups.name), asc(groups.id))
    .limit(SEARCH_LIMIT);

  if (rows.length === 0) {
    return [];
  }

  const memberCounts = await database
    .select({ groupId: groupMembers.groupId, memberCount: count() })
    .from(groupMembers)
    .where(
      inArray(
        groupMembers.groupId,
        rows.map((row) => row.id),
      ),
    )
    .groupBy(groupMembers.groupId);
  const memberCountByGroupId = new Map(
    memberCounts.map((row) => [row.groupId, Number(row.memberCount)]),
  );

  return rows.map((row) => ({
    ...row,
    memberCount: memberCountByGroupId.get(row.id) ?? 0,
  }));
}

export const searchLinkableGroupsProcedure = protectedProcedure
  .input(
    z.object({
      venueId: z.string().uuid(),
      query: z.string().trim().min(2).max(255),
    }),
  )
  .query(async ({ ctx, input }) => {
    const appUser = await resolveAppUser(ctx.userId);
    return searchLinkableGroups(ctx.db, {
      ...input,
      actor: {
        userId: appUser.id,
        publicMetadata: await ctx.getPublicMetadata(),
      },
    });
  });
