import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import {
  GameFormatEnum,
  GameRegistrationModeEnum,
  MatchStatusEnum,
  games,
  groupMembers,
  groups,
  matches,
  user,
  venues,
} from "@repo/db/schema";

import { listCreateGroups } from "#src/routers/games/listCreateGroups";
import { groupById } from "#src/routers/groups/byId";
import { createLoosePublic } from "#src/routers/groups/createLoosePublic";
import { deleteGroup } from "#src/routers/groups/delete";
import { listPublic } from "#src/routers/groups/listPublic";
import { mine } from "#src/routers/groups/mine";
import { loadHome } from "#src/routers/users/home";
import { createPgliteDb, type TestDatabase } from "@repo/db/testing";

const NOW = new Date("2026-11-01T12:00:00.000Z");
const PAST = new Date("2026-10-20T18:00:00.000Z");
const FUTURE = new Date("2026-11-08T18:00:00.000Z");

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

async function insertGame(
  database: TestDatabase,
  args: {
    createdBy: string;
    groupId: string;
    venueId: string;
    start: Date;
    completed?: boolean;
  },
) {
  const [game] = await database
    .insert(games)
    .values({
      name: "Session",
      format: GameFormatEnum.FRIENDLY_GAME,
      registrationMode: GameRegistrationModeEnum.INDIVIDUAL,
      createdBy: args.createdBy,
      groupId: args.groupId,
      venueId: args.venueId,
      isPublic: false,
      playersAllowed: 4,
      teamsAllowed: 2,
      windowStart: args.start,
      windowEnd: new Date(args.start.getTime() + 2 * 60 * 60 * 1000),
    })
    .returning({ id: games.id });
  if (!game) {
    throw new Error("Failed to insert game");
  }
  await database.insert(matches).values({
    gameId: game.id,
    startTime: args.start,
    status: args.completed
      ? MatchStatusEnum.COMPLETED
      : MatchStatusEnum.SCHEDULED,
  });
  return game;
}

async function seed(database: TestDatabase) {
  const creator = await insertUser(database, "owner@example.com");
  const member = await insertUser(database, "member@example.com");
  const group = await createLoosePublic(database, {
    name: "Gooz of Arad",
    sport: "padel",
    userId: creator.id,
  });
  await database
    .insert(groupMembers)
    .values({ groupId: group.id, userId: member.id });
  const venue = await insertVenue(database);
  const played = await insertGame(database, {
    createdBy: creator.id,
    groupId: group.id,
    venueId: venue.id,
    start: PAST,
    completed: true,
  });
  const upcoming = await insertGame(database, {
    createdBy: creator.id,
    groupId: group.id,
    venueId: venue.id,
    start: FUTURE,
  });
  return { creator, member, group, played, upcoming };
}

describe("deleteGroup", () => {
  it("soft-deletes a Group with members and Games, keeping the played ones", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const f = await seed(db);

      const result = await deleteGroup(db, {
        groupId: f.group.id,
        userId: f.creator.id,
        now: NOW,
      });

      expect(result).toEqual({
        ok: true,
        groupId: f.group.id,
        cancelledGameCount: 1,
      });
      const row = await db.query.groups.findFirst({
        where: eq(groups.id, f.group.id),
      });
      expect(row?.deletedAt).toEqual(NOW);
      expect(row?.deletedBy).toBe(f.creator.id);

      const memberships = await db.query.groupMembers.findMany({
        where: eq(groupMembers.groupId, f.group.id),
      });
      expect(memberships).toHaveLength(2);

      const played = await db.query.games.findFirst({
        where: eq(games.id, f.played.id),
      });
      expect(played?.cancelledAt).toBeNull();
      const upcoming = await db.query.games.findFirst({
        where: eq(games.id, f.upcoming.id),
      });
      expect(upcoming?.cancelledAt).not.toBeNull();
    } finally {
      await close();
    }
  });

  it("hides the Group from every list and door afterwards", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const f = await seed(db);
      const outsider = await insertUser(db, "outsider@example.com");
      await deleteGroup(db, {
        groupId: f.group.id,
        userId: f.creator.id,
        now: NOW,
      });

      expect(await mine(db, { userId: f.member.id, now: NOW })).toEqual([]);
      expect(await listPublic(db, { userId: outsider.id })).toEqual([]);
      expect(await listCreateGroups(db, { userId: f.creator.id })).toEqual([]);
      expect((await loadHome(db, { userId: f.member.id })).groupsCount).toBe(0);
      await expect(
        groupById(db, { groupId: f.group.id, userId: f.member.id }),
      ).rejects.toMatchObject({ code: "NOT_FOUND" });
      await expect(
        deleteGroup(db, { groupId: f.group.id, userId: f.creator.id }),
      ).rejects.toMatchObject({ code: "NOT_FOUND" });
    } finally {
      await close();
    }
  });

  it("refuses everyone but the owner on a Loose Group", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const f = await seed(db);
      await db
        .update(groupMembers)
        .set({ role: "organizer" })
        .where(eq(groupMembers.userId, f.member.id));

      const error = await deleteGroup(db, {
        groupId: f.group.id,
        userId: f.member.id,
      }).then(
        () => null,
        (caught: unknown) => caught,
      );
      expect(error).toBeInstanceOf(TRPCError);
      expect((error as TRPCError).code).toBe("FORBIDDEN");

      const home = await groupById(db, {
        groupId: f.group.id,
        userId: f.member.id,
      });
      expect(home.canDelete).toBe(false);
      expect(home.canEdit).toBe(false);
      expect(home.isOwner).toBe(false);
    } finally {
      await close();
    }
  });

  it("lets the owner delete a Group that has Games and members", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const f = await seed(db);
      const home = await groupById(db, {
        groupId: f.group.id,
        userId: f.creator.id,
      });
      expect(home).toMatchObject({
        canDelete: true,
        canEdit: true,
        canTransferOwnership: true,
        canChangeSport: false,
        isOwner: true,
      });
    } finally {
      await close();
    }
  });
});
