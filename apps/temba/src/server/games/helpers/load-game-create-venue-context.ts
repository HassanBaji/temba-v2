import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";

import { communities, groups } from "@repo/db";

import { type db } from "~/server/db";
import type { GameCreateVenueContext } from "~/server/games/utils";

type DbClient = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];

export async function loadGameCreateVenueContext(
  database: DbClient,
  groupId: string | undefined,
): Promise<GameCreateVenueContext> {
  if (!groupId) {
    return { locked: false, groupKind: "none", linkedVenueId: null };
  }

  const group = await database.query.groups.findFirst({
    where: eq(groups.id, groupId),
    columns: { id: true, communityId: true },
  });
  if (!group) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Group not found",
    });
  }
  if (!group.communityId) {
    return { locked: false, groupKind: "loose", linkedVenueId: null };
  }

  const community = await database.query.communities.findFirst({
    where: eq(communities.id, group.communityId),
    columns: { id: true, venueId: true },
  });
  if (!community?.venueId) {
    return { locked: false, groupKind: "club", linkedVenueId: null };
  }

  return {
    locked: true,
    groupKind: "club",
    linkedVenueId: community.venueId,
  };
}
