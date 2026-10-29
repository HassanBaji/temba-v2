import { TRPCError } from "@trpc/server";
import { and, eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import {
  communities,
  communityMembers,
  CommunityRoleEnum,
  communitySports,
  groupMembers,
  GroupSportEnum,
  user,
} from "@repo/db/schema";

import {
  gameAdminUserIds,
  isGameOrganizer,
  mayCreateGameOnGroup,
} from "#src/games/access";
import { listCreateGroups } from "#src/routers/games/listCreateGroups";
import { groupById } from "#src/routers/groups/byId";
import { createClubPrivate } from "#src/routers/groups/createClubPrivate";
import { createLoosePrivate } from "#src/routers/groups/createLoosePrivate";
import {
  ALWAYS_ORGANIZER_MESSAGE,
  NOT_A_COMMUNITY_MEMBER_ORGANIZER_MESSAGE,
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

async function seedClub(database: TestDatabase) {
  const owner = await insertUser(database, { name: "Owner" });
  const member = await insertUser(database, { name: "Club member" });
  const outsider = await insertUser(database, { name: "Outsider" });
  const [community] = await database
    .insert(communities)
    .values({ name: "Padel Club", type: "private", createdBy: owner })
    .returning({ id: communities.id });
  await database.insert(communitySports).values({
    communityId: community!.id,
    sport: GroupSportEnum.PADEL,
  });
  await database.insert(communityMembers).values([
    {
      communityId: community!.id,
      userId: owner,
      role: CommunityRoleEnum.OWNER,
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
    { groupId: group.id, userId: member },
    { groupId: group.id, userId: outsider },
  ]);
  return {
    owner,
    member,
    outsider,
    communityId: community!.id,
    groupId: group.id,
  };
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

  it("refuses anyone who is not a Group approver, including an Appointed Organizer", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const f = await seedLoose(db);
      await setOrganizer(db, {
        groupId: f.groupId,
        approverUserId: f.creator,
        userId: f.member,
        organizer: true,
      });

      const error = await rejection(
        setOrganizer(db, {
          groupId: f.groupId,
          approverUserId: f.member,
          userId: f.other,
          organizer: true,
        }),
      );
      expect(error.code).toBe("FORBIDDEN");
      const home = await groupById(db, {
        groupId: f.groupId,
        userId: f.member,
      });
      expect(home.canAppointOrganizers).toBe(false);
    } finally {
      await close();
    }
  });

  it("refuses the Group creator and Unclaimed players", async () => {
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

      const unclaimed = await rejection(
        setOrganizer(db, {
          groupId: f.groupId,
          approverUserId: f.creator,
          userId: f.unclaimed,
          organizer: true,
        }),
      );
      expect(unclaimed.message).toBe(UNCLAIMED_ORGANIZER_MESSAGE);
    } finally {
      await close();
    }
  });

  it("on a Club Group, needs a Community Member and lapses when they leave the Community", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const f = await seedClub(db);
      const groupGame = { createdBy: f.owner, groupId: f.groupId };

      const outsider = await rejection(
        setOrganizer(db, {
          groupId: f.groupId,
          approverUserId: f.owner,
          userId: f.outsider,
          organizer: true,
        }),
      );
      expect(outsider.message).toBe(NOT_A_COMMUNITY_MEMBER_ORGANIZER_MESSAGE);

      const owner = await rejection(
        setOrganizer(db, {
          groupId: f.groupId,
          approverUserId: f.owner,
          userId: f.owner,
          organizer: true,
        }),
      );
      expect(owner.message).toBe(ALWAYS_ORGANIZER_MESSAGE);

      await setOrganizer(db, {
        groupId: f.groupId,
        approverUserId: f.owner,
        userId: f.member,
        organizer: true,
      });
      expect(await isGameOrganizer(db, groupGame, f.member)).toBe(true);

      await db
        .delete(communityMembers)
        .where(
          and(
            eq(communityMembers.communityId, f.communityId),
            eq(communityMembers.userId, f.member),
          ),
        );
      expect(await isGameOrganizer(db, groupGame, f.member)).toBe(false);
      expect(await gameAdminUserIds(db, groupGame)).not.toContain(f.member);
      expect(await listCreateGroups(db, { userId: f.member })).toEqual([]);
    } finally {
      await close();
    }
  });
});
