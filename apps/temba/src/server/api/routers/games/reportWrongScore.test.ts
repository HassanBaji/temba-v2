import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import {
  GamePositionEnum,
  MatchStatusEnum,
  gamePlayers,
  gameTeamPlayers,
  gameTeams,
  matches,
  matchResultConfirmations,
  matchSets,
  ratingEvents,
  ratings,
  user,
  venues,
} from "@repo/db/schema";

import { confirmMatchResult } from "~/server/api/routers/games/confirmMatchResult";
import { reportWrongScore } from "~/server/api/routers/games/reportWrongScore";
import { scoreSet } from "~/server/api/routers/games/scoreSet";
import { createFriendlyGame } from "~/server/games/create-friendly";
import { createPgliteDb, type TestDatabase } from "~/server/test/pglite";

async function insertUser(database: TestDatabase, email: string) {
  const [row] = await database
    .insert(user)
    .values({ name: email.split("@")[0] ?? "Test User", email })
    .returning();
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
    .returning();
  if (!row) {
    throw new Error("Failed to insert venue");
  }
  return row;
}

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

/** A fresh Friendly game, organized by a User with no seat on its Match. */
async function setUpSeatedFriendlyMatch(database: TestDatabase) {
  const [organizer, a, b, c, d, outsider] = await Promise.all([
    insertUser(database, `organizer-${crypto.randomUUID()}@example.com`),
    insertUser(database, `a-${crypto.randomUUID()}@example.com`),
    insertUser(database, `b-${crypto.randomUUID()}@example.com`),
    insertUser(database, `c-${crypto.randomUUID()}@example.com`),
    insertUser(database, `d-${crypto.randomUUID()}@example.com`),
    insertUser(database, `outsider-${crypto.randomUUID()}@example.com`),
  ]);
  if (!organizer || !a || !b || !c || !d || !outsider) {
    throw new Error("Failed to insert Users");
  }
  const venue = await insertVenue(database);
  const windowStart = new Date();
  const windowEnd = new Date(windowStart.getTime() + 60 * 60 * 1000);

  const created = await createFriendlyGame(database, {
    createdBy: organizer.id,
    venueId: venue.id,
    windowStart,
    windowEnd,
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

  return {
    game: created.game,
    matchId: created.matchId,
    sets,
    organizer,
    a,
    b,
    c,
    d,
    outsider,
  };
}

/**
 * Drives a freshly seated Match to `completed`/rated purely through the
 * ADR-0011 confirmation flow: the Set-entering User (`a`) auto-confirms,
 * then `b`, `c`, `d` confirm in turn, and the last confirmation runs the
 * complete-and-rate effect.
 */
async function completeAndRateViaConfirmation(
  database: TestDatabase,
  args: {
    gameId: string;
    matchId: string;
    setId: string;
    a: { id: string };
    b: { id: string };
    c: { id: string };
    d: { id: string };
  },
) {
  await scoreSet(database, {
    gameId: args.gameId,
    matchId: args.matchId,
    setId: args.setId,
    userId: args.a.id,
    slot1GamesWon: 6,
    slot2GamesWon: 2,
  });
  await confirmMatchResult(database, {
    gameId: args.gameId,
    matchId: args.matchId,
    userId: args.b.id,
  });
  await confirmMatchResult(database, {
    gameId: args.gameId,
    matchId: args.matchId,
    userId: args.c.id,
  });
  await confirmMatchResult(database, {
    gameId: args.gameId,
    matchId: args.matchId,
    userId: args.d.id,
  });
}

async function ratingEventsFor(database: TestDatabase, matchId: string) {
  return database.query.ratingEvents.findMany({
    where: eq(ratingEvents.matchId, matchId),
  });
}

async function confirmationsFor(database: TestDatabase, matchId: string) {
  return database.query.matchResultConfirmations.findMany({
    where: eq(matchResultConfirmations.matchId, matchId),
  });
}

async function ratingRowFor(database: TestDatabase, userId: string) {
  return database.query.ratings.findFirst({
    where: eq(ratings.userId, userId),
  });
}

describe("reportWrongScore (Option A wrong-score reversal, TEM-185)", () => {
  it("refuses a non-organizer", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const { game, matchId, sets, a, b, c, d, outsider } =
        await setUpSeatedFriendlyMatch(db);
      const firstSet = sets[0];
      if (!firstSet) {
        throw new Error("Expected a Set shell");
      }
      await completeAndRateViaConfirmation(db, {
        gameId: game.id,
        matchId,
        setId: firstSet.id,
        a,
        b,
        c,
        d,
      });

      // A seated player is not the organizer.
      await expect(
        reportWrongScore(db, { gameId: game.id, matchId, userId: b.id }),
      ).rejects.toBeInstanceOf(TRPCError);
      // Nor is a total outsider.
      await expect(
        reportWrongScore(db, {
          gameId: game.id,
          matchId,
          userId: outsider.id,
        }),
      ).rejects.toBeInstanceOf(TRPCError);

      const match = await db.query.matches.findFirst({
        where: eq(matches.id, matchId),
      });
      expect(match?.status).toBe(MatchStatusEnum.COMPLETED);
      expect(await ratingEventsFor(db, matchId)).toHaveLength(4);
    } finally {
      await close();
    }
  });

  it("refuses when the Match is not completed (nothing to reverse)", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const { game, matchId, sets, organizer, a } =
        await setUpSeatedFriendlyMatch(db);
      const firstSet = sets[0];
      if (!firstSet) {
        throw new Error("Expected a Set shell");
      }
      // Only a's auto-confirmation exists — Match is still pending.
      await scoreSet(db, {
        gameId: game.id,
        matchId,
        setId: firstSet.id,
        userId: a.id,
        slot1GamesWon: 6,
        slot2GamesWon: 2,
      });

      await expect(
        reportWrongScore(db, {
          gameId: game.id,
          matchId,
          userId: organizer.id,
        }),
      ).rejects.toBeInstanceOf(TRPCError);
    } finally {
      await close();
    }
  });

  it("clean reversal: restores all four Ratings, deletes the rating events, clears confirmations, and reopens to pending", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const { game, matchId, sets, organizer, a, b, c, d } =
        await setUpSeatedFriendlyMatch(db);
      const firstSet = sets[0];
      if (!firstSet) {
        throw new Error("Expected a Set shell");
      }
      await completeAndRateViaConfirmation(db, {
        gameId: game.id,
        matchId,
        setId: firstSet.id,
        a,
        b,
        c,
        d,
      });

      const eventsBeforeReversal = await ratingEventsFor(db, matchId);
      expect(eventsBeforeReversal).toHaveLength(4);
      const beforeByUser = new Map(
        eventsBeforeReversal.map((event) => [event.userId, event]),
      );

      await reportWrongScore(db, {
        gameId: game.id,
        matchId,
        userId: organizer.id,
      });

      for (const seated of [a, b, c, d]) {
        const stored = beforeByUser.get(seated.id);
        if (!stored) {
          throw new Error("Expected a stored rating event for seated User");
        }
        const row = await ratingRowFor(db, seated.id);
        if (!row) {
          throw new Error("Expected a Rating row for seated User");
        }
        expect(row.mu).toBeCloseTo(stored.muBefore, 10);
        expect(row.phi).toBeCloseTo(stored.phiBefore, 10);
        expect(row.sigma).toBeCloseTo(stored.sigmaBefore, 10);
      }

      expect(await ratingEventsFor(db, matchId)).toHaveLength(0);
      expect(await confirmationsFor(db, matchId)).toHaveLength(0);

      const match = await db.query.matches.findFirst({
        where: eq(matches.id, matchId),
      });
      expect(match?.status).toBe(MatchStatusEnum.PENDING);
    } finally {
      await close();
    }
  });

  it("is idempotent: a second reversal attempt on an already-reopened Match is refused, not double-applied", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const { game, matchId, sets, organizer, a, b, c, d } =
        await setUpSeatedFriendlyMatch(db);
      const firstSet = sets[0];
      if (!firstSet) {
        throw new Error("Expected a Set shell");
      }
      await completeAndRateViaConfirmation(db, {
        gameId: game.id,
        matchId,
        setId: firstSet.id,
        a,
        b,
        c,
        d,
      });

      await reportWrongScore(db, {
        gameId: game.id,
        matchId,
        userId: organizer.id,
      });

      await expect(
        reportWrongScore(db, {
          gameId: game.id,
          matchId,
          userId: organizer.id,
        }),
      ).rejects.toBeInstanceOf(TRPCError);

      // Still reversed exactly once: no rating events, no confirmations.
      expect(await ratingEventsFor(db, matchId)).toHaveLength(0);
      expect(await confirmationsFor(db, matchId)).toHaveLength(0);
      const match = await db.query.matches.findFirst({
        where: eq(matches.id, matchId),
      });
      expect(match?.status).toBe(MatchStatusEnum.PENDING);
    } finally {
      await close();
    }
  });

  it("after a clean reversal, a fresh score entry re-triggers the confirmation flow from zero", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const { game, matchId, sets, organizer, a, b, c, d } =
        await setUpSeatedFriendlyMatch(db);
      const firstSet = sets[0];
      if (!firstSet) {
        throw new Error("Expected a Set shell");
      }
      await completeAndRateViaConfirmation(db, {
        gameId: game.id,
        matchId,
        setId: firstSet.id,
        a,
        b,
        c,
        d,
      });
      await reportWrongScore(db, {
        gameId: game.id,
        matchId,
        userId: organizer.id,
      });

      // Sets are editable again through the existing scoreSet door.
      await scoreSet(db, {
        gameId: game.id,
        matchId,
        setId: firstSet.id,
        userId: a.id,
        slot1GamesWon: 6,
        slot2GamesWon: 3,
      });
      expect(await confirmationsFor(db, matchId)).toHaveLength(1);
      let match = await db.query.matches.findFirst({
        where: eq(matches.id, matchId),
      });
      expect(match?.status).toBe(MatchStatusEnum.PENDING);

      await confirmMatchResult(db, { gameId: game.id, matchId, userId: b.id });
      await confirmMatchResult(db, { gameId: game.id, matchId, userId: c.id });
      await confirmMatchResult(db, { gameId: game.id, matchId, userId: d.id });

      match = await db.query.matches.findFirst({
        where: eq(matches.id, matchId),
      });
      expect(match?.status).toBe(MatchStatusEnum.COMPLETED);
      expect(await ratingEventsFor(db, matchId)).toHaveLength(4);
    } finally {
      await close();
    }
  });

  describe("not clean: at least one of the four seated Users has a later Rated Match", () => {
    const positions = ["a", "b", "c", "d"] as const;

    for (const position of positions) {
      it(`refuses when the ${position} seat has a later Rated Match, with no partial reversal`, async () => {
        const { db, close } = await createPgliteDb();
        try {
          const first = await setUpSeatedFriendlyMatch(db);
          const firstSet = first.sets[0];
          if (!firstSet) {
            throw new Error("Expected a Set shell");
          }
          await completeAndRateViaConfirmation(db, {
            gameId: first.game.id,
            matchId: first.matchId,
            setId: firstSet.id,
            a: first.a,
            b: first.b,
            c: first.c,
            d: first.d,
          });

          const eventsAfterFirst = await ratingEventsFor(db, first.matchId);
          expect(eventsAfterFirst).toHaveLength(4);

          // The re-played seat carries over into a second, independent
          // Friendly Match; three fresh Users fill the remaining seats.
          const replayedUser = first[position];
          const [fresh1, fresh2, fresh3] = await Promise.all([
            insertUser(db, `fresh1-${crypto.randomUUID()}@example.com`),
            insertUser(db, `fresh2-${crypto.randomUUID()}@example.com`),
            insertUser(db, `fresh3-${crypto.randomUUID()}@example.com`),
          ]);
          if (!fresh1 || !fresh2 || !fresh3) {
            throw new Error("Failed to insert Users");
          }
          const venue2 = await insertVenue(db);
          const windowStart2 = new Date();
          const windowEnd2 = new Date(windowStart2.getTime() + 60 * 60 * 1000);
          const second = await createFriendlyGame(db, {
            createdBy: first.organizer.id,
            venueId: venue2.id,
            windowStart: windowStart2,
            windowEnd: windowEnd2,
          });
          // Seat the re-played User in the same slot/position they held on
          // the first Match so slot membership is irrelevant to the check.
          const secondSeats =
            position === "a" || position === "b"
              ? {
                  slot1: {
                    left: position === "a" ? replayedUser : fresh1,
                    right: position === "b" ? replayedUser : fresh1,
                  },
                  slot2: { left: fresh2, right: fresh3 },
                }
              : {
                  slot1: { left: fresh1, right: fresh2 },
                  slot2: {
                    left: position === "c" ? replayedUser : fresh3,
                    right: position === "d" ? replayedUser : fresh3,
                  },
                };
          await seatFriendlyMatch(db, {
            gameId: second.game.id,
            matchId: second.matchId,
            slot1: secondSeats.slot1,
            slot2: secondSeats.slot2,
          });
          const secondSets = await db.query.matchSets.findMany({
            where: eq(matchSets.matchId, second.matchId),
          });
          const secondFirstSet = secondSets[0];
          if (!secondFirstSet) {
            throw new Error("Expected a Set shell");
          }
          const secondSeatedUsers = {
            a: secondSeats.slot1.left,
            b: secondSeats.slot1.right,
            c: secondSeats.slot2.left,
            d: secondSeats.slot2.right,
          };
          await completeAndRateViaConfirmation(db, {
            gameId: second.game.id,
            matchId: second.matchId,
            setId: secondFirstSet.id,
            a: secondSeatedUsers.a,
            b: secondSeatedUsers.b,
            c: secondSeatedUsers.c,
            d: secondSeatedUsers.d,
          });
          expect(await ratingEventsFor(db, second.matchId)).toHaveLength(4);

          // The replayed User's rating snapshot right before the (refused)
          // reversal attempt — must be untouched afterward.
          const ratingBeforeAttempt = await ratingRowFor(db, replayedUser.id);
          if (!ratingBeforeAttempt) {
            throw new Error("Expected a Rating row for the replayed User");
          }

          await expect(
            reportWrongScore(db, {
              gameId: first.game.id,
              matchId: first.matchId,
              userId: first.organizer.id,
            }),
          ).rejects.toBeInstanceOf(TRPCError);

          // No partial reversal: the first Match's rating events, Ratings,
          // confirmations, and status are all untouched.
          expect(await ratingEventsFor(db, first.matchId)).toHaveLength(4);
          expect(await confirmationsFor(db, first.matchId)).toHaveLength(4);
          const match = await db.query.matches.findFirst({
            where: eq(matches.id, first.matchId),
          });
          expect(match?.status).toBe(MatchStatusEnum.COMPLETED);
          const ratingAfterAttempt = await ratingRowFor(db, replayedUser.id);
          expect(ratingAfterAttempt?.mu).toBe(ratingBeforeAttempt.mu);
          expect(ratingAfterAttempt?.phi).toBe(ratingBeforeAttempt.phi);
          expect(ratingAfterAttempt?.sigma).toBe(ratingBeforeAttempt.sigma);
        } finally {
          await close();
        }
      });
    }
  });
});
