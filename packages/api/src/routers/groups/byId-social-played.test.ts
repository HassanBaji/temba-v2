import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import { games, groupMembers } from "@repo/db/schema";
import { createPgliteDb } from "@repo/db/testing";

import {
  asDb,
  insertAmericano,
  insertAmericanoPlayers,
  insertAmericanoUser,
  registerAmericanoPlayers,
} from "#src/games/americano.test-support";
import { americanoBoard } from "#src/routers/games/americanoBoard";
import { enterTournamentScore } from "#src/routers/games/enterTournamentScore";
import { postAmericanoRounds } from "#src/routers/games/postAmericanoRounds";
import { groupById } from "#src/routers/groups/byId";

describe("groupById, a played Social", () => {
  it("sends a finished Americano as its whole day, to a player and to someone who watched", async () => {
    const { db: database, close } = await createPgliteDb();
    try {
      const organizer = await insertAmericanoUser(database, "Hassan Haji");
      const gameId = await insertAmericano(database, {
        createdBy: organizer.id,
        players: 8,
        rounds: 3,
        windowStart: new Date("2027-03-01T09:00:00"),
        windowEnd: new Date("2027-03-01T11:00:00"),
      });
      const people = await insertAmericanoPlayers(database, 8);
      const gamePlayerIds = await registerAmericanoPlayers(
        database,
        gameId,
        people,
      );
      await postAmericanoRounds(asDb(database), {
        gameId,
        organizerUserId: organizer.id,
        gamePlayerIds,
      });
      const board = await americanoBoard(asDb(database), {
        gameId,
        userId: organizer.id,
        now: new Date("2027-03-01T12:00:00"),
      });
      for (const round of board.rounds) {
        for (const match of round.matches) {
          await enterTournamentScore(asDb(database), {
            gameId,
            matchId: match.matchId,
            userId: organizer.id,
            slot1GamesWon: 6,
            slot2GamesWon: 2,
          });
        }
      }
      const game = await database.query.games.findFirst({
        where: eq(games.id, gameId),
        columns: { groupId: true },
      });
      await database.insert(groupMembers).values(
        [organizer, people[0]!].map((member) => ({
          groupId: game!.groupId!,
          userId: member.id,
        })),
      );
      const read = async (userId: string) => {
        const detail = await groupById(asDb(database), {
          groupId: game!.groupId!,
          userId,
          now: new Date("2027-03-02T12:00:00"),
        });
        return detail.gameHistory.find((row) => row.id === gameId);
      };

      const played = await read(people[0]!.id);
      expect(played?.social).toMatchObject({
        tournamentShape: "americano",
        entrantCount: 8,
        finished: true,
        myTournament: null,
        americano: {
          finished: true,
          playerCount: 8,
          roundCount: 3,
          matchMinutes: 30,
          partnerCount: 3,
        },
      });
      expect(played?.social?.americano?.results).toHaveLength(3);
      expect(played?.social?.winner?.names).toHaveLength(1);

      const watched = await read(organizer.id);
      expect(watched?.social).toMatchObject({
        entrantCount: 8,
        finished: true,
        americano: null,
        winner: { names: played!.social!.winner!.names, isViewer: false },
      });
    } finally {
      await close();
    }
  });
});
