import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import { z } from "zod";

import { groupSeasons } from "@repo/db";

import {
  SEASON_NAME_MAX_LENGTH,
  seasonDatesError,
} from "@repo/domain/group-season";

import { protectedProcedure } from "#src/trpc";
import { resolveAppUser } from "#src/auth/resolve-app-user";
import { type db } from "#src/db";
import { assertCanManageSeasons } from "#src/groups/helpers/season-access";
import { requireGroup } from "#src/groups/helpers/require-group";
import { toSeasonRow } from "#src/standing/load-group-standing";

type DbClient = typeof db;

const DAY_KEY = /^\d{4}-\d{2}-\d{2}$/;

export const createSeasonInput = z.object({
  groupId: z.string().uuid(),
  name: z.string().trim().min(1).max(SEASON_NAME_MAX_LENGTH),
  startsOn: z.string().regex(DAY_KEY),
  endsOn: z.string().regex(DAY_KEY),
});

/**
 * Opens a Season on the Group (design "Seasons" 1k). The window may not
 * overlap another Season's, and a Season closed early keeps the shortened
 * window it closed with, so the next one may start the day after.
 */
export async function createSeason(
  database: DbClient,
  args: z.infer<typeof createSeasonInput> & { userId: string; now?: Date },
) {
  const group = await requireGroup(database, args.groupId);
  await assertCanManageSeasons(database, group, args.userId);
  const now = args.now ?? new Date();

  const existing = await database.query.groupSeasons.findMany({
    where: eq(groupSeasons.groupId, group.id),
    columns: { startsOn: true, endsOn: true },
  });
  const error = seasonDatesError(args, existing);
  if (error) {
    throw new TRPCError({ code: "BAD_REQUEST", message: error });
  }

  const [created] = await database
    .insert(groupSeasons)
    .values({
      groupId: group.id,
      name: args.name,
      startsOn: args.startsOn,
      endsOn: args.endsOn,
      createdBy: args.userId,
      createdAt: now,
      updatedAt: now,
    })
    .returning();
  if (!created) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Failed to create the season",
    });
  }
  return toSeasonRow(created, now);
}

export const createSeasonProcedure = protectedProcedure
  .input(createSeasonInput)
  .mutation(async ({ ctx, input }) => {
    const appUser = await resolveAppUser(ctx.userId);
    return createSeason(ctx.db, { ...input, userId: appUser.id });
  });
