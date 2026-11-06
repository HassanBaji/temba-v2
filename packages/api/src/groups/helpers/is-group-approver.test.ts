import { describe, expect, it } from "vitest";

import {
  groupMembers,
  GroupMemberRoleEnum,
  groups,
  GroupTypeEnum,
  user,
  venues,
} from "@repo/db/schema";

import {
  groupApproverUserIds,
  isGroupApprover,
} from "#src/groups/helpers/is-group-approver";
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
  return row.id;
}

async function insertVenue(database: TestDatabase) {
  const [row] = await database
    .insert(venues)
    .values({ name: "Parity Club", city: "Lisbon", country: "PT" })
    .returning({ id: venues.id });
  if (!row) {
    throw new Error("Failed to insert venue");
  }
  return row.id;
}

async function insertGroup(
  database: TestDatabase,
  args: { createdBy: string; venueId?: string },
) {
  const [row] = await database
    .insert(groups)
    .values({
      name: "Parity Group",
      type: GroupTypeEnum.PUBLIC,
      createdBy: args.createdBy,
      venueId: args.venueId ?? null,
    })
    .returning();
  if (!row) {
    throw new Error("Failed to insert group");
  }
  return row;
}

async function appoint(
  database: TestDatabase,
  groupId: string,
  userId: string,
) {
  await database.insert(groupMembers).values({
    groupId,
    userId,
    role: GroupMemberRoleEnum.ORGANIZER,
  });
}

async function expectParity(
  database: TestDatabase,
  group: typeof groups.$inferSelect,
  userIds: string[],
) {
  const resolved = await groupApproverUserIds(database, group);
  expect(new Set(resolved).size).toBe(resolved.length);
  for (const userId of userIds) {
    expect(resolved.includes(userId)).toBe(
      await isGroupApprover(database, group, userId),
    );
  }
}

async function clubFixture(database: TestDatabase) {
  const creator = await insertUser(database, "parity-creator@example.com");
  const member = await insertUser(database, "parity-member@example.com");
  const outsider = await insertUser(database, "parity-outsider@example.com");
  const venueId = await insertVenue(database);
  const group = await insertGroup(database, { createdBy: creator, venueId });
  await database
    .insert(groupMembers)
    .values({ groupId: group.id, userId: member });
  return {
    venueId,
    group,
    member,
    creator,
    outsider,
    everyone: [member, creator, outsider],
  };
}

describe("groupApproverUserIds", () => {
  it("is the creator alone on a Loose Group without Appointed Organizers", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const creator = await insertUser(db, "parity-loose-creator@example.com");
      const other = await insertUser(db, "parity-loose-other@example.com");
      const group = await insertGroup(db, { createdBy: creator });

      expect(await groupApproverUserIds(db, group)).toEqual([creator]);
      await expectParity(db, group, [creator, other]);
    } finally {
      await close();
    }
  });

  it("includes an Appointed Organizer on a Loose Group", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const creator = await insertUser(db, "parity-loose-creator@example.com");
      const organizer = await insertUser(
        db,
        "parity-loose-organizer@example.com",
      );
      const other = await insertUser(db, "parity-loose-other@example.com");
      const group = await insertGroup(db, { createdBy: creator });
      await appoint(db, group.id, organizer);
      await db
        .insert(groupMembers)
        .values({ groupId: group.id, userId: other });

      expect((await groupApproverUserIds(db, group)).sort()).toEqual(
        [creator, organizer].sort(),
      );
      await expectParity(db, group, [creator, organizer, other]);
    } finally {
      await close();
    }
  });

  it("is the creator alone on a Club Group without Appointed Organizers", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const fixture = await clubFixture(db);

      expect(await groupApproverUserIds(db, fixture.group)).toEqual([
        fixture.creator,
      ]);
      await expectParity(db, fixture.group, fixture.everyone);
    } finally {
      await close();
    }
  });

  it("includes an Appointed Organizer on a Club Group", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const fixture = await clubFixture(db);
      await appoint(db, fixture.group.id, fixture.outsider);

      expect((await groupApproverUserIds(db, fixture.group)).sort()).toEqual(
        [fixture.creator, fixture.outsider].sort(),
      );
      await expectParity(db, fixture.group, fixture.everyone);
    } finally {
      await close();
    }
  });

  it("lists a creator who is also an Appointed Organizer once", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const creator = await insertUser(
        db,
        "parity-creator-organizer@example.com",
      );
      const group = await insertGroup(db, { createdBy: creator });
      await appoint(db, group.id, creator);

      expect(await groupApproverUserIds(db, group)).toEqual([creator]);
      await expectParity(db, group, [creator]);
    } finally {
      await close();
    }
  });

  it("keeps the Club Group doors while the linked Venue is Soft-archived", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const fixture = await clubFixture(db);
      await appoint(db, fixture.group.id, fixture.outsider);
      await commit(db, { venueId: fixture.venueId }, "archived");

      expect((await groupApproverUserIds(db, fixture.group)).sort()).toEqual(
        [fixture.creator, fixture.outsider].sort(),
      );
      await expectParity(db, fixture.group, fixture.everyone);
    } finally {
      await close();
    }
  });
});
