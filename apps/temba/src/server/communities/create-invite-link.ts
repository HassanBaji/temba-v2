import { requireLiveCommunity } from "~/server/communities/helpers/require-live-community";
import { requireStaff } from "~/server/communities/helpers/require-staff";
import { mintLink, throwInviteFrozen } from "~/server/invites/doors";
import { communityInviteLinkUrl } from "~/server/invites/tokens";
import { type db } from "~/server/db";

type DbClient = typeof db;

export async function createInviteLink(
  database: DbClient,
  args: { communityId: string; userId: string; origin: string },
) {
  const community = await requireLiveCommunity(database, args.communityId);
  await requireStaff(database, community.id, args.userId);

  const minted = await mintLink(
    database,
    { kind: "community", id: community.id },
    { createdBy: args.userId },
  );
  if (!minted.ok) {
    throwInviteFrozen(
      { kind: "community", id: community.id },
      "mint",
      minted.reason === "frozen" ? "frozen" : "not_found",
    );
  }

  return {
    id: minted.link.id,
    inviteUrl: communityInviteLinkUrl(args.origin, minted.link.token),
    createdAt: minted.link.createdAt,
    expiresAt: minted.link.expiresAt,
  };
}
