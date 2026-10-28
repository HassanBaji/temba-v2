import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import { z } from "zod";

import { groups, type DbClient } from "@repo/db";

import { resolveAppUser } from "#src/auth/resolve-app-user";
import { operatorProcedure } from "#src/trpc";

export async function setVerified(
  database: DbClient,
  args: { groupId: string; verified: boolean; operatorUserId: string },
) {
  const group = await database.query.groups.findFirst({
    where: eq(groups.id, args.groupId),
    columns: { id: true, verifiedAt: true },
  });
  if (!group) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Group not found" });
  }

  if (args.verified === (group.verifiedAt !== null)) {
    return { id: group.id, verifiedAt: group.verifiedAt };
  }

  const verifiedAt = args.verified ? new Date() : null;
  await database
    .update(groups)
    .set({
      verifiedAt,
      verifiedBy: args.verified ? args.operatorUserId : null,
    })
    .where(eq(groups.id, group.id));

  return { id: group.id, verifiedAt };
}

export const setVerifiedProcedure = operatorProcedure
  .input(z.object({ groupId: z.string().uuid(), verified: z.boolean() }))
  .mutation(async ({ ctx, input }) => {
    const operator = await resolveAppUser(ctx.userId);
    return setVerified(ctx.db, {
      groupId: input.groupId,
      verified: input.verified,
      operatorUserId: operator.id,
    });
  });
