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

/**
 * A Proposal came in, or was changed: everyone who acts for the posting Team
 * hears, except who sent it. Each send carries its own key, so a change tells
 * them again.
 */
export async function notifyProposalReceived(
  database: DbOrTx,
  args: {
    challengeId: string;
    proposalId: string;
    posterTeam: TeamForActing;
    proposingTeamId: string;
    proposedBy: string;
    sentAt: Date;
  },
) {
  const recipients = await actingUserIds(database, args.posterTeam);
  return notify(database, {
    type: "challenge_proposal_received",
    recipients: recipients.map((userId) => ({ userId, audience: "player" })),
    excludeUserIds: [args.proposedBy],
    actorUserId: args.proposedBy,
    teamId: args.proposingTeamId,
    challengeId: args.challengeId,
    dedupeKey: `challenge_proposal_received:${args.proposalId}:${args.sentAt.getTime()}`,
  });
}

/** The poster asked for another time: the proposing Team hears, except who decided. */
export async function notifyProposalDeclined(
  database: DbOrTx,
  args: {
    challengeId: string;
    proposalId: string;
    proposingTeam: TeamForActing;
    posterTeamId: string;
    decidedBy: string;
  },
) {
  const recipients = await actingUserIds(database, args.proposingTeam);
  return notify(database, {
    type: "challenge_proposal_declined",
    recipients: recipients.map((userId) => ({ userId, audience: "player" })),
    excludeUserIds: [args.decidedBy],
    actorUserId: args.decidedBy,
    teamId: args.posterTeamId,
    challengeId: args.challengeId,
    dedupeKey: `challenge_proposal_declined:${args.proposalId}`,
  });
}

/** The clock expired a Proposal: everyone who acts for the proposing Team hears, once. */
export async function notifyProposalExpired(
  database: DbOrTx,
  args: {
    challengeId: string;
    proposalId: string;
    proposingTeam: TeamForActing;
    posterTeamId: string;
  },
) {
  const recipients = await actingUserIds(database, args.proposingTeam);
  return notify(database, {
    type: "challenge_proposal_expired",
    recipients: recipients.map((userId) => ({ userId, audience: "player" })),
    excludeUserIds: [],
    teamId: args.posterTeamId,
    challengeId: args.challengeId,
    dedupeKey: `challenge_proposal_expired:${args.proposalId}`,
  });
}
