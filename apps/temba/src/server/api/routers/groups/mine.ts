import { eq } from "drizzle-orm";

import { groupMembers, type GroupSportEnum } from "@repo/db";

import { protectedProcedure } from "~/server/api/trpc";
import { resolveAppUser } from "~/server/auth/resolve-app-user";
import { type db } from "~/server/db";

type DbClient = typeof db;

/** Groups the caller is a member of (Loose Groups and joined Club Groups). */
export async function mine(database: DbClient, args: { userId: string }) {
  const memberships = await database.query.groupMembers.findMany({
    where: eq(groupMembers.userId, args.userId),
    with: {
      group: {
        with: {
          community: true,
        },
      },
    },
  });
  return memberships.map((membership) => {
    const group = membership.group;
    const community = group.community;

    return {
      id: group.id,
      name: group.name,
      description: group.description,
      type: group.type,
      sport: group.sport as GroupSportEnum | null,
      community: community
        ? {
            id: community.id,
            name: community.name,
            archivedAt: community.archivedAt,
          }
        : null,
    };
  });
}

export const mineProcedure = protectedProcedure.query(async ({ ctx }) => {
  const appUser = await resolveAppUser(ctx.userId);
  return mine(ctx.db, { userId: appUser.id });
});
