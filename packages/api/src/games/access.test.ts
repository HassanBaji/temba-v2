import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import {
  GameFormatEnum,
  games,
  groupMembers,
  GroupMemberRoleEnum,
  groups,
  GroupTypeEnum,
  user,
  venues,
} from "@repo/db/schema";

import {
  gameAdminUserIds,
  type GameRow,
  isGameOrganizer,
} from "#src/games/access";
import { isGroupApprover } from "#src/groups/helpers/is-group-approver";
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
    .values({
      name: `Venue ${crypto.randomUUID()}`,
      city: "Manama",
      country: "BH",
    })
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
      name: "Audience Group",
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

async function insertGame(
  database: TestDatabase,
  args: { createdBy: string; groupId: string | null; venueId?: string },
): Promise<GameRow> {
  const venueId = args.venueId ?? (await insertVenue(database));
  const [row] = await database
    .insert(games)
    .values({
      format: GameFormatEnum.FRIENDLY_GAME,
      venueId,
      createdBy: args.createdBy,
      groupId: args.groupId,
    })
    .returning();
  if (!row) {
    throw new Error("Failed to insert game");
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

async function clubGame(database: TestDatabase) {
  const creator = await insertUser(database, "audience-creator@example.com");
  const organizer = await insertUser(
    database,
    "audience-organizer@example.com",
  );
  const member = await insertUser(database, "audience-member@example.com");
  const outsider = await insertUser(database, "audience-outsider@example.com");
  const venueId = await insertVenue(database);
  const group = await insertGroup(database, { createdBy: creator, venueId });
  await appoint(database, group.id, organizer);
  await database
    .insert(groupMembers)
    .values({ groupId: group.id, userId: member });
  const game = await insertGame(database, {
    createdBy: organizer,
    groupId: group.id,
    venueId,
  });
  return {
    venueId,
    group,
    game,
    creator,
    organizer,
    member,
    outsider,
    everyone: [creator, organizer, member, outsider],
  };
}

/** Organizers ∪ Group approvers: the Group creator and Appointed Organizers. */
async function expectedAdmin(
  database: TestDatabase,
  game: GameRow,
  userId: string,
) {
  const group = game.groupId
    ? await database.query.groups.findFirst({
        where: eq(groups.id, game.groupId),
      })
    : undefined;
  return (
    (await isGameOrganizer(database, game, userId)) ||
    (group != null && (await isGroupApprover(database, group, userId)))
  );
}

async function expectParity(
  database: TestDatabase,
  game: GameRow,
  userIds: string[],
) {
  const resolved = await gameAdminUserIds(database, game);
  expect(new Set(resolved).size).toBe(resolved.length);
  for (const userId of userIds) {
    expect(resolved.includes(userId)).toBe(
      await expectedAdmin(database, game, userId),
    );
  }
}

describe("gameAdminUserIds", () => {
  it("is the Game creator alone on a groupless Game", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const creator = await insertUser(db, "groupless-creator@example.com");
      const other = await insertUser(db, "groupless-other@example.com");
      const game = await insertGame(db, { createdBy: creator, groupId: null });

      expect(await gameAdminUserIds(db, game)).toEqual([creator]);
      await expectParity(db, game, [creator, other]);
    } finally {
      await close();
    }
  });

  it("is the Group creator alone on a Loose Group Game", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const creator = await insertUser(db, "loose-game-creator@example.com");
      const other = await insertUser(db, "loose-game-other@example.com");
      const group = await insertGroup(db, { createdBy: creator });
      const game = await insertGame(db, {
        createdBy: creator,
        groupId: group.id,
      });

      expect(await gameAdminUserIds(db, game)).toEqual([creator]);
      await expectParity(db, game, [creator, other]);
    } finally {
      await close();
    }
  });

  it("is the Group creator and the Appointed Organizers on a Club Group Game", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const fixture = await clubGame(db);

      expect((await gameAdminUserIds(db, fixture.game)).sort()).toEqual(
        [fixture.creator, fixture.organizer].sort(),
      );
      await expectParity(db, fixture.game, fixture.everyone);
    } finally {
      await close();
    }
  });

  it("lists a Group creator who is also an Appointed Organizer once", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const creator = await insertUser(
        db,
        "creator-organizer-game@example.com",
      );
      const venueId = await insertVenue(db);
      const group = await insertGroup(db, { createdBy: creator, venueId });
      await appoint(db, group.id, creator);
      const game = await insertGame(db, {
        createdBy: creator,
        groupId: group.id,
        venueId,
      });

      expect(await gameAdminUserIds(db, game)).toEqual([creator]);
      await expectParity(db, game, [creator]);
    } finally {
      await close();
    }
  });

  it("drops an Organizer whose appointment ended, even the one who created the Game", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const fixture = await clubGame(db);
      await db
        .update(groupMembers)
        .set({ role: GroupMemberRoleEnum.MEMBER })
        .where(eq(groupMembers.userId, fixture.organizer));
      await db
        .update(groupMembers)
        .set({ role: GroupMemberRoleEnum.ORGANIZER })
        .where(eq(groupMembers.userId, fixture.member));

      expect(await isGameOrganizer(db, fixture.game, fixture.organizer)).toBe(
        false,
      );
      const resolved = await gameAdminUserIds(db, fixture.game);
      expect(resolved).not.toContain(fixture.organizer);
      expect(resolved).toContain(fixture.member);
      await expectParity(db, fixture.game, fixture.everyone);
    } finally {
      await close();
    }
  });

  it("keeps the audience while the linked Venue is Soft-archived", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const fixture = await clubGame(db);
      await commit(db, { venueId: fixture.venueId }, "archived");

      expect(await isGameOrganizer(db, fixture.game, fixture.creator)).toBe(
        true,
      );
      expect((await gameAdminUserIds(db, fixture.game)).sort()).toEqual(
        [fixture.creator, fixture.organizer].sort(),
      );
      await expectParity(db, fixture.game, fixture.everyone);
    } finally {
      await close();
    }
  });
});
