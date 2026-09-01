import { TRPCError } from "@trpc/server";

import { requireGroup } from "~/server/groups/helpers/require-group";
import { type db } from "~/server/db";

type DbClient = typeof db;

export async function requireLooseCreator(
  database: DbClient,
  groupId: string,
  callerId: string,
) {
  const group = await requireGroup(database, groupId);

  if (group.communityId) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "This Group belongs to a Community",
    });
  }

  if (group.createdBy !== callerId) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Only the creator can manage invites for this Group",
    });
  }

  return group;
}
