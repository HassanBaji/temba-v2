import { TRPCError } from "@trpc/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";

import { groupMembers } from "@repo/db";

import { levelSetterProcedure } from "#src/trpc";
import { resolveAppUser } from "#src/auth/resolve-app-user";
import { type db } from "#src/db";
import { requireGroup } from "#src/groups/helpers/require-group";
import { notify } from "#src/notifications/notify";
import {
  applyLevelOverride,
  assertLevelTenths,
} from "#src/ratings/apply-level-override";
import { LEVEL_TENTHS_MAX, LEVEL_TENTHS_MIN } from "@repo/domain/level-range";
import {
  LEVEL_OVERRIDE_REASONS,
  type LevelOverrideReason,
} from "@repo/domain/level-slider";
import { messagesFor } from "@repo/i18n/messages";
import { DEFAULT_LOCALE, type Locale } from "@repo/i18n/locale";

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
    locale?: Locale;
  },
) {
  const locale = args.locale ?? DEFAULT_LOCALE;
  assertLevelTenths(args.levelTenths, locale);

  const group = await requireGroup(database, args.groupId, locale);
  const sport = group.sport;
  if (!sport) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: messagesFor(locale).level.errors.noSport,
    });
  }
  if (sport === "football") {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: messagesFor(locale).level.errors.footballFromResults,
    });
  }
  if (!(await isGroupMember(database, group.id, args.setterUserId))) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: messagesFor(locale).level.errors.groupMembersSet,
    });
  }
  if (args.targetUserId === args.setterUserId) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: messagesFor(locale).level.errors.ownLevel,
    });
  }
  if (!(await isGroupMember(database, group.id, args.targetUserId))) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: messagesFor(locale).level.errors.notGroupMember,
    });
  }

  return database.transaction(async (tx) => {
    const result = await applyLevelOverride(tx, {
      sport,
      setterUserId: args.setterUserId,
      targetUserId: args.targetUserId,
      groupId: group.id,
      levelTenths: args.levelTenths,
      reason: args.reason,
      locale,
    });
    await notify(tx, {
      type: "level_set",
      recipients: [{ userId: args.targetUserId, audience: "player" }],
      excludeUserIds: [args.setterUserId],
      actorUserId: args.setterUserId,
      groupId: group.id,
      levelOverrideId: result.overrideId,
    });
    return result;
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
      locale: ctx.locale,
    });
  });
