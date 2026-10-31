import { TRPCError } from "@trpc/server";
import { and, eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import {
  communities,
  communityMembers,
  CommunityRoleEnum,
  communitySports,
  groupMembers,
  GroupMemberRoleEnum,
  GroupSportEnum,
  user,
} from "@repo/db/schema";

import { groupById } from "#src/routers/groups/byId";
import { createClubPrivate } from "#src/routers/groups/createClubPrivate";
import { createLoosePrivate } from "#src/routers/groups/createLoosePrivate";
import {
  CANNOT_REMOVE_CREATOR_MESSAGE,
  CANNOT_REMOVE_SELF_MESSAGE,
  CANNOT_REMOVE_STAFF_MESSAGE,
  removePlayer,
} from "#src/routers/groups/removePlayer";
import { commit } from "#src/soft-archive";
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

async function seedClub(database: TestDatabase) {
  const owner = await insertUser(database, "Owner");
  const admin = await insertUser(database, "Admin");
  const organizer = await insertUser(database, "Club organizer");
  const member = await insertUser(database, "Club member");
  const [community] = await database
    .insert(communities)
    .values({ name: "Padel Club", type: "private", createdBy: owner })
    .returning({ id: communities.id });
  await database.insert(communitySports).values({
    communityId: community!.id,
    sport: GroupSportEnum.PADEL,
  });
  await database.insert(communityMembers).values([
    { communityId: community!.id, userId: owner, role: CommunityRoleEnum.OWNER },
    { communityId: community!.id, userId: admin, role: CommunityRoleEnum.ADMIN },
    {
      communityId: community!.id,
      userId: organizer,
      role: CommunityRoleEnum.MEMBER,
    },
    {
      communityId: community!.id,
      userId: member,
      role: CommunityRoleEnum.MEMBER,
    },
  ]);
  const group = await createClubPrivate(database, {
    communityId: community!.id,
    name: "Club squad",
    sport: "padel",
    userId: owner,
  });
  await database.insert(groupMembers).values([
    { groupId: group.id, userId: admin },
    {
      groupId: group.id,
      userId: organizer,
      role: GroupMemberRoleEnum.ORGANIZER,
    },
    { groupId: group.id, userId: member },
  ]);
  return {
    owner,
    admin,
    organizer,
    member,
    communityId: community!.id,
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
      expect(creator.message).toBe(CANNOT_REMOVE_CREATOR_MESSAGE);

      const self = await rejection(
        removePlayer(db, {
          groupId: f.groupId,
          approverUserId: f.organizer,
          userId: f.organizer,
        }),
      );
      expect(self.message).toBe(CANNOT_REMOVE_SELF_MESSAGE);

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

  it("on a Club Group keeps Owner and Admin and freezes while Soft-archived", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const f = await seedClub(db);

      const owner = await rejection(
        removePlayer(db, {
          groupId: f.groupId,
          approverUserId: f.organizer,
          userId: f.owner,
        }),
      );
      expect(owner.message).toBe(CANNOT_REMOVE_CREATOR_MESSAGE);

      const admin = await rejection(
        removePlayer(db, {
          groupId: f.groupId,
          approverUserId: f.organizer,
          userId: f.admin,
        }),
      );
      expect(admin.message).toBe(CANNOT_REMOVE_STAFF_MESSAGE);

      await expect(
        removePlayer(db, {
          groupId: f.groupId,
          approverUserId: f.organizer,
          userId: f.member,
        }),
      ).resolves.toMatchObject({ ok: true });

      await db.insert(groupMembers).values({
        groupId: f.groupId,
        userId: f.member,
      });
      await commit(db, { communityId: f.communityId }, "archived");
      const frozen = await rejection(
        removePlayer(db, {
          groupId: f.groupId,
          approverUserId: f.owner,
          userId: f.member,
        }),
      );
      expect(frozen.message).toBe(
        "Cannot remove players from a Group in an archived Community",
      );
    } finally {
      await close();
    }
  });
});
