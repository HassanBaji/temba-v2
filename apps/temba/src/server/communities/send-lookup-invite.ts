import { and, eq, inArray, isNull } from "drizzle-orm";

import { communityMemberInvites, user } from "@repo/db";

import { requireLiveCommunity } from "~/server/communities/helpers/require-live-community";
import { requireMembership } from "~/server/communities/helpers/require-membership";
import { requireStaff } from "~/server/communities/helpers/require-staff";
import { mintLookup } from "~/server/invites/doors";
import { type db } from "~/server/db";

type DbClient = typeof db;

export async function sendLookupInvite(
  database: DbClient,
  args: { communityId: string; userId: string; userIds: string[] },
) {
  const community = await requireLiveCommunity(database, args.communityId);
  await requireStaff(database, community.id, args.userId);

  const uniqueIds = [...new Set(args.userIds)];
  const targets = await database.query.user.findMany({
    where: inArray(user.id, uniqueIds),
    columns: {
      id: true,
      name: true,
    },
  });
  const targetsById = new Map(targets.map((row) => [row.id, row]));

  const sent: {
    id: string;
    communityId: string;
    userId: string;
    createdAt: Date;
  }[] = [];
  const refused: { name: string; message: string }[] = [];

  for (const userId of uniqueIds) {
    const target = targetsById.get(userId);
    if (!target) {
      refused.push({ name: "Unknown User", message: "User not found" });
      continue;
    }

    const existingMembership = await requireMembership(
      database,
      community.id,
      target.id,
    );
    if (existingMembership) {
      refused.push({
        name: target.name,
        message: "User is already a Member of this Community",
      });
      continue;
    }

    const existingInvite =
      await database.query.communityMemberInvites.findFirst({
        where: and(
          eq(communityMemberInvites.communityId, community.id),
          eq(communityMemberInvites.userId, target.id),
          isNull(communityMemberInvites.acceptedAt),
          isNull(communityMemberInvites.revokedAt),
        ),
      });

    if (existingInvite) {
      refused.push({
        name: target.name,
        message: "An unused Lookup invite already exists for this User",
      });
      continue;
    }

    try {
      const minted = await mintLookup(
        database,
        { kind: "community", id: community.id },
        { userId: target.id, invitedBy: args.userId },
      );
      if (!minted.ok) {
        refused.push({
          name: target.name,
          message:
            minted.reason === "unused_exists"
              ? "An unused Lookup invite already exists for this User"
              : "Failed to create Lookup invite",
        });
        continue;
      }

      sent.push({
        id: minted.invite.id,
        communityId: minted.invite.hostId,
        userId: minted.invite.userId,
        createdAt: minted.invite.createdAt,
      });
    } catch {
      refused.push({
        name: target.name,
        message: "An unused Lookup invite already exists for this User",
      });
    }
  }

  return { sent, refused };
}
