import { eq } from "drizzle-orm";

import { groupMembers } from "@repo/db";

import { searchLookupUsers } from "~/server/invites/search-lookup-users";
import { type db } from "~/server/db";

type DbClient = typeof db;

export async function searchUsersForGamePicker(
  database: DbClient,
  game: { groupId: string | null; isPublic: boolean },
  args: { query: string; excludeUserIds: string[] },
) {
  if (game.groupId && !game.isPublic) {
    const members = await database.query.groupMembers.findMany({
      where: eq(groupMembers.groupId, game.groupId),
      columns: { userId: true },
    });
    return searchLookupUsers(database, {
      query: args.query,
      excludeUserIds: args.excludeUserIds,
      includeUserIds: members.map((row) => row.userId),
    });
  }

  if (game.groupId && game.isPublic) {
    const members = await database.query.groupMembers.findMany({
      where: eq(groupMembers.groupId, game.groupId),
      columns: { userId: true },
    });
    return searchLookupUsers(database, {
      query: args.query,
      excludeUserIds: args.excludeUserIds,
      boostUserIds: members.map((row) => row.userId),
      boostCue: "Group member",
    });
  }

  return searchLookupUsers(database, {
    query: args.query,
    excludeUserIds: args.excludeUserIds,
  });
}
