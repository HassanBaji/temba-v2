import { TRPCError } from "@trpc/server";

import { type Sport } from "@repo/domain/sport";

import { requireGroup } from "#src/groups/helpers/require-group";
import { type db } from "#src/db";
import { isGroupMember } from "#src/games/access";

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

/**
 * The tagged Group's Organizers act for a football Team, and anyone can make a
 * Group, so a Team is tagged only to a Group its Captain belongs to.
 */
export async function requireCaptainInTagGroup(
  database: DbClient,
  groupId: string,
  captainUserId: string,
) {
  if (!(await isGroupMember(database, groupId, captainUserId))) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "A Team can only be tagged to a Group its Captain is in",
    });
  }
}
