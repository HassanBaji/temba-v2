import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import {
  GameFormatEnum,
  GameRegistrationModeEnum,
  gamePlayers,
  gameWaitlist,
  games,
  groupMembers,
  groups,
  matches,
  user,
  venues,
} from "@repo/db/schema";

import { listMyGamesHubRows } from "~/server/games/hub-list-rows";
import { admit } from "~/server/games/admit";
import { createPgliteDb, type TestDatabase } from "~/server/test/pglite";

const NOW = new Date("2026-08-31T16:00:00.000Z");
const WINDOW_START = new Date("2026-09-01T18:00:00.000Z");
const WINDOW_END = new Date("2026-09-01T20:00:00.000Z");

async function insertUser(
  database: TestDatabase,
  email: string,
  image: string | null = null,
) {
  const [row] = await database
    .insert(user)
    .values({ name: email.split("@")[0] ?? "Test User", email, image })
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

async function insertGroup(database: TestDatabase, createdBy: string) {
  const [row] = await database
    .insert(groups)
    .values({
      name: `Group ${crypto.randomUUID()}`,
      createdBy,
    })
    .returning({ id: groups.id });
  if (!row) {
    throw new Error("Failed to insert group");
  }
  return row;
}

async function insertGame(
  database: TestDatabase,
  args: {
    createdBy: string;
    venueId: string;
    isPublic?: boolean;
    groupId?: string | null;
    windowStart?: Date;
    windowEnd?: Date;
  },
) {
  const [row] = await database
    .insert(games)
    .values({
      format: GameFormatEnum.FRIENDLY_GAME,
      registrationMode: GameRegistrationModeEnum.INDIVIDUAL,
      venueId: args.venueId,
      createdBy: args.createdBy,
      groupId: args.groupId ?? null,
      isPublic: args.isPublic ?? false,
      playersAllowed: 4,
      teamsAllowed: 2,
      windowStart: args.windowStart ?? WINDOW_START,
      windowEnd: args.windowEnd ?? WINDOW_END,
    })
    .returning();
  if (!row) {
    throw new Error("Failed to insert game");
  }
  await database.insert(matches).values({ gameId: row.id });
  return row;
}

describe("My Games hub rows", () => {
  it("includes Group Games plus private Games the User created or joined", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const viewer = await insertUser(db, "viewer-my-games@example.com");
      const other = await insertUser(db, "other-my-games@example.com");
      const venue = await insertVenue(db);
      const myGroup = await insertGroup(db, viewer.id);
      const otherGroup = await insertGroup(db, other.id);
      await db.insert(groupMembers).values({
        groupId: myGroup.id,
        userId: viewer.id,
      });

      const memberGame = await insertGame(db, {
        createdBy: other.id,
        venueId: venue.id,
        groupId: myGroup.id,
        isPublic: true,
      });
      const privateCreated = await insertGame(db, {
        createdBy: viewer.id,
        venueId: venue.id,
      });
      const privateJoined = await insertGame(db, {
        createdBy: other.id,
        venueId: venue.id,
      });
      await db.insert(gamePlayers).values({
        gameId: privateJoined.id,
        userId: viewer.id,
      });
      const privateWaitlisted = await insertGame(db, {
        createdBy: other.id,
        venueId: venue.id,
      });
      await db.insert(gameWaitlist).values({
        gameId: privateWaitlisted.id,
        userId: viewer.id,
      });
      const publicCreated = await insertGame(db, {
        createdBy: viewer.id,
        venueId: venue.id,
        isPublic: true,
      });
      const strangerPrivate = await insertGame(db, {
        createdBy: other.id,
        venueId: venue.id,
        groupId: otherGroup.id,
      });

      const rows = await listMyGamesHubRows(db, viewer.id, NOW);
      const ids = rows.map((row) => row.id).sort();

      expect(ids).toEqual(
        [
          memberGame.id,
          privateCreated.id,
          privateJoined.id,
          privateWaitlisted.id,
        ].sort(),
      );
      expect(ids).not.toContain(publicCreated.id);
      expect(ids).not.toContain(strangerPrivate.id);
    } finally {
      await close();
    }
  });

  it("lists private created Games when the User belongs to no Groups", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const viewer = await insertUser(db, "solo-creator@example.com");
      const venue = await insertVenue(db);
      const created = await insertGame(db, {
        createdBy: viewer.id,
        venueId: venue.id,
      });

      const rows = await listMyGamesHubRows(db, viewer.id, NOW);
      expect(rows.map((row) => row.id)).toEqual([created.id]);
    } finally {
      await close();
    }
  });

  it("does not list a cancelled private Game the User created", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const viewer = await insertUser(db, "cancelled-creator@example.com");
      const venue = await insertVenue(db);
      const created = await insertGame(db, {
        createdBy: viewer.id,
        venueId: venue.id,
      });
      await db
        .update(games)
        .set({ cancelledAt: NOW })
        .where(eq(games.id, created.id));

      const rows = await listMyGamesHubRows(db, viewer.id, NOW);
      expect(rows).toEqual([]);
    } finally {
      await close();
    }
  });

  it("shows stored User photos or initials on Friendly roster occupants", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const photoUrl = "https://img.clerk.com/roster-photo.png";
      const viewer = await insertUser(db, "roster-photo@example.com", photoUrl);
      const partner = await insertUser(db, "roster-initials@example.com", null);
      const venue = await insertVenue(db);
      const created = await insertGame(db, {
        createdBy: viewer.id,
        venueId: venue.id,
        windowStart: new Date(Date.now() - 60 * 60 * 1000),
        windowEnd: new Date(Date.now() + 24 * 60 * 60 * 1000),
      });

      const seated = await admit(db, {
        game: created,
        door: "register",
        party: {
          kind: "user",
          userId: viewer.id,
          seat: { sideIndex: 1, position: "left" },
        },
      });
      expect(seated).toMatchObject({ ok: true });

      const partnerSeat = await admit(db, {
        game: created,
        door: "register",
        party: {
          kind: "user",
          userId: partner.id,
          seat: { sideIndex: 1, position: "right" },
        },
      });
      expect(partnerSeat).toMatchObject({ ok: true });

      const rows = await listMyGamesHubRows(db, viewer.id, NOW);
      const row = rows.find((item) => item.id === created.id);
      expect(row?.sides[0]?.left).toMatchObject({
        userId: viewer.id,
        image: photoUrl,
      });
      expect(row?.sides[0]?.right).toMatchObject({
        userId: partner.id,
        image: null,
      });
      expect(row?.sides[0]?.left && row.sides[0].right).toBeTruthy();
    } finally {
      await close();
    }
  });
});
