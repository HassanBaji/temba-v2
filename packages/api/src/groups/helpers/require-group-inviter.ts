import { TRPCError } from "@trpc/server";

import { isAppointedOrganizer } from "#src/groups/helpers/appointed-organizers";
import { requireGroup } from "#src/groups/helpers/require-group";
import { type db } from "#src/db";

type DbClient = typeof db;

/** Who manages a Group's invites: its creator and its Appointed Organizers. */
export async function requireGroupInviter(
  database: DbClient,
  groupId: string,
  callerId: string,
) {
  const group = await requireGroup(database, groupId);

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
