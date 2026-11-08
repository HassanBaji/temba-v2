import type { DbClient, DbTx } from "@repo/db";
import { eq } from "drizzle-orm";

import { teamMembers } from "@repo/db";
import { teamIsSquad } from "@repo/domain/team-roster";

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

/**
 * The poster confirmed a Proposal and the Game exists. Each Team hears with
 * the other Team named, except who confirmed. On padel every member is seated,
 * so every member hears; on football only who acts for each Team, since
 * nobody is seated until a Captain names the squad.
 */
export async function notifyProposalConfirmed(
  database: DbOrTx,
  args: {
    challengeId: string;
    proposalId: string;
    gameId: string;
    posterTeam: TeamForActing;
    proposingTeam: TeamForActing;
    confirmedBy: string;
  },
) {
  const told = new Set<string>();
  for (const [team, other] of [
    [args.posterTeam, args.proposingTeam],
    [args.proposingTeam, args.posterTeam],
  ] as const) {
    const audience = await confirmedAudience(database, team);
    const recipients = audience.filter((userId) => !told.has(userId));
    for (const userId of recipients) {
      told.add(userId);
    }
    await notify(database, {
      type: "challenge_proposal_confirmed",
      recipients: recipients.map((userId) => ({ userId, audience: "player" })),
      excludeUserIds: [args.confirmedBy],
      actorUserId: args.confirmedBy,
      teamId: other.id,
      gameId: args.gameId,
      challengeId: args.challengeId,
      dedupeKey: `challenge_proposal_confirmed:${args.proposalId}`,
    });
  }
}

async function confirmedAudience(database: DbOrTx, team: TeamForActing) {
  const acting = await actingUserIds(database, team);
  if (teamIsSquad(team.sport)) {
    return acting;
  }
  const members = await database.query.teamMembers.findMany({
    where: eq(teamMembers.teamId, team.id),
    columns: { userId: true },
  });
  return [...new Set([...acting, ...members.map((row) => row.userId)])];
}

/** The poster confirmed another Team's Proposal: everyone who acts for this proposing Team hears, once. */
export async function notifyProposalPassedOver(
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
    type: "challenge_proposal_passed_over",
    recipients: recipients.map((userId) => ({ userId, audience: "player" })),
    excludeUserIds: [],
    teamId: args.posterTeamId,
    challengeId: args.challengeId,
    dedupeKey: `challenge_proposal_passed_over:${args.proposalId}`,
  });
}

/** A day before kick-off a side is still short: who acts for that Team hears, once per side. */
export async function notifySquadDue(
  database: DbOrTx,
  args: {
    challengeId: string;
    gameId: string;
    team: TeamForActing;
    opponentTeamId: string | null;
  },
) {
  const recipients = await actingUserIds(database, args.team);
  return notify(database, {
    type: "challenge_squad_due",
    recipients: recipients.map((userId) => ({ userId, audience: "player" })),
    excludeUserIds: [],
    teamId: args.opponentTeamId,
    gameId: args.gameId,
    challengeId: args.challengeId,
    dedupeKey: `challenge_squad_due:${args.gameId}:${args.team.id}`,
  });
}
