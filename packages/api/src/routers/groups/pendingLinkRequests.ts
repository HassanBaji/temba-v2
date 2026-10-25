import { and, asc, eq, isNull } from "drizzle-orm";

import {
  groupLinkRequests,
  GroupLinkRequestStatusEnum,
  groups,
  venues,
} from "@repo/db";

import { resolveAppUser } from "#src/auth/resolve-app-user";
import { type db } from "#src/db";
import { protectedProcedure } from "#src/trpc";

type DbClient = typeof db;

export async function pendingLinkRequests(
  database: DbClient,
  args: { userId: string },
) {
  return database
    .select({
      id: groupLinkRequests.id,
      groupId: groups.id,
      groupName: groups.name,
      venueId: venues.id,
      venueName: venues.name,
      venueLogoImageUrl: venues.logoImageUrl,
      createdAt: groupLinkRequests.createdAt,
    })
    .from(groupLinkRequests)
    .innerJoin(groups, eq(groups.id, groupLinkRequests.groupId))
    .innerJoin(venues, eq(venues.id, groupLinkRequests.venueId))
    .where(
      and(
        eq(groupLinkRequests.status, GroupLinkRequestStatusEnum.PENDING),
        eq(groups.createdBy, args.userId),
        isNull(groups.communityId),
        isNull(venues.archivedAt),
      ),
    )
    .orderBy(asc(groupLinkRequests.createdAt), asc(groupLinkRequests.id));
}

export const pendingLinkRequestsProcedure = protectedProcedure.query(
  async ({ ctx }) => {
    const appUser = await resolveAppUser(ctx.userId);
    return pendingLinkRequests(ctx.db, { userId: appUser.id });
  },
);
