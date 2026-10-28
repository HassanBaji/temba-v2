import { and, eq } from "drizzle-orm";
import { z } from "zod";

import { venueManagers } from "@repo/db";
import type { DbClient } from "@repo/db";

import { operatorProcedure } from "#src/trpc";

export async function removeManager(
  database: DbClient,
  args: { venueId: string; userId: string },
) {
  await database
    .delete(venueManagers)
    .where(
      and(
        eq(venueManagers.venueId, args.venueId),
        eq(venueManagers.userId, args.userId),
      ),
    );
  return { ok: true as const };
}

export const removeManagerProcedure = operatorProcedure
  .input(
    z.object({
      venueId: z.string().uuid(),
      userId: z.string().uuid(),
    }),
  )
  .mutation(async ({ ctx, input }) => {
    return removeManager(ctx.db, input);
  });
