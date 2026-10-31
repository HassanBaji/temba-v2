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
import { createInviteLink } from "#src/routers/groups/createInviteLink";
import { createLoosePrivate } from "#src/routers/groups/createLoosePrivate";
import { listLookupInvites } from "#src/routers/groups/listLookupInvites";
import { sendLookupInvite } from "#src/routers/groups/sendLookupInvite";
import { setOrganizer } from "#src/routers/groups/setOrganizer";
import { createPgliteDb, type TestDatabase } from "@repo/db/testing";

const ORIGIN = "https://temba.test";

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

async function seedLoose(database: TestDatabase) {
  const creator = await insertUser(database, "Creator");
  const organizer = await insertUser(database, "Organizer");
  const member = await insertUser(database, "Member");
  const outsider = await insertUser(database, "Outsider");
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
  ]);
  return { creator, organizer, member, outsider, groupId: group.id };
}

async function seedClub(database: TestDatabase) {
  const owner = await insertUser(database, "Owner");
  const organizer = await insertUser(database, "Club organizer");
  const clubMember = await insertUser(database, "Club member");
  const outsider = await insertUser(database, "Outsider");
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
    {
      communityId: community!.id,
      userId: organizer,
      role: CommunityRoleEnum.MEMBER,
    },
    {
      communityId: community!.id,
      userId: clubMember,
      role: CommunityRoleEnum.MEMBER,
    },
  ]);
  const group = await createClubPrivate(database, {
    communityId: community!.id,
    name: "Club squad",
    sport: "padel",
    userId: owner,
  });
  await database.insert(groupMembers).values({
    groupId: group.id,
    userId: organizer,
    role: GroupMemberRoleEnum.ORGANIZER,
  });
  return {
    owner,
    organizer,
    clubMember,
    outsider,
    communityId: community!.id,
    groupId: group.id,
  };
}

describe("Appointed Organizer invite doors", () => {
  it("on a Loose Group sends Lookup invites, mints Invite links and appoints others", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const f = await seedLoose(db);

      const home = await groupById(db, {
        groupId: f.groupId,
        userId: f.organizer,
      });
      expect(home).toMatchObject({
        canManageLookupInvites: true,
        canManageInviteLinks: true,
        canAddPlayers: true,
        canRemovePlayers: true,
        canAppointOrganizers: true,
        canDelete: false,
      });

      const sent = await sendLookupInvite(db, {
        groupId: f.groupId,
        userId: f.organizer,
        userIds: [f.outsider],
      });
      expect(sent.sent).toHaveLength(1);
      expect(sent.refused).toEqual([]);
      expect(
        (
          await listLookupInvites(db, {
            groupId: f.groupId,
            userId: f.organizer,
          })
        ).map((invite) => invite.user.id),
      ).toEqual([f.outsider]);

      const link = await createInviteLink(db, {
        groupId: f.groupId,
        userId: f.organizer,
        origin: ORIGIN,
      });
      expect(link.inviteUrl.startsWith(ORIGIN)).toBe(true);

      await expect(
        setOrganizer(db, {
          groupId: f.groupId,
          approverUserId: f.organizer,
          userId: f.member,
          organizer: true,
        }),
      ).resolves.toMatchObject({ ok: true, organizer: true });

      const asMember = await rejection(
        sendLookupInvite(db, {
          groupId: f.groupId,
          userId: f.outsider,
          userIds: [f.member],
        }),
      );
      expect(asMember.code).toBe("FORBIDDEN");
    } finally {
      await close();
    }
  });

  it("on a Club Group invites Community Members only, cannot mint links, and lapses on leaving the Community", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const f = await seedClub(db);

      const home = await groupById(db, {
        groupId: f.groupId,
        userId: f.organizer,
      });
      expect(home).toMatchObject({
        canManageLookupInvites: true,
        canManageInviteLinks: false,
        canRemovePlayers: true,
        canAppointOrganizers: true,
      });

      const sent = await sendLookupInvite(db, {
        groupId: f.groupId,
        userId: f.organizer,
        userIds: [f.clubMember, f.outsider],
      });
      expect(sent.sent.map((invite) => invite.userId)).toEqual([f.clubMember]);
      expect(sent.refused).toEqual([
        {
          name: "Outsider",
          message: "Invitee must already be a Community Member",
        },
      ]);

      const link = await rejection(
        createInviteLink(db, {
          groupId: f.groupId,
          userId: f.organizer,
          origin: ORIGIN,
        }),
      );
      expect(link.code).toBe("FORBIDDEN");

      await db
        .delete(communityMembers)
        .where(
          and(
            eq(communityMembers.communityId, f.communityId),
            eq(communityMembers.userId, f.organizer),
          ),
        );
      const lapsed = await rejection(
        sendLookupInvite(db, {
          groupId: f.groupId,
          userId: f.organizer,
          userIds: [f.outsider],
        }),
      );
      expect(lapsed.code).toBe("FORBIDDEN");
      expect(
        (await groupById(db, { groupId: f.groupId, userId: f.organizer }))
          .canManageLookupInvites,
      ).toBe(false);
    } finally {
      await close();
    }
  });
});
