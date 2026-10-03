import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import {
  GroupSportEnum,
  games,
  matches,
  ratingEvents,
  ratings,
  user,
  venues,
} from "@repo/db/schema";

import { loadRatingsMe } from "~/server/api/routers/ratings/me";
import {
  INITIAL_PHI,
  INITIAL_SIGMA,
  muFromLevel,
} from "~/server/ratings/level";
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

async function insertPadelRating(database: TestDatabase, userId: string) {
  await database.insert(ratings).values({
    userId,
    sport: GroupSportEnum.PADEL,
    mu: muFromLevel(3.2),
    phi: INITIAL_PHI,
    sigma: INITIAL_SIGMA,
    levelBand: "C2",
  });
}

async function insertGameWithMatches(
  database: TestDatabase,
  createdBy: string,
  matchCount: number,
) {
  const [venue] = await database
    .insert(venues)
    .values({
      name: `Venue ${crypto.randomUUID()}`,
      city: "Lisbon",
      country: "PT",
    })
    .returning({ id: venues.id });
  if (!venue) {
    throw new Error("Failed to insert venue");
  }

  const [game] = await database
    .insert(games)
    .values({
      name: "Rated night",
      venueId: venue.id,
      createdBy,
    })
    .returning({ id: games.id });
  if (!game) {
    throw new Error("Failed to insert game");
  }

  const rows = await database
    .insert(matches)
    .values(Array.from({ length: matchCount }, () => ({ gameId: game.id })))
    .returning({ id: matches.id });
  if (rows.length !== matchCount) {
    throw new Error("Failed to insert matches");
  }
  return rows;
}

async function insertRatingEvent(
  database: TestDatabase,
  args: {
    userId: string;
    matchId: string;
    sport?: (typeof GroupSportEnum)[keyof typeof GroupSportEnum];
    createdAt?: Date;
  },
) {
  await database.insert(ratingEvents).values({
    userId: args.userId,
    sport: args.sport ?? GroupSportEnum.PADEL,
    matchId: args.matchId,
    outcomeScore: 1,
    weight: 1,
    muBefore: muFromLevel(3.2),
    phiBefore: INITIAL_PHI,
    sigmaBefore: INITIAL_SIGMA,
    muAfter: muFromLevel(3.3),
    phiAfter: INITIAL_PHI,
    sigmaAfter: INITIAL_SIGMA,
    createdAt: args.createdAt,
  });
}

describe("loadRatingsMe ratedMatchCount", () => {
  it("is 0 when the User has no rating", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const viewer = await insertUser(db, "ratings-me-none@example.com");
      const result = await loadRatingsMe(db, { userId: viewer.id });
      expect(result.rating).toBeNull();
      expect(result.ratedMatchCount).toBe(0);
    } finally {
      await close();
    }
  });

  it("is 0 when the User has a rating and no padel ratingEvents", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const viewer = await insertUser(db, "ratings-me-zero@example.com");
      await insertPadelRating(db, viewer.id);
      const result = await loadRatingsMe(db, { userId: viewer.id });
      expect(result.rating).not.toBeNull();
      expect(result.ratedMatchCount).toBe(0);
      expect(result.history).toEqual([]);
    } finally {
      await close();
    }
  });

  it("counts N padel ratingEvents", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const viewer = await insertUser(db, "ratings-me-three@example.com");
      await insertPadelRating(db, viewer.id);
      const matchRows = await insertGameWithMatches(db, viewer.id, 3);
      for (const [index, match] of matchRows.entries()) {
        await insertRatingEvent(db, {
          userId: viewer.id,
          matchId: match.id,
          createdAt: new Date(Date.UTC(2026, 1, 1 + index)),
        });
      }

      const result = await loadRatingsMe(db, { userId: viewer.id });
      expect(result.ratedMatchCount).toBe(3);
      expect(result.history).toHaveLength(4);
    } finally {
      await close();
    }
  });

  it("counts every padel event when N is greater than the 15-event history cap", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const viewer = await insertUser(db, "ratings-me-twenty@example.com");
      await insertPadelRating(db, viewer.id);
      const matchRows = await insertGameWithMatches(db, viewer.id, 21);
      const padelMatches = matchRows.slice(0, 20);
      const footballMatch = matchRows[20];
      if (!footballMatch) {
        throw new Error("Expected a spare match for a football event");
      }

      for (const [index, match] of padelMatches.entries()) {
        await insertRatingEvent(db, {
          userId: viewer.id,
          matchId: match.id,
          createdAt: new Date(Date.UTC(2026, 0, 1 + index)),
        });
      }
      await insertRatingEvent(db, {
        userId: viewer.id,
        matchId: footballMatch.id,
        sport: GroupSportEnum.FOOTBALL,
      });

      const result = await loadRatingsMe(db, { userId: viewer.id });
      expect(result.ratedMatchCount).toBe(20);
      expect(result.history).toHaveLength(16);

      const leftover = await db.query.ratingEvents.findMany({
        where: eq(ratingEvents.userId, viewer.id),
      });
      expect(leftover).toHaveLength(21);
    } finally {
      await close();
    }
  });
});
