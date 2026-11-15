import { and, eq } from "drizzle-orm";
import { z } from "zod";

import { venueVerifiers } from "@repo/db";
import type { DbClient } from "@repo/db";

import { operatorProcedure } from "#src/trpc";

/**
 * An Operator ends a Verifier's role at one Venue. The Level overrides they
 * already wrote stay, with their name and Venue on them.
 */
export async function removeVerifier(
  database: DbClient,
  args: { venueId: string; userId: string },
) {
  await database
    .delete(venueVerifiers)
    .where(
      and(
        eq(venueVerifiers.venueId, args.venueId),
        eq(venueVerifiers.userId, args.userId),
      ),
    );
  return { ok: true as const };
}

export const removeVerifierProcedure = operatorProcedure
  .input(
    z.object({
      venueId: z.string().uuid(),
      userId: z.string().uuid(),
    }),
  )
  .mutation(async ({ ctx, input }) => {
    return removeVerifier(ctx.db, input);
  });
