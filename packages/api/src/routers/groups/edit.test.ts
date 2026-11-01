import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import {
  GameFormatEnum,
  GameRegistrationModeEnum,
  communities,
  communityMembers,
  CommunityRoleEnum,
  communitySports,
  games,
  groupMembers,
  user,
  venues,
} from "@repo/db/schema";

import { groupById } from "#src/routers/groups/byId";
import { createClubPublic } from "#src/routers/groups/createClubPublic";
import { createLoosePublic } from "#src/routers/groups/createLoosePublic";
import {
  editGroup,
  SPORT_LOCKED_MESSAGE,
  SPORT_NOT_ALLOWED_MESSAGE,
} from "#src/routers/groups/edit";
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
      expect(error.message).toBe(SPORT_LOCKED_MESSAGE);
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
    } finally {
      await close();
    }
  });

  it("keeps a Club Group's sport on the Community allow-list and lets Admin edit", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const owner = await insertUser(db, "owner@example.com");
      const admin = await insertUser(db, "admin@example.com");
      const [community] = await db
        .insert(communities)
        .values({ name: "Arad", createdBy: owner.id })
        .returning({ id: communities.id });
      if (!community) {
        throw new Error("community");
      }
      await db.insert(communityMembers).values([
        {
          communityId: community.id,
          userId: owner.id,
          role: CommunityRoleEnum.OWNER,
        },
        {
          communityId: community.id,
          userId: admin.id,
          role: CommunityRoleEnum.ADMIN,
        },
      ]);
      await db
        .insert(communitySports)
        .values({ communityId: community.id, sport: "padel" });
      const group = await createClubPublic(db, {
        name: "Club Crew",
        sport: "padel",
        communityId: community.id,
        userId: owner.id,
      });

      const error = await rejection(
        editGroup(db, {
          groupId: group.id,
          userId: admin.id,
          sport: "football",
        }),
      );
      expect(error.message).toBe(SPORT_NOT_ALLOWED_MESSAGE);

      const renamed = await editGroup(db, {
        groupId: group.id,
        userId: admin.id,
        name: "Club Crew II",
      });
      expect(renamed.name).toBe("Club Crew II");
      expect(
        (await groupById(db, { groupId: group.id, userId: admin.id })).canEdit,
      ).toBe(true);
      const stored = await db.query.groupMembers.findFirst({
        where: eq(groupMembers.groupId, group.id),
      });
      expect(stored).toBeDefined();
    } finally {
      await close();
    }
  });
});
