import { and, eq, inArray, isNull } from "drizzle-orm";

import { groupMemberInvites, groupMembers, user } from "@repo/db";

import { requireCommunityMembership } from "~/server/groups/helpers/require-community-membership";
import { requireGroupLookupSender } from "~/server/groups/helpers/require-group-lookup-sender";
import { mintLookup } from "~/server/invites/doors";
import { type db } from "~/server/db";

type DbClient = typeof db;

export async function sendLookupInvite(
  database: DbClient,
  args: { groupId: string; userId: string; userIds: string[] },
) {
  const { group, canAutoAdmit } = await requireGroupLookupSender(
    database,
    args.groupId,
    args.userId,
  );

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
    groupId: string;
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

    if (group.communityId && !canAutoAdmit) {
      const inviteeMembership = await requireCommunityMembership(
        database,
        group.communityId,
        target.id,
      );
      if (!inviteeMembership) {
        refused.push({
          name: target.name,
          message: "Invitee must already be a Community Member",
        });
        continue;
      }
    }

    const existingMember = await database.query.groupMembers.findFirst({
      where: and(
        eq(groupMembers.groupId, group.id),
        eq(groupMembers.userId, target.id),
      ),
    });

    if (existingMember) {
      refused.push({
        name: target.name,
        message: "User is already a member of this Group",
      });
      continue;
    }

    const existingInvite = await database.query.groupMemberInvites.findFirst({
      where: and(
        eq(groupMemberInvites.groupId, group.id),
        eq(groupMemberInvites.userId, target.id),
        isNull(groupMemberInvites.acceptedAt),
        isNull(groupMemberInvites.revokedAt),
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
        { kind: "group", id: group.id },
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
        groupId: minted.invite.hostId,
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
