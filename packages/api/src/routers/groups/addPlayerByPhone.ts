import { TRPCError } from "@trpc/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";

import { CommunityRoleEnum, groupMembers, type groups } from "@repo/db";

import { ADD_PLAYER_DEFAULT_FOOTBALL_LEVEL } from "@repo/domain/add-player-by-phone";
import {
  FOOTBALL_SELF_PLACEMENTS,
  type FootballSelfPlacement,
} from "@repo/domain/football-self-placement";
import { ASSIGNABLE_DISPLAY_LEVEL_BANDS } from "@repo/domain/level-bands";
import type { PadelLevelChoice } from "@repo/domain/onboarding-answers";
import { protectedProcedure } from "#src/trpc";
import { resolveAppUser } from "#src/auth/resolve-app-user";
import {
  admit as admitCommunityMember,
  throwAdmitFailure,
} from "#src/community-membership";
import { type db } from "#src/db";
import { requireCommunityMembership } from "#src/groups/helpers/require-community-membership";
import { requireGroupPhoneAdder } from "#src/groups/helpers/require-group-phone-adder";
import { notifyGroupJoined } from "#src/notifications/notify-group-joined";
import { sendLookupInvite } from "#src/routers/groups/sendLookupInvite";
import {
  createUnclaimedPlayer,
  type UnclaimedPlayerStartingLevel,
} from "#src/unclaimed-players/create-unclaimed-player";
import { requireE164 } from "#src/unclaimed-players/require-e164";
import { resolvePhonePlayer } from "#src/unclaimed-players/resolve-phone-player";

type DbClient = typeof db;

type AddPlayerLevel = PadelLevelChoice | "not_sure" | FootballSelfPlacement;

export const NOT_A_COMMUNITY_MEMBER_MESSAGE =
  "Only an Owner or Admin can add someone who is not a Community Member";

function isFootballPlacement(
  level: AddPlayerLevel,
): level is FootballSelfPlacement {
  return (FOOTBALL_SELF_PLACEMENTS as readonly string[]).includes(level);
}

function refuse(message: string): never {
  throw new TRPCError({ code: "BAD_REQUEST", message });
}

function startingLevelFor(
  group: typeof groups.$inferSelect,
  level: AddPlayerLevel | undefined,
): UnclaimedPlayerStartingLevel {
  if (group.sport === "football") {
    if (level !== undefined && !isFootballPlacement(level)) {
      refuse("Pick a football Level");
    }
    return {
      sport: "football",
      placement: level ?? ADD_PLAYER_DEFAULT_FOOTBALL_LEVEL,
    };
  }
  if (level !== undefined && isFootballPlacement(level)) {
    refuse("Pick a padel Level");
  }
  return { sport: "padel", level: level ?? "not_sure" };
}

export async function addPlayerByPhone(
  database: DbClient,
  args: {
    groupId: string;
    approverUserId: string;
    countryIso: string;
    nationalNumber: string;
    name?: string;
    level?: AddPlayerLevel;
  },
) {
  const { group, canAdmitCommunityMember } = await requireGroupPhoneAdder(
    database,
    args.groupId,
    args.approverUserId,
  );
  const startingLevel = startingLevelFor(group, args.level);
  const phoneNumber = requireE164(args.countryIso, args.nationalNumber);
  const name = args.name?.trim();

  const resolved = await resolvePhonePlayer(database, phoneNumber);

  if (resolved.kind === "account") {
    const invitee = resolved.user;
    const { refused } = await sendLookupInvite(database, {
      groupId: group.id,
      userId: args.approverUserId,
      userIds: [invitee.id],
    });
    const refusal = refused[0];
    if (refusal) {
      throw new TRPCError({ code: "CONFLICT", message: refusal.message });
    }
    return {
      outcome: "invited" as const,
      userId: invitee.id,
      name: invitee.name,
    };
  }

  return database.transaction(async (tx) => {
    const communityId = group.communityId;
    if (communityId && !canAdmitCommunityMember) {
      const isCommunityMember =
        resolved.kind === "unclaimed" &&
        (await requireCommunityMembership(
          tx,
          communityId,
          resolved.user.id,
        )) !== null;
      if (!isCommunityMember) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: NOT_A_COMMUNITY_MEMBER_MESSAGE,
        });
      }
    }

    let player;
    if (resolved.kind === "new") {
      if (!name) {
        refuse("Enter their name");
      }
      ({ user: player } = await createUnclaimedPlayer(tx, {
        phoneNumber,
        name,
        addedByUserId: args.approverUserId,
        startingLevel,
      }));
    } else {
      player = resolved.user;
    }

    const existing = await tx.query.groupMembers.findFirst({
      where: and(
        eq(groupMembers.groupId, group.id),
        eq(groupMembers.userId, player.id),
      ),
      columns: { id: true },
    });
    if (existing) {
      throw new TRPCError({
        code: "CONFLICT",
        message: `${player.name} is already in this Group`,
      });
    }

    if (communityId && canAdmitCommunityMember) {
      const admitted = await admitCommunityMember(tx, {
        communityId,
        userId: player.id,
        role: CommunityRoleEnum.MEMBER,
      });
      if (!admitted.ok && admitted.reason !== "already_member") {
        throwAdmitFailure(admitted);
      }
    }

    await tx.insert(groupMembers).values({
      groupId: group.id,
      userId: player.id,
    });
    await notifyGroupJoined(tx, {
      group,
      joinerUserId: player.id,
      decidedByUserId: args.approverUserId,
    });

    return {
      outcome: "added" as const,
      userId: player.id,
      name: player.name,
    };
  });
}

export const addPlayerByPhoneProcedure = protectedProcedure
  .input(
    z.object({
      groupId: z.string().uuid(),
      countryIso: z.string().trim().min(1).max(8),
      nationalNumber: z.string().trim().min(1).max(32),
      name: z.string().trim().min(1).max(100).optional(),
      level: z
        .union([
          z.enum(ASSIGNABLE_DISPLAY_LEVEL_BANDS),
          z.literal("not_sure"),
          z.enum(FOOTBALL_SELF_PLACEMENTS),
        ])
        .optional(),
    }),
  )
  .mutation(async ({ ctx, input }) => {
    const appUser = await resolveAppUser(ctx.userId);
    return addPlayerByPhone(ctx.db, {
      ...input,
      approverUserId: appUser.id,
    });
  });
