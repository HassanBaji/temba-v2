import { TRPCError } from "@trpc/server";
import { and, eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import {
  groupMembers,
  GroupMemberRoleEnum,
  groups,
  user,
  venueManagers,
  venues,
} from "@repo/db/schema";

import { groupById } from "#src/routers/groups/byId";
import { createLoosePrivate } from "#src/routers/groups/createLoosePrivate";
import { removePlayer } from "#src/routers/groups/removePlayer";
import { createPgliteDb, type TestDatabase } from "@repo/db/testing";

async function insertUser(database: TestDatabase, name: string) {
  const [row] = await database
    .insert(user)
    .values({
      name,
      email: `${name.toLowerCase().replace(/\s+/g, ".")}@example.com`,
      clerkId: `user_${crypto.randomUUID()}`,
    })
    .returning({ id: user.id });
  if (!row) {
    throw new Error("Failed to insert user");
  }
  return row.id;
}

async function rejection(promise: Promise<unknown>) {
  const error = await promise.then(
    () => null,
    (caught: unknown) => caught,
  );
  expect(error).toBeInstanceOf(TRPCError);
  return error as TRPCError;
}

async function membershipOf(
  database: TestDatabase,
  groupId: string,
  userId: string,
) {
  return database.query.groupMembers.findFirst({
    where: and(
      eq(groupMembers.groupId, groupId),
      eq(groupMembers.userId, userId),
    ),
  });
}

async function seedLoose(database: TestDatabase) {
  const creator = await insertUser(database, "Creator");
  const organizer = await insertUser(database, "Organizer");
  const member = await insertUser(database, "Member");
  const other = await insertUser(database, "Other");
  const group = await createLoosePrivate(database, {
    name: "Thursday padel",
    sport: "padel",
    userId: creator,
  });
  await database.insert(groupMembers).values([
    {
      groupId: group.id,
      userId: organizer,
      role: GroupMemberRoleEnum.ORGANIZER,
    },
    { groupId: group.id, userId: member },
    { groupId: group.id, userId: other },
  ]);
  return { creator, organizer, member, other, groupId: group.id };
}

/** A Club Group: a Loose Group linked to a Venue, with an Appointed Organizer. */
async function seedClub(database: TestDatabase) {
  const manager = await insertUser(database, "Manager");
  const creator = await insertUser(database, "Club creator");
  const organizer = await insertUser(database, "Club organizer");
  const member = await insertUser(database, "Club member");
  const [venue] = await database
    .insert(venues)
    .values({ name: "Padel Club", city: "Manama", country: "BH" })
    .returning({ id: venues.id });
  if (!venue) {
    throw new Error("Failed to insert venue");
  }
  await database
    .insert(venueManagers)
    .values({ venueId: venue.id, userId: manager });
  const group = await createLoosePrivate(database, {
    name: "Club squad",
    sport: "padel",
    userId: creator,
  });
  await database
    .update(groups)
    .set({ venueId: venue.id })
    .where(eq(groups.id, group.id));
  await database.insert(groupMembers).values([
    { groupId: group.id, userId: manager },
    {
      groupId: group.id,
      userId: organizer,
      role: GroupMemberRoleEnum.ORGANIZER,
    },
    { groupId: group.id, userId: member },
  ]);
  return {
    manager,
    creator,
    organizer,
    member,
    venueId: venue.id,
    groupId: group.id,
  };
}

describe("groups.removePlayer", () => {
  it("lets an Appointed Organizer remove a player, but never the creator or themself", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const f = await seedLoose(db);

      const home = await groupById(db, {
        groupId: f.groupId,
        userId: f.organizer,
      });
      expect(home.canRemovePlayers).toBe(true);

      const creator = await rejection(
        removePlayer(db, {
          groupId: f.groupId,
          approverUserId: f.organizer,
          userId: f.creator,
        }),
      );
      expect(creator.message).toBe("The Group creator cannot be removed");

      const self = await rejection(
        removePlayer(db, {
          groupId: f.groupId,
          approverUserId: f.organizer,
          userId: f.organizer,
        }),
      );
      expect(self.message).toBe("Leave the Group instead");

      await expect(
        removePlayer(db, {
          groupId: f.groupId,
          approverUserId: f.organizer,
          userId: f.member,
        }),
      ).resolves.toMatchObject({ ok: true, userId: f.member });
      expect(await membershipOf(db, f.groupId, f.member)).toBeUndefined();
      expect(await membershipOf(db, f.groupId, f.creator)).toBeTruthy();
    } finally {
      await close();
    }
  });

  it("refuses a plain member and reports a player who is not in the Group", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const f = await seedLoose(db);

      const notApprover = await rejection(
        removePlayer(db, {
          groupId: f.groupId,
          approverUserId: f.member,
          userId: f.other,
        }),
      );
      expect(notApprover.code).toBe("FORBIDDEN");
      expect(
        (await groupById(db, { groupId: f.groupId, userId: f.member }))
          .canRemovePlayers,
      ).toBe(false);

      const stranger = await insertUser(db, "Stranger");
      const missing = await rejection(
        removePlayer(db, {
          groupId: f.groupId,
          approverUserId: f.creator,
          userId: stranger,
        }),
      );
      expect(missing.code).toBe("NOT_FOUND");
    } finally {
      await close();
    }
  });

  it("lets the creator remove an Appointed Organizer", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const f = await seedLoose(db);
      await expect(
        removePlayer(db, {
          groupId: f.groupId,
          approverUserId: f.creator,
          userId: f.organizer,
        }),
      ).resolves.toMatchObject({ ok: true });
      expect(await membershipOf(db, f.groupId, f.organizer)).toBeUndefined();
    } finally {
      await close();
    }
  });

  it("on a Club Group keeps the creator, removes any other member including the Venue manager, and the manager is no approver", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const f = await seedClub(db);

      const creator = await rejection(
        removePlayer(db, {
          groupId: f.groupId,
          approverUserId: f.organizer,
          userId: f.creator,
        }),
      );
      expect(creator.message).toBe("The Group creator cannot be removed");

      const asManager = await rejection(
        removePlayer(db, {
          groupId: f.groupId,
          approverUserId: f.manager,
          userId: f.member,
        }),
      );
      expect(asManager.code).toBe("FORBIDDEN");
      expect(
        (await groupById(db, { groupId: f.groupId, userId: f.manager }))
          .canRemovePlayers,
      ).toBe(false);

      await expect(
        removePlayer(db, {
          groupId: f.groupId,
          approverUserId: f.organizer,
          userId: f.manager,
        }),
      ).resolves.toMatchObject({ ok: true, userId: f.manager });
      expect(await membershipOf(db, f.groupId, f.manager)).toBeUndefined();

      await db
        .update(venues)
        .set({ archivedAt: new Date() })
        .where(eq(venues.id, f.venueId));
      await expect(
        removePlayer(db, {
          groupId: f.groupId,
          approverUserId: f.creator,
          userId: f.member,
        }),
      ).resolves.toMatchObject({ ok: true, userId: f.member });
      expect(await membershipOf(db, f.groupId, f.member)).toBeUndefined();
    } finally {
      await close();
    }
  });
});
