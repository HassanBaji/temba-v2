import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import {
  GameFormatEnum,
  GameRegistrationModeEnum,
  games,
  groupMembers,
  groups,
  user,
  venueManagers,
  venues,
} from "@repo/db/schema";

import { groupById } from "#src/routers/groups/byId";
import { createLoosePublic } from "#src/routers/groups/createLoosePublic";
import { editGroup } from "#src/routers/groups/edit";
import { createPgliteDb, type TestDatabase } from "@repo/db/testing";

async function insertUser(database: TestDatabase, email: string) {
  const [row] = await database
    .insert(user)
    .values({
      name: email.split("@")[0] ?? "User",
      email,
      clerkId: `user_${crypto.randomUUID()}`,
    })
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
      city: "Manama",
      country: "BH",
    })
    .returning({ id: venues.id });
  if (!row) {
    throw new Error("Failed to insert venue");
  }
  return row;
}

async function rejection(promise: Promise<unknown>) {
  const error = await promise.then(
    () => null,
    (caught: unknown) => caught,
  );
  expect(error).toBeInstanceOf(TRPCError);
  return error as TRPCError;
}

describe("editGroup", () => {
  it("saves name, visibility and approval together, dropping approval for Private", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const owner = await insertUser(db, "owner@example.com");
      const group = await createLoosePublic(db, {
        name: "Gooz of Arad",
        sport: "football",
        userId: owner.id,
        requiresApproval: true,
      });

      const renamed = await editGroup(db, {
        groupId: group.id,
        userId: owner.id,
        name: "Arad FC",
      });
      expect(renamed).toMatchObject({
        name: "Arad FC",
        type: "public",
        requiresApproval: true,
      });

      const privated = await editGroup(db, {
        groupId: group.id,
        userId: owner.id,
        type: "private",
      });
      expect(privated).toMatchObject({
        type: "private",
        requiresApproval: false,
      });

      const reopened = await editGroup(db, {
        groupId: group.id,
        userId: owner.id,
        type: "public",
        requiresApproval: true,
      });
      expect(reopened).toMatchObject({
        type: "public",
        requiresApproval: true,
      });
    } finally {
      await close();
    }
  });

  it("changes the sport until the first Game, then locks it", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const owner = await insertUser(db, "owner@example.com");
      const group = await createLoosePublic(db, {
        name: "Crew",
        sport: "padel",
        userId: owner.id,
      });
      expect(
        (await groupById(db, { groupId: group.id, userId: owner.id }))
          .canChangeSport,
      ).toBe(true);

      const switched = await editGroup(db, {
        groupId: group.id,
        userId: owner.id,
        sport: "football",
      });
      expect(switched.sport).toBe("football");

      const venue = await insertVenue(db);
      await db.insert(games).values({
        name: "Session",
        venueId: venue.id,
        format: GameFormatEnum.FRIENDLY_GAME,
        registrationMode: GameRegistrationModeEnum.INDIVIDUAL,
        createdBy: owner.id,
        groupId: group.id,
        isPublic: false,
        playersAllowed: 10,
        teamsAllowed: 2,
      });
      const error = await rejection(
        editGroup(db, { groupId: group.id, userId: owner.id, sport: "padel" }),
      );
      expect(error.message).toBe(
        "The sport is locked once the Group has a Game",
      );
      expect(
        (await groupById(db, { groupId: group.id, userId: owner.id }))
          .canChangeSport,
      ).toBe(false);

      const sameSport = await editGroup(db, {
        groupId: group.id,
        userId: owner.id,
        sport: "football",
        name: "Crew FC",
      });
      expect(sameSport.name).toBe("Crew FC");
    } finally {
      await close();
    }
  });

  it("refuses a member who is not the owner", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const owner = await insertUser(db, "owner@example.com");
      const member = await insertUser(db, "member@example.com");
      const group = await createLoosePublic(db, {
        name: "Crew",
        sport: "padel",
        userId: owner.id,
      });
      await db
        .insert(groupMembers)
        .values({ groupId: group.id, userId: member.id, role: "organizer" });

      const error = await rejection(
        editGroup(db, { groupId: group.id, userId: member.id, name: "Mine" }),
      );
      expect(error.code).toBe("FORBIDDEN");
      expect(error.message).toBe("Only the Group owner can edit this Group");
    } finally {
      await close();
    }
  });

  it("on a Club Group lets only the owner edit, with the sport free of any Venue allow-list", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const owner = await insertUser(db, "owner@example.com");
      const organizer = await insertUser(db, "organizer@example.com");
      const manager = await insertUser(db, "manager@example.com");
      const venue = await insertVenue(db);
      await db
        .insert(venueManagers)
        .values({ venueId: venue.id, userId: manager.id });
      const group = await createLoosePublic(db, {
        name: "Club Crew",
        sport: "padel",
        userId: owner.id,
      });
      await db
        .update(groups)
        .set({ venueId: venue.id })
        .where(eq(groups.id, group.id));
      await db.insert(groupMembers).values({
        groupId: group.id,
        userId: organizer.id,
        role: "organizer",
      });

      for (const userId of [organizer.id, manager.id]) {
        const error = await rejection(
          editGroup(db, { groupId: group.id, userId, name: "Mine" }),
        );
        expect(error.code).toBe("FORBIDDEN");
        expect(
          (await groupById(db, { groupId: group.id, userId: organizer.id }))
            .canEdit,
        ).toBe(false);
      }

      const switched = await editGroup(db, {
        groupId: group.id,
        userId: owner.id,
        sport: "football",
        name: "Club Crew II",
      });
      expect(switched).toMatchObject({
        name: "Club Crew II",
        sport: "football",
      });
      const asOwner = await groupById(db, {
        groupId: group.id,
        userId: owner.id,
      });
      expect(asOwner.canEdit).toBe(true);
      expect(asOwner.venue).toEqual(expect.objectContaining({ id: venue.id }));
      const stored = await db.query.groups.findFirst({
        where: eq(groups.id, group.id),
      });
      expect(stored?.venueId).toBe(venue.id);
    } finally {
      await close();
    }
  });
});
