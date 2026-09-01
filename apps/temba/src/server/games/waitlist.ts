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
import { type GameRow, userPassesJoinGate } from "~/server/games/access";
import { admit } from "~/server/games/admit";
import {
  firstVacantPosition,
  isIndividualSeatGame,
  type SeatPosition,
  vacateSeat,
} from "~/server/games/seats";

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

export async function promoteWaitlist(
  database: Tx,
  game: GameRow,
  vacated?: { sideIndex: number; position: SeatPosition },
) {
  const entries = await database.query.gameWaitlist.findMany({
    where: eq(gameWaitlist.gameId, game.id),
    orderBy: (table, { asc }) => [asc(table.createdAt), asc(table.id)],
  });

  if (isIndividualSeatGame(game)) {
    if (!vacated) {
      return;
    }
    for (const entry of entries) {
      if (!entry.userId) {
        continue;
      }
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
      const admitted = await admit(database, {
        game,
        door: "promote",
        party: {
          kind: "user",
          userId: entry.userId,
          seat: {
            sideIndex: vacated.sideIndex,
            position: vacated.position,
          },
        },
      });
      if (!admitted.ok) {
        if (
          admitted.reason === "full" ||
          admitted.reason === "join_frozen" ||
          admitted.reason === "no_vacant_side"
        ) {
          break;
        }
        continue;
      }
      await database.delete(gameWaitlist).where(eq(gameWaitlist.id, entry.id));
      return;
    }
    return;
  }

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
      const admitted = await admit(database, {
        game,
        door: "promote",
        party: { kind: "user", userId: entry.userId },
      });
      if (!admitted.ok) {
        if (admitted.reason === "full" || admitted.reason === "join_frozen") {
          break;
        }
        continue;
      }
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
      const admitted = await admit(database, {
        game,
        door: "promote",
        party: { kind: "team", teamId: entry.teamId },
      });
      if (!admitted.ok) {
        if (
          admitted.reason === "full" ||
          admitted.reason === "join_frozen" ||
          admitted.reason === "no_vacant_side"
        ) {
          break;
        }
        continue;
      }
      await database.delete(gameWaitlist).where(eq(gameWaitlist.id, entry.id));
    }
  }
}

export async function leaveRegisteredSeat(
  database: Tx,
  game: GameRow,
  userId: string,
  notRegisteredMessage = "You are not registered on this Game",
) {
  if (isIndividualSeatGame(game)) {
    const vacated = await vacateSeat(
      database,
      game,
      userId,
      notRegisteredMessage,
    );
    if (!game.cancelledAt) {
      const target =
        vacated ?? (await firstVacantPosition(database, game)) ?? undefined;
      await promoteWaitlist(database, game, target);
    }
    return;
  }

  const player = await database.query.gamePlayers.findFirst({
    where: and(eq(gamePlayers.gameId, game.id), eq(gamePlayers.userId, userId)),
  });
  if (!player) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: notRegisteredMessage,
    });
  }

  const link = await database.query.gameTeamPlayers.findFirst({
    where: eq(gameTeamPlayers.gamePlayerId, player.id),
  });
  if (link) {
    await removeGameTeamAndPlayers(database, link.gameTeamId);
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
