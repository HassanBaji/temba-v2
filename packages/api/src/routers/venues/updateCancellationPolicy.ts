import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import { z } from "zod";

import { venues } from "@repo/db";
import { type db } from "#src/db";
import {
  cancellationPolicySchema,
  type CancellationPolicy,
} from "@repo/validators/cancellation-policy";

import { resolveAppUser } from "#src/auth/resolve-app-user";
import { protectedProcedure } from "#src/trpc";
import { requireVenue } from "#src/venues/helpers/require-venue";
import { requireVenueManager } from "#src/venues/helpers/require-venue-manager";

type DbClient = typeof db;

export async function updateCancellationPolicy(
  database: DbClient,
  args: {
    venueId: string;
    policy: CancellationPolicy;
    actor: {
      userId: string;
      publicMetadata: Record<string, unknown> | undefined;
    };
  },
) {
  await requireVenue(database, args.venueId);
  await requireVenueManager(database, {
    venueId: args.venueId,
    ...args.actor,
  });

  const parsed = cancellationPolicySchema.safeParse(args.policy);
  if (!parsed.success) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: parsed.error.issues[0]?.message ?? "Invalid Cancellation policy",
    });
  }

  const [updated] = await database
    .update(venues)
    .set({ cancellationPolicy: parsed.data, updatedAt: new Date() })
    .where(eq(venues.id, args.venueId))
    .returning({
      id: venues.id,
      cancellationPolicy: venues.cancellationPolicy,
      updatedAt: venues.updatedAt,
    });

  if (!updated) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Failed to update the Cancellation policy",
    });
  }

  return updated;
}

export const updateCancellationPolicyProcedure = protectedProcedure
  .input(
    z.object({ venueId: z.string().uuid(), policy: cancellationPolicySchema }),
  )
  .mutation(async ({ ctx, input }) => {
    const appUser = await resolveAppUser(ctx.userId);
    return updateCancellationPolicy(ctx.db, {
      venueId: input.venueId,
      policy: input.policy,
      actor: {
        userId: appUser.id,
        publicMetadata: await ctx.getPublicMetadata(),
      },
    });
  });
