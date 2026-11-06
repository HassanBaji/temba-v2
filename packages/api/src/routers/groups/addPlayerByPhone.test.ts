import { TRPCError } from "@trpc/server";
import { and, eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import {
  gamePlayers,
  groupMemberInvites,
  groupMembers,
  GroupMemberRoleEnum,
  groups,
  ratings,
  user,
  venueManagers,
  venues,
} from "@repo/db/schema";

import { createFriendlyGame } from "#src/games/create-friendly";
import { addPlayerByPhone as addPlayerToGame } from "#src/routers/games/addPlayerByPhone";
import { addPlayerByPhone } from "#src/routers/groups/addPlayerByPhone";
import { groupById } from "#src/routers/groups/byId";
import { createLoosePrivate } from "#src/routers/groups/createLoosePrivate";
import { previewPlayerByPhone } from "#src/routers/groups/previewPlayerByPhone";
import {
  ONLY_UNCLAIMED_REMOVABLE_MESSAGE,
  removeUnclaimedPlayer,
} from "#src/routers/groups/removeUnclaimedPlayer";
import { isUnclaimed } from "#src/unclaimed-players/is-unclaimed";
import { createPgliteDb, type TestDatabase } from "@repo/db/testing";

const HOUR = 60 * 60 * 1000;

async function insertUser(
  database: TestDatabase,
  values: { name: string; phoneNumber?: string },
) {
  const [row] = await database
    .insert(user)
    .values({
      ...values,
      email: `${values.name.toLowerCase().replace(/\s+/g, ".")}@example.com`,
      clerkId: `user_${crypto.randomUUID()}`,
    })
    .returning({ id: user.id });
  if (!row) {
    throw new Error("Failed to insert user");
  }
  return row.id;
}

async function insertVenue(database: TestDatabase, name: string) {
  const [row] = await database
    .insert(venues)
    .values({ name, city: "Manama", country: "BH" })
    .returning({ id: venues.id });
  if (!row) {
    throw new Error("Failed to insert venue");
  }
  return row.id;
}

function bahrain(nationalNumber: string) {
  return { countryIso: "BH", nationalNumber };
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
  const creator = await insertUser(database, { name: "Creator" });
  const member = await insertUser(database, { name: "Member" });
  const ahmed = await insertUser(database, {
    name: "Ahmed Ali",
    phoneNumber: "+97336110001",
  });
  const group = await createLoosePrivate(database, {
    name: "Thursday padel",
    sport: "padel",
    userId: creator,
  });
  await database
    .insert(groupMembers)
    .values({ groupId: group.id, userId: member });
  return { creator, member, ahmed, groupId: group.id };
}

/** A Club Group: a Loose Group linked to a Venue, with an Appointed Organizer. */
async function seedClub(database: TestDatabase) {
  const manager = await insertUser(database, { name: "Manager" });
  const creator = await insertUser(database, { name: "Club creator" });
  const organizer = await insertUser(database, { name: "Club organizer" });
  const venueId = await insertVenue(database, "Padel Club");
  await database.insert(venueManagers).values({ venueId, userId: manager });
  const group = await createLoosePrivate(database, {
    name: "Club squad",
    sport: "padel",
    userId: creator,
  });
  await database.update(groups).set({ venueId }).where(eq(groups.id, group.id));
  await database.insert(groupMembers).values({
    groupId: group.id,
    userId: organizer,
    role: GroupMemberRoleEnum.ORGANIZER,
  });
  return { manager, creator, organizer, venueId, groupId: group.id };
}

describe("groups.previewPlayerByPhone and groups.addPlayerByPhone", () => {
  it("adds a new number to a Loose Group as one Unclaimed player counted in member count and Standing", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const f = await seedLoose(db);
      await expect(
        previewPlayerByPhone(db, {
          groupId: f.groupId,
          approverUserId: f.creator,
          ...bahrain("3612 4408"),
        }),
      ).resolves.toEqual({ kind: "new", name: null, alreadyInGroup: false });

      const added = await addPlayerByPhone(db, {
        groupId: f.groupId,
        approverUserId: f.creator,
        ...bahrain("36124408"),
        name: "Ali",
        level: "C+",
      });
      expect(added).toMatchObject({ outcome: "added", name: "Ali" });

      const rows = await db.query.user.findMany({
        where: eq(user.phoneNumber, "+97336124408"),
      });
      expect(rows).toHaveLength(1);
      expect(isUnclaimed(rows[0]!)).toBe(true);
      expect(rows[0]).toMatchObject({
        id: added.userId,
        addedByUserId: f.creator,
      });
      const memberships = await db.query.groupMembers.findMany({
        where: eq(groupMembers.userId, added.userId),
      });
      expect(memberships.map((row) => row.groupId)).toEqual([f.groupId]);
      const playerRatings = await db.query.ratings.findMany({
        where: eq(ratings.userId, added.userId),
      });
      expect(
        playerRatings.map((rating) => [rating.sport, rating.levelBand]),
      ).toEqual([["padel", "C1"]]);

      const home = await groupById(db, {
        groupId: f.groupId,
        userId: f.creator,
      });
      expect(home.canAddPlayers).toBe(true);
      expect(home.standing.memberCount).toBe(3);
      expect(home.memberUserIds).toContain(added.userId);
      expect(
        home.standing.leaderboard.find((row) => row.userId === added.userId),
      ).toMatchObject({
        name: "Ali",
        unclaimed: true,
        phoneMasked: "+973 •••• 4408",
      });
      expect(
        home.standing.leaderboard.find((row) => row.userId === f.member),
      ).toMatchObject({ unclaimed: false, phoneMasked: null });

      await expect(
        previewPlayerByPhone(db, {
          groupId: f.groupId,
          approverUserId: f.creator,
          ...bahrain("36124408"),
        }),
      ).resolves.toEqual({
        kind: "unclaimed",
        name: "Ali",
        alreadyInGroup: true,
        phoneMasked: "+973 •••• 4408",
      });
      const twice = await rejection(
        addPlayerByPhone(db, {
          groupId: f.groupId,
          approverUserId: f.creator,
          ...bahrain("36124408"),
        }),
      );
      expect(twice.message).toBe("Ali is already in this Group");
    } finally {
      await close();
    }
  });

  it("never sends phoneMasked to a member", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const f = await seedLoose(db);
      const added = await addPlayerByPhone(db, {
        groupId: f.groupId,
        approverUserId: f.creator,
        ...bahrain("36124408"),
        name: "Ali",
      });

      const home = await groupById(db, {
        groupId: f.groupId,
        userId: f.member,
      });
      expect(home.canAddPlayers).toBe(false);
      expect(
        home.standing.leaderboard.find((row) => row.userId === added.userId),
      ).toMatchObject({ unclaimed: true, phoneMasked: null });
      expect(
        home.standing.leaderboard.every((row) => row.phoneMasked === null),
      ).toBe(true);
    } finally {
      await close();
    }
  });

  it("refuses a member who is not a Group approver", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const f = await seedLoose(db);
      const preview = await rejection(
        previewPlayerByPhone(db, {
          groupId: f.groupId,
          approverUserId: f.member,
          ...bahrain("36124408"),
        }),
      );
      expect(preview.code).toBe("FORBIDDEN");
      const add = await rejection(
        addPlayerByPhone(db, {
          groupId: f.groupId,
          approverUserId: f.member,
          ...bahrain("36124408"),
          name: "Ali",
        }),
      );
      expect(add.code).toBe("FORBIDDEN");
      expect(
        await db.query.user.findFirst({
          where: eq(user.phoneNumber, "+97336124408"),
        }),
      ).toBeUndefined();
    } finally {
      await close();
    }
  });

  it("sends an account holder a Lookup invite and adds no membership", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const f = await seedLoose(db);
      await expect(
        previewPlayerByPhone(db, {
          groupId: f.groupId,
          approverUserId: f.creator,
          ...bahrain("36110001"),
        }),
      ).resolves.toEqual({
        kind: "account",
        name: "Ahmed Ali",
        alreadyInGroup: false,
      });

      const added = await addPlayerByPhone(db, {
        groupId: f.groupId,
        approverUserId: f.creator,
        ...bahrain("36110001"),
        name: "Ignored",
      });
      expect(added).toEqual({
        outcome: "invited",
        userId: f.ahmed,
        name: "Ahmed Ali",
      });
      expect(await membershipOf(db, f.groupId, f.ahmed)).toBeUndefined();
      const invites = await db.query.groupMemberInvites.findMany({
        where: eq(groupMemberInvites.userId, f.ahmed),
      });
      expect(invites).toEqual([
        expect.objectContaining({
          groupId: f.groupId,
          invitedBy: f.creator,
          acceptedAt: null,
          revokedAt: null,
        }),
      ]);

      const again = await rejection(
        addPlayerByPhone(db, {
          groupId: f.groupId,
          approverUserId: f.creator,
          ...bahrain("36110001"),
        }),
      );
      expect(again.message).toBe(
        "An unused Lookup invite already exists for this User",
      );
    } finally {
      await close();
    }
  });

  it("on a Club Group lets the creator and an Appointed Organizer add a new number, not the Venue manager", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const f = await seedClub(db);

      const manager = await rejection(
        addPlayerByPhone(db, {
          groupId: f.groupId,
          approverUserId: f.manager,
          ...bahrain("36124408"),
          name: "Ali",
        }),
      );
      expect(manager.code).toBe("FORBIDDEN");
      expect(
        await db.query.user.findFirst({
          where: eq(user.phoneNumber, "+97336124408"),
        }),
      ).toBeUndefined();

      const byCreator = await addPlayerByPhone(db, {
        groupId: f.groupId,
        approverUserId: f.creator,
        ...bahrain("36124408"),
        name: "Ali",
      });
      expect(byCreator.outcome).toBe("added");
      expect(await membershipOf(db, f.groupId, byCreator.userId)).toBeTruthy();

      const byOrganizer = await addPlayerByPhone(db, {
        groupId: f.groupId,
        approverUserId: f.organizer,
        ...bahrain("36124409"),
        name: "Sara",
      });
      expect(byOrganizer.outcome).toBe("added");
      expect(
        await membershipOf(db, f.groupId, byOrganizer.userId),
      ).toBeTruthy();

      const home = await groupById(db, {
        groupId: f.groupId,
        userId: f.organizer,
      });
      expect(home.canAddPlayers).toBe(true);
      expect(home.standing.memberCount).toBe(4);
    } finally {
      await close();
    }
  });

  it("adds an Unclaimed player known from another Group without a new user row", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const f = await seedClub(db);
      const looseGroup = await createLoosePrivate(db, {
        name: "Elsewhere",
        sport: "padel",
        userId: f.creator,
      });
      const outsider = await addPlayerByPhone(db, {
        groupId: looseGroup.id,
        approverUserId: f.creator,
        ...bahrain("36124408"),
        name: "Ali",
      });

      await expect(
        previewPlayerByPhone(db, {
          groupId: f.groupId,
          approverUserId: f.creator,
          ...bahrain("36124408"),
        }),
      ).resolves.toEqual({
        kind: "unclaimed",
        name: "Ali",
        alreadyInGroup: false,
        phoneMasked: "+973 •••• 4408",
      });
      const added = await addPlayerByPhone(db, {
        groupId: f.groupId,
        approverUserId: f.creator,
        ...bahrain("36124408"),
      });
      expect(added).toMatchObject({
        outcome: "added",
        userId: outsider.userId,
      });
      expect(await membershipOf(db, f.groupId, outsider.userId)).toBeTruthy();
      expect(
        await db.query.user.findMany({
          where: eq(user.phoneNumber, "+97336124408"),
        }),
      ).toHaveLength(1);
    } finally {
      await close();
    }
  });

  it("keeps preview, add and remove open while the Club Group's Venue is Soft-archived", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const f = await seedClub(db);
      const added = await addPlayerByPhone(db, {
        groupId: f.groupId,
        approverUserId: f.creator,
        ...bahrain("36124408"),
        name: "Ali",
      });
      await db
        .update(venues)
        .set({ archivedAt: new Date() })
        .where(eq(venues.id, f.venueId));

      await expect(
        previewPlayerByPhone(db, {
          groupId: f.groupId,
          approverUserId: f.creator,
          ...bahrain("36124409"),
        }),
      ).resolves.toEqual({ kind: "new", name: null, alreadyInGroup: false });
      const sara = await addPlayerByPhone(db, {
        groupId: f.groupId,
        approverUserId: f.organizer,
        ...bahrain("36124409"),
        name: "Sara",
      });
      expect(sara.outcome).toBe("added");
      await expect(
        removeUnclaimedPlayer(db, {
          groupId: f.groupId,
          approverUserId: f.creator,
          userId: added.userId,
        }),
      ).resolves.toMatchObject({ ok: true });
      expect(await membershipOf(db, f.groupId, added.userId)).toBeUndefined();
      expect(await membershipOf(db, f.groupId, sara.userId)).toBeTruthy();
    } finally {
      await close();
    }
  });
});

describe("groups.removeUnclaimedPlayer", () => {
  it("removes only the Unclaimed membership and keeps their Game history", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const f = await seedLoose(db);
      const added = await addPlayerByPhone(db, {
        groupId: f.groupId,
        approverUserId: f.creator,
        ...bahrain("36124408"),
        name: "Ali",
      });
      const venueId = await insertVenue(db, "Padel Central");
      const windowStart = new Date(Date.now() + 24 * HOUR);
      const created = await createFriendlyGame(db, {
        createdBy: f.creator,
        groupId: f.groupId,
        venueId,
        windowStart,
        windowEnd: new Date(windowStart.getTime() + 2 * HOUR),
      });
      await addPlayerToGame(db, {
        gameId: created.game.id,
        organizerUserId: f.creator,
        ...bahrain("36124408"),
        seat: { sideIndex: 2, position: "left" },
      });

      const refusedAccount = await rejection(
        removeUnclaimedPlayer(db, {
          groupId: f.groupId,
          approverUserId: f.creator,
          userId: f.member,
        }),
      );
      expect(refusedAccount.message).toBe(ONLY_UNCLAIMED_REMOVABLE_MESSAGE);
      expect(await membershipOf(db, f.groupId, f.member)).toBeTruthy();

      const notApprover = await rejection(
        removeUnclaimedPlayer(db, {
          groupId: f.groupId,
          approverUserId: f.member,
          userId: added.userId,
        }),
      );
      expect(notApprover.code).toBe("FORBIDDEN");

      await expect(
        removeUnclaimedPlayer(db, {
          groupId: f.groupId,
          approverUserId: f.creator,
          userId: added.userId,
        }),
      ).resolves.toMatchObject({ ok: true });

      expect(await membershipOf(db, f.groupId, added.userId)).toBeUndefined();
      expect(await membershipOf(db, f.groupId, f.member)).toBeTruthy();
      expect(
        await db.query.user.findFirst({ where: eq(user.id, added.userId) }),
      ).toBeTruthy();
      const seats = await db.query.gamePlayers.findMany({
        where: and(
          eq(gamePlayers.gameId, created.game.id),
          eq(gamePlayers.userId, added.userId),
        ),
      });
      expect(seats).toHaveLength(1);

      const home = await groupById(db, {
        groupId: f.groupId,
        userId: f.creator,
      });
      expect(home.standing.memberCount).toBe(2);

      const gone = await rejection(
        removeUnclaimedPlayer(db, {
          groupId: f.groupId,
          approverUserId: f.creator,
          userId: added.userId,
        }),
      );
      expect(gone.code).toBe("NOT_FOUND");
    } finally {
      await close();
    }
  });

  it("lets an Appointed Organizer of a Club Group remove an Unclaimed player", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const f = await seedClub(db);
      const added = await addPlayerByPhone(db, {
        groupId: f.groupId,
        approverUserId: f.creator,
        ...bahrain("36124408"),
        name: "Ali",
      });
      await removeUnclaimedPlayer(db, {
        groupId: f.groupId,
        approverUserId: f.organizer,
        userId: added.userId,
      });
      expect(await membershipOf(db, f.groupId, added.userId)).toBeUndefined();
      expect(
        await db.query.user.findFirst({ where: eq(user.id, added.userId) }),
      ).toBeTruthy();
    } finally {
      await close();
    }
  });
});
