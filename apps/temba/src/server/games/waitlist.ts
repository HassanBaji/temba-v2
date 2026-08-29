import { TRPCError } from "@trpc/server";
import { and, eq, inArray, or } from "drizzle-orm";

import {
  gamePlayers,
  gameTeamPlayers,
  gameTeams,
  gameWaitlist,
  matches,
  teamMembers,
} from "@repo/db";

import { type db } from "~/server/db";
import {
  FRIENDLY_PLAYERS_ALLOWED,
  FRIENDLY_TEAMS_ALLOWED,
  type GameRow,
  registeredGameTeamCount,
  registeredUserCount,
  userPassesJoinGate,
} from "~/server/games/access";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

export async function clearMatchSlotsForGameTeam(
  database: Tx | typeof db,
  gameTeamId: string,
) {
  await database
    .update(matches)
    .set({ slot1GameTeamId: null, updatedAt: new Date() })
    .where(eq(matches.slot1GameTeamId, gameTeamId));
  await database
    .update(matches)
    .set({ slot2GameTeamId: null, updatedAt: new Date() })
    .where(eq(matches.slot2GameTeamId, gameTeamId));
}

export async function removeGameTeamAndPlayers(
  database: Tx,
  gameTeamId: string,
) {
  const links = await database.query.gameTeamPlayers.findMany({
    where: eq(gameTeamPlayers.gameTeamId, gameTeamId),
    columns: { gamePlayerId: true },
  });
  await clearMatchSlotsForGameTeam(database, gameTeamId);
  await database.delete(gameTeams).where(eq(gameTeams.id, gameTeamId));
  for (const link of links) {
    await database
      .delete(gamePlayers)
      .where(eq(gamePlayers.id, link.gamePlayerId));
  }
}

async function insertRegisteredPair(
  database: Tx,
  args: {
    gameId: string;
    userIds: [string, string];
    teamId: string | null;
  },
) {
  const createdPlayers = [];
  for (const userId of args.userIds) {
    const [player] = await database
      .insert(gamePlayers)
      .values({ gameId: args.gameId, userId })
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
    .values({
      gameId: args.gameId,
      teamId: args.teamId,
    })
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
}

export async function assignFriendlyMatchSlots(database: Tx, gameId: string) {
  const match = await database.query.matches.findFirst({
    where: eq(matches.gameId, gameId),
    columns: { id: true },
  });
  if (!match) {
    return;
  }
  const sides = await database.query.gameTeams.findMany({
    where: eq(gameTeams.gameId, gameId),
    columns: { id: true },
    orderBy: (table, { asc }) => [asc(table.createdAt), asc(table.id)],
  });
  await database
    .update(matches)
    .set({
      slot1GameTeamId: sides[0]?.id ?? null,
      slot2GameTeamId: sides[1]?.id ?? null,
      updatedAt: new Date(),
    })
    .where(eq(matches.id, match.id));
}

export async function enqueueWaitlistUser(
  database: Tx | typeof db,
  gameId: string,
  userId: string,
) {
  const existing = await database.query.gameWaitlist.findFirst({
    where: and(
      eq(gameWaitlist.gameId, gameId),
      eq(gameWaitlist.userId, userId),
    ),
    columns: { id: true },
  });
  if (existing) {
    return;
  }
  await database.insert(gameWaitlist).values({ gameId, userId });
}

export async function enqueueWaitlistTeam(
  database: Tx | typeof db,
  gameId: string,
  teamId: string,
) {
  const existing = await database.query.gameWaitlist.findFirst({
    where: and(
      eq(gameWaitlist.gameId, gameId),
      eq(gameWaitlist.teamId, teamId),
    ),
    columns: { id: true },
  });
  if (existing) {
    return;
  }
  await database.insert(gameWaitlist).values({ gameId, teamId });
}

async function teamIsCompleteAndAllowed(
  database: Tx,
  game: GameRow,
  teamId: string,
) {
  const members = await database.query.teamMembers.findMany({
    where: eq(teamMembers.teamId, teamId),
  });
  if (members.length !== 2) {
    return false;
  }
  for (const member of members) {
    if (!(await userPassesJoinGate(database, game, member.userId))) {
      return false;
    }
  }
  return members;
}

export async function promoteWaitlist(database: Tx, game: GameRow) {
  const entries = await database.query.gameWaitlist.findMany({
    where: eq(gameWaitlist.gameId, game.id),
    orderBy: (table, { asc }) => [asc(table.createdAt), asc(table.id)],
  });

  for (const entry of entries) {
    if (entry.userId) {
      const already = await database.query.gamePlayers.findFirst({
        where: and(
          eq(gamePlayers.gameId, game.id),
          eq(gamePlayers.userId, entry.userId),
        ),
        columns: { id: true },
      });
      if (already) {
        await database
          .delete(gameWaitlist)
          .where(eq(gameWaitlist.id, entry.id));
        continue;
      }
      if (!(await userPassesJoinGate(database, game, entry.userId))) {
        continue;
      }
      const userCount = await registeredUserCount(database, game.id);
      if (userCount >= (game.playersAllowed ?? FRIENDLY_PLAYERS_ALLOWED)) {
        break;
      }
      await database.insert(gamePlayers).values({
        gameId: game.id,
        userId: entry.userId,
      });
      await database.delete(gameWaitlist).where(eq(gameWaitlist.id, entry.id));
      continue;
    }

    if (entry.teamId) {
      const already = await database.query.gameTeams.findFirst({
        where: and(
          eq(gameTeams.gameId, game.id),
          eq(gameTeams.teamId, entry.teamId),
        ),
        columns: { id: true },
      });
      if (already) {
        await database
          .delete(gameWaitlist)
          .where(eq(gameWaitlist.id, entry.id));
        continue;
      }
      const members = await teamIsCompleteAndAllowed(
        database,
        game,
        entry.teamId,
      );
      if (!members) {
        continue;
      }
      const teamCount = await registeredGameTeamCount(database, game.id);
      if (teamCount >= (game.teamsAllowed ?? FRIENDLY_TEAMS_ALLOWED)) {
        break;
      }
      const userIds = members.map((member) => member.userId) as [
        string,
        string,
      ];
      await insertRegisteredPair(database, {
        gameId: game.id,
        userIds,
        teamId: entry.teamId,
      });
      await database.delete(gameWaitlist).where(eq(gameWaitlist.id, entry.id));
      if (game.format === "friendly_game") {
        await assignFriendlyMatchSlots(database, game.id);
      }
    }
  }
}

export async function leaveRegisteredSeat(
  database: Tx,
  game: GameRow,
  userId: string,
) {
  const player = await database.query.gamePlayers.findFirst({
    where: and(eq(gamePlayers.gameId, game.id), eq(gamePlayers.userId, userId)),
  });
  if (!player) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "You are not registered on this Game",
    });
  }

  const link = await database.query.gameTeamPlayers.findFirst({
    where: eq(gameTeamPlayers.gamePlayerId, player.id),
  });
  if (link) {
    await removeGameTeamAndPlayers(database, link.gameTeamId);
    if (game.format === "friendly_game") {
      await assignFriendlyMatchSlots(database, game.id);
    }
  } else {
    await database.delete(gamePlayers).where(eq(gamePlayers.id, player.id));
  }

  if (!game.cancelledAt) {
    await promoteWaitlist(database, game);
  }
}

export async function leaveWaitlistEntry(
  database: Tx | typeof db,
  gameId: string,
  userId: string,
) {
  const memberships = await database.query.teamMembers.findMany({
    where: eq(teamMembers.userId, userId),
    columns: { teamId: true },
  });
  const teamIds = memberships.map((row) => row.teamId);
  const deleted = await database
    .delete(gameWaitlist)
    .where(
      and(
        eq(gameWaitlist.gameId, gameId),
        teamIds.length > 0
          ? or(
              eq(gameWaitlist.userId, userId),
              inArray(gameWaitlist.teamId, teamIds),
            )
          : eq(gameWaitlist.userId, userId),
      ),
    )
    .returning({ id: gameWaitlist.id });
  if (deleted.length === 0) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "You are not on the waitlist",
    });
  }
}
