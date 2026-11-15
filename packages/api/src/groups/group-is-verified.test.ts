import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import { groups, user, venues } from "@repo/db/schema";

import { groupIsVerified } from "#src/groups/group-is-verified";
import { createGame } from "#src/routers/games/create";
import { createTournament } from "#src/routers/games/createTournament";
import { createLoosePublic } from "#src/routers/groups/createLoosePublic";
import { createLoosePrivate } from "#src/routers/groups/createLoosePrivate";
import { createPgliteDb, type TestDatabase } from "@repo/db/testing";

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

async function insertVenue(database: TestDatabase) {
  const [row] = await database
    .insert(venues)
    .values({ name: "Club", city: "Lisbon", country: "PT" })
    .returning({ id: venues.id });
  if (!row) {
    throw new Error("Failed to insert venue");
  }
  return row;
}

async function insertGroup(
  database: TestDatabase,
  args: { createdBy: string; verifiedAt?: Date; venueId?: string },
) {
  const [row] = await database
    .insert(groups)
    .values({
      name: `Group ${crypto.randomUUID()}`,
      createdBy: args.createdBy,
      verifiedAt: args.verifiedAt,
      venueId: args.venueId,
    })
    .returning();
  if (!row) {
    throw new Error("Failed to insert group");
  }
  return row;
}

const windowStart = new Date("2027-09-20T10:00:00");
const windowEnd = new Date("2027-09-20T12:00:00");

function friendlyInput(args: {
  createdBy: string;
  groupId: string;
  venueId: string;
}) {
  return {
    ...args,
    isPublic: false,
    format: "friendly_game" as const,
    registrationMode: "individual" as const,
    windowStart,
    windowEnd,
  };
}

function tournamentInput(args: {
  createdBy: string;
  groupId: string;
  venueId: string;
  isPublic: boolean;
}) {
  return {
    ...args,
    name: "Autumn Friendly",
    teamCount: 12,
    poolCount: 3,
    matchMinutes: 45,
    windowStart,
    windowEnd,
  };
}

describe("groupIsVerified", () => {
  it("is true when verified_at is set", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const owner = await insertUser(db, "verified-flag@example.com");
      const verified = await insertGroup(db, {
        createdBy: owner.id,
        verifiedAt: new Date(),
      });
      const unverified = await insertGroup(db, { createdBy: owner.id });

      expect(groupIsVerified(verified)).toBe(true);
      expect(groupIsVerified(unverified)).toBe(false);
    } finally {
      await close();
    }
  });

  it("is true for a Club Group through its Venue link, not for a Loose Group", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const owner = await insertUser(db, "club-group@example.com");
      const venue = await insertVenue(db);

      const club = await insertGroup(db, {
        createdBy: owner.id,
        venueId: venue.id,
      });
      const loose = await insertGroup(db, { createdBy: owner.id });

      expect(club.verifiedAt).toBeNull();
      expect(groupIsVerified(club)).toBe(true);
      expect(groupIsVerified(loose)).toBe(false);
    } finally {
      await close();
    }
  });
});

describe("Game create on a Verified Group", () => {
  it("stores rated true for a Friendly game and an Americano", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const owner = await insertUser(db, "verified-games@example.com");
      const venue = await insertVenue(db);
      const group = await insertGroup(db, {
        createdBy: owner.id,
        verifiedAt: new Date(),
      });

      const friendly = await createGame(
        db,
        friendlyInput({
          createdBy: owner.id,
          groupId: group.id,
          venueId: venue.id,
        }),
      );
      const americano = await createGame(db, {
        ...friendlyInput({
          createdBy: owner.id,
          groupId: group.id,
          venueId: venue.id,
        }),
        format: "americano",
        playersAllowed: 8,
      });

      for (const { id } of [friendly, americano]) {
        const row = await db.query.games.findFirst({
          where: (g, { eq: equals }) => equals(g.id, id),
        });
        expect(row?.rated).toBe(true);
        expect(row?.isPublic).toBe(false);
      }
    } finally {
      await close();
    }
  });

  it("allows a public tournament and stores it rated", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const owner = await insertUser(db, "verified-tournament@example.com");
      const venue = await insertVenue(db);
      const group = await insertGroup(db, {
        createdBy: owner.id,
        verifiedAt: new Date(),
      });

      const created = await createTournament(
        db,
        tournamentInput({
          createdBy: owner.id,
          groupId: group.id,
          venueId: venue.id,
          isPublic: true,
        }),
      );

      const row = await db.query.games.findFirst({
        where: (g, { eq: equals }) => equals(g.id, created.id),
      });
      expect(row?.rated).toBe(true);
      expect(row?.isPublic).toBe(true);
    } finally {
      await close();
    }
  });
  it("stores rated true on a Club Group with no verified_at, at its linked Venue", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const owner = await insertUser(db, "club-games@example.com");
      const venue = await insertVenue(db);
      const club = await insertGroup(db, {
        createdBy: owner.id,
        venueId: venue.id,
      });

      const created = await createTournament(
        db,
        tournamentInput({
          createdBy: owner.id,
          groupId: club.id,
          venueId: venue.id,
          isPublic: true,
        }),
      );

      const row = await db.query.games.findFirst({
        where: (g, { eq: equals }) => equals(g.id, created.id),
      });
      expect(row).toMatchObject({
        rated: true,
        isPublic: true,
        venueId: venue.id,
      });
    } finally {
      await close();
    }
  });
});

describe("Game create on a Group that is not Verified", () => {
  it("stores rated false and isPublic false for a Friendly game and an Americano", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const owner = await insertUser(db, "unverified-games@example.com");
      const venue = await insertVenue(db);
      const group = await insertGroup(db, { createdBy: owner.id });

      const friendly = await createGame(
        db,
        friendlyInput({
          createdBy: owner.id,
          groupId: group.id,
          venueId: venue.id,
        }),
      );
      const americano = await createGame(db, {
        ...friendlyInput({
          createdBy: owner.id,
          groupId: group.id,
          venueId: venue.id,
        }),
        format: "americano",
        playersAllowed: 8,
      });

      for (const { id } of [friendly, americano]) {
        const row = await db.query.games.findFirst({
          where: (g, { eq: equals }) => equals(g.id, id),
        });
        expect(row?.rated).toBe(false);
        expect(row?.isPublic).toBe(false);
      }
    } finally {
      await close();
    }
  });

  it("refuses a public tournament and creates a private one Unrated", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const owner = await insertUser(db, "unverified-tournament@example.com");
      const venue = await insertVenue(db);
      const group = await insertGroup(db, { createdBy: owner.id });

      await expect(
        createTournament(
          db,
          tournamentInput({
            createdBy: owner.id,
            groupId: group.id,
            venueId: venue.id,
            isPublic: true,
          }),
        ),
      ).rejects.toMatchObject({
        code: "FORBIDDEN",
        message:
          "Only a Verified Group can open a Game to anyone with the link",
      });

      const created = await createTournament(
        db,
        tournamentInput({
          createdBy: owner.id,
          groupId: group.id,
          venueId: venue.id,
          isPublic: false,
        }),
      );
      const row = await db.query.games.findFirst({
        where: (g, { eq: equals }) => equals(g.id, created.id),
      });
      expect(row?.rated).toBe(false);
      expect(row?.isPublic).toBe(false);
    } finally {
      await close();
    }
  });
});

describe("Verification changes after create", () => {
  it("leaves existing Games' rated and isPublic unchanged", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const owner = await insertUser(db, "snapshot@example.com");
      const venue = await insertVenue(db);
      const group = await insertGroup(db, {
        createdBy: owner.id,
        verifiedAt: new Date(),
      });
      const ratedTournament = await createTournament(
        db,
        tournamentInput({
          createdBy: owner.id,
          groupId: group.id,
          venueId: venue.id,
          isPublic: true,
        }),
      );

      await db
        .update(groups)
        .set({ verifiedAt: null, verifiedBy: null })
        .where(eq(groups.id, group.id));
      const unratedFriendly = await createGame(
        db,
        friendlyInput({
          createdBy: owner.id,
          groupId: group.id,
          venueId: venue.id,
        }),
      );
      await db
        .update(groups)
        .set({ verifiedAt: new Date(), verifiedBy: owner.id })
        .where(eq(groups.id, group.id));

      const tournamentRow = await db.query.games.findFirst({
        where: (g, { eq: equals }) => equals(g.id, ratedTournament.id),
      });
      const friendlyRow = await db.query.games.findFirst({
        where: (g, { eq: equals }) => equals(g.id, unratedFriendly.id),
      });
      expect(tournamentRow).toMatchObject({ rated: true, isPublic: true });
      expect(friendlyRow).toMatchObject({ rated: false, isPublic: false });
    } finally {
      await close();
    }
  });
});

describe("Group create", () => {
  it("never verifies a new Group, whoever creates it", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const creator = await insertUser(db, "creator@example.com");

      const publicGroup = await createLoosePublic(db, {
        name: "Public",
        sport: "padel",
        userId: creator.id,
      });
      const privateGroup = await createLoosePrivate(db, {
        name: "Private",
        sport: "padel",
        userId: creator.id,
      });

      for (const created of [publicGroup, privateGroup]) {
        const row = await db.query.groups.findFirst({
          where: eq(groups.id, created.id),
        });
        expect(row?.verifiedAt).toBeNull();
        expect(row?.verifiedBy).toBeNull();
      }
    } finally {
      await close();
    }
  });
});
