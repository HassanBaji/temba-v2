import { requireLiveCommunity } from "~/server/communities/helpers/require-live-community";
import { requireStaff } from "~/server/communities/helpers/require-staff";
import { getLiveLink } from "~/server/invites/doors";
import { communityInviteLinkUrl } from "~/server/invites/tokens";
import { type db } from "~/server/db";

type DbClient = typeof db;

export async function getInviteLink(
  database: DbClient,
  args: { communityId: string; userId: string; origin: string },
) {
  const community = await requireLiveCommunity(database, args.communityId);
  await requireStaff(database, community.id, args.userId);

  const newest = await getLiveLink(database, {
    kind: "community",
    id: community.id,
  });

  if (!newest) {
    return null;
  }

  return {
    id: newest.id,
    inviteUrl: communityInviteLinkUrl(args.origin, newest.token),
    createdAt: newest.createdAt,
    expiresAt: newest.expiresAt,
  };
}
