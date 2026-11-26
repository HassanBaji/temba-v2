import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import {
  GamePositionEnum,
  GroupMemberRoleEnum,
  MatchStatusEnum,
  gamePlayers,
  groupMembers,
  gameTeamPlayers,
  gameTeams,
  groups,
  matches,
  matchResultConfirmations,
  matchSets,
  ratingEvents,
  ratings,
  user,
  venues,
} from "@repo/db/schema";

import { addSet } from "#src/routers/games/addSet";
import { gameById } from "#src/routers/games/byId";
import { completeMatch } from "#src/routers/games/completeMatch";
import { confirmMatchResult } from "#src/routers/games/confirmMatchResult";
import { removeSet } from "#src/routers/games/removeSet";
import { scoreSet } from "#src/routers/games/scoreSet";
import { createFriendlyGame } from "#src/games/create-friendly";
import { createUnclaimedPlayer } from "#src/unclaimed-players/create-unclaimed-player";
import { createPgliteDb, type TestDatabase } from "@repo/db/testing";

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
  const group = await insertGroup(database, a.id);
  const windowStart = new Date();
  const windowEnd = new Date(windowStart.getTime() + 60 * 60 * 1000);

  const created = await createFriendlyGame(database, {
    createdBy: a.id,
    groupId: group.id,
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
  it("auto-confirms the Set-entering User's side, and completes+rates on one confirmation from the other side (ADR-0114)", async () => {
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

      // a's partner has nothing to add: their side already agreed.
      await confirmMatchResult(db, { gameId: game.id, matchId, userId: b.id });
      expect(await confirmedUserIds(db, matchId)).toEqual([a.id]);
      match = await db.query.matches.findFirst({
        where: eq(matches.id, matchId),
      });
      expect(match?.status).not.toBe(MatchStatusEnum.COMPLETED);
      expect(
        await db.query.ratingEvents.findMany({
          where: eq(ratingEvents.matchId, matchId),
        }),
      ).toHaveLength(0);

      // One player of the other side completes and rates all four.
      await confirmMatchResult(db, { gameId: game.id, matchId, userId: c.id });
      match = await db.query.matches.findFirst({
        where: eq(matches.id, matchId),
      });
      expect(match?.status).toBe(MatchStatusEnum.COMPLETED);
      const events = await db.query.ratingEvents.findMany({
        where: eq(ratingEvents.matchId, matchId),
      });
      expect(events).toHaveLength(4);

      // c's partner tapping on a stale screen afterwards is not an error.
      await expect(
        confirmMatchResult(db, { gameId: game.id, matchId, userId: d.id }),
      ).resolves.toEqual({ ok: true });
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
      // Repeated taps from the side that already agreed add nothing.
      await confirmMatchResult(db, { gameId: game.id, matchId, userId: b.id });
      await confirmMatchResult(db, { gameId: game.id, matchId, userId: b.id });

      const rows = await db.query.matchResultConfirmations.findMany({
        where: eq(matchResultConfirmations.matchId, matchId),
      });
      expect(rows.filter((row) => row.userId === a.id)).toHaveLength(1);
      expect(await confirmedUserIds(db, matchId)).toEqual([a.id]);

      await confirmMatchResult(db, { gameId: game.id, matchId, userId: c.id });

      const match = await db.query.matches.findFirst({
        where: eq(matches.id, matchId),
      });
      expect(match?.status).toBe(MatchStatusEnum.COMPLETED);
      expect(
        await db.query.ratingEvents.findMany({
          where: eq(ratingEvents.matchId, matchId),
        }),
      ).toHaveLength(4);

      // A duplicate confirmation after completion succeeds without
      // double-firing the rating effect.
      await expect(
        confirmMatchResult(db, { gameId: game.id, matchId, userId: c.id }),
      ).resolves.toEqual({ ok: true });
      expect(
        await db.query.ratingEvents.findMany({
          where: eq(ratingEvents.matchId, matchId),
        }),
      ).toHaveLength(4);
      void d;
    } finally {
      await close();
    }
  });

  it("keeps the first confirmation time when a player confirms again", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const { game, matchId, sets, a, c } = await setUpSeatedFriendlyMatch(db);
      await scoreSet(db, {
        gameId: game.id,
        matchId,
        setId: sets[0]!.id,
        userId: a.id,
        slot1GamesWon: 6,
        slot2GamesWon: 2,
      });
      await confirmMatchResult(db, { gameId: game.id, matchId, userId: c.id });
      const confirmedAt = async () =>
        (
          await db.query.matchResultConfirmations.findMany({
            where: eq(matchResultConfirmations.matchId, matchId),
          })
        ).find((row) => row.userId === c.id)?.confirmedAt;
      const first = await confirmedAt();
      await new Promise((resolve) => setTimeout(resolve, 5));
      await confirmMatchResult(db, { gameId: game.id, matchId, userId: c.id });
      expect(await confirmedAt()).toEqual(first);
    } finally {
      await close();
    }
  });

  it("refuses a seated player who is not an Organizer completing the Match alone", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const { game, matchId, sets, a, b } = await setUpSeatedFriendlyMatch(db);
      await scoreSet(db, {
        gameId: game.id,
        matchId,
        setId: sets[0]!.id,
        userId: b.id,
        slot1GamesWon: 6,
        slot2GamesWon: 0,
      });

      await expect(
        completeMatch(db, { gameId: game.id, matchId, userId: b.id }),
      ).rejects.toMatchObject({ code: "FORBIDDEN" });
      const match = await db.query.matches.findFirst({
        where: eq(matches.id, matchId),
      });
      expect(match?.status).toBe(MatchStatusEnum.PENDING);
      expect(
        await db.query.ratingEvents.findMany({
          where: eq(ratingEvents.matchId, matchId),
        }),
      ).toHaveLength(0);

      const detail = await gameById(db, { gameId: game.id, userId: b.id });
      expect(detail.matches[0]?.canComplete).toBe(false);
      const organizerView = await gameById(db, {
        gameId: game.id,
        userId: a.id,
      });
      expect(organizerView.matches[0]?.canComplete).toBe(true);
    } finally {
      await close();
    }
  });

  it("clears the others' confirmations when a Set is removed, so the losing side cannot flip the result", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const { game, matchId, sets, b, c, d } =
        await setUpSeatedFriendlyMatch(db);
      const base = { gameId: game.id, matchId };
      await scoreSet(db, {
        ...base,
        setId: sets[0]!.id,
        userId: b.id,
        slot1GamesWon: 6,
        slot2GamesWon: 4,
      });
      await scoreSet(db, {
        ...base,
        setId: sets[1]!.id,
        userId: b.id,
        slot1GamesWon: 4,
        slot2GamesWon: 6,
      });
      await scoreSet(db, {
        ...base,
        setId: sets[2]!.id,
        userId: b.id,
        slot1GamesWon: 6,
        slot2GamesWon: 3,
      });
      expect(await confirmedUserIds(db, matchId)).toEqual([b.id]);

      await removeSet(db, { ...base, setId: sets[0]!.id, userId: d.id });
      await removeSet(db, { ...base, setId: sets[2]!.id, userId: d.id });
      expect(await confirmedUserIds(db, matchId)).toEqual([d.id]);

      // d's partner cannot complete the flipped result for the other side.
      await confirmMatchResult(db, { ...base, userId: c.id });
      const match = await db.query.matches.findFirst({
        where: eq(matches.id, matchId),
      });
      expect(match?.status).toBe(MatchStatusEnum.PENDING);
      expect(
        await db.query.ratingEvents.findMany({
          where: eq(ratingEvents.matchId, matchId),
        }),
      ).toHaveLength(0);
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

      // The other side never agreed, so their tap is refused.
      await expect(
        confirmMatchResult(db, { gameId: game.id, matchId, userId: c.id }),
      ).rejects.toBeInstanceOf(TRPCError);
      void b;
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
      expect(await confirmedUserIds(db, matchId)).toEqual([a.id]);

      // c corrects the Set's score after a entered it.
      await scoreSet(db, {
        gameId: game.id,
        matchId,
        setId: firstSet.id,
        userId: c.id,
        slot1GamesWon: 6,
        slot2GamesWon: 4,
      });

      expect(await confirmedUserIds(db, matchId)).toEqual([c.id]);

      const match = await db.query.matches.findFirst({
        where: eq(matches.id, matchId),
      });
      expect(match?.status).not.toBe(MatchStatusEnum.COMPLETED);
      void b;
      void d;
    } finally {
      await close();
    }
  });

  it("confirms nothing when a Set is saved with the games it already had, from either side", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const { game, matchId, sets, a, b, c } =
        await setUpSeatedFriendlyMatch(db);
      const base = { gameId: game.id, matchId, setId: sets[0]!.id };
      const sameScore = { slot1GamesWon: 6, slot2GamesWon: 2 };

      await scoreSet(db, { ...base, userId: a.id, ...sameScore });
      await scoreSet(db, { ...base, userId: b.id, ...sameScore });
      await scoreSet(db, { ...base, userId: c.id, ...sameScore });

      expect(await confirmedUserIds(db, matchId)).toEqual([a.id]);
      const match = await db.query.matches.findFirst({
        where: eq(matches.id, matchId),
      });
      expect(match?.status).toBe(MatchStatusEnum.PENDING);
    } finally {
      await close();
    }
  });

  it("lets the other side correct a later Set: the Apps resend every Set in order, and the unchanged first one must not complete the Match", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const { game, matchId, sets, b, c, d } =
        await setUpSeatedFriendlyMatch(db);
      const base = { gameId: game.id, matchId };
      const entered = [
        { setId: sets[0]!.id, slot1GamesWon: 6, slot2GamesWon: 2 },
        { setId: sets[1]!.id, slot1GamesWon: 6, slot2GamesWon: 3 },
      ];
      for (const set of entered) {
        await scoreSet(db, { ...base, userId: b.id, ...set });
      }

      const corrected = [
        entered[0]!,
        { setId: sets[1]!.id, slot1GamesWon: 3, slot2GamesWon: 6 },
      ];
      for (const set of corrected) {
        await scoreSet(db, { ...base, userId: c.id, ...set });
      }

      expect(await confirmedUserIds(db, matchId)).toEqual([c.id]);
      let match = await db.query.matches.findFirst({
        where: eq(matches.id, matchId),
        with: { sets: { orderBy: (table, { asc }) => [asc(table.setNumber)] } },
      });
      expect(match?.status).toBe(MatchStatusEnum.PENDING);
      expect(
        match?.sets
          .slice(0, 2)
          .map((set) => [set.slot1GamesWon, set.slot2GamesWon]),
      ).toEqual([
        [6, 2],
        [3, 6],
      ]);
      expect(
        await db.query.ratingEvents.findMany({
          where: eq(ratingEvents.matchId, matchId),
        }),
      ).toHaveLength(0);

      // The corrected score still takes one tap from the side that entered
      // the first one.
      await confirmMatchResult(db, { ...base, userId: b.id });
      match = await db.query.matches.findFirst({
        where: eq(matches.id, matchId),
        with: { sets: true },
      });
      expect(match?.status).toBe(MatchStatusEnum.COMPLETED);
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

  it("still completes a drawn Friendly game as a draw, by confirmation and by force-complete", async () => {
    const { db, close } = await createPgliteDb();
    try {
      for (const path of ["confirmation", "force-complete"] as const) {
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
          slot2GamesWon: 4,
        });
        const secondSet = await addSet(db, {
          gameId: game.id,
          matchId,
          userId: a.id,
        });
        await scoreSet(db, {
          gameId: game.id,
          matchId,
          setId: secondSet.id,
          userId: a.id,
          slot1GamesWon: 4,
          slot2GamesWon: 6,
        });

        if (path === "confirmation") {
          for (const userId of [b.id, c.id, d.id]) {
            await confirmMatchResult(db, { gameId: game.id, matchId, userId });
          }
        } else {
          await completeMatch(db, { gameId: game.id, matchId, userId: a.id });
        }

        const match = await db.query.matches.findFirst({
          where: eq(matches.id, matchId),
        });
        expect(match?.status).toBe(MatchStatusEnum.COMPLETED);
        const events = await db.query.ratingEvents.findMany({
          where: eq(ratingEvents.matchId, matchId),
        });
        expect(events).toHaveLength(4);
      }
    } finally {
      await close();
    }
  });
});

let unclaimedPhoneSuffix = 4400;

async function insertUnclaimed(database: TestDatabase, addedByUserId: string) {
  unclaimedPhoneSuffix += 1;
  const created = await database.transaction((tx) =>
    createUnclaimedPlayer(tx, {
      phoneNumber: `+9733612${unclaimedPhoneSuffix}`,
      name: `Unclaimed ${unclaimedPhoneSuffix}`,
      addedByUserId,
      startingLevel: { sport: "padel", level: "C+" },
    }),
  );
  return created.user;
}

type SeatKey = "a" | "b" | "c" | "d";

async function setUpMatchWithUnclaimed(
  database: TestDatabase,
  args: { unclaimed: SeatKey[]; organizerSeated: boolean },
) {
  const organizer = await insertUser(
    database,
    `organizer-${crypto.randomUUID()}@example.com`,
  );
  const seat = async (key: SeatKey) => {
    if (key === "a" && args.organizerSeated) {
      return organizer;
    }
    if (args.unclaimed.includes(key)) {
      return insertUnclaimed(database, organizer.id);
    }
    return insertUser(database, `${key}-${crypto.randomUUID()}@example.com`);
  };
  const a = await seat("a");
  const b = await seat("b");
  const c = await seat("c");
  const d = await seat("d");
  const venue = await insertVenue(database);
  const group = await insertGroup(database, organizer.id);
  const windowStart = new Date();
  const created = await createFriendlyGame(database, {
    createdBy: organizer.id,
    groupId: group.id,
    venueId: venue.id,
    windowStart,
    windowEnd: new Date(windowStart.getTime() + 60 * 60 * 1000),
  });
  await seatFriendlyMatch(database, {
    gameId: created.game.id,
    matchId: created.matchId,
    slot1: { left: a, right: b },
    slot2: { left: c, right: d },
  });
  const [firstSet] = await database.query.matchSets.findMany({
    where: eq(matchSets.matchId, created.matchId),
  });
  if (!firstSet) {
    throw new Error("Expected a Set shell");
  }
  return {
    game: created.game,
    matchId: created.matchId,
    firstSetId: firstSet.id,
    organizer,
    a,
    b,
    c,
    d,
  };
}

async function matchStatus(database: TestDatabase, matchId: string) {
  const match = await database.query.matches.findFirst({
    where: eq(matches.id, matchId),
    columns: { status: true },
  });
  return match?.status;
}

async function ratedUserIds(database: TestDatabase, matchId: string) {
  const events = await database.query.ratingEvents.findMany({
    where: eq(ratingEvents.matchId, matchId),
    columns: { userId: true },
  });
  return events.map((event) => event.userId).sort();
}

describe("Match result confirmation with Unclaimed players (D14)", () => {
  it("completes and rates once the three account holders confirm", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const f = await setUpMatchWithUnclaimed(db, {
        unclaimed: ["d"],
        organizerSeated: false,
      });
      const before = await db.query.ratings.findFirst({
        where: eq(ratings.userId, f.d.id),
      });

      await scoreSet(db, {
        gameId: f.game.id,
        matchId: f.matchId,
        setId: f.firstSetId,
        userId: f.a.id,
        slot1GamesWon: 6,
        slot2GamesWon: 2,
      });
      await confirmMatchResult(db, {
        gameId: f.game.id,
        matchId: f.matchId,
        userId: f.b.id,
      });
      expect(await matchStatus(db, f.matchId)).not.toBe(
        MatchStatusEnum.COMPLETED,
      );

      await confirmMatchResult(db, {
        gameId: f.game.id,
        matchId: f.matchId,
        userId: f.c.id,
      });

      expect(await matchStatus(db, f.matchId)).toBe(MatchStatusEnum.COMPLETED);
      expect(await ratedUserIds(db, f.matchId)).toEqual(
        [f.a.id, f.b.id, f.c.id, f.d.id].sort(),
      );
      const after = await db.query.ratings.findFirst({
        where: eq(ratings.userId, f.d.id),
      });
      expect(after?.mu).not.toBe(before?.mu);
    } finally {
      await close();
    }
  });

  it("completes a side of two Unclaimed players once the other side and an Organizer confirm", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const f = await setUpMatchWithUnclaimed(db, {
        unclaimed: ["c", "d"],
        organizerSeated: false,
      });

      await scoreSet(db, {
        gameId: f.game.id,
        matchId: f.matchId,
        setId: f.firstSetId,
        userId: f.a.id,
        slot1GamesWon: 6,
        slot2GamesWon: 2,
      });
      await confirmMatchResult(db, {
        gameId: f.game.id,
        matchId: f.matchId,
        userId: f.b.id,
      });
      expect(await matchStatus(db, f.matchId)).not.toBe(
        MatchStatusEnum.COMPLETED,
      );

      const details = await gameById(db, {
        gameId: f.game.id,
        userId: f.organizer.id,
      });
      expect(details.matchResultConfirmation?.requiredUserIds.sort()).toEqual(
        [f.a.id, f.b.id].sort(),
      );
      expect(details.matchResultConfirmation?.organizerSides).toEqual([
        { slot: 2, confirmed: false },
      ]);

      await confirmMatchResult(db, {
        gameId: f.game.id,
        matchId: f.matchId,
        userId: f.organizer.id,
      });

      expect(await matchStatus(db, f.matchId)).toBe(MatchStatusEnum.COMPLETED);
      expect(await ratedUserIds(db, f.matchId)).toEqual(
        [f.a.id, f.b.id, f.c.id, f.d.id].sort(),
      );
    } finally {
      await close();
    }
  });

  it("refuses a side confirmation from a player who is not an Organizer", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const f = await setUpMatchWithUnclaimed(db, {
        unclaimed: ["c", "d"],
        organizerSeated: true,
      });

      await scoreSet(db, {
        gameId: f.game.id,
        matchId: f.matchId,
        setId: f.firstSetId,
        userId: f.a.id,
        slot1GamesWon: 6,
        slot2GamesWon: 2,
      });
      await expect(
        confirmMatchResult(db, {
          gameId: f.game.id,
          matchId: f.matchId,
          userId: f.b.id,
          slot: 2,
        }),
      ).rejects.toThrow("Only an organizer");
      expect(await matchStatus(db, f.matchId)).not.toBe(
        MatchStatusEnum.COMPLETED,
      );

      await confirmMatchResult(db, {
        gameId: f.game.id,
        matchId: f.matchId,
        userId: f.a.id,
        slot: 2,
      });
      expect(await matchStatus(db, f.matchId)).toBe(MatchStatusEnum.COMPLETED);
    } finally {
      await close();
    }
  });

  it("completes a Match with no account holder once the Organizer confirms", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const f = await setUpMatchWithUnclaimed(db, {
        unclaimed: ["a", "b", "c", "d"],
        organizerSeated: false,
      });

      await scoreSet(db, {
        gameId: f.game.id,
        matchId: f.matchId,
        setId: f.firstSetId,
        userId: f.organizer.id,
        slot1GamesWon: 6,
        slot2GamesWon: 2,
      });
      expect(await matchStatus(db, f.matchId)).not.toBe(
        MatchStatusEnum.COMPLETED,
      );
      await confirmMatchResult(db, {
        gameId: f.game.id,
        matchId: f.matchId,
        userId: f.organizer.id,
      });

      expect(await matchStatus(db, f.matchId)).toBe(MatchStatusEnum.COMPLETED);
      expect(await ratedUserIds(db, f.matchId)).toEqual(
        [f.a.id, f.b.id, f.c.id, f.d.id].sort(),
      );
    } finally {
      await close();
    }
  });
});

describe("an Organizer's confirmation is final (ADR-0044)", () => {
  it("completes and rates without any player confirming", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const f = await setUpMatchWithUnclaimed(db, {
        unclaimed: [],
        organizerSeated: false,
      });

      await scoreSet(db, {
        gameId: f.game.id,
        matchId: f.matchId,
        setId: f.firstSetId,
        userId: f.organizer.id,
        slot1GamesWon: 6,
        slot2GamesWon: 2,
      });
      expect(await matchStatus(db, f.matchId)).not.toBe(
        MatchStatusEnum.COMPLETED,
      );
      await confirmMatchResult(db, {
        gameId: f.game.id,
        matchId: f.matchId,
        userId: f.organizer.id,
      });

      expect(await matchStatus(db, f.matchId)).toBe(MatchStatusEnum.COMPLETED);
      expect(await ratedUserIds(db, f.matchId)).toEqual(
        [f.a.id, f.b.id, f.c.id, f.d.id].sort(),
      );
      const details = await gameById(db, {
        gameId: f.game.id,
        userId: f.a.id,
      });
      expect(details.matchResultConfirmation?.confirmedByOrganizer).toBe(true);
      expect(details.matchResultConfirmation?.confirmedAt).toBeNull();
    } finally {
      await close();
    }
  });

  it("keeps a seated Organizer's score entry waiting until they confirm", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const f = await setUpMatchWithUnclaimed(db, {
        unclaimed: [],
        organizerSeated: true,
      });

      await scoreSet(db, {
        gameId: f.game.id,
        matchId: f.matchId,
        setId: f.firstSetId,
        userId: f.organizer.id,
        slot1GamesWon: 6,
        slot2GamesWon: 2,
      });
      expect(await confirmedUserIds(db, f.matchId)).toEqual([f.organizer.id]);
      expect(await matchStatus(db, f.matchId)).not.toBe(
        MatchStatusEnum.COMPLETED,
      );

      await confirmMatchResult(db, {
        gameId: f.game.id,
        matchId: f.matchId,
        userId: f.organizer.id,
      });
      expect(await matchStatus(db, f.matchId)).toBe(MatchStatusEnum.COMPLETED);
    } finally {
      await close();
    }
  });

  it("lets an Appointed Organizer confirm for everyone", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const f = await setUpMatchWithUnclaimed(db, {
        unclaimed: [],
        organizerSeated: false,
      });
      const appointed = await insertUser(
        db,
        `appointed-${crypto.randomUUID()}@example.com`,
      );
      if (!f.game.groupId) {
        throw new Error("Expected a Group Game");
      }
      await db.insert(groupMembers).values({
        groupId: f.game.groupId,
        userId: appointed.id,
        role: GroupMemberRoleEnum.ORGANIZER,
      });

      await scoreSet(db, {
        gameId: f.game.id,
        matchId: f.matchId,
        setId: f.firstSetId,
        userId: f.a.id,
        slot1GamesWon: 6,
        slot2GamesWon: 2,
      });
      await confirmMatchResult(db, {
        gameId: f.game.id,
        matchId: f.matchId,
        userId: appointed.id,
      });
      expect(await matchStatus(db, f.matchId)).toBe(MatchStatusEnum.COMPLETED);
    } finally {
      await close();
    }
  });

  it("still refuses a User who is neither seated nor an Organizer", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const f = await setUpMatchWithUnclaimed(db, {
        unclaimed: [],
        organizerSeated: false,
      });
      const outsider = await insertUser(
        db,
        `outsider-${crypto.randomUUID()}@example.com`,
      );
      await scoreSet(db, {
        gameId: f.game.id,
        matchId: f.matchId,
        setId: f.firstSetId,
        userId: f.a.id,
        slot1GamesWon: 6,
        slot2GamesWon: 2,
      });
      await expect(
        confirmMatchResult(db, {
          gameId: f.game.id,
          matchId: f.matchId,
          userId: outsider.id,
        }),
      ).rejects.toThrow("or an organizer");
    } finally {
      await close();
    }
  });
});
