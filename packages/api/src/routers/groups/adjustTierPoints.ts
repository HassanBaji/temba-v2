import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import { z } from "zod";

import { groupTierEvents, groupTierPoints } from "@repo/db";
import { groupHasTier } from "@repo/domain/game-rating-scope";
import {
  LEVEL_OVERRIDE_REASONS,
  type LevelOverrideReason,
} from "@repo/domain/level-slider";
import {
  TIER_ADJUST_MAX_STEP,
  TIER_POINTS_START,
} from "@repo/domain/tier-points";
import { messagesFor } from "@repo/i18n/messages";
import { DEFAULT_LOCALE, type Locale } from "@repo/i18n/locale";

import { protectedProcedure } from "#src/trpc";
import { resolveAppUser } from "#src/auth/resolve-app-user";
import { type db } from "#src/db";
import { isGroupMember } from "#src/games/access";
import { groupIsVerified } from "#src/groups/group-is-verified";
import { mayOrganizeGroupGames } from "#src/groups/helpers/may-organize-group-games";
import { requireGroup } from "#src/groups/helpers/require-group";
import { notify } from "#src/notifications/notify";
import { rewriteTierBands } from "#src/ratings/apply-tier-match";

type DbClient = typeof db;

const TIER_ADJUST_NOTE_MAX = 140;

/**
 * An Organizer moves a member's Tier points by hand, a Tier adjustment
 * (ADR-0073): never their own, at most 400 from the current points, with a
 * reason the player sees. It ends a Provisional tier, re-cuts the Group's
 * fish and tells the member and everyone whose fish moved.
 */
export async function adjustTierPoints(
  database: DbClient,
  args: {
    groupId: string;
    organizerUserId: string;
    userId: string;
    points: number;
    reason: LevelOverrideReason;
    note?: string | null;
    locale?: Locale;
    now?: Date;
  },
) {
  const locale = args.locale ?? DEFAULT_LOCALE;
  const errors = messagesFor(locale).rating.adjust.errors;
  const group = await requireGroup(database, args.groupId, locale);
  if (!(await mayOrganizeGroupGames(database, group, args.organizerUserId))) {
    throw new TRPCError({ code: "FORBIDDEN", message: errors.organizerOnly });
  }
  if (args.userId === args.organizerUserId) {
    throw new TRPCError({ code: "BAD_REQUEST", message: errors.notYourOwn });
  }
  if (!groupHasTier({ sport: group.sport, verified: groupIsVerified(group) })) {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: errors.noTier,
    });
  }
  if (!(await isGroupMember(database, group.id, args.userId))) {
    throw new TRPCError({ code: "NOT_FOUND", message: errors.notMember });
  }
  if (!(LEVEL_OVERRIDE_REASONS as readonly unknown[]).includes(args.reason)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: errors.reasonRequired,
    });
  }
  if (!Number.isInteger(args.points) || args.points < 0) {
    throw new TRPCError({ code: "BAD_REQUEST", message: errors.belowZero });
  }
  const trimmedNote = args.note?.trim().slice(0, TIER_ADJUST_NOTE_MAX);
  const note =
    trimmedNote === undefined || trimmedNote === "" ? null : trimmedNote;
  const now = args.now ?? new Date();

  return database.transaction(async (tx) => {
    await tx
      .insert(groupTierPoints)
      .values({
        groupId: group.id,
        userId: args.userId,
        points: TIER_POINTS_START,
        createdAt: now,
        updatedAt: now,
      })
      .onConflictDoNothing({
        target: [groupTierPoints.groupId, groupTierPoints.userId],
      });

    // The whole Group in user-id order, as a Match's Tier write locks it:
    // the adjustment can move anyone's fish.
    const rows = await tx
      .select()
      .from(groupTierPoints)
      .where(eq(groupTierPoints.groupId, group.id))
      .orderBy(groupTierPoints.userId)
      .for("update");
    const rowByUser = new Map(rows.map((row) => [row.userId, row]));
    const row = rowByUser.get(args.userId);
    if (!row) {
      throw new TRPCError({ code: "NOT_FOUND", message: errors.notMember });
    }
    const delta = args.points - row.points;
    if (delta === 0) {
      throw new TRPCError({ code: "BAD_REQUEST", message: errors.noChange });
    }
    if (Math.abs(delta) > TIER_ADJUST_MAX_STEP) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: errors.tooFar(TIER_ADJUST_MAX_STEP),
      });
    }

    const [event] = await tx
      .insert(groupTierEvents)
      .values({
        groupId: group.id,
        userId: args.userId,
        kind: "adjustment",
        delta,
        pointsBefore: row.points,
        pointsAfter: args.points,
        bandBefore: row.band,
        setByUserId: args.organizerUserId,
        reason: args.reason,
        note,
        createdAt: now,
      })
      .returning({ id: groupTierEvents.id });
    if (!event) {
      throw new Error("Failed to write the Tier adjustment");
    }
    const [updated] = await tx
      .update(groupTierPoints)
      .set({
        points: args.points,
        confirmedAt: row.confirmedAt ?? now,
        updatedAt: now,
      })
      .where(eq(groupTierPoints.id, row.id))
      .returning();
    if (updated) {
      rowByUser.set(updated.userId, updated);
    }

    // One Notification per player: the member hears of the adjustment
    // below, which already names their new place; anyone else whose fish
    // moved hears of that.
    const table = await rewriteTierBands(tx, {
      groupId: group.id,
      matchId: null,
      rowByUser,
      now,
      actorUserId: args.organizerUserId,
      toldAnotherWay: [args.userId],
    });
    const self = table.rows.find((entry) => entry.userId === args.userId);
    await tx
      .update(groupTierEvents)
      .set({
        bandAfter: self?.band ?? null,
        placeAfter: self?.place ?? null,
        rankedCount: table.rankedCount,
      })
      .where(eq(groupTierEvents.id, event.id));

    await notify(tx, {
      type: "tier_points_adjusted",
      recipients: [{ userId: args.userId, audience: "player" }],
      excludeUserIds: [args.organizerUserId],
      actorUserId: args.organizerUserId,
      groupId: group.id,
      groupTierEventId: event.id,
    });

    return {
      userId: args.userId,
      points: args.points,
      delta,
      place: self?.place ?? null,
      band: self?.band ?? null,
      rankedCount: table.rankedCount,
      provisional: self?.provisional ?? false,
    };
  });
}

export const adjustTierPointsProcedure = protectedProcedure
  .input(
    z.object({
      groupId: z.string().uuid(),
      userId: z.string().uuid(),
      points: z.number().int().min(0),
      reason: z.enum(LEVEL_OVERRIDE_REASONS),
      note: z.string().trim().max(TIER_ADJUST_NOTE_MAX).optional(),
    }),
  )
  .mutation(async ({ ctx, input }) => {
    const appUser = await resolveAppUser(ctx.userId);
    return adjustTierPoints(ctx.db, {
      groupId: input.groupId,
      organizerUserId: appUser.id,
      userId: input.userId,
      points: input.points,
      reason: input.reason,
      note: input.note,
      locale: ctx.locale,
    });
  });
