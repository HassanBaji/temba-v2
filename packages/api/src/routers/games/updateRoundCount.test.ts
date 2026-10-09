import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import { courts, games, groups, matches, user, venues } from "@repo/db/schema";

import { createTournament } from "#src/routers/games/createTournament";
import { drawPools } from "#src/routers/games/drawPools";
import { postPoolDraw } from "#src/routers/games/postPoolDraw";
import { registerSeat } from "#src/routers/games/registerSeat";
import { undoPoolDraw } from "#src/routers/games/undoPoolDraw";
import {
  ROUND_COUNT_NOT_POOL_TOURNAMENT_MESSAGE,
  updateGameRoundCount,
} from "#src/routers/games/updateRoundCount";
import { POOL_DRAW_POSTED_MESSAGE } from "#src/games/assert-pool-draw-not-posted";
import { createPgliteDb, type TestDatabase } from "@repo/db/testing";

// Fixture windows sit on fixed dates, so registration must still read as open.
beforeAll(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-09-01T12:00:00"));
});

afterAll(() => {
  vi.useRealTimers();
});

async function insertUser(database: TestDatabase, email: string) {
  const [row] = await database
    .insert(user)
    .values({ name: email.split("@")[0] ?? "User", email })
    .returning({ id: user.id });
  if (!row) {
    throw new Error("Failed to insert user");
  }
  return row;
}

async function insertVenue(database: TestDatabase) {
  const [row] = await database
    .insert(venues)
    .values({
      name: `Venue ${crypto.randomUUID()}`,
      city: "Lisbon",
      country: "PT",
    })
    .returning({ id: venues.id });
  if (!row) {
    throw new Error("Failed to insert venue");
  }
  return row;
}

async function insertCourt(database: TestDatabase, venueId: string) {
  const [row] = await database
    .insert(courts)
    .values({ venueId, name: "Court 1" })
    .returning({ id: courts.id });
  if (!row) {
    throw new Error("Failed to insert court");
  }
  return row;
}

async function insertGroup(database: TestDatabase, createdBy: string) {
  const [row] = await database
    .insert(groups)
    .values({ name: `Group ${crypto.randomUUID()}`, createdBy })
    .returning({ id: groups.id });
  if (!row) {
    throw new Error("Failed to insert group");
  }
  return row;
}

async function seedTournament(
  database: TestDatabase,
  args: { prefix: string; teamCount: number; poolCount: number },
) {
  const owner = await insertUser(database, `${args.prefix}-owner@example.com`);
  const venue = await insertVenue(database);
  const court = await insertCourt(database, venue.id);
  const group = await insertGroup(database, owner.id);
  const created = await createTournament(database, {
    createdBy: owner.id,
    name: "Autumn Friendly",
    groupId: group.id,
    isPublic: true,
    registrationMode: "individual",
    teamCount: args.teamCount,
    poolCount: args.poolCount,
    venueId: venue.id,
    courtIds: [court.id],
    matchMinutes: 45,
    windowStart: new Date("2026-09-20T09:00:00"),
    windowEnd: new Date("2026-09-20T23:00:00"),
  });
  return { owner, venue, gameId: created.id };
}

async function fillCompleteTeams(
  database: TestDatabase,
  gameId: string,
  prefix: string,
  teamCount: number,
) {
  for (let index = 0; index < teamCount; index += 1) {
    for (const position of ["left", "right"] as const) {
      const player = await insertUser(
        database,
        `${prefix}-${index}-${position}@example.com`,
      );
      await registerSeat(database, {
        gameId,
        userId: player.id,
        sideIndex: index + 1,
        position,
      });
    }
  }
}

async function storedRoundCount(database: TestDatabase, gameId: string) {
  const game = await database.query.games.findFirst({
    where: eq(games.id, gameId),
    columns: { roundCount: true },
  });
  return game?.roundCount;
}

async function expectRefused(
  run: () => Promise<unknown>,
  code: TRPCError["code"],
  message: string,
) {
  try {
    await run();
    throw new Error("expected the action to be refused");
  } catch (error) {
    expect(error).toBeInstanceOf(TRPCError);
    if (!(error instanceof TRPCError)) {
      return;
    }
    expect(error.code).toBe(code);
    expect(error.message).toBe(message);
  }
}

describe("updateRoundCount", () => {
  it("stores an explicit count and stamps updatedAt", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const { owner, gameId } = await seedTournament(db, {
        prefix: "rounds-set",
        teamCount: 4,
        poolCount: 1,
      });
      const earlier = new Date("2026-01-01T00:00:00");
      await db
        .update(games)
        .set({ updatedAt: earlier })
        .where(eq(games.id, gameId));

      const result = await updateGameRoundCount(db, {
        gameId,
        userId: owner.id,
        roundCount: 5,
      });

      expect(result).toEqual({ ok: true, roundCount: 5 });
      const game = await db.query.games.findFirst({
        where: eq(games.id, gameId),
      });
      expect(game?.roundCount).toBe(5);
      expect(game?.updatedAt.getTime()).toBeGreaterThan(earlier.getTime());
    } finally {
      await close();
    }
  });

  it("accepts both ends of 1 to twice the suggestion", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const { owner, gameId } = await seedTournament(db, {
        prefix: "rounds-bounds",
        teamCount: 4,
        poolCount: 1,
      });

      await updateGameRoundCount(db, {
        gameId,
        userId: owner.id,
        roundCount: 1,
      });
      expect(await storedRoundCount(db, gameId)).toBe(1);

      await updateGameRoundCount(db, {
        gameId,
        userId: owner.id,
        roundCount: 6,
      });
      expect(await storedRoundCount(db, gameId)).toBe(6);
    } finally {
      await close();
    }
  });

  it("stores null for the suggested count and for null", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const { owner, gameId } = await seedTournament(db, {
        prefix: "rounds-normalize",
        teamCount: 4,
        poolCount: 1,
      });

      await updateGameRoundCount(db, {
        gameId,
        userId: owner.id,
        roundCount: 5,
      });
      const suggested = await updateGameRoundCount(db, {
        gameId,
        userId: owner.id,
        roundCount: 3,
      });
      expect(suggested.roundCount).toBeNull();
      expect(await storedRoundCount(db, gameId)).toBeNull();

      await updateGameRoundCount(db, {
        gameId,
        userId: owner.id,
        roundCount: 2,
      });
      await updateGameRoundCount(db, {
        gameId,
        userId: owner.id,
        roundCount: null,
      });
      expect(await storedRoundCount(db, gameId)).toBeNull();
    } finally {
      await close();
    }
  });

  it("refuses a count below 1 or above twice the suggestion", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const { owner, gameId } = await seedTournament(db, {
        prefix: "rounds-range",
        teamCount: 4,
        poolCount: 1,
      });
      await updateGameRoundCount(db, {
        gameId,
        userId: owner.id,
        roundCount: 2,
      });

      for (const roundCount of [0, -1, 7]) {
        await expectRefused(
          () =>
            updateGameRoundCount(db, {
              gameId,
              userId: owner.id,
              roundCount,
            }),
          "BAD_REQUEST",
          "Rounds must be between 1 and 6",
        );
      }
      expect(await storedRoundCount(db, gameId)).toBe(2);
    } finally {
      await close();
    }
  });

  it("validates against the planned field, not the drawn one", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const { owner, gameId } = await seedTournament(db, {
        prefix: "rounds-planned",
        teamCount: 8,
        poolCount: 1,
      });
      await fillCompleteTeams(db, gameId, "rounds-planned", 4);
      await drawPools(db, { gameId, organizerUserId: owner.id });

      await updateGameRoundCount(db, {
        gameId,
        userId: owner.id,
        roundCount: 14,
      });
      expect(await storedRoundCount(db, gameId)).toBe(14);

      await updateGameRoundCount(db, {
        gameId,
        userId: owner.id,
        roundCount: 7,
      });
      expect(await storedRoundCount(db, gameId)).toBeNull();

      await expectRefused(
        () =>
          updateGameRoundCount(db, {
            gameId,
            userId: owner.id,
            roundCount: 15,
          }),
        "BAD_REQUEST",
        "Rounds must be between 1 and 14",
      );
    } finally {
      await close();
    }
  });

  it("refuses a non-organizer", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const { gameId } = await seedTournament(db, {
        prefix: "rounds-stranger",
        teamCount: 4,
        poolCount: 1,
      });
      const stranger = await insertUser(db, "rounds-stranger@example.com");

      await expectRefused(
        () =>
          updateGameRoundCount(db, {
            gameId,
            userId: stranger.id,
            roundCount: 2,
          }),
        "FORBIDDEN",
        "Only an organizer can do that",
      );
      expect(await storedRoundCount(db, gameId)).toBeNull();
    } finally {
      await close();
    }
  });

  it("refuses a cancelled Game", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const { owner, gameId } = await seedTournament(db, {
        prefix: "rounds-cancelled",
        teamCount: 4,
        poolCount: 1,
      });
      await db
        .update(games)
        .set({ cancelledAt: new Date() })
        .where(eq(games.id, gameId));

      await expectRefused(
        () =>
          updateGameRoundCount(db, {
            gameId,
            userId: owner.id,
            roundCount: 2,
          }),
        "BAD_REQUEST",
        "Cannot edit a cancelled Game",
      );
      expect(await storedRoundCount(db, gameId)).toBeNull();
    } finally {
      await close();
    }
  });

  it("refuses a Game that is not a Pool tournament", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const owner = await insertUser(db, "rounds-friendly-owner@example.com");
      const venue = await insertVenue(db);
      const [friendly] = await db
        .insert(games)
        .values({
          format: "friendly_game",
          venueId: venue.id,
          createdBy: owner.id,
          playersAllowed: 4,
          teamsAllowed: 2,
        })
        .returning({ id: games.id });
      if (!friendly) {
        throw new Error("Failed to insert Friendly game");
      }

      await expectRefused(
        () =>
          updateGameRoundCount(db, {
            gameId: friendly.id,
            userId: owner.id,
            roundCount: 2,
          }),
        "BAD_REQUEST",
        ROUND_COUNT_NOT_POOL_TOURNAMENT_MESSAGE,
      );
      expect(await storedRoundCount(db, friendly.id)).toBeNull();
    } finally {
      await close();
    }
  });

  it("allows a draft draw, refuses a posted draw, and allows again after Undo", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const { owner, gameId } = await seedTournament(db, {
        prefix: "rounds-draw",
        teamCount: 4,
        poolCount: 1,
      });
      await fillCompleteTeams(db, gameId, "rounds-draw", 4);
      await drawPools(db, { gameId, organizerUserId: owner.id });

      await updateGameRoundCount(db, {
        gameId,
        userId: owner.id,
        roundCount: 2,
      });
      await postPoolDraw(db, { gameId, organizerUserId: owner.id });
      const posted = await db.query.matches.findMany({
        where: eq(matches.gameId, gameId),
        columns: { roundNumber: true },
      });
      expect([...new Set(posted.map((row) => row.roundNumber))].sort()).toEqual(
        [1, 2],
      );

      await expectRefused(
        () =>
          updateGameRoundCount(db, {
            gameId,
            userId: owner.id,
            roundCount: 5,
          }),
        "FORBIDDEN",
        POOL_DRAW_POSTED_MESSAGE,
      );
      expect(await storedRoundCount(db, gameId)).toBe(2);

      await undoPoolDraw(db, { gameId, organizerUserId: owner.id });
      await updateGameRoundCount(db, {
        gameId,
        userId: owner.id,
        roundCount: 5,
      });
      expect(await storedRoundCount(db, gameId)).toBe(5);
    } finally {
      await close();
    }
  });
});
