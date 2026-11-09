import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import {
  groupLinkRequests,
  groupMembers,
  groups,
  user,
  venues,
} from "@repo/db/schema";
import { createPgliteDb, type TestDatabase } from "@repo/db/testing";

import { groupIsVerified } from "#src/groups/group-is-verified";
import { createCaller } from "#src/root";
import { createTRPCContext } from "#src/trpc";
import { linkGroup } from "#src/routers/venues/linkGroup";
import { searchGroupsToLink } from "#src/routers/venues/searchGroupsToLink";

async function insertUser(database: TestDatabase, name: string) {
  const [row] = await database
    .insert(user)
    .values({ name, email: `${name.toLowerCase()}@example.com` })
    .returning({ id: user.id });
  if (!row) {
    throw new Error("Failed to insert user");
  }
  return row;
}

async function insertVenue(
  database: TestDatabase,
  args: { name: string; archivedAt?: Date },
) {
  const [row] = await database
    .insert(venues)
    .values({
      name: args.name,
      city: "Manama",
      country: "BH",
      archivedAt: args.archivedAt,
    })
    .returning({ id: venues.id });
  if (!row) {
    throw new Error("Failed to insert venue");
  }
  return row;
}

async function insertGroup(
  database: TestDatabase,
  args: {
    name: string;
    createdBy: string;
    type?: "public" | "private";
    venueId?: string;
    deletedAt?: Date;
  },
) {
  const [row] = await database
    .insert(groups)
    .values({
      name: args.name,
      createdBy: args.createdBy,
      type: args.type ?? "public",
      venueId: args.venueId,
      deletedAt: args.deletedAt,
    })
    .returning();
  if (!row) {
    throw new Error("Failed to insert group");
  }
  await database
    .insert(groupMembers)
    .values({ groupId: row.id, userId: args.createdBy });
  return row;
}

async function readGroup(database: TestDatabase, groupId: string) {
  const row = await database.query.groups.findFirst({
    where: eq(groups.id, groupId),
  });
  if (!row) {
    throw new Error("Group missing");
  }
  return row;
}

function callerFor(metadata: Record<string, unknown> | undefined) {
  return createCaller(() =>
    createTRPCContext({
      db: {} as Parameters<typeof createTRPCContext>[0]["db"],
      userId: "user_clerk",
      getPublicMetadata: async () => metadata,
      headers: new Headers(),
      webOrigin: "https://temba.example",
      locale: "en",
    }),
  );
}

describe("Operator direct Venue link doors", () => {
  it.each([undefined, {}, { operator: false }])(
    "refuse callers who are not Operators (%j)",
    async (metadata) => {
      const caller = callerFor(metadata);
      await expect(
        caller.venues.linkGroup({
          venueId: crypto.randomUUID(),
          groupId: crypto.randomUUID(),
        }),
      ).rejects.toMatchObject({ code: "FORBIDDEN" });
      await expect(
        caller.venues.searchGroupsToLink({ query: "crew" }),
      ).rejects.toMatchObject({ code: "FORBIDDEN" });
    },
  );
});

describe("linkGroup", () => {
  it("makes a Loose Group a Club Group of the Venue at once", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const venue = await insertVenue(db, { name: "Smash Club" });
      const creator = await insertUser(db, "Creator");
      const group = await insertGroup(db, {
        name: "Tuesday Crew",
        createdBy: creator.id,
      });

      const result = await linkGroup(db, {
        venueId: venue.id,
        groupId: group.id,
      });

      expect(result).toEqual({
        ok: true,
        groupId: group.id,
        venueId: venue.id,
      });
      const linked = await readGroup(db, group.id);
      expect(linked.venueId).toBe(venue.id);
      expect(groupIsVerified(linked)).toBe(true);
    } finally {
      await close();
    }
  });

  it("links a private Loose Group too", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const venue = await insertVenue(db, { name: "Smash Club" });
      const creator = await insertUser(db, "Creator");
      const group = await insertGroup(db, {
        name: "Closed Crew",
        createdBy: creator.id,
        type: "private",
      });

      await linkGroup(db, { venueId: venue.id, groupId: group.id });

      expect((await readGroup(db, group.id)).venueId).toBe(venue.id);
    } finally {
      await close();
    }
  });

  it("lapses the Group's pending link requests from every Venue", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const venue = await insertVenue(db, { name: "Smash Club" });
      const other = await insertVenue(db, { name: "Other Club" });
      const manager = await insertUser(db, "Manager");
      const creator = await insertUser(db, "Creator");
      const group = await insertGroup(db, {
        name: "Tuesday Crew",
        createdBy: creator.id,
      });
      await db.insert(groupLinkRequests).values([
        { groupId: group.id, venueId: venue.id, requestedBy: manager.id },
        { groupId: group.id, venueId: other.id, requestedBy: manager.id },
      ]);

      await linkGroup(db, { venueId: venue.id, groupId: group.id });

      const requests = await db.query.groupLinkRequests.findMany({
        where: eq(groupLinkRequests.groupId, group.id),
      });
      expect(requests.map((request) => request.status)).toEqual([
        "cancelled",
        "cancelled",
      ]);
    } finally {
      await close();
    }
  });

  it("refuses a Group that is already a Club Group", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const venue = await insertVenue(db, { name: "Smash Club" });
      const other = await insertVenue(db, { name: "Other Club" });
      const creator = await insertUser(db, "Creator");
      const group = await insertGroup(db, {
        name: "Tuesday Crew",
        createdBy: creator.id,
        venueId: other.id,
      });

      await expect(
        linkGroup(db, { venueId: venue.id, groupId: group.id }),
      ).rejects.toMatchObject({ code: "BAD_REQUEST" });
      expect((await readGroup(db, group.id)).venueId).toBe(other.id);
    } finally {
      await close();
    }
  });

  it("refuses a Soft-archived Venue", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const venue = await insertVenue(db, {
        name: "Smash Club",
        archivedAt: new Date(),
      });
      const creator = await insertUser(db, "Creator");
      const group = await insertGroup(db, {
        name: "Tuesday Crew",
        createdBy: creator.id,
      });

      await expect(
        linkGroup(db, { venueId: venue.id, groupId: group.id }),
      ).rejects.toMatchObject({ code: "BAD_REQUEST" });
      expect((await readGroup(db, group.id)).venueId).toBeNull();
    } finally {
      await close();
    }
  });

  it("refuses a deleted or missing Group and a missing Venue", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const venue = await insertVenue(db, { name: "Smash Club" });
      const creator = await insertUser(db, "Creator");
      const deleted = await insertGroup(db, {
        name: "Gone Crew",
        createdBy: creator.id,
        deletedAt: new Date(),
      });

      await expect(
        linkGroup(db, { venueId: venue.id, groupId: deleted.id }),
      ).rejects.toMatchObject({ code: "NOT_FOUND" });
      await expect(
        linkGroup(db, { venueId: venue.id, groupId: crypto.randomUUID() }),
      ).rejects.toMatchObject({ code: "NOT_FOUND" });
      await expect(
        linkGroup(db, { venueId: crypto.randomUUID(), groupId: deleted.id }),
      ).rejects.toMatchObject({ code: "NOT_FOUND" });
    } finally {
      await close();
    }
  });
});

describe("searchGroupsToLink", () => {
  it("finds live Loose Groups of either visibility, with member counts", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const venue = await insertVenue(db, { name: "Smash Club" });
      const creator = await insertUser(db, "Creator");
      const member = await insertUser(db, "Member");
      const open = await insertGroup(db, {
        name: "Crew Open",
        createdBy: creator.id,
      });
      await db
        .insert(groupMembers)
        .values({ groupId: open.id, userId: member.id });
      const closed = await insertGroup(db, {
        name: "Crew Private",
        createdBy: creator.id,
        type: "private",
      });
      await insertGroup(db, {
        name: "Crew Linked",
        createdBy: creator.id,
        venueId: venue.id,
      });
      await insertGroup(db, {
        name: "Crew Deleted",
        createdBy: creator.id,
        deletedAt: new Date(),
      });
      await insertGroup(db, { name: "Other", createdBy: creator.id });

      const results = await searchGroupsToLink(db, { query: "crew" });

      expect(
        results.map((row) => ({
          id: row.id,
          type: row.type,
          memberCount: row.memberCount,
        })),
      ).toEqual([
        { id: open.id, type: "public", memberCount: 2 },
        { id: closed.id, type: "private", memberCount: 1 },
      ]);
    } finally {
      await close();
    }
  });
});
