import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import { games, groupMembers } from "@repo/db/schema";
import { createPgliteDb } from "@repo/db/testing";

import {
  insertKingPlayers,
  insertKingTournament,
  insertKingUser,
  seatKingTeams,
} from "#src/games/king-of-the-court.test-support";
import { postKingCourts } from "#src/routers/games/postKingCourts";
import { postKingFinalOrder } from "#src/routers/games/postKingFinalOrder";
import { groupById } from "#src/routers/groups/byId";

const START = new Date("2026-09-25T09:00:00");
const END = new Date("2026-09-25T11:00:00");
const AFTER = new Date("2026-09-25T11:05:00");
const NEXT_DAY = new Date("2026-09-26T11:05:00");

beforeAll(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-09-01T12:00:00"));
});

afterAll(() => {
  vi.useRealTimers();
});

describe("groupById, a played King of the court", () => {
  it("needs its final order until it is posted, then names the king", async () => {
    const { db: database, close } = await createPgliteDb();
    try {
      const organizer = await insertKingUser(database, "Hassan Haji");
      const gameId = await insertKingTournament(database, {
        createdBy: organizer.id,
        courts: 3,
        windowStart: START,
        windowEnd: END,
      });
      const players = await insertKingPlayers(database, 12);
      const teamIds = await seatKingTeams(database, gameId, players);
      await postKingCourts(database, {
        gameId,
        organizerUserId: organizer.id,
        gameTeamIds: teamIds,
      });
      const game = await database.query.games.findFirst({
        where: eq(games.id, gameId),
        columns: { groupId: true },
      });
      const groupId = game!.groupId!;
      await database
        .insert(groupMembers)
        .values(
          [organizer, players[0]!].map((member) => ({
            groupId,
            userId: member.id,
          })),
        )
        .onConflictDoNothing();
      const read = async (userId: string) => {
        const detail = await groupById(database, {
          groupId,
          userId,
          now: NEXT_DAY,
        });
        return {
          row: detail.gameHistory.find((item) => item.id === gameId),
          counts: detail.gameHistoryCounts,
        };
      };

      const before = await read(players[0]!.id);
      expect(before.row).toMatchObject({
        scoredSets: [],
        resultPosted: false,
        social: {
          tournamentShape: "king_of_the_court",
          entrantCount: 6,
          finished: false,
          winner: null,
          king: { posted: false, place: null, teamCount: 6 },
        },
      });
      expect(before.counts.needs_score).toBe(1);

      await postKingFinalOrder(database, {
        gameId,
        organizerUserId: organizer.id,
        gameTeamIds: [teamIds[2]!, teamIds[0]!, teamIds[1]!],
        now: AFTER,
      });

      const played = await read(players[0]!.id);
      expect(played.row).toMatchObject({
        resultPosted: true,
        social: {
          finished: true,
          winner: {
            names: ["Player 5 Haji", "Player 6 Haji"],
            isViewer: false,
          },
          king: { posted: true, place: 2, teamCount: 6 },
        },
      });
      expect(played.counts).toMatchObject({ finished: 1, needs_score: 0 });

      const watched = await read(organizer.id);
      expect(watched.row?.social).toMatchObject({
        finished: true,
        king: null,
        winner: { names: ["Player 5 Haji", "Player 6 Haji"] },
      });
    } finally {
      await close();
    }
  });
});
