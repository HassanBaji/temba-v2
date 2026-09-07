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
  user,
  venues,
} from "@repo/db/schema";

import { completeMatch } from "~/server/api/routers/games/completeMatch";
import { confirmMatchResult } from "~/server/api/routers/games/confirmMatchResult";
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

async function setUpSeatedFriendlyMatch(database: TestDatabase) {
  const [a, b, c, d, outsider] = await Promise.all([
    insertUser(database, `a-${crypto.randomUUID()}@example.com`),
    insertUser(database, `b-${crypto.randomUUID()}@example.com`),
    insertUser(database, `c-${crypto.randomUUID()}@example.com`),
    insertUser(database, `d-${crypto.randomUUID()}@example.com`),
    insertUser(database, `outsider-${crypto.randomUUID()}@example.com`),
  ]);
  if (!a || !b || !c || !d || !outsider) {
    throw new Error("Failed to insert Users");
  }
  const venue = await insertVenue(database);
  const windowStart = new Date();
  const windowEnd = new Date(windowStart.getTime() + 60 * 60 * 1000);

  const created = await createFriendlyGame(database, {
    createdBy: a.id,
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
    a,
    b,
    c,
    d,
    outsider,
  };
}

async function confirmedUserIds(database: TestDatabase, matchId: string) {
  const rows = await database.query.matchResultConfirmations.findMany({
    where: eq(matchResultConfirmations.matchId, matchId),
  });
  return rows.map((row) => row.userId).sort();
}

describe("Match result confirmation (ADR-0011)", () => {
  it("auto-confirms the Set-entering User, requires the other three, and completes+rates only on the last confirmation", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const { game, matchId, sets, a, b, c, d } =
        await setUpSeatedFriendlyMatch(db);
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

      expect(await confirmedUserIds(db, matchId)).toEqual([a.id].sort());
      let match = await db.query.matches.findFirst({
        where: eq(matches.id, matchId),
      });
      expect(match?.status).not.toBe(MatchStatusEnum.COMPLETED);

      await confirmMatchResult(db, { gameId: game.id, matchId, userId: b.id });
      expect(await confirmedUserIds(db, matchId)).toEqual(
        [a.id, b.id].sort(),
      );

      await confirmMatchResult(db, { gameId: game.id, matchId, userId: c.id });
      match = await db.query.matches.findFirst({
        where: eq(matches.id, matchId),
      });
      expect(match?.status).not.toBe(MatchStatusEnum.COMPLETED);
      expect(
        await db.query.ratingEvents.findMany({
          where: eq(ratingEvents.matchId, matchId),
        }),
      ).toHaveLength(0);

      // Last confirmation completes and rates in the same effect.
      await confirmMatchResult(db, { gameId: game.id, matchId, userId: d.id });
      match = await db.query.matches.findFirst({
        where: eq(matches.id, matchId),
      });
      expect(match?.status).toBe(MatchStatusEnum.COMPLETED);
      const events = await db.query.ratingEvents.findMany({
        where: eq(ratingEvents.matchId, matchId),
      });
      expect(events).toHaveLength(4);
    } finally {
      await close();
    }
  });

  it("is idempotent: a duplicate confirmation does not insert a second row or double-fire completion", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const { game, matchId, sets, a, b, c, d } =
        await setUpSeatedFriendlyMatch(db);
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
      await confirmMatchResult(db, { gameId: game.id, matchId, userId: b.id });
      // Duplicate confirmation from b while still pending.
      await confirmMatchResult(db, { gameId: game.id, matchId, userId: b.id });

      const rows = await db.query.matchResultConfirmations.findMany({
        where: eq(matchResultConfirmations.matchId, matchId),
      });
      expect(rows.filter((row) => row.userId === b.id)).toHaveLength(1);
      expect(await confirmedUserIds(db, matchId)).toEqual(
        [a.id, b.id].sort(),
      );

      await confirmMatchResult(db, { gameId: game.id, matchId, userId: c.id });
      await confirmMatchResult(db, { gameId: game.id, matchId, userId: d.id });

      const match = await db.query.matches.findFirst({
        where: eq(matches.id, matchId),
      });
      expect(match?.status).toBe(MatchStatusEnum.COMPLETED);
      expect(
        await db.query.ratingEvents.findMany({
          where: eq(ratingEvents.matchId, matchId),
        }),
      ).toHaveLength(4);

      // A duplicate confirmation call after completion refuses rather than
      // double-firing the rating effect.
      await expect(
        confirmMatchResult(db, { gameId: game.id, matchId, userId: d.id }),
      ).rejects.toBeInstanceOf(TRPCError);
      expect(
        await db.query.ratingEvents.findMany({
          where: eq(ratingEvents.matchId, matchId),
        }),
      ).toHaveLength(4);
    } finally {
      await close();
    }
  });

  it("refuses a User not seated on either Game team", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const { game, matchId, sets, a, outsider } =
        await setUpSeatedFriendlyMatch(db);
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

      await expect(
        confirmMatchResult(db, {
          gameId: game.id,
          matchId,
          userId: outsider.id,
        }),
      ).rejects.toBeInstanceOf(TRPCError);
    } finally {
      await close();
    }
  });

  it("refuses when the Match has no result yet", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const { game, matchId, a } = await setUpSeatedFriendlyMatch(db);

      await expect(
        confirmMatchResult(db, { gameId: game.id, matchId, userId: a.id }),
      ).rejects.toBeInstanceOf(TRPCError);
    } finally {
      await close();
    }
  });

  it("refuses an already-completed Match", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const { game, matchId, sets, a, b, c, d } =
        await setUpSeatedFriendlyMatch(db);
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
      // Organizer force-completes without full confirmation.
      await completeMatch(db, { gameId: game.id, matchId, userId: a.id });

      await expect(
        confirmMatchResult(db, { gameId: game.id, matchId, userId: b.id }),
      ).rejects.toBeInstanceOf(TRPCError);
      void c;
      void d;
    } finally {
      await close();
    }
  });

  it("refuses a cancelled Match", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const { game, matchId, sets, a, b } = await setUpSeatedFriendlyMatch(db);
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
      await db
        .update(matches)
        .set({ status: MatchStatusEnum.CANCELLED })
        .where(eq(matches.id, matchId));

      await expect(
        confirmMatchResult(db, { gameId: game.id, matchId, userId: b.id }),
      ).rejects.toBeInstanceOf(TRPCError);
    } finally {
      await close();
    }
  });

  it("clears existing confirmations (except the editor's own fresh one) when a Set's games-won values change", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const { game, matchId, sets, a, b, c, d } =
        await setUpSeatedFriendlyMatch(db);
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
      await confirmMatchResult(db, { gameId: game.id, matchId, userId: b.id });
      await confirmMatchResult(db, { gameId: game.id, matchId, userId: c.id });
      expect(await confirmedUserIds(db, matchId)).toEqual(
        [a.id, b.id, c.id].sort(),
      );

      // a edits the Set's score after b and c have confirmed.
      await scoreSet(db, {
        gameId: game.id,
        matchId,
        setId: firstSet.id,
        userId: a.id,
        slot1GamesWon: 6,
        slot2GamesWon: 4,
      });

      expect(await confirmedUserIds(db, matchId)).toEqual([a.id]);

      const match = await db.query.matches.findFirst({
        where: eq(matches.id, matchId),
      });
      expect(match?.status).not.toBe(MatchStatusEnum.COMPLETED);
      void d;
    } finally {
      await close();
    }
  });

  it("does not clear confirmations when a Set write resubmits the same games-won values", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const { game, matchId, sets, a, b, c, d } =
        await setUpSeatedFriendlyMatch(db);
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
      await confirmMatchResult(db, { gameId: game.id, matchId, userId: b.id });

      // a resubmits the same values — no change, so b's confirmation stays.
      await scoreSet(db, {
        gameId: game.id,
        matchId,
        setId: firstSet.id,
        userId: a.id,
        slot1GamesWon: 6,
        slot2GamesWon: 2,
      });

      expect(await confirmedUserIds(db, matchId)).toEqual(
        [a.id, b.id].sort(),
      );
      void c;
      void d;
    } finally {
      await close();
    }
  });

  it("completeMatch.ts's organizer force-complete override is unaffected by confirmation count", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const { game, matchId, sets, a } = await setUpSeatedFriendlyMatch(db);
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
      // Only a's auto-confirmation exists (1 of 4) — organizer force-completes anyway.
      expect(await confirmedUserIds(db, matchId)).toEqual([a.id]);

      await completeMatch(db, { gameId: game.id, matchId, userId: a.id });

      const match = await db.query.matches.findFirst({
        where: eq(matches.id, matchId),
      });
      expect(match?.status).toBe(MatchStatusEnum.COMPLETED);
      const events = await db.query.ratingEvents.findMany({
        where: eq(ratingEvents.matchId, matchId),
      });
      expect(events).toHaveLength(4);
    } finally {
      await close();
    }
  });
});
