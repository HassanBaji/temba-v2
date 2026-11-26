import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import { games, matchGoals } from "@repo/db/schema";
import { createPgliteDb, type TestDatabase } from "@repo/db/testing";

import {
  addMember,
  footballGame,
  insertUser,
  nextFootballGame,
  playScore,
} from "#src/ratings/group-rated-match.test-support";
import { footballPlayerCard } from "#src/routers/games/footballPlayerCard";
import { register } from "#src/routers/games/register";

type ApiDb = Parameters<typeof footballPlayerCard>[0];

function apiDb(database: TestDatabase) {
  return database as unknown as ApiDb;
}

async function withDb(run: (database: TestDatabase) => Promise<void>) {
  const { db, close } = await createPgliteDb();
  try {
    await run(db);
  } finally {
    await close();
  }
}

/** Two played Games, a 5–3 win then a 2–4 loss for `a`, and a third to come. */
async function playedGroup(database: TestDatabase) {
  const f = await footballGame(database);
  const a = await addMember(f, "a");
  const b = await addMember(f, "b");
  const c = await addMember(f, "c");
  const d = await addMember(f, "d");
  const first = await playScore(f, [a, b], [c, d], { slot1: 5, slot2: 3 });
  await database
    .insert(matchGoals)
    .values({ matchId: first, userId: a, goals: 2 });
  await database
    .update(games)
    .set({ mvpUserId: a, mvpSettledAt: new Date() })
    .where(eq(games.id, f.gameId));

  const second = await nextFootballGame(f, 30);
  for (const userId of [a, b, c, d]) {
    await register(apiDb(database), { gameId: second.gameId, userId });
  }
  const secondMatch = await playScore(second, [c, a], [b, d], {
    slot1: 2,
    slot2: 4,
  });
  await database
    .insert(matchGoals)
    .values({ matchId: secondMatch, userId: a, goals: 1 });

  const upcoming = await nextFootballGame(f, 60);
  for (const userId of [a, b, c, d]) {
    await register(apiDb(database), { gameId: upcoming.gameId, userId });
  }
  return { f, upcoming, a, b };
}

describe("games.footballPlayerCard", () => {
  it("totals a player's Games, goals and MVPs in the Group, with their form", async () => {
    await withDb(async (db) => {
      const { f, upcoming, a } = await playedGroup(db);

      const card = await footballPlayerCard(apiDb(db), {
        gameId: upcoming.gameId,
        viewerUserId: f.organizerId,
        userId: a,
      });

      expect(card).toMatchObject({
        games: 2,
        goals: 3,
        mvps: 1,
        form: ["won", "lost"],
      });
      expect(typeof card.pointsThisMonth).toBe("number");
    });
  });

  it("reads nothing played for a newcomer", async () => {
    await withDb(async (db) => {
      const { f, upcoming } = await playedGroup(db);
      const newcomer = await addMember(upcoming, "newcomer");

      const card = await footballPlayerCard(apiDb(db), {
        gameId: upcoming.gameId,
        viewerUserId: f.organizerId,
        userId: newcomer,
      });

      expect(card).toEqual({
        games: 0,
        goals: 0,
        mvps: 0,
        form: [],
        pointsThisMonth: 0,
      });
    });
  });

  it("is the Organizers' only, and only for a player on the roster", async () => {
    await withDb(async (db) => {
      const { f, upcoming, a, b } = await playedGroup(db);

      await expect(
        footballPlayerCard(apiDb(db), {
          gameId: upcoming.gameId,
          viewerUserId: b,
          userId: a,
        }),
      ).rejects.toMatchObject({ code: "FORBIDDEN" });

      const stranger = await insertUser(db, "stranger");
      const error = await footballPlayerCard(apiDb(db), {
        gameId: upcoming.gameId,
        viewerUserId: f.organizerId,
        userId: stranger.id,
      }).catch((caught: unknown) => caught);
      expect(error).toBeInstanceOf(TRPCError);
      expect(error).toMatchObject({ code: "NOT_FOUND" });
    });
  });
});
