import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";

import { groups } from "@repo/db";

import { type db } from "#src/db";
import type { GameCreateVenueContext } from "#src/games/utils";

type DbClient = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];

/** A Club Group's Games are held at its linked Venue; a Loose Group picks one. */
export async function loadGameCreateVenueContext(
  database: DbClient,
  groupId: string | undefined,
): Promise<GameCreateVenueContext> {
  if (!groupId) {
    return { locked: false, groupKind: "none", linkedVenueId: null };
  }

  const group = await database.query.groups.findFirst({
    where: eq(groups.id, groupId),
    columns: { id: true, venueId: true },
  });
  if (!group) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Group not found",
    });
  }
  if (!group.venueId) {
    return { locked: false, groupKind: "loose", linkedVenueId: null };
  }

  return { locked: true, groupKind: "club", linkedVenueId: group.venueId };
}
