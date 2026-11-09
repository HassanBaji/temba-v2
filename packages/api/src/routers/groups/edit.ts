import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import { z } from "zod";

import { groups } from "@repo/db";
import { GROUP_NAME_MAX_LENGTH } from "@repo/domain/group-settings";
import { sportSchema } from "@repo/validators/sport";

import { protectedProcedure } from "#src/trpc";
import { resolveAppUser } from "#src/auth/resolve-app-user";
import { type db } from "#src/db";
import { groupHasGames } from "#src/groups/helpers/group-has-games";
import { assertGroupOwner } from "#src/groups/helpers/group-owner";
import { requireGroup } from "#src/groups/helpers/require-group";

type DbClient = typeof db;

/**
 * Edit Group: name, sport, visibility and Require approval in one save. Only
 * the fields given change. Sport locks after the first Game, since the
 * standing depends on it. A Private Group never requires approval.
 */
export async function editGroup(
  database: DbClient,
  args: {
    groupId: string;
    userId: string;
    name?: string;
    sport?: "padel" | "football";
    type?: "public" | "private";
    requiresApproval?: boolean;
  },
) {
  const group = await requireGroup(database, args.groupId);
  assertGroupOwner(
    group,
    args.userId,
    "Only the Group owner can edit this Group",
  );

  const patch: Partial<typeof groups.$inferInsert> = {};

  if (args.name !== undefined && args.name !== group.name) {
    patch.name = args.name;
  }

  if (args.sport !== undefined && args.sport !== group.sport) {
    if (await groupHasGames(database, group.id)) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "The sport is locked once the Group has a Game",
      });
    }
    patch.sport = args.sport;
  }

  const nextType = args.type ?? group.type;
  if (args.type !== undefined && args.type !== group.type) {
    patch.type = args.type;
  }

  const nextRequiresApproval =
    nextType === "public"
      ? (args.requiresApproval ?? group.requiresApproval)
      : false;
  if (nextRequiresApproval !== group.requiresApproval) {
    patch.requiresApproval = nextRequiresApproval;
  }

  if (Object.keys(patch).length === 0) {
    return {
      id: group.id,
      name: group.name,
      sport: group.sport,
      type: group.type,
      requiresApproval: group.requiresApproval,
    };
  }

  const [updated] = await database
    .update(groups)
    .set({ ...patch, updatedAt: new Date() })
    .where(eq(groups.id, group.id))
    .returning({
      id: groups.id,
      name: groups.name,
      sport: groups.sport,
      type: groups.type,
      requiresApproval: groups.requiresApproval,
    });

  if (!updated) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Failed to save the Group",
    });
  }

  return updated;
}

export const editProcedure = protectedProcedure
  .input(
    z.object({
      groupId: z.string().uuid(),
      name: z.string().trim().min(1).max(GROUP_NAME_MAX_LENGTH).optional(),
      sport: sportSchema.optional(),
      type: z.enum(["public", "private"]).optional(),
      requiresApproval: z.boolean().optional(),
    }),
  )
  .mutation(async ({ ctx, input }) => {
    const appUser = await resolveAppUser(ctx.userId);
    return editGroup(ctx.db, {
      groupId: input.groupId,
      userId: appUser.id,
      name: input.name,
      sport: input.sport,
      type: input.type,
      requiresApproval: input.requiresApproval,
    });
  });
