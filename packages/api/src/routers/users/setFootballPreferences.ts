import { eq } from "drizzle-orm";
import { z } from "zod";

import { user } from "@repo/db";
import {
  footballPositionSchema,
  footballRoleSchema,
} from "@repo/validators/football";

import { protectedProcedure } from "#src/trpc";
import { resolveAppUser } from "#src/auth/resolve-app-user";
import { type db } from "#src/db";

type DbClient = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];

export const footballPreferencesSchema = z.object({
  role: footballRoleSchema,
  position: footballPositionSchema.nullable(),
});

/**
 * The football defaults for the join sheet, changeable from the Football
 * profile at any time. Each Game registration still keeps its own.
 */
export async function writeFootballPreferences(
  database: DbClient,
  args: z.infer<typeof footballPreferencesSchema> & { userId: string },
) {
  await database
    .update(user)
    .set({
      preferredFootballRole: args.role,
      preferredFootballPosition: args.position,
      updatedAt: new Date(),
    })
    .where(eq(user.id, args.userId));
  return { role: args.role, position: args.position };
}

export const setFootballPreferences = protectedProcedure
  .input(footballPreferencesSchema)
  .mutation(async ({ ctx, input }) => {
    const appUser = await resolveAppUser(ctx.userId);
    return writeFootballPreferences(ctx.db, { userId: appUser.id, ...input });
  });
