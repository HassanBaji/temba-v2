import { and, eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import {
  communities,
  communityMembers,
  CommunityRoleEnum,
  GameFormatEnum,
  games,
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

async function insertGroup(
  database: TestDatabase,
  args: { createdBy: string; communityId?: string },
) {
  const [row] = await database
    .insert(groups)
    .values({
      name: "Audience Group",
      type: GroupTypeEnum.PUBLIC,
      createdBy: args.createdBy,
      communityId: args.communityId ?? null,
    })
    .returning();
  if (!row) {
    throw new Error("Failed to insert group");
  }
  return row;
}

async function insertGame(
  database: TestDatabase,
  args: { createdBy: string; groupId: string | null },
): Promise<GameRow> {
  const [venue] = await database
    .insert(venues)
    .values({
      name: `Venue ${crypto.randomUUID()}`,
      city: "Manama",
      country: "BH",
    })
    .returning({ id: venues.id });
  if (!venue) {
    throw new Error("Failed to insert venue");
  }
  const [row] = await database
    .insert(games)
    .values({
      format: GameFormatEnum.FRIENDLY_GAME,
      venueId: venue.id,
      createdBy: args.createdBy,
      groupId: args.groupId,
    })
    .returning();
  if (!row) {
    throw new Error("Failed to insert game");
  }
  return row;
}

async function seat(
  database: TestDatabase,
  communityId: string,
  userId: string,
  role: CommunityRoleEnum,
) {
  await database.insert(communityMembers).values({ communityId, userId, role });
}

async function clubGame(database: TestDatabase) {
  const owner = await insertUser(database, "audience-owner@example.com");
  const admin = await insertUser(database, "audience-admin@example.com");
  const member = await insertUser(database, "audience-member@example.com");
  const creator = await insertUser(database, "audience-creator@example.com");
  const outsider = await insertUser(database, "audience-outsider@example.com");
  const [community] = await database
    .insert(communities)
    .values({ name: "Audience Club", type: "public", createdBy: owner })
    .returning({ id: communities.id });
  if (!community) {
    throw new Error("Failed to insert community");
  }
  await seat(database, community.id, owner, CommunityRoleEnum.OWNER);
  await seat(database, community.id, admin, CommunityRoleEnum.ADMIN);
  await seat(database, community.id, member, CommunityRoleEnum.MEMBER);
  await seat(database, community.id, creator, CommunityRoleEnum.MEMBER);
  const group = await insertGroup(database, {
    createdBy: creator,
    communityId: community.id,
  });
  const game = await insertGame(database, {
    createdBy: admin,
    groupId: group.id,
  });
  return {
    communityId: community.id,
    game,
    owner,
    admin,
    member,
    creator,
    everyone: [owner, admin, member, creator, outsider],
  };
}

/** Organizers ∪ Group approvers, minus E1 (creator left the Community) and E2 (Soft-archived). */
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
  const organizerOrApprover =
    (await isGameOrganizer(database, game, userId)) ||
    (group != null && (await isGroupApprover(database, group, userId)));
  if (!group?.communityId) {
    return organizerOrApprover;
  }
  const community = await database.query.communities.findFirst({
    where: eq(communities.id, group.communityId),
    columns: { archivedAt: true },
  });
  const archived = community?.archivedAt != null;
  const seatRow = await database.query.communityMembers.findFirst({
    where: and(
      eq(communityMembers.communityId, group.communityId),
      eq(communityMembers.userId, userId),
    ),
    columns: { id: true },
  });
  const creatorLeft = group.createdBy === userId && seatRow == null;
  return organizerOrApprover && !archived && !creatorLeft;
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

  it("is Owners, Admins and a creator who still holds a seat on a Club Group Game", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const fixture = await clubGame(db);

      expect((await gameAdminUserIds(db, fixture.game)).sort()).toEqual(
        [fixture.owner, fixture.admin, fixture.creator].sort(),
      );
      await expectParity(db, fixture.game, fixture.everyone);
    } finally {
      await close();
    }
  });

  it("lists an Owner who is also the Group creator once", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const owner = await insertUser(db, "owner-creator-game@example.com");
      const [community] = await db
        .insert(communities)
        .values({ name: "Solo Club", type: "public", createdBy: owner })
        .returning({ id: communities.id });
      if (!community) {
        throw new Error("Failed to insert community");
      }
      await seat(db, community.id, owner, CommunityRoleEnum.OWNER);
      const group = await insertGroup(db, {
        createdBy: owner,
        communityId: community.id,
      });
      const game = await insertGame(db, {
        createdBy: owner,
        groupId: group.id,
      });

      expect(await gameAdminUserIds(db, game)).toEqual([owner]);
      await expectParity(db, game, [owner]);
    } finally {
      await close();
    }
  });

  it("drops a Club Group creator who left the Community, though still an Organizer", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const fixture = await clubGame(db);
      await db
        .delete(communityMembers)
        .where(
          and(
            eq(communityMembers.communityId, fixture.communityId),
            eq(communityMembers.userId, fixture.creator),
          ),
        );

      expect(await isGameOrganizer(db, fixture.game, fixture.creator)).toBe(
        true,
      );
      expect(await gameAdminUserIds(db, fixture.game)).not.toContain(
        fixture.creator,
      );
      await expectParity(db, fixture.game, fixture.everyone);
    } finally {
      await close();
    }
  });

  it("drops a demoted Admin, even the one who created the Game, and adds a promoted Member", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const fixture = await clubGame(db);
      await db
        .update(communityMembers)
        .set({ role: CommunityRoleEnum.MEMBER })
        .where(eq(communityMembers.userId, fixture.admin));
      await db
        .update(communityMembers)
        .set({ role: CommunityRoleEnum.ADMIN })
        .where(eq(communityMembers.userId, fixture.member));

      const resolved = await gameAdminUserIds(db, fixture.game);
      expect(resolved).not.toContain(fixture.admin);
      expect(resolved).toContain(fixture.member);
      await expectParity(db, fixture.game, fixture.everyone);
    } finally {
      await close();
    }
  });

  it("is nobody while the Community is Soft-archived, though Organizers still resolve", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const fixture = await clubGame(db);
      await commit(db, { communityId: fixture.communityId }, "archived");

      expect(await isGameOrganizer(db, fixture.game, fixture.owner)).toBe(true);
      expect(await gameAdminUserIds(db, fixture.game)).toEqual([]);
      await expectParity(db, fixture.game, fixture.everyone);
    } finally {
      await close();
    }
  });
});
