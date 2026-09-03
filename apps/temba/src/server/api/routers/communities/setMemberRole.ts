import { TRPCError } from "@trpc/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";

import { communityMembers, CommunityRoleEnum } from "@repo/db";

import { protectedProcedure } from "~/server/api/trpc";
import { resolveAppUser } from "~/server/auth/resolve-app-user";
import { asRole } from "~/server/communities/helpers/as-role";
import { requireCommunity } from "~/server/communities/helpers/require-community";
import { requireMembership } from "~/server/communities/helpers/require-membership";
import { type CommunityRole } from "~/server/communities/utils";
import { type db } from "~/server/db";

type DbClient = typeof db;

async function requireOwner(
  database: DbClient,
  communityId: string,
  userId: string,
) {
  const membership = await requireMembership(database, communityId, userId);

  if (membership?.role !== "owner") {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Only Owners can change Community roles",
    });
  }

  return membership;
}

async function lockOwnersForUpdate(
  tx: Parameters<Parameters<DbClient["transaction"]>[0]>[0],
  communityId: string,
) {
  return tx
    .select({ id: communityMembers.id })
    .from(communityMembers)
    .where(
      and(
        eq(communityMembers.communityId, communityId),
        eq(communityMembers.role, CommunityRoleEnum.OWNER),
      ),
    )
    .for("update");
}

export async function setMemberRole(
  database: DbClient,
  args: {
    communityId: string;
    callerId: string;
    userId: string;
    role: CommunityRole;
  },
) {
  const community = await requireCommunity(database, args.communityId);

  await requireOwner(database, community.id, args.callerId);

  const target = await requireMembership(database, community.id, args.userId);

  if (!target) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Community member not found",
    });
  }

  const nextRole = args.role;
  const previousRole = asRole(target.role);

  if (previousRole === nextRole) {
    return {
      ok: true as const,
      userId: target.userId,
      role: previousRole,
    };
  }

  const demotingOwner = previousRole === "owner" && nextRole !== "owner";

  const updated = await database.transaction(async (tx) => {
    if (demotingOwner) {
      const owners = await lockOwnersForUpdate(tx, community.id);
      if (owners.length <= 1) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message:
            "The last Owner cannot demote until another Owner is promoted",
        });
      }
    }

    const [row] = await tx
      .update(communityMembers)
      .set({
        role: nextRole,
        updatedAt: new Date(),
      })
      .where(eq(communityMembers.id, target.id))
      .returning();

    if (!row) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to update member role",
      });
    }

    return row;
  });

  return {
    ok: true as const,
    userId: updated.userId,
    role: asRole(updated.role),
  };
}

export const setMemberRoleProcedure = protectedProcedure
  .input(
    z.object({
      communityId: z.string().uuid(),
      userId: z.string().uuid(),
      role: z.enum(["owner", "admin", "member"]),
    }),
  )
  .mutation(async ({ ctx, input }) => {
    const appUser = await resolveAppUser(ctx.userId);
    return setMemberRole(ctx.db, {
      communityId: input.communityId,
      callerId: appUser.id,
      userId: input.userId,
      role: input.role,
    });
  });
