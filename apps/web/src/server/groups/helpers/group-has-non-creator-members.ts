import { and, eq, ne } from "drizzle-orm";

import { groupMembers } from "@repo/db";

import { type db } from "~/server/db";

type DbClient = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];

export async function groupHasNonCreatorMembers(
  database: DbClient,
  groupId: string,
  createdBy: string,
) {
  const extra = await database.query.groupMembers.findFirst({
    where: and(
      eq(groupMembers.groupId, groupId),
      ne(groupMembers.userId, createdBy),
    ),
    columns: { id: true },
  });
  return Boolean(extra);
}
