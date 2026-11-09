import { TRPCError } from "@trpc/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";

import { groupLevelOverrides, groupRatings, ratings } from "@repo/db";

import { protectedProcedure } from "#src/trpc";
import { resolveAppUser } from "#src/auth/resolve-app-user";
import { type db } from "#src/db";
import { isGroupMember } from "#src/games/access";
import { mayOrganizeGroupGames } from "#src/groups/helpers/may-organize-group-games";
import { requireGroup } from "#src/groups/helpers/require-group";
import { assertLevelTenths } from "#src/ratings/apply-level-override";
import { groupRatingStart } from "@repo/domain/group-level";
import {
  bandFromLevel,
  confirmedPhiForOverride,
  formatLevel,
  levelFromMu,
  muFromLevel,
} from "@repo/domain/level";
import { LEVEL_TENTHS_MAX, LEVEL_TENTHS_MIN } from "@repo/domain/level-range";
import { sportOrDefault } from "@repo/domain/sport";

type DbClient = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];

/**
 * An Organizer of the Group sets a member's Group Level, as a Group Level
 * override (ADR-0053): a confirmed baseline inside that Group that later
 * Group rated Matches move from. The Temba Level does not change.
 */
export async function setGroupLevelForMember(
  database: DbClient,
  args: {
    groupId: string;
    setterUserId: string;
    targetUserId: string;
    levelTenths: number;
  },
) {
  assertLevelTenths(args.levelTenths);
  const group = await requireGroup(database, args.groupId);
  if (!(await mayOrganizeGroupGames(database, group, args.setterUserId))) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Only an Organizer of this Group can set a Group Level",
    });
  }
  if (args.targetUserId === args.setterUserId) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "You cannot set your own Group Level",
    });
  }
  if (!(await isGroupMember(database, group.id, args.targetUserId))) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "That User is not a member of this Group",
    });
  }
  const level = args.levelTenths / 10;
  const sport = sportOrDefault(group.sport);

  return database.transaction(async (tx) => {
    const [existing] = await tx
      .select()
      .from(groupRatings)
      .where(
        and(
          eq(groupRatings.userId, args.targetUserId),
          eq(groupRatings.groupId, group.id),
        ),
      )
      .for("update");
    const temba = existing
      ? null
      : await tx.query.ratings.findFirst({
          where: and(
            eq(ratings.userId, args.targetUserId),
            eq(ratings.sport, sport),
          ),
          columns: { mu: true, phi: true, sigma: true },
        });
    const before = existing ?? groupRatingStart(temba ?? null);
    const after = {
      mu: muFromLevel(level),
      phi: confirmedPhiForOverride(before.phi),
      sigma: before.sigma,
      levelBand: bandFromLevel(level),
    };
    const now = new Date();

    await tx
      .insert(groupRatings)
      .values({
        userId: args.targetUserId,
        groupId: group.id,
        ...after,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: [groupRatings.userId, groupRatings.groupId],
        set: { ...after, updatedAt: now },
      });
    await tx.insert(groupLevelOverrides).values({
      userId: args.targetUserId,
      groupId: group.id,
      setByUserId: args.setterUserId,
      muBefore: before.mu,
      phiBefore: before.phi,
      sigmaBefore: before.sigma,
      levelBandBefore: before.levelBand,
      muAfter: after.mu,
      phiAfter: after.phi,
      sigmaAfter: after.sigma,
      levelBandAfter: after.levelBand,
      createdAt: now,
    });

    return {
      level: formatLevel(levelFromMu(after.mu)),
      levelBand: after.levelBand,
      provisional: false as const,
    };
  });
}

export const setGroupLevel = protectedProcedure
  .input(
    z.object({
      groupId: z.string().uuid(),
      userId: z.string().uuid(),
      levelTenths: z.number().int().min(LEVEL_TENTHS_MIN).max(LEVEL_TENTHS_MAX),
    }),
  )
  .mutation(async ({ ctx, input }) => {
    const appUser = await resolveAppUser(ctx.userId);
    return setGroupLevelForMember(ctx.db, {
      groupId: input.groupId,
      setterUserId: appUser.id,
      targetUserId: input.userId,
      levelTenths: input.levelTenths,
    });
  });
