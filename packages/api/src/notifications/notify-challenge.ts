import type { DbClient, DbTx } from "@repo/db";

import { notify } from "#src/notifications/notify";
import { actingUserIds, type TeamForActing } from "#src/teams/acts-for-team";

type DbOrTx = DbClient | DbTx;

/** The clock expired the Team's Challenge: everyone who acts for the Team hears, once. */
export async function notifyChallengeExpired(
  database: DbOrTx,
  args: { challengeId: string; team: TeamForActing },
) {
  const recipients = await actingUserIds(database, args.team);
  return notify(database, {
    type: "challenge_expired",
    recipients: recipients.map((userId) => ({ userId, audience: "player" })),
    excludeUserIds: [],
    teamId: args.team.id,
    challengeId: args.challengeId,
    dedupeKey: `challenge_expired:${args.challengeId}`,
  });
}
