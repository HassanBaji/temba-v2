import { eq } from "drizzle-orm";

import { groupMembers, type GroupSportEnum } from "@repo/db";

import { protectedProcedure } from "~/server/api/trpc";
import { resolveAppUser } from "~/server/auth/resolve-app-user";
import { type db } from "~/server/db";

type DbClient = typeof db;

/** Loose Groups the caller belongs to (Club Groups live under Communities). */
export async function mineLoose(database: DbClient, args: { userId: string }) {
  const memberships = await database.query.groupMembers.findMany({
    where: eq(groupMembers.userId, args.userId),
    with: {
      group: true,
    },
  });

  return memberships
    .filter((membership) => membership.group.communityId === null)
    .map((membership) => ({
      id: membership.group.id,
      name: membership.group.name,
      description: membership.group.description,
      type: membership.group.type,
      sport: membership.group.sport as GroupSportEnum | null,
    }));
}

export const mineLooseProcedure = protectedProcedure.query(async ({ ctx }) => {
  const appUser = await resolveAppUser(ctx.userId);
  return mineLoose(ctx.db, { userId: appUser.id });
});
