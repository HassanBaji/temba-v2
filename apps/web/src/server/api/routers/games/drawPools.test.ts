import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import {
  courts,
  gameTeams,
  groups,
  matches,
  user,
  venues,
} from "@repo/db/schema";

import { gameById } from "~/server/api/routers/games/byId";
import { createTournament } from "~/server/api/routers/games/createTournament";
import { drawPools } from "~/server/api/routers/games/drawPools";
import { registerSeat } from "~/server/api/routers/games/registerSeat";
import { createPgliteDb, type TestDatabase } from "~/server/test/pglite";

async function insertUser(
  database: TestDatabase,
  email: string,
  name?: string,
) {
  const [row] = await database
    .insert(user)
    .values({ name: name ?? email.split("@")[0] ?? "User", email })
    .returning({ id: user.id, name: user.name });
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

async function insertCourt(
  database: TestDatabase,
  venueId: string,
  name: string,
) {
  const [row] = await database
    .insert(courts)
    .values({ venueId, name })
    .returning({ id: courts.id, name: courts.name });
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

function identityShuffle<T>(items: readonly T[]): T[] {
  return [...items];
}

function reverseShuffle<T>(items: readonly T[]): T[] {
  return [...items].reverse();
}

async function insertTournament(
  database: TestDatabase,
  args: {
    createdBy: string;
    venueId: string;
    teamCount: number;
    poolCount: number;
    courtIds?: string[];
  },
) {
  const group = await insertGroup(database, args.createdBy);
  const created = await createTournament(database, {
    createdBy: args.createdBy,
    name: "Autumn Friendly",
    groupId: group.id,
    isPublic: true,
    registrationMode: "individual",
    teamCount: args.teamCount,
    poolCount: args.poolCount,
    venueId: args.venueId,
    courtIds: args.courtIds,
    matchMinutes: 45,
    windowStart: new Date("2026-09-20T18:00:00"),
    windowEnd: new Date("2026-09-20T21:00:00"),
  });
  return created.id;
}

async function insertNamedUsers(
  database: TestDatabase,
  prefix: string,
  count: number,
) {
  const rows = [];
  for (let index = 0; index < count; index += 1) {
    rows.push(
      await insertUser(
        database,
        `${prefix}-${index}@example.com`,
        `${prefix}-${index + 1}`,
      ),
    );
  }
  return rows;
}

async function fillCompleteTeams(
  database: TestDatabase,
  gameId: string,
  players: { id: string }[],
  teamCount: number,
) {
  for (let index = 0; index < teamCount; index += 1) {
    const left = players[index * 2];
    const right = players[index * 2 + 1];
    if (!left || !right) {
      throw new Error("Not enough players to fill Game teams");
    }
    await registerSeat(database, {
      gameId,
      userId: left.id,
      sideIndex: index + 1,
      position: "left",
    });
    await registerSeat(database, {
      gameId,
      userId: right.id,
      sideIndex: index + 1,
      position: "right",
    });
  }
}

async function poolIndexBySide(
  database: TestDatabase,
  gameId: string,
): Promise<Map<number, number | null>> {
  const rows = await database.query.gameTeams.findMany({
    where: eq(gameTeams.gameId, gameId),
    columns: { sideIndex: true, poolIndex: true },
  });
  const bySide = new Map<number, number | null>();
  for (const row of rows) {
    if (row.sideIndex == null) {
      continue;
    }
    bySide.set(row.sideIndex, row.poolIndex);
  }
  return bySide;
}

async function expectRefused(
  run: () => Promise<unknown>,
  code: TRPCError["code"],
  message: string | RegExp,
) {
  try {
    await run();
    throw new Error("expected the Pool draw to be refused");
  } catch (error) {
    expect(error).toBeInstanceOf(TRPCError);
    if (!(error instanceof TRPCError)) {
      return;
    }
    expect(error.code).toBe(code);
    if (typeof message === "string") {
      expect(error.message).toBe(message);
    } else {
      expect(error.message).toMatch(message);
    }
  }
}

describe("drawPools", () => {
  it("assigns an even split from a deterministic shuffle", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const owner = await insertUser(db, "owner-even@example.com");
      const venue = await insertVenue(db);
      const courtA = await insertCourt(db, venue.id, "Court 1");
      const courtB = await insertCourt(db, venue.id, "Court 2");
      const gameId = await insertTournament(db, {
        createdBy: owner.id,
        venueId: venue.id,
        teamCount: 8,
        poolCount: 2,
        courtIds: [courtA.id, courtB.id],
      });
      const players = await insertNamedUsers(db, "even", 16);
      await fillCompleteTeams(db, gameId, players, 8);

      const drawn = await drawPools(db, {
        gameId,
        organizerUserId: owner.id,
        shuffle: identityShuffle,
      });

      expect(drawn.poolCount).toBe(2);
      expect(drawn.pools.map((pool) => pool.poolIndex)).toEqual([1, 2]);
      expect(drawn.pools.map((pool) => pool.gameTeamIds.length)).toEqual([
        4, 4,
      ]);

      const bySide = await poolIndexBySide(db, gameId);
      expect(bySide.get(1)).toBe(1);
      expect(bySide.get(2)).toBe(1);
      expect(bySide.get(3)).toBe(1);
      expect(bySide.get(4)).toBe(1);
      expect(bySide.get(5)).toBe(2);
      expect(bySide.get(6)).toBe(2);
      expect(bySide.get(7)).toBe(2);
      expect(bySide.get(8)).toBe(2);

      const matchRows = await db.query.matches.findMany({
        where: eq(matches.gameId, gameId),
      });
      expect(matchRows).toHaveLength(0);

      const detail = await gameById(db, { gameId, userId: owner.id });
      expect(
        detail.gameTeams.map((team) => ({
          sideIndex: team.sideIndex,
          poolIndex: team.poolIndex,
        })),
      ).toEqual(
        expect.arrayContaining([
          { sideIndex: 1, poolIndex: 1 },
          { sideIndex: 4, poolIndex: 1 },
          { sideIndex: 5, poolIndex: 2 },
          { sideIndex: 8, poolIndex: 2 },
        ]),
      );
      expect(detail.recordedCourts.map((court) => court.name).sort()).toEqual([
        "Court 1",
        "Court 2",
      ]);
      expect(detail.matches).toHaveLength(0);
    } finally {
      await close();
    }
  });

  it("assigns an uneven split from a deterministic shuffle", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const owner = await insertUser(db, "owner-uneven@example.com");
      const venue = await insertVenue(db);
      const gameId = await insertTournament(db, {
        createdBy: owner.id,
        venueId: venue.id,
        teamCount: 10,
        poolCount: 3,
      });
      const players = await insertNamedUsers(db, "uneven", 20);
      await fillCompleteTeams(db, gameId, players, 10);

      const drawn = await drawPools(db, {
        gameId,
        organizerUserId: owner.id,
        shuffle: identityShuffle,
      });

      expect(drawn.poolCount).toBe(3);
      expect(drawn.pools.map((pool) => pool.gameTeamIds.length)).toEqual([
        4, 3, 3,
      ]);

      const bySide = await poolIndexBySide(db, gameId);
      expect([1, 2, 3, 4].map((side) => bySide.get(side))).toEqual([
        1, 1, 1, 1,
      ]);
      expect([5, 6, 7].map((side) => bySide.get(side))).toEqual([2, 2, 2]);
      expect([8, 9, 10].map((side) => bySide.get(side))).toEqual([3, 3, 3]);
    } finally {
      await close();
    }
  });

  it("rebalances an early draw to the real Game team count", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const owner = await insertUser(db, "owner-early@example.com");
      const venue = await insertVenue(db);
      const gameId = await insertTournament(db, {
        createdBy: owner.id,
        venueId: venue.id,
        teamCount: 12,
        poolCount: 3,
      });
      const players = await insertNamedUsers(db, "early", 12);
      await fillCompleteTeams(db, gameId, players, 6);

      const drawn = await drawPools(db, {
        gameId,
        organizerUserId: owner.id,
        shuffle: identityShuffle,
      });

      expect(drawn.poolCount).toBe(2);
      expect(drawn.pools.map((pool) => pool.gameTeamIds.length)).toEqual([
        3, 3,
      ]);

      const bySide = await poolIndexBySide(db, gameId);
      expect([1, 2, 3].map((side) => bySide.get(side))).toEqual([1, 1, 1]);
      expect([4, 5, 6].map((side) => bySide.get(side))).toEqual([2, 2, 2]);
      expect(bySide.size).toBe(6);
    } finally {
      await close();
    }
  });

  it("overwrites a previous draft with a different assignment and creates no Matches", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const owner = await insertUser(db, "owner-reroll@example.com");
      const venue = await insertVenue(db);
      const gameId = await insertTournament(db, {
        createdBy: owner.id,
        venueId: venue.id,
        teamCount: 8,
        poolCount: 2,
      });
      const players = await insertNamedUsers(db, "reroll", 16);
      await fillCompleteTeams(db, gameId, players, 8);

      await drawPools(db, {
        gameId,
        organizerUserId: owner.id,
        shuffle: identityShuffle,
      });
      const first = await poolIndexBySide(db, gameId);

      await drawPools(db, {
        gameId,
        organizerUserId: owner.id,
        shuffle: reverseShuffle,
      });
      const second = await poolIndexBySide(db, gameId);

      expect(second.get(1)).toBe(2);
      expect(second.get(8)).toBe(1);
      expect(second.get(1)).not.toBe(first.get(1));
      expect(second.get(8)).not.toBe(first.get(8));

      const matchRows = await db.query.matches.findMany({
        where: eq(matches.gameId, gameId),
      });
      expect(matchRows).toHaveLength(0);
    } finally {
      await close();
    }
  });

  it("refuses while a Half team exists and names the incomplete Game teams", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const owner = await insertUser(db, "owner-half@example.com");
      const venue = await insertVenue(db);
      const gameId = await insertTournament(db, {
        createdBy: owner.id,
        venueId: venue.id,
        teamCount: 8,
        poolCount: 2,
      });
      const players = await insertNamedUsers(db, "half-full", 8);
      await fillCompleteTeams(db, gameId, players, 4);
      const ada = await insertUser(db, "half-ada@example.com", "Ada");
      const jonas = await insertUser(db, "half-jonas@example.com", "Jonas");
      await registerSeat(db, {
        gameId,
        userId: ada.id,
        sideIndex: 5,
        position: "left",
      });
      await registerSeat(db, {
        gameId,
        userId: jonas.id,
        sideIndex: 6,
        position: "right",
      });

      await expectRefused(
        () =>
          drawPools(db, {
            gameId,
            organizerUserId: owner.id,
            shuffle: identityShuffle,
          }),
        "BAD_REQUEST",
        "Cannot draw the groups while Half teams remain: Ada, Jonas",
      );

      const bySide = await poolIndexBySide(db, gameId);
      expect([...bySide.values()].every((value) => value == null)).toBe(true);
    } finally {
      await close();
    }
  });

  it("refuses below 4 complete Game teams", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const owner = await insertUser(db, "owner-min@example.com");
      const venue = await insertVenue(db);
      const gameId = await insertTournament(db, {
        createdBy: owner.id,
        venueId: venue.id,
        teamCount: 8,
        poolCount: 2,
      });
      const players = await insertNamedUsers(db, "min", 6);
      await fillCompleteTeams(db, gameId, players, 3);

      await expectRefused(
        () =>
          drawPools(db, {
            gameId,
            organizerUserId: owner.id,
            shuffle: identityShuffle,
          }),
        "BAD_REQUEST",
        "Need at least 4 complete Game teams to draw the groups",
      );
    } finally {
      await close();
    }
  });

  it("refuses a non-organizer", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const owner = await insertUser(db, "owner-auth@example.com");
      const ada = await insertUser(db, "ada-auth@example.com", "Ada");
      const venue = await insertVenue(db);
      const gameId = await insertTournament(db, {
        createdBy: owner.id,
        venueId: venue.id,
        teamCount: 4,
        poolCount: 1,
      });
      const partners = await insertNamedUsers(db, "auth-pair", 8);
      await fillCompleteTeams(db, gameId, partners, 4);

      await expectRefused(
        () =>
          drawPools(db, {
            gameId,
            organizerUserId: ada.id,
            shuffle: identityShuffle,
          }),
        "FORBIDDEN",
        "Only an organizer can do that",
      );
    } finally {
      await close();
    }
  });
});
