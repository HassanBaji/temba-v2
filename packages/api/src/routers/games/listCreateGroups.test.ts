import { describe, expect, it } from "vitest";

import {
  groupMembers,
  GroupMemberRoleEnum,
  groups,
  user,
  venues,
} from "@repo/db/schema";

import { listCreateGroups } from "#src/routers/games/listCreateGroups";
import { commit } from "#src/soft-archive";
import { createPgliteDb, type TestDatabase } from "@repo/db/testing";

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

async function insertVenue(database: TestDatabase, name: string) {
  const [row] = await database
    .insert(venues)
    .values({ name, city: "Lisbon", country: "PT" })
    .returning({ id: venues.id, name: venues.name });
  if (!row) {
    throw new Error("Failed to insert venue");
  }
  return row;
}

async function insertGroup(
  database: TestDatabase,
  args: {
    createdBy: string;
    name: string;
    venueId?: string;
    sport?: "padel" | "football";
  },
) {
  const [row] = await database
    .insert(groups)
    .values({
      name: args.name,
      createdBy: args.createdBy,
      venueId: args.venueId,
      sport: args.sport,
    })
    .returning({ id: groups.id, name: groups.name });
  if (!row) {
    throw new Error("Failed to insert group");
  }
  return row;
}

describe("listCreateGroups", () => {
  it("returns Groups the caller may organize, sorted by name", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const owner = await insertUser(db, "list-create-owner@example.com");
      const other = await insertUser(db, "list-create-other@example.com");
      const zebra = await insertGroup(db, {
        createdBy: owner.id,
        name: "Zebra",
      });
      const alpha = await insertGroup(db, {
        createdBy: owner.id,
        name: "Alpha",
      });
      await insertGroup(db, { createdBy: other.id, name: "Other Crew" });

      const rows = await listCreateGroups(db, { userId: owner.id });
      expect(rows.map((row) => row.id)).toEqual([alpha.id, zebra.id]);
      expect(rows[0]?.venueName).toBeNull();
      expect(rows.map((row) => row.verified)).toEqual([false, false]);
    } finally {
      await close();
    }
  });

  it("carries each Group's sport so the create flow can branch on it", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const owner = await insertUser(db, "list-create-sport@example.com");
      await insertGroup(db, {
        createdBy: owner.id,
        name: "Five-a-side",
        sport: "football",
      });
      await insertGroup(db, { createdBy: owner.id, name: "Padel crew" });

      const rows = await listCreateGroups(db, { userId: owner.id });
      expect(rows.map((row) => [row.name, row.sport])).toEqual([
        ["Five-a-side", "football"],
        ["Padel crew", "padel"],
      ]);
    } finally {
      await close();
    }
  });

  it("lists a Club Group with its Venue name and Verified for its creator", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const creator = await insertUser(db, "list-create-creator@example.com");
      const venue = await insertVenue(db, "Live Club");
      const clubGroup = await insertGroup(db, {
        createdBy: creator.id,
        name: "Club Squad",
        venueId: venue.id,
      });

      const rows = await listCreateGroups(db, { userId: creator.id });
      expect(rows).toEqual([
        {
          id: clubGroup.id,
          name: "Club Squad",
          venueName: "Live Club",
          sport: "padel",
          verified: true,
        },
      ]);
    } finally {
      await close();
    }
  });

  it("includes Groups where the caller is an Appointed Organizer, not a plain member", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const creator = await insertUser(db, "list-create-appointer@example.com");
      const organizer = await insertUser(
        db,
        "list-create-organizer@example.com",
      );
      const member = await insertUser(db, "list-create-member@example.com");
      const venue = await insertVenue(db, "Appointing Club");
      const clubGroup = await insertGroup(db, {
        createdBy: creator.id,
        name: "Appointed Squad",
        venueId: venue.id,
      });
      const looseGroup = await insertGroup(db, {
        createdBy: creator.id,
        name: "Loose Squad",
      });
      await db.insert(groupMembers).values([
        {
          groupId: clubGroup.id,
          userId: organizer.id,
          role: GroupMemberRoleEnum.ORGANIZER,
        },
        {
          groupId: looseGroup.id,
          userId: organizer.id,
          role: GroupMemberRoleEnum.ORGANIZER,
        },
        { groupId: clubGroup.id, userId: member.id },
        { groupId: looseGroup.id, userId: member.id },
      ]);

      const organizerRows = await listCreateGroups(db, {
        userId: organizer.id,
      });
      expect(organizerRows.map((row) => row.id)).toEqual([
        clubGroup.id,
        looseGroup.id,
      ]);

      const memberRows = await listCreateGroups(db, { userId: member.id });
      expect(memberRows).toEqual([]);
    } finally {
      await close();
    }
  });

  it("keeps listing a Club Group while its linked Venue is Soft-archived", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const creator = await insertUser(db, "list-create-archive@example.com");
      const venue = await insertVenue(db, "Archived Club");
      const clubGroup = await insertGroup(db, {
        createdBy: creator.id,
        name: "Still Listed",
        venueId: venue.id,
      });
      await commit(db, { venueId: venue.id }, "archived");

      const rows = await listCreateGroups(db, { userId: creator.id });
      expect(rows.map((row) => row.id)).toEqual([clubGroup.id]);
    } finally {
      await close();
    }
  });
});
