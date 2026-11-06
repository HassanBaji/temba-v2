import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import {
  groupMembers,
  groups,
  user,
  venueManagers,
  venues,
} from "@repo/db/schema";

import {
  gameAdminUserIds,
  isGameOrganizer,
  mayCreateGameOnGroup,
} from "#src/games/access";
import { listCreateGroups } from "#src/routers/games/listCreateGroups";
import { groupById } from "#src/routers/groups/byId";
import { createLoosePrivate } from "#src/routers/groups/createLoosePrivate";
import {
  ALWAYS_ORGANIZER_MESSAGE,
  setOrganizer,
  UNCLAIMED_ORGANIZER_MESSAGE,
} from "#src/routers/groups/setOrganizer";
import { createPgliteDb, type TestDatabase } from "@repo/db/testing";

async function insertUser(
  database: TestDatabase,
  values: { name: string; unclaimed?: boolean },
) {
  const [row] = await database
    .insert(user)
    .values({
      name: values.name,
      email: `${values.name.toLowerCase().replace(/\s+/g, ".")}@example.com`,
      clerkId: values.unclaimed ? null : `user_${crypto.randomUUID()}`,
      addedAt: values.unclaimed ? new Date() : null,
      phoneNumber: values.unclaimed ? "+97336110001" : null,
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

async function requireGroupRow(database: TestDatabase, groupId: string) {
  const group = await database.query.groups.findFirst({
    where: (groups, { eq: equals }) => equals(groups.id, groupId),
  });
  if (!group) {
    throw new Error("Group missing");
  }
  return group;
}

async function seedLoose(database: TestDatabase) {
  const creator = await insertUser(database, { name: "Creator" });
  const member = await insertUser(database, { name: "Member" });
  const other = await insertUser(database, { name: "Other" });
  const unclaimed = await insertUser(database, {
    name: "Not on Temba",
    unclaimed: true,
  });
  const group = await createLoosePrivate(database, {
    name: "Thursday padel",
    sport: "padel",
    userId: creator,
  });
  await database.insert(groupMembers).values([
    { groupId: group.id, userId: member },
    { groupId: group.id, userId: other },
    { groupId: group.id, userId: unclaimed },
  ]);
  return { creator, member, other, unclaimed, groupId: group.id };
}

/** A Club Group: a Loose Group linked to a Venue. */
async function seedClub(database: TestDatabase) {
  const manager = await insertUser(database, { name: "Manager" });
  const creator = await insertUser(database, { name: "Club creator" });
  const member = await insertUser(database, { name: "Club member" });
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
    { groupId: group.id, userId: member },
    { groupId: group.id, userId: manager },
  ]);
  return { manager, creator, member, venueId: venue.id, groupId: group.id };
}

describe("groups.setOrganizer", () => {
  it("lets a Group approver make a player an Organizer of the Group's Games and take it away", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const f = await seedLoose(db);
      const groupGame = { createdBy: f.creator, groupId: f.groupId };
      expect(await isGameOrganizer(db, groupGame, f.member)).toBe(false);

      await expect(
        setOrganizer(db, {
          groupId: f.groupId,
          approverUserId: f.creator,
          userId: f.member,
          organizer: true,
        }),
      ).resolves.toMatchObject({ ok: true, organizer: true });

      const group = await requireGroupRow(db, f.groupId);
      expect(await isGameOrganizer(db, groupGame, f.member)).toBe(true);
      expect(await mayCreateGameOnGroup(db, group, f.member)).toBe(true);
      expect(
        (await listCreateGroups(db, { userId: f.member })).map(
          (option) => option.id,
        ),
      ).toEqual([f.groupId]);
      expect(await gameAdminUserIds(db, groupGame)).toEqual(
        expect.arrayContaining([f.creator, f.member]),
      );

      const home = await groupById(db, {
        groupId: f.groupId,
        userId: f.creator,
      });
      expect(home.canAppointOrganizers).toBe(true);
      const entry = home.standing.leaderboard.find(
        (row) => row.userId === f.member,
      );
      expect(entry).toMatchObject({
        isOrganizer: true,
        isAppointedOrganizer: true,
      });
      const creatorEntry = home.standing.leaderboard.find(
        (row) => row.userId === f.creator,
      );
      expect(creatorEntry).toMatchObject({
        isOrganizer: true,
        isAppointedOrganizer: false,
      });

      await setOrganizer(db, {
        groupId: f.groupId,
        approverUserId: f.creator,
        userId: f.member,
        organizer: false,
      });
      expect(await isGameOrganizer(db, groupGame, f.member)).toBe(false);
      expect(await listCreateGroups(db, { userId: f.member })).toEqual([]);
    } finally {
      await close();
    }
  });

  it("refuses a plain member, and lets an Appointed Organizer appoint and dismiss others", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const f = await seedLoose(db);

      const error = await rejection(
        setOrganizer(db, {
          groupId: f.groupId,
          approverUserId: f.member,
          userId: f.other,
          organizer: true,
        }),
      );
      expect(error.code).toBe("FORBIDDEN");
      expect(
        (await groupById(db, { groupId: f.groupId, userId: f.member }))
          .canAppointOrganizers,
      ).toBe(false);

      await setOrganizer(db, {
        groupId: f.groupId,
        approverUserId: f.creator,
        userId: f.member,
        organizer: true,
      });
      expect(
        (await groupById(db, { groupId: f.groupId, userId: f.member }))
          .canAppointOrganizers,
      ).toBe(true);

      await expect(
        setOrganizer(db, {
          groupId: f.groupId,
          approverUserId: f.member,
          userId: f.other,
          organizer: true,
        }),
      ).resolves.toMatchObject({ ok: true, organizer: true });
      await expect(
        setOrganizer(db, {
          groupId: f.groupId,
          approverUserId: f.other,
          userId: f.member,
          organizer: false,
        }),
      ).resolves.toMatchObject({ ok: true, organizer: false });
      expect(
        (await groupById(db, { groupId: f.groupId, userId: f.member }))
          .canAppointOrganizers,
      ).toBe(false);
    } finally {
      await close();
    }
  });

  it("refuses the Group creator, Unclaimed players, and a player who is not in the Group", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const f = await seedLoose(db);
      const creator = await rejection(
        setOrganizer(db, {
          groupId: f.groupId,
          approverUserId: f.creator,
          userId: f.creator,
          organizer: false,
        }),
      );
      expect(creator.message).toBe(ALWAYS_ORGANIZER_MESSAGE);
      expect(ALWAYS_ORGANIZER_MESSAGE).toBe(
        "The Group creator is always an Organizer",
      );

      const unclaimed = await rejection(
        setOrganizer(db, {
          groupId: f.groupId,
          approverUserId: f.creator,
          userId: f.unclaimed,
          organizer: true,
        }),
      );
      expect(unclaimed.message).toBe(UNCLAIMED_ORGANIZER_MESSAGE);

      const stranger = await insertUser(db, { name: "Stranger" });
      const missing = await rejection(
        setOrganizer(db, {
          groupId: f.groupId,
          approverUserId: f.creator,
          userId: stranger,
          organizer: true,
        }),
      );
      expect(missing.code).toBe("NOT_FOUND");
    } finally {
      await close();
    }
  });

  it("on a Club Group appoints any member, the creator is always an Organizer, and the Venue manager is no approver", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const f = await seedClub(db);
      const groupGame = { createdBy: f.creator, groupId: f.groupId };

      const asManager = await rejection(
        setOrganizer(db, {
          groupId: f.groupId,
          approverUserId: f.manager,
          userId: f.member,
          organizer: true,
        }),
      );
      expect(asManager.code).toBe("FORBIDDEN");

      const creator = await rejection(
        setOrganizer(db, {
          groupId: f.groupId,
          approverUserId: f.creator,
          userId: f.creator,
          organizer: true,
        }),
      );
      expect(creator.message).toBe(ALWAYS_ORGANIZER_MESSAGE);

      await setOrganizer(db, {
        groupId: f.groupId,
        approverUserId: f.creator,
        userId: f.member,
        organizer: true,
      });
      expect(await isGameOrganizer(db, groupGame, f.member)).toBe(true);
      expect(await gameAdminUserIds(db, groupGame)).toEqual(
        expect.arrayContaining([f.creator, f.member]),
      );
      expect(
        (await listCreateGroups(db, { userId: f.member })).map(
          (option) => option.id,
        ),
      ).toEqual([f.groupId]);

      await expect(
        setOrganizer(db, {
          groupId: f.groupId,
          approverUserId: f.member,
          userId: f.manager,
          organizer: true,
        }),
      ).resolves.toMatchObject({ ok: true, organizer: true });
      expect(await isGameOrganizer(db, groupGame, f.manager)).toBe(true);
    } finally {
      await close();
    }
  });
});
