import { TRPCError } from "@trpc/server";
import { and, eq } from "drizzle-orm";

import { groupMembers } from "@repo/db";

import { requireGroup } from "~/server/groups/helpers/require-group";
import { type db } from "~/server/db";

type DbClient = typeof db;

export async function leaveGroup(
  database: DbClient,
  args: { groupId: string; userId: string },
) {
  const group = await requireGroup(database, args.groupId);

  const membership = await database.query.groupMembers.findFirst({
    where: and(
      eq(groupMembers.groupId, group.id),
      eq(groupMembers.userId, args.userId),
    ),
  });

  if (!membership) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "You are not a member of this Group",
    });
  }

  await database.delete(groupMembers).where(eq(groupMembers.id, membership.id));

  return {
    ok: true as const,
    groupId: group.id,
    communityId: group.communityId,
  };
}
