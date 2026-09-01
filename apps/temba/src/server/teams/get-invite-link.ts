import { getLiveLink } from "~/server/invites/doors";
import { teamInviteLinkUrl } from "~/server/invites/tokens";
import { requireIncompleteTeamCreator } from "~/server/teams/helpers/require-incomplete-team-creator";
import { type db } from "~/server/db";

type DbClient = typeof db;

export async function getInviteLink(
  database: DbClient,
  args: { teamId: string; userId: string; origin: string },
) {
  await requireIncompleteTeamCreator(database, args.teamId, args.userId);

  const newest = await getLiveLink(database, {
    kind: "team",
    id: args.teamId,
  });
  if (!newest) {
    return null;
  }

  return {
    id: newest.id,
    inviteUrl: teamInviteLinkUrl(args.origin, newest.token),
    createdAt: newest.createdAt,
    expiresAt: newest.expiresAt,
  };
}
