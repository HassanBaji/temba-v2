import { TRPCError } from "@trpc/server";

import { isAppointedOrganizer } from "#src/groups/helpers/appointed-organizers";
import { requireGroup } from "#src/groups/helpers/require-group";
import { type db } from "#src/db";

type DbClient = typeof db;

export async function requireLooseInviter(
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

  if (
    group.createdBy !== callerId &&
    !(await isAppointedOrganizer(database, group, callerId))
  ) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Only the creator or an Organizer can manage invites for this Group",
    });
  }

  return group;
}
