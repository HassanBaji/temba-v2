import { asc, ilike } from "drizzle-orm";
import { z } from "zod";

import { groups, type DbClient } from "@repo/db";

import { operatorProcedure } from "#src/trpc";

export const OPERATOR_GROUPS_PAGE_SIZE = 50;

export type GroupVerificationSource = "operator" | "venue_community" | "none";

export async function listForOperator(
  database: DbClient,
  args: { query?: string; cursor?: number; limit?: number },
) {
  const offset = args.cursor ?? 0;
  const limit = args.limit ?? OPERATOR_GROUPS_PAGE_SIZE;
  const query = args.query?.trim();

  const rows = await database.query.groups.findMany({
    where: query ? ilike(groups.name, `%${query}%`) : undefined,
    columns: {
      id: true,
      name: true,
      type: true,
      sport: true,
      verifiedAt: true,
    },
    with: {
      community: {
        columns: { name: true, archivedAt: true, isVenueCommunity: true },
        with: { venue: { columns: { id: true, name: true } } },
      },
    },
    orderBy: [asc(groups.name), asc(groups.id)],
    limit: limit + 1,
    offset,
  });

  const page = rows.slice(0, limit);
  return {
    items: page.map((group) => {
      const venueCommunityVenue = group.community?.isVenueCommunity
        ? group.community.venue
        : null;
      return {
        id: group.id,
        name: group.name,
        type: group.type,
        sport: group.sport,
        communityName: group.community?.name ?? null,
        communityArchived: group.community?.archivedAt != null,
        verifiedAt: group.verifiedAt,
        venueCommunityVenueName: venueCommunityVenue?.name ?? null,
        verificationSource: (group.verifiedAt
          ? "operator"
          : venueCommunityVenue
            ? "venue_community"
            : "none") satisfies GroupVerificationSource,
      };
    }),
    nextCursor: rows.length > limit ? offset + limit : undefined,
  };
}

export const listForOperatorProcedure = operatorProcedure
  .input(
    z.object({
      query: z.string().trim().max(255).optional(),
      cursor: z.number().int().min(0).optional(),
    }),
  )
  .query(async ({ ctx, input }) => {
    return listForOperator(ctx.db, input);
  });
