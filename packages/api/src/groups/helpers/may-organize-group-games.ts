import type { DbClient, DbTx } from "@repo/db";

import { isAppointedOrganizer } from "#src/groups/helpers/appointed-organizers";

type DbOrTx = DbClient | DbTx;

type GroupForOrganize = {
  id: string;
  createdBy: string;
};

/** The Group creator or an Appointed Organizer. */
export async function mayOrganizeGroupGames(
  database: DbOrTx,
  group: GroupForOrganize,
  userId: string,
) {
  if (group.createdBy === userId) {
    return true;
  }
  return isAppointedOrganizer(database, group, userId);
}
