import { and, asc, count, ilike, inArray, isNull } from "drizzle-orm";
import { z } from "zod";

import { groupMembers, groups, type DbClient } from "@repo/db";

import { operatorProcedure } from "#src/trpc";

const SEARCH_LIMIT = 20;

/** Loose Groups, public or private, that an Operator may link to a Venue. */
export async function searchGroupsToLink(
  database: DbClient,
  args: { query: string },
) {
  const rows = await database
    .select({
      id: groups.id,
      name: groups.name,
      type: groups.type,
      sport: groups.sport,
      imageUrl: groups.imageUrl,
    })
    .from(groups)
    .where(
      and(
        isNull(groups.venueId),
        isNull(groups.deletedAt),
        ilike(groups.name, `%${args.query}%`),
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

export const searchGroupsToLinkProcedure = operatorProcedure
  .input(z.object({ query: z.string().trim().min(2).max(255) }))
  .query(async ({ ctx, input }) => {
    return searchGroupsToLink(ctx.db, input);
  });
