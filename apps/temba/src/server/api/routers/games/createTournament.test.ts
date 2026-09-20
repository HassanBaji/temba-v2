import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import {
  communities,
  courts,
  gameCourts,
  games,
  groups,
  matches,
  user,
  venues,
} from "@repo/db/schema";

import { createGame } from "~/server/api/routers/games/create";
import {
  createTournament,
  createTournamentInputSchema,
} from "~/server/api/routers/games/createTournament";
import { commit } from "~/server/soft-archive";
import { createPgliteDb, type TestDatabase } from "~/server/test/pglite";

async function insertUser(database: TestDatabase, email: string) {
  const [row] = await database
    .insert(user)
    .values({ name: "Test User", email })
    .returning({ id: user.id });
  if (!row) {
    throw new Error("Failed to insert user");
  }
  return row;
}

async function insertVenue(
  database: TestDatabase,
  archivedAt: Date | null = null,
) {
  const [row] = await database
    .insert(venues)
    .values({
      name: `Venue ${crypto.randomUUID()}`,
      city: "Lisbon",
      country: "PT",
      archivedAt,
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
    .returning({ id: courts.id });
  if (!row) {
    throw new Error("Failed to insert court");
  }
  return row;
}

async function insertGroup(
  database: TestDatabase,
  args: { createdBy: string; communityId?: string },
) {
  const [row] = await database
    .insert(groups)
    .values({
      name: `Group ${crypto.randomUUID()}`,
      createdBy: args.createdBy,
      communityId: args.communityId,
    })
    .returning({ id: groups.id });
  if (!row) {
    throw new Error("Failed to insert group");
  }
  return row;
}

function windowTimes() {
  const windowStart = new Date("2026-09-20T10:00:00");
  return {
    windowStart,
    windowEnd: new Date(windowStart.getTime() + 4 * 60 * 60 * 1000),
  };
}

describe("createTournamentInputSchema", () => {
  it("refuses a team count below 4", () => {
    const parsed = createTournamentInputSchema.safeParse({
      name: "Autumn Friendly",
      groupId: crypto.randomUUID(),
      isPublic: false,
      registrationMode: "individual",
      teamCount: 2,
      poolCount: 1,
      venueId: crypto.randomUUID(),
      ...windowTimes(),
    });
    expect(parsed.success).toBe(false);
    if (parsed.success) {
      return;
    }
    expect(parsed.error.flatten().fieldErrors.teamCount?.[0]).toMatch(/4/u);
  });

  it("refuses an odd team count", () => {
    const parsed = createTournamentInputSchema.safeParse({
      name: "Autumn Friendly",
      groupId: crypto.randomUUID(),
      isPublic: false,
      registrationMode: "individual",
      teamCount: 5,
      poolCount: 1,
      venueId: crypto.randomUUID(),
      ...windowTimes(),
    });
    expect(parsed.success).toBe(false);
    if (parsed.success) {
      return;
    }
    expect(parsed.error.flatten().fieldErrors.teamCount?.[0]).toMatch(/even/iu);
  });

  it("refuses a Pool count above a third of the team count", () => {
    const parsed = createTournamentInputSchema.safeParse({
      name: "Autumn Friendly",
      groupId: crypto.randomUUID(),
      isPublic: false,
      registrationMode: "individual",
      teamCount: 12,
      poolCount: 5,
      venueId: crypto.randomUUID(),
      ...windowTimes(),
    });
    expect(parsed.success).toBe(false);
    if (parsed.success) {
      return;
    }
    expect(parsed.error.flatten().fieldErrors.poolCount?.[0]).toMatch(/4/u);
  });
});

describe("createTournament", () => {
  it("creates a Friendly tournament with Pools, doubled playersAllowed, and no Matches", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const owner = await insertUser(db, "tournament-create@example.com");
      const venue = await insertVenue(db);
      const courtA = await insertCourt(db, venue.id, "Court A");
      const courtB = await insertCourt(db, venue.id, "Court B");
      const group = await insertGroup(db, { createdBy: owner.id });
      const created = await createTournament(db, {
        createdBy: owner.id,
        name: "Autumn Friendly",
        groupId: group.id,
        isPublic: true,
        registrationMode: "individual",
        teamCount: 12,
        poolCount: 3,
        venueId: venue.id,
        courtIds: [courtA.id, courtB.id],
        pricePerPlayerCents: 1000,
        ...windowTimes(),
      });

      const row = await db.query.games.findFirst({
        where: eq(games.id, created.id),
      });
      expect(row?.format).toBe("friendly_tournament");
      expect(row?.name).toBe("Autumn Friendly");
      expect(row?.groupId).toBe(group.id);
      expect(row?.poolCount).toBe(3);
      expect(row?.playersAllowed).toBe(24);
      expect(row?.teamsAllowed).toBe(12);
      expect(row?.isPublic).toBe(true);
      expect(row?.registrationMode).toBe("individual");
      expect(row?.pricePerPlayerCents).toBe(1000);
      expect(row?.levelMinTenths).toBeNull();
      expect(row?.levelMaxTenths).toBeNull();

      const recordedCourts = await db.query.gameCourts.findMany({
        where: eq(gameCourts.gameId, created.id),
      });
      expect(recordedCourts.map((court) => court.courtId).sort()).toEqual(
        [courtA.id, courtB.id].sort(),
      );

      const createdMatches = await db.query.matches.findMany({
        where: eq(matches.gameId, created.id),
      });
      expect(createdMatches).toHaveLength(0);
    } finally {
      await close();
    }
  });

  it("accepts team-only registration and stores optional Level range", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const owner = await insertUser(db, "tournament-team-only@example.com");
      const venue = await insertVenue(db);
      const group = await insertGroup(db, { createdBy: owner.id });
      const created = await createTournament(db, {
        createdBy: owner.id,
        name: "Team Cup",
        groupId: group.id,
        isPublic: false,
        registrationMode: "team_only",
        teamCount: 8,
        poolCount: 2,
        venueId: venue.id,
        levelMinTenths: 30,
        levelMaxTenths: 42,
        ...windowTimes(),
      });
      const row = await db.query.games.findFirst({
        where: eq(games.id, created.id),
      });
      expect(row?.registrationMode).toBe("team_only");
      expect(row?.playersAllowed).toBe(16);
      expect(row?.teamsAllowed).toBe(8);
      expect(row?.levelMinTenths).toBe(30);
      expect(row?.levelMaxTenths).toBe(42);
    } finally {
      await close();
    }
  });

  it("saves a one-day tournament whose window is shorter than the fit", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const owner = await insertUser(db, "tournament-overrun@example.com");
      const venue = await insertVenue(db);
      const group = await insertGroup(db, { createdBy: owner.id });
      const windowStart = new Date("2026-09-20T10:00:00");
      const created = await createTournament(db, {
        createdBy: owner.id,
        name: "Tight Saturday",
        groupId: group.id,
        isPublic: false,
        registrationMode: "individual",
        teamCount: 12,
        poolCount: 3,
        venueId: venue.id,
        windowStart,
        windowEnd: new Date(windowStart.getTime() + 60 * 60 * 1000),
      });
      expect(created.id).toBeDefined();
      const row = await db.query.games.findFirst({
        where: eq(games.id, created.id),
      });
      expect(row?.poolCount).toBe(3);
    } finally {
      await close();
    }
  });

  it("refuses a Group the caller may not organize", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const owner = await insertUser(db, "tournament-owner@example.com");
      const other = await insertUser(db, "tournament-other@example.com");
      const venue = await insertVenue(db);
      const group = await insertGroup(db, { createdBy: owner.id });
      await expect(
        createTournament(db, {
          createdBy: other.id,
          name: "Not yours",
          groupId: group.id,
          isPublic: false,
          registrationMode: "individual",
          teamCount: 8,
          poolCount: 2,
          venueId: venue.id,
          ...windowTimes(),
        }),
      ).rejects.toBeInstanceOf(TRPCError);
    } finally {
      await close();
    }
  });

  it("refuses a Club Group whose Community is Soft-archived", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const owner = await insertUser(db, "tournament-archived@example.com");
      const venue = await insertVenue(db);
      const [community] = await db
        .insert(communities)
        .values({
          name: "Archived Club",
          type: "private",
          createdBy: owner.id,
        })
        .returning({ id: communities.id });
      if (!community) {
        throw new Error("Failed to insert community");
      }
      const group = await insertGroup(db, {
        createdBy: owner.id,
        communityId: community.id,
      });
      await commit(db, { communityId: community.id }, "archived");
      await expect(
        createTournament(db, {
          createdBy: owner.id,
          name: "Archived Cup",
          groupId: group.id,
          isPublic: false,
          registrationMode: "individual",
          teamCount: 8,
          poolCount: 2,
          venueId: venue.id,
          ...windowTimes(),
        }),
      ).rejects.toMatchObject({
        code: "FORBIDDEN",
        message:
          "Cannot create a Club Group Game while the Community is archived",
      });
    } finally {
      await close();
    }
  });

  it("locks Venue to the Club Group linked Venue", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const owner = await insertUser(db, "tournament-linked@example.com");
      const linked = await insertVenue(db);
      const other = await insertVenue(db);
      const [community] = await db
        .insert(communities)
        .values({
          name: "Linked Club",
          type: "private",
          createdBy: owner.id,
          venueId: linked.id,
        })
        .returning({ id: communities.id });
      if (!community) {
        throw new Error("Failed to insert community");
      }
      const group = await insertGroup(db, {
        createdBy: owner.id,
        communityId: community.id,
      });
      await expect(
        createTournament(db, {
          createdBy: owner.id,
          name: "Wrong Venue",
          groupId: group.id,
          isPublic: false,
          registrationMode: "individual",
          teamCount: 8,
          poolCount: 2,
          venueId: other.id,
          ...windowTimes(),
        }),
      ).rejects.toMatchObject({
        code: "FORBIDDEN",
        message: "Venue must be this Community’s linked Venue",
      });

      const created = await createTournament(db, {
        createdBy: owner.id,
        name: "Right Venue",
        groupId: group.id,
        isPublic: false,
        registrationMode: "individual",
        teamCount: 8,
        poolCount: 2,
        venueId: linked.id,
        ...windowTimes(),
      });
      const row = await db.query.games.findFirst({
        where: eq(games.id, created.id),
      });
      expect(row?.venueId).toBe(linked.id);
    } finally {
      await close();
    }
  });

  it("leaves pool_count null on Friendly tournaments created through the existing Game create door", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const owner = await insertUser(db, "tournament-legacy@example.com");
      const venue = await insertVenue(db);
      const group = await insertGroup(db, { createdBy: owner.id });
      const created = await createGame(db, {
        createdBy: owner.id,
        groupId: group.id,
        isPublic: false,
        format: "friendly_tournament",
        registrationMode: "individual",
        playersAllowed: 8,
        venueId: venue.id,
        ...windowTimes(),
      });
      const row = await db.query.games.findFirst({
        where: eq(games.id, created.id),
      });
      expect(row?.format).toBe("friendly_tournament");
      expect(row?.poolCount).toBeNull();
    } finally {
      await close();
    }
  });
});
