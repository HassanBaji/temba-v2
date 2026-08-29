import { TRPCError } from "@trpc/server";
import { and, eq } from "drizzle-orm";

import {
  gameInviteLinkConsents,
  gamePlayers,
  gameTeamPlayers,
  gameTeams,
  gameWaitlist,
  teamMembers,
  teams,
} from "@repo/db";

import { type db } from "~/server/db";
import {
  type GameRow,
  FRIENDLY_TEAMS_ALLOWED,
  assertRegistrationOpen,
  getRegistrationStatus,
  isGroupMember,
  registeredGameTeamCount,
  userPassesJoinGate,
} from "~/server/games/access";
import {
  enqueueWaitlistTeam,
  enqueueWaitlistUser,
} from "~/server/games/waitlist";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];
type DbClient = typeof db | Tx;

export async function assertGameInviteDoorsOpen(
  database: DbClient,
  game: GameRow,
  now = new Date(),
) {
  // Closed includes organizer-close, ended window, cancel, and Soft-archived
  // Club Group Games (TEM-43). Mint and accept share this door.
  await assertRegistrationOpen(database, game, now);
}

export async function assertInviteeAllowedOnGame(
  database: DbClient,
  game: GameRow,
  userId: string,
) {
  if (game.isPublic) {
    return;
  }
  if (game.groupId) {
    if (!(await isGroupMember(database, game.groupId, userId))) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Only Group members can use invites on this Game",
      });
    }
    return;
  }
}

async function userAlreadyOnGame(
  database: DbClient,
  gameId: string,
  userId: string,
) {
  const row = await database.query.gamePlayers.findFirst({
    where: and(eq(gamePlayers.gameId, gameId), eq(gamePlayers.userId, userId)),
    columns: { id: true },
  });
  return Boolean(row);
}

export async function admitIndividualUser(
  database: Tx,
  game: GameRow,
  userId: string,
  now = new Date(),
): Promise<{ waitlisted: boolean }> {
  if (await userAlreadyOnGame(database, game.id, userId)) {
    throw new TRPCError({
      code: "CONFLICT",
      message: "You are already registered on this Game",
    });
  }
  const waitlisted = await database.query.gameWaitlist.findFirst({
    where: and(
      eq(gameWaitlist.gameId, game.id),
      eq(gameWaitlist.userId, userId),
    ),
    columns: { id: true },
  });
  if (waitlisted) {
    throw new TRPCError({
      code: "CONFLICT",
      message: "You are already on the waitlist",
    });
  }

  const status = await getRegistrationStatus(database, game, now);
  if (status === "full") {
    await enqueueWaitlistUser(database, game.id, userId);
    return { waitlisted: true };
  }

  await database.insert(gamePlayers).values({
    gameId: game.id,
    userId,
  });
  return { waitlisted: false };
}

export async function admitCompleteTeam(
  database: Tx,
  game: GameRow,
  teamId: string,
): Promise<{ waitlisted: boolean }> {
  const members = await database.query.teamMembers.findMany({
    where: eq(teamMembers.teamId, teamId),
  });
  if (members.length !== 2) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Incomplete Teams cannot register",
    });
  }

  const existing = await database.query.gameTeams.findFirst({
    where: and(eq(gameTeams.gameId, game.id), eq(gameTeams.teamId, teamId)),
    columns: { id: true },
  });
  if (existing) {
    throw new TRPCError({
      code: "CONFLICT",
      message: "That Team is already registered on this Game",
    });
  }

  const teamCount = await registeredGameTeamCount(database, game.id);
  if (teamCount >= (game.teamsAllowed ?? FRIENDLY_TEAMS_ALLOWED)) {
    await enqueueWaitlistTeam(database, game.id, teamId);
    return { waitlisted: true };
  }

  const createdPlayers = [];
  for (const member of members) {
    if (await userAlreadyOnGame(database, game.id, member.userId)) {
      throw new TRPCError({
        code: "CONFLICT",
        message: "A Team partner is already registered on this Game",
      });
    }
    const [player] = await database
      .insert(gamePlayers)
      .values({ gameId: game.id, userId: member.userId })
      .returning();
    if (!player) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to register on this Game",
      });
    }
    createdPlayers.push(player);
  }

  const [gameTeam] = await database
    .insert(gameTeams)
    .values({ gameId: game.id, teamId })
    .returning();
  if (!gameTeam) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Failed to register on this Game",
    });
  }
  for (const player of createdPlayers) {
    await database.insert(gameTeamPlayers).values({
      gameTeamId: gameTeam.id,
      gamePlayerId: player.id,
    });
  }
  return { waitlisted: false };
}

export async function eligibleCompleteTeamsForUser(
  database: DbClient,
  game: GameRow,
  userId: string,
) {
  const memberships = await database.query.teamMembers.findMany({
    where: eq(teamMembers.userId, userId),
    columns: { teamId: true },
  });
  const eligible = [];
  for (const membership of memberships) {
    const members = await database.query.teamMembers.findMany({
      where: eq(teamMembers.teamId, membership.teamId),
    });
    if (members.length !== 2) {
      continue;
    }
    const team = await database.query.teams.findFirst({
      where: eq(teams.id, membership.teamId),
      columns: { id: true, name: true },
    });
    if (!team) {
      continue;
    }
    let allowed = true;
    for (const member of members) {
      if (game.isPublic || game.groupId) {
        if (!(await userPassesJoinGate(database, game, member.userId))) {
          allowed = false;
          break;
        }
      }
    }
    if (!allowed) {
      continue;
    }
    eligible.push({
      id: team.id,
      name: team.name,
      memberIds: members.map((member) => member.userId),
    });
  }
  return eligible;
}

export async function recordTeamInviteLinkConsent(
  database: Tx,
  args: {
    game: GameRow;
    linkId: string;
    userId: string;
  },
): Promise<
  | { outcome: "waiting_for_partner" }
  | { outcome: "registered"; waitlisted: boolean }
> {
  const eligible = await eligibleCompleteTeamsForUser(
    database,
    args.game,
    args.userId,
  );
  if (eligible.length !== 1) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message:
        "You must have exactly one complete Team that is allowed on this Game",
    });
  }
  const team = eligible[0];
  if (!team) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message:
        "You must have exactly one complete Team that is allowed on this Game",
    });
  }
  const partnerId = team.memberIds.find((id) => id !== args.userId);
  if (!partnerId) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Incomplete Teams cannot register",
    });
  }

  const existingForUser = await database.query.gameInviteLinkConsents.findFirst(
    {
      where: and(
        eq(gameInviteLinkConsents.gameInviteLinkId, args.linkId),
        eq(gameInviteLinkConsents.userId, args.userId),
      ),
    },
  );
  if (!existingForUser) {
    const otherConsent = await database.query.gameInviteLinkConsents.findFirst({
      where: eq(gameInviteLinkConsents.gameInviteLinkId, args.linkId),
    });
    if (otherConsent && otherConsent.teamId !== team.id) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Your Team partner must accept this Invite link",
      });
    }
    if (otherConsent && otherConsent.userId !== partnerId) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Your Team partner must accept this Invite link",
      });
    }
    await database.insert(gameInviteLinkConsents).values({
      gameInviteLinkId: args.linkId,
      teamId: team.id,
      userId: args.userId,
    });
  }

  const consents = await database.query.gameInviteLinkConsents.findMany({
    where: and(
      eq(gameInviteLinkConsents.gameInviteLinkId, args.linkId),
      eq(gameInviteLinkConsents.teamId, team.id),
    ),
  });
  const consentedUsers = new Set(consents.map((row) => row.userId));
  if (!consentedUsers.has(args.userId) || !consentedUsers.has(partnerId)) {
    return { outcome: "waiting_for_partner" };
  }

  const result = await admitCompleteTeam(database, args.game, team.id);
  return { outcome: "registered", waitlisted: result.waitlisted };
}
