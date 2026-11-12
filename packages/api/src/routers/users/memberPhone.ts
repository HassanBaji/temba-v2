import { and, eq, isNull, or } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { z } from "zod";

import {
  GroupMemberRoleEnum,
  groupMembers,
  groups,
  user,
  type DbClient,
} from "@repo/db";

import { protectedProcedure } from "#src/trpc";
import { resolveAppUser } from "#src/auth/resolve-app-user";

/**
 * The player's number, for a viewer who is a Group approver of a Group the
 * player belongs to (ADR-0078); `null` for everyone else and for the viewer
 * themselves.
 */
export async function loadMemberPhone(
  database: DbClient,
  args: { viewerId: string; playerId: string },
) {
  if (args.viewerId === args.playerId) {
    return { phoneNumber: null };
  }
  const playerMember = alias(groupMembers, "player_member");
  const viewerMember = alias(groupMembers, "viewer_member");
  const [shared] = await database
    .select({ groupId: groups.id })
    .from(playerMember)
    .innerJoin(groups, eq(groups.id, playerMember.groupId))
    .leftJoin(
      viewerMember,
      and(
        eq(viewerMember.groupId, groups.id),
        eq(viewerMember.userId, args.viewerId),
        eq(viewerMember.role, GroupMemberRoleEnum.ORGANIZER),
      ),
    )
    .where(
      and(
        eq(playerMember.userId, args.playerId),
        isNull(groups.deletedAt),
        or(
          eq(groups.createdBy, args.viewerId),
          eq(viewerMember.userId, args.viewerId),
        ),
      ),
    )
    .limit(1);
  if (!shared) {
    return { phoneNumber: null };
  }
  const player = await database.query.user.findFirst({
    where: eq(user.id, args.playerId),
    columns: { phoneNumber: true },
  });
  return { phoneNumber: player?.phoneNumber ?? null };
}

export const memberPhone = protectedProcedure
  .input(z.object({ userId: z.string().uuid() }))
  .query(async ({ ctx, input }) => {
    const appUser = await resolveAppUser(ctx.userId);
    return loadMemberPhone(ctx.db, {
      viewerId: appUser.id,
      playerId: input.userId,
    });
  });
