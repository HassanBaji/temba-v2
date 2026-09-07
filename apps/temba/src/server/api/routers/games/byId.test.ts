import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import {
  GamePositionEnum,
  MatchStatusEnum,
  gamePlayers,
  gameTeamPlayers,
  gameTeams,
  games,
  matches,
  matchSets,
  ratings,
  user,
  venues,
} from "@repo/db/schema";

import { gameById } from "~/server/api/routers/games/byId";
import { completeMatch } from "~/server/api/routers/games/completeMatch";
import { confirmMatchResult } from "~/server/api/routers/games/confirmMatchResult";
import { createGame } from "~/server/api/routers/games/create";
import { scoreSet } from "~/server/api/routers/games/scoreSet";
import { createFriendlyGame } from "~/server/games/create-friendly";
import { INITIAL_SIGMA, muFromLevel } from "~/server/ratings/level";
import { createPgliteDb, type TestDatabase } from "~/server/test/pglite";

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

async function insertVenue(
  database: TestDatabase,
  coords?: { latitude?: string | null; longitude?: string | null },
) {
  const [row] = await database
    .insert(venues)
    .values({
      name: `Venue ${crypto.randomUUID()}`,
      city: "Lisbon",
      country: "PT",
      latitude: coords?.latitude,
      longitude: coords?.longitude,
    })
    .returning({
      id: venues.id,
      latitude: venues.latitude,
      longitude: venues.longitude,
    });
  if (!row) {
    throw new Error("Failed to insert venue");
  }
  return row;
}

async function insertFriendlyGame(
  database: TestDatabase,
  args: { createdBy: string; venueId: string },
) {
  const windowStart = new Date();
  const created = await createFriendlyGame(database, {
    createdBy: args.createdBy,
    venueId: args.venueId,
    windowStart,
    windowEnd: new Date(windowStart.getTime() + 60 * 60 * 1000),
  });
  return created.game;
}

describe("gameById Venue coordinates", () => {
  it("returns the same stored decimals as Venue reads when both are present", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const owner = await insertUser(db, "coords-both@example.com");
      const venue = await insertVenue(db, {
        latitude: "26.228509",
        longitude: "50.58605",
      });
      const game = await insertFriendlyGame(db, {
        createdBy: owner.id,
        venueId: venue.id,
      });

      const detail = await gameById(db, { gameId: game.id, userId: owner.id });

      expect(detail.venue?.latitude).toEqual(venue.latitude);
      expect(detail.venue?.longitude).toEqual(venue.longitude);
    } finally {
      await close();
    }
  });

  it("returns nullable latitude and longitude when either coordinate is missing", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const owner = await insertUser(db, "coords-partial@example.com");
      const missingBoth = await insertVenue(db);
      const missingLng = await insertVenue(db, {
        latitude: "26.228509",
        longitude: null,
      });
      const missingLat = await insertVenue(db, {
        latitude: null,
        longitude: "50.58605",
      });

      const [bothUnset, noLng, noLat] = await Promise.all([
        insertFriendlyGame(db, {
          createdBy: owner.id,
          venueId: missingBoth.id,
        }),
        insertFriendlyGame(db, {
          createdBy: owner.id,
          venueId: missingLng.id,
        }),
        insertFriendlyGame(db, {
          createdBy: owner.id,
          venueId: missingLat.id,
        }),
      ]);

      const [unsetDetail, noLngDetail, noLatDetail] = await Promise.all([
        gameById(db, { gameId: bothUnset.id, userId: owner.id }),
        gameById(db, { gameId: noLng.id, userId: owner.id }),
        gameById(db, { gameId: noLat.id, userId: owner.id }),
      ]);

      expect(unsetDetail.venue?.latitude ?? null).toBeNull();
      expect(unsetDetail.venue?.longitude ?? null).toBeNull();
      expect(noLngDetail.venue?.latitude).toEqual(missingLng.latitude);
      expect(noLngDetail.venue?.longitude ?? null).toBeNull();
      expect(noLatDetail.venue?.latitude ?? null).toBeNull();
      expect(noLatDetail.venue?.longitude).toEqual(missingLat.longitude);
    } finally {
      await close();
    }
  });
});

async function seatFriendlyMatch(
  database: TestDatabase,
  args: {
    gameId: string;
    matchId: string;
    slot1: { left: { id: string }; right: { id: string } };
    slot2: { left: { id: string }; right: { id: string } };
  },
) {
  const [slot1Team] = await database
    .insert(gameTeams)
    .values({ gameId: args.gameId, sideIndex: 1 })
    .returning({ id: gameTeams.id });
  const [slot2Team] = await database
    .insert(gameTeams)
    .values({ gameId: args.gameId, sideIndex: 2 })
    .returning({ id: gameTeams.id });
  if (!slot1Team || !slot2Team) {
    throw new Error("Failed to insert game teams");
  }

  async function occupy(
    gameTeamId: string,
    occupant: { id: string },
    position: (typeof GamePositionEnum)[keyof typeof GamePositionEnum],
  ) {
    const [player] = await database
      .insert(gamePlayers)
      .values({ gameId: args.gameId, userId: occupant.id })
      .returning({ id: gamePlayers.id });
    if (!player) {
      throw new Error("Failed to insert game player");
    }
    await database.insert(gameTeamPlayers).values({
      gameTeamId,
      gamePlayerId: player.id,
      position,
    });
  }

  await occupy(slot1Team.id, args.slot1.left, GamePositionEnum.LEFT);
  await occupy(slot1Team.id, args.slot1.right, GamePositionEnum.RIGHT);
  await occupy(slot2Team.id, args.slot2.left, GamePositionEnum.LEFT);
  await occupy(slot2Team.id, args.slot2.right, GamePositionEnum.RIGHT);

  await database
    .update(matches)
    .set({
      slot1GameTeamId: slot1Team.id,
      slot2GameTeamId: slot2Team.id,
    })
    .where(eq(matches.id, args.matchId));

  return { slot1TeamId: slot1Team.id, slot2TeamId: slot2Team.id };
}

async function insertRating(
  database: TestDatabase,
  userId: string,
  level: number,
) {
  await database.insert(ratings).values({
    userId,
    sport: "padel",
    mu: muFromLevel(level),
    phi: 100,
    sigma: INITIAL_SIGMA,
    levelBand: "C2",
  });
}

async function setUpSeatedFriendlyGame(
  database: TestDatabase,
  args: { windowStart: Date; windowEnd: Date },
) {
  const [a, b, c, d] = await Promise.all([
    insertUser(database, `a-${crypto.randomUUID()}@example.com`),
    insertUser(database, `b-${crypto.randomUUID()}@example.com`),
    insertUser(database, `c-${crypto.randomUUID()}@example.com`),
    insertUser(database, `d-${crypto.randomUUID()}@example.com`),
  ]);
  if (!a || !b || !c || !d) {
    throw new Error("Failed to insert Users");
  }
  const venue = await insertVenue(database);

  const created = await createFriendlyGame(database, {
    createdBy: a.id,
    venueId: venue.id,
    windowStart: args.windowStart,
    windowEnd: args.windowEnd,
  });

  await seatFriendlyMatch(database, {
    gameId: created.game.id,
    matchId: created.matchId,
    slot1: { left: a, right: b },
    slot2: { left: c, right: d },
  });

  const sets = await database.query.matchSets.findMany({
    where: eq(matchSets.matchId, created.matchId),
  });

  return { game: created.game, matchId: created.matchId, sets, a, b, c, d };
}

describe("gameById phase (TEM-177)", () => {
  it("is upcoming for a live Game whose window has not started", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const windowStart = new Date(Date.now() + 60 * 60 * 1000);
      const windowEnd = new Date(windowStart.getTime() + 60 * 60 * 1000);
      const { game, a } = await setUpSeatedFriendlyGame(db, {
        windowStart,
        windowEnd,
      });

      const detail = await gameById(db, { gameId: game.id, userId: a.id });

      expect(detail.phase).toBe("upcoming");
    } finally {
      await close();
    }
  });

  it("is needs_results once the window has ended with no result entered", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const windowStart = new Date(Date.now() - 2 * 60 * 60 * 1000);
      const windowEnd = new Date(Date.now() - 60 * 60 * 1000);
      const { game, a } = await setUpSeatedFriendlyGame(db, {
        windowStart,
        windowEnd,
      });

      const detail = await gameById(db, { gameId: game.id, userId: a.id });

      expect(detail.phase).toBe("needs_results");
    } finally {
      await close();
    }
  });

  it("is cancelled when the Game is cancelled", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const windowStart = new Date(Date.now() + 60 * 60 * 1000);
      const windowEnd = new Date(windowStart.getTime() + 60 * 60 * 1000);
      const { game, a } = await setUpSeatedFriendlyGame(db, {
        windowStart,
        windowEnd,
      });
      await db
        .update(games)
        .set({ cancelledAt: new Date() })
        .where(eq(games.id, game.id));

      const detail = await gameById(db, { gameId: game.id, userId: a.id });

      expect(detail.phase).toBe("cancelled");
    } finally {
      await close();
    }
  });

  it("is null for formats other than individual Friendly (e.g. Americano)", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const owner = await insertUser(db, "phase-americano@example.com");
      const venue = await insertVenue(db);
      const windowStart = new Date();
      const windowEnd = new Date(windowStart.getTime() + 60 * 60 * 1000);
      const americano = await createGame(db, {
        createdBy: owner.id,
        isPublic: false,
        format: "americano",
        registrationMode: "individual",
        playersAllowed: 8,
        windowStart,
        windowEnd,
        venueId: venue.id,
      });

      const detail = await gameById(db, {
        gameId: americano.id,
        userId: owner.id,
      });

      expect(detail.phase).toBeNull();
    } finally {
      await close();
    }
  });
});

describe("gameById sides[].left/right levelBand (TEM-177)", () => {
  it("is the seated User's Rating band, and null with no Rating yet", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const windowStart = new Date(Date.now() + 60 * 60 * 1000);
      const windowEnd = new Date(windowStart.getTime() + 60 * 60 * 1000);
      const { game, a, b } = await setUpSeatedFriendlyGame(db, {
        windowStart,
        windowEnd,
      });
      await insertRating(db, a.id, 3.15);

      const detail = await gameById(db, { gameId: game.id, userId: a.id });

      const side1 = detail.sides.find((side) => side.sideIndex === 1);
      expect(side1?.left?.userId).toBe(a.id);
      expect(side1?.left?.levelBand).toBe("C2");
      expect(side1?.right?.userId).toBe(b.id);
      expect(side1?.right?.levelBand).toBeNull();
    } finally {
      await close();
    }
  });
});

describe("gameById matchResultConfirmation (TEM-177)", () => {
  it("reflects who has confirmed and who is still required", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const windowStart = new Date(Date.now() - 2 * 60 * 60 * 1000);
      const windowEnd = new Date(Date.now() - 60 * 60 * 1000);
      const { game, matchId, sets, a, b } = await setUpSeatedFriendlyGame(db, {
        windowStart,
        windowEnd,
      });
      const firstSet = sets[0];
      if (!firstSet) {
        throw new Error("Expected a Set shell");
      }

      await scoreSet(db, {
        gameId: game.id,
        matchId,
        setId: firstSet.id,
        userId: a.id,
        slot1GamesWon: 6,
        slot2GamesWon: 2,
      });

      const viewerA = await gameById(db, { gameId: game.id, userId: a.id });
      expect(viewerA.matchResultConfirmation?.confirmedUserIds).toEqual([a.id]);
      expect(viewerA.matchResultConfirmation?.requiredUserIds).toHaveLength(4);
      expect(viewerA.matchResultConfirmation?.viewerHasConfirmed).toBe(true);

      const viewerB = await gameById(db, { gameId: game.id, userId: b.id });
      expect(viewerB.matchResultConfirmation?.viewerHasConfirmed).toBe(false);
    } finally {
      await close();
    }
  });
});

describe("gameById ratingImpact (TEM-177)", () => {
  it("is populated for the viewer once the Match is Final, and omitted before", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const windowStart = new Date(Date.now() - 2 * 60 * 60 * 1000);
      const windowEnd = new Date(Date.now() - 60 * 60 * 1000);
      const { game, matchId, sets, a, b, c, d } = await setUpSeatedFriendlyGame(
        db,
        { windowStart, windowEnd },
      );
      const firstSet = sets[0];
      if (!firstSet) {
        throw new Error("Expected a Set shell");
      }

      await scoreSet(db, {
        gameId: game.id,
        matchId,
        setId: firstSet.id,
        userId: a.id,
        slot1GamesWon: 6,
        slot2GamesWon: 2,
      });

      const beforeFinal = await gameById(db, {
        gameId: game.id,
        userId: a.id,
      });
      expect(beforeFinal.phase).toBe("needs_results");
      expect(beforeFinal.ratingImpact).toBeNull();

      await confirmMatchResult(db, { gameId: game.id, matchId, userId: b.id });
      await confirmMatchResult(db, { gameId: game.id, matchId, userId: c.id });
      await confirmMatchResult(db, { gameId: game.id, matchId, userId: d.id });

      const afterFinal = await gameById(db, { gameId: game.id, userId: a.id });
      expect(afterFinal.phase).toBe("final");
      expect(afterFinal.matchResultConfirmation?.confirmedUserIds).toHaveLength(
        4,
      );
      expect(afterFinal.matchResultConfirmation?.confirmedAt).toBeInstanceOf(
        Date,
      );
      expect(beforeFinal.matchResultConfirmation?.confirmedAt).toBeNull();
      expect(afterFinal.ratingImpact?.newLevel).toBeGreaterThan(3);
      expect(afterFinal.ratingImpact?.levelChange).toBeGreaterThan(0);
      expect(afterFinal.ratingImpact?.isProvisional).toBe(true);
      expect(
        afterFinal.ratingImpact?.ratedMatchesRemainingToConfirm,
      ).toBeGreaterThan(0);
      expect(typeof afterFinal.ratingImpact?.newLevelBand).toBe("string");
    } finally {
      await close();
    }
  });

  it("is null for a viewing Organizer with no seat on the Match even once Final", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const organizer = await insertUser(db, "organizer-final@example.com");
      const [a, b, c, d] = await Promise.all([
        insertUser(db, `a-${crypto.randomUUID()}@example.com`),
        insertUser(db, `b-${crypto.randomUUID()}@example.com`),
        insertUser(db, `c-${crypto.randomUUID()}@example.com`),
        insertUser(db, `d-${crypto.randomUUID()}@example.com`),
      ]);
      if (!a || !b || !c || !d) {
        throw new Error("Failed to insert Users");
      }
      const venue = await insertVenue(db);
      const windowStart = new Date(Date.now() - 2 * 60 * 60 * 1000);
      const windowEnd = new Date(Date.now() - 60 * 60 * 1000);
      const created = await createFriendlyGame(db, {
        createdBy: organizer.id,
        venueId: venue.id,
        windowStart,
        windowEnd,
      });
      await seatFriendlyMatch(db, {
        gameId: created.game.id,
        matchId: created.matchId,
        slot1: { left: a, right: b },
        slot2: { left: c, right: d },
      });
      const sets = await db.query.matchSets.findMany({
        where: eq(matchSets.matchId, created.matchId),
      });
      const firstSet = sets[0];
      if (!firstSet) {
        throw new Error("Expected a Set shell");
      }

      await scoreSet(db, {
        gameId: created.game.id,
        matchId: created.matchId,
        setId: firstSet.id,
        userId: a.id,
        slot1GamesWon: 6,
        slot2GamesWon: 2,
      });
      // Organizer force-completes without playing or confirming themselves.
      await completeMatch(db, {
        gameId: created.game.id,
        matchId: created.matchId,
        userId: organizer.id,
      });

      const detail = await gameById(db, {
        gameId: created.game.id,
        userId: organizer.id,
      });

      expect(detail.phase).toBe("final");
      expect(detail.ratingImpact).toBeNull();
    } finally {
      await close();
    }
  });
});
