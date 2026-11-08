import { TRPCError } from "@trpc/server";

import { type Sport } from "@repo/domain/sport";

import { requireGroup } from "#src/groups/helpers/require-group";
import { type db } from "#src/db";

type DbClient = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];

/** A Group tag points at a live Group of the Team's sport. */
export async function requireTagGroup(
  database: DbClient,
  groupId: string,
  sport: Sport,
) {
  const group = await requireGroup(database, groupId);
  if (group.sport !== sport) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "A Team can only be tagged to a Group of its sport",
    });
  }
  return group;
}
