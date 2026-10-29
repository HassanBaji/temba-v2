import { TRPCError } from "@trpc/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";

import { groupMembers } from "@repo/db";

import { levelSetterProcedure } from "#src/trpc";
import { resolveAppUser } from "#src/auth/resolve-app-user";
import { type db } from "#src/db";
import { requireGroup } from "#src/groups/helpers/require-group";
import {
  applyLevelOverride,
  assertLevelTenths,
} from "#src/ratings/apply-level-override";
import { LEVEL_TENTHS_MAX, LEVEL_TENTHS_MIN } from "@repo/domain/level-range";
import {
  LEVEL_OVERRIDE_REASONS,
  type LevelOverrideReason,
} from "@repo/domain/level-slider";

type DbClient = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];

async function isGroupMember(
  database: DbClient,
  groupId: string,
  userId: string,
) {
  const row = await database.query.groupMembers.findFirst({
    where: and(
      eq(groupMembers.groupId, groupId),
      eq(groupMembers.userId, userId),
    ),
    columns: { id: true },
  });
  return row !== undefined;
}

/** A Level setter sets a Group member's Level, as a Level override. */
export async function setMemberLevel(
  database: DbClient,
  args: {
    groupId: string;
    setterUserId: string;
    targetUserId: string;
    levelTenths: number;
    reason?: LevelOverrideReason | null;
  },
) {
  assertLevelTenths(args.levelTenths);

  const group = await requireGroup(database, args.groupId);
  const sport = group.sport;
  if (!sport) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "This Group has no sport, so it has no Levels",
    });
  }
  if (sport === "football") {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Football Levels arrive with results",
    });
  }
  if (!(await isGroupMember(database, group.id, args.setterUserId))) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Only Group members can set a Level",
    });
  }
  if (args.targetUserId === args.setterUserId) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "You cannot set your own Level",
    });
  }
  if (!(await isGroupMember(database, group.id, args.targetUserId))) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "That User is not a member of this Group",
    });
  }

  return applyLevelOverride(database, {
    sport,
    setterUserId: args.setterUserId,
    targetUserId: args.targetUserId,
    groupId: group.id,
    levelTenths: args.levelTenths,
    reason: args.reason,
  });
}

export const setLevel = levelSetterProcedure
  .input(
    z.object({
      groupId: z.string().uuid(),
      userId: z.string().uuid(),
      levelTenths: z.number().int().min(LEVEL_TENTHS_MIN).max(LEVEL_TENTHS_MAX),
      reason: z.enum(LEVEL_OVERRIDE_REASONS).optional(),
    }),
  )
  .mutation(async ({ ctx, input }) => {
    const appUser = await resolveAppUser(ctx.userId);
    return setMemberLevel(ctx.db, {
      groupId: input.groupId,
      setterUserId: appUser.id,
      targetUserId: input.userId,
      levelTenths: input.levelTenths,
      reason: input.reason,
    });
  });
