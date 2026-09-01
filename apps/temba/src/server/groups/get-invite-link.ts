import { requireGroupInviteLinkMinter } from "~/server/groups/helpers/require-group-invite-link-minter";
import { getLiveLink } from "~/server/invites/doors";
import { groupInviteLinkUrl } from "~/server/invites/tokens";
import { type db } from "~/server/db";

type DbClient = typeof db;

export async function getInviteLink(
  database: DbClient,
  args: { groupId: string; userId: string; origin: string },
) {
  const group = await requireGroupInviteLinkMinter(
    database,
    args.groupId,
    args.userId,
  );

  const newest = await getLiveLink(database, { kind: "group", id: group.id });
  if (!newest) {
    return null;
  }

  return {
    id: newest.id,
    inviteUrl: groupInviteLinkUrl(args.origin, newest.token),
    createdAt: newest.createdAt,
    expiresAt: newest.expiresAt,
  };
}
