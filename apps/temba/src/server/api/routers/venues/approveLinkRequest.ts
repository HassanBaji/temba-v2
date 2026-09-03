import { TRPCError } from "@trpc/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";

import {
  communities,
  venueLinkRequests,
  VenueLinkRequestStatusEnum,
} from "@repo/db";

import { operatorProcedure } from "~/server/api/trpc";
import { resolveAppUser } from "~/server/auth/resolve-app-user";
import { type db } from "~/server/db";
import { requirePendingVenueLinkRequest } from "~/server/venues/helpers/require-pending-venue-link-request";

type DbClient = typeof db;

export async function approveLinkRequest(
  database: DbClient,
  args: { requestId: string; userId: string },
) {
  const request = await requirePendingVenueLinkRequest(
    database,
    args.requestId,
  );

  if (request.community.venueId) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "This Community already has a Venue link",
    });
  }

  await database.transaction(async (tx) => {
    await tx
      .update(communities)
      .set({
        venueId: request.venueId,
        updatedAt: new Date(),
      })
      .where(eq(communities.id, request.communityId));

    const [updated] = await tx
      .update(venueLinkRequests)
      .set({
        status: VenueLinkRequestStatusEnum.APPROVED,
        decidedBy: args.userId,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(venueLinkRequests.id, request.id),
          eq(venueLinkRequests.status, VenueLinkRequestStatusEnum.PENDING),
        ),
      )
      .returning();

    if (!updated) {
      throw new TRPCError({
        code: "CONFLICT",
        message: "Venue link request is no longer pending",
      });
    }
  });

  return {
    ok: true as const,
    communityId: request.communityId,
    venueId: request.venueId,
  };
}

export const approveLinkRequestProcedure = operatorProcedure
  .input(z.object({ requestId: z.string().uuid() }))
  .mutation(async ({ ctx, input }) => {
    const appUser = await resolveAppUser(ctx.userId);
    return approveLinkRequest(ctx.db, {
      requestId: input.requestId,
      userId: appUser.id,
    });
  });
