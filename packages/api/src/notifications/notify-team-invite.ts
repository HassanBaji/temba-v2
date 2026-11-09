import type { DbClient, DbTx } from "@repo/db";

import { notify } from "#src/notifications/notify";

type DbOrTx = DbClient | DbTx;

/** The Lookup invite stays the actionable item; this only tells the invitee. */
export async function notifyTeamInvite(
  database: DbOrTx,
  args: { teamId: string; inviterUserId: string; inviteeUserIds: string[] },
) {
  return notify(database, {
    type: "team_invite_received",
    recipients: args.inviteeUserIds.map((userId) => ({
      userId,
      audience: "player",
    })),
    excludeUserIds: [args.inviterUserId],
    actorUserId: args.inviterUserId,
    teamId: args.teamId,
  });
}
