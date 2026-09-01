import { and, eq } from "drizzle-orm";

import { gamePlayers, gameTeams, gameWaitlist, teamMembers } from "@repo/db";

import { type GameRow, userPassesJoinGate } from "~/server/games/access";
import { admit } from "~/server/games/admit";
import { isIndividualSeatGame } from "~/server/games/seats";
import { type db } from "~/server/db";
import type { SeatPosition } from "~/server/games/utils";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

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
