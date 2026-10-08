import { and, eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import {
  communities,
  communityMembers,
  CommunityRoleEnum,
  communitySports,
  groupInviteLinks,
  groups,
  GroupSportEnum,
  notifications,
  NotificationAudienceEnum,
  NotificationTypeEnum,
  user,
} from "@repo/db/schema";
import { createPgliteDb, type TestDatabase } from "@repo/db/testing";

import { acceptInviteLink } from "#src/routers/groups/acceptInviteLink";
import { acceptLookupInvite } from "#src/routers/groups/acceptLookupInvite";
import { approveJoinRequest } from "#src/routers/groups/approveJoinRequest";
import { createClubPublic } from "#src/routers/groups/createClubPublic";
import { createInviteLink } from "#src/routers/groups/createInviteLink";
import { createLoosePublic } from "#src/routers/groups/createLoosePublic";
import { joinClubPublic } from "#src/routers/groups/joinClubPublic";
import { joinLoosePublic } from "#src/routers/groups/joinLoosePublic";
import { requestJoin } from "#src/routers/groups/requestJoin";
import { sendLookupInvite } from "#src/routers/groups/sendLookupInvite";
import { notifyGroupJoined } from "#src/notifications/notify-group-joined";
import { commit } from "#src/soft-archive";

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

async function insertCommunity(database: TestDatabase, ownerId: string) {
  const [community] = await database
    .insert(communities)
    .values({ name: "Club", type: "public", createdBy: ownerId })
    .returning({ id: communities.id });
  if (!community) {
    throw new Error("Failed to insert community");
  }
  await database.insert(communitySports).values({
    communityId: community.id,
    sport: GroupSportEnum.PADEL,
  });
  await database.insert(communityMembers).values({
    communityId: community.id,
    userId: ownerId,
    role: CommunityRoleEnum.OWNER,
  });
  return community.id;
}

async function addToCommunity(
  database: TestDatabase,
  communityId: string,
  userId: string,
  role: CommunityRoleEnum,
) {
  await database.insert(communityMembers).values({ communityId, userId, role });
}

async function groupJoinedRecipients(database: TestDatabase, groupId: string) {
  const rows = await database.query.notifications.findMany({
    where: and(
      eq(notifications.groupId, groupId),
      eq(notifications.type, NotificationTypeEnum.GROUP_MEMBER_JOINED),
    ),
  });
  return rows;
}

describe("Group joined Notifications", () => {
  it("writes nothing when a Group is created", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const creator = await insertUser(db, "create-creator@example.com");
      const communityOwner = await insertUser(db, "create-owner@example.com");
      const communityId = await insertCommunity(db, communityOwner);

      await createLoosePublic(db, {
        name: "Loose",
        sport: "padel",
        userId: creator,
      });
      await createClubPublic(db, {
        communityId,
        name: "Club Squad",
        sport: "padel",
        userId: communityOwner,
      });

      expect(await db.select().from(notifications)).toHaveLength(0);
    } finally {
      await close();
    }
  });

  it("notifies the creator when someone joins through the Group URL", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const creator = await insertUser(db, "url-creator@example.com");
      const joiner = await insertUser(db, "url-joiner@example.com");
      const group = await createLoosePublic(db, {
        name: "Open Crew",
        sport: "padel",
        userId: creator,
      });

      await joinLoosePublic(db, { groupId: group.id, userId: joiner });

      const rows = await groupJoinedRecipients(db, group.id);
      expect(rows).toHaveLength(1);
      expect(rows[0]).toMatchObject({
        recipientUserId: creator,
        actorUserId: joiner,
        audience: NotificationAudienceEnum.ADMIN,
        gameId: null,
      });
    } finally {
      await close();
    }
  });

  it("notifies each Group approver on a Club Group Public join, never the joiner", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const owner = await insertUser(db, "club-owner@example.com");
      const admin = await insertUser(db, "club-admin@example.com");
      const creator = await insertUser(db, "club-creator@example.com");
      const joiner = await insertUser(db, "club-joiner@example.com");
      const plain = await insertUser(db, "club-plain@example.com");
      const communityId = await insertCommunity(db, owner);
      await addToCommunity(db, communityId, admin, CommunityRoleEnum.ADMIN);
      await addToCommunity(db, communityId, creator, CommunityRoleEnum.MEMBER);
      await addToCommunity(db, communityId, joiner, CommunityRoleEnum.MEMBER);
      await addToCommunity(db, communityId, plain, CommunityRoleEnum.MEMBER);
      const group = await createClubPublic(db, {
        communityId,
        name: "Club Squad",
        sport: "padel",
        userId: owner,
      });
      await db
        .update(groups)
        .set({ createdBy: creator })
        .where(eq(groups.id, group.id));

      await joinClubPublic(db, { groupId: group.id, userId: joiner });

      const rows = await groupJoinedRecipients(db, group.id);
      expect(rows.map((row) => row.recipientUserId).sort()).toEqual(
        [owner, admin, creator].sort(),
      );
    } finally {
      await close();
    }
  });

  it("gives a creator who left the Community no row (E1)", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const owner = await insertUser(db, "e1-owner@example.com");
      const creator = await insertUser(db, "e1-creator@example.com");
      const joiner = await insertUser(db, "e1-joiner@example.com");
      const communityId = await insertCommunity(db, owner);
      await addToCommunity(db, communityId, creator, CommunityRoleEnum.MEMBER);
      await addToCommunity(db, communityId, joiner, CommunityRoleEnum.MEMBER);
      const group = await createClubPublic(db, {
        communityId,
        name: "Club Squad",
        sport: "padel",
        userId: owner,
      });
      await db
        .update(groups)
        .set({ createdBy: creator })
        .where(eq(groups.id, group.id));
      await db
        .delete(communityMembers)
        .where(eq(communityMembers.userId, creator));

      await joinClubPublic(db, { groupId: group.id, userId: joiner });

      const rows = await groupJoinedRecipients(db, group.id);
      expect(rows.map((row) => row.recipientUserId)).toEqual([owner]);
    } finally {
      await close();
    }
  });

  it("writes nothing for a Soft-archived Community (E2)", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const owner = await insertUser(db, "e2-owner@example.com");
      const joiner = await insertUser(db, "e2-joiner@example.com");
      const communityId = await insertCommunity(db, owner);
      const group = await createClubPublic(db, {
        communityId,
        name: "Club Squad",
        sport: "padel",
        userId: owner,
      });
      await commit(db, { communityId }, "archived");
      const row = await db.query.groups.findFirst({
        where: eq(groups.id, group.id),
      });
      if (!row) {
        throw new Error("Group missing");
      }

      await notifyGroupJoined(db, { group: row, joinerUserId: joiner });

      expect(await db.select().from(notifications)).toHaveLength(0);
    } finally {
      await close();
    }
  });

  it("skips the deciding approver on approval", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const owner = await insertUser(db, "appr-owner@example.com");
      const admin = await insertUser(db, "appr-admin@example.com");
      const joiner = await insertUser(db, "appr-joiner@example.com");
      const communityId = await insertCommunity(db, owner);
      await addToCommunity(db, communityId, admin, CommunityRoleEnum.ADMIN);
      await addToCommunity(db, communityId, joiner, CommunityRoleEnum.MEMBER);
      const group = await createClubPublic(db, {
        communityId,
        name: "Gated Squad",
        sport: "padel",
        userId: owner,
        requiresApproval: true,
      });
      const request = await requestJoin(db, {
        groupId: group.id,
        userId: joiner,
      });

      await approveJoinRequest(db, { requestId: request.id, userId: owner });

      const rows = await groupJoinedRecipients(db, group.id);
      expect(rows.map((row) => row.recipientUserId)).toEqual([admin]);
      expect(rows[0]?.actorUserId).toBe(joiner);
    } finally {
      await close();
    }
  });

  it("writes nothing when the only approver approves (E7)", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const creator = await insertUser(db, "e7-creator@example.com");
      const joiner = await insertUser(db, "e7-joiner@example.com");
      const group = await createLoosePublic(db, {
        name: "Gated Crew",
        sport: "padel",
        userId: creator,
        requiresApproval: true,
      });
      const request = await requestJoin(db, {
        groupId: group.id,
        userId: joiner,
      });

      await approveJoinRequest(db, { requestId: request.id, userId: creator });

      expect(await groupJoinedRecipients(db, group.id)).toHaveLength(0);
      const member = await db.query.groupMembers.findFirst({
        where: (members, { and: all, eq: is }) =>
          all(is(members.groupId, group.id), is(members.userId, joiner)),
      });
      expect(member).toBeTruthy();
    } finally {
      await close();
    }
  });

  it("notifies the creator when a Group Invite link is accepted", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const creator = await insertUser(db, "link-creator@example.com");
      const joiner = await insertUser(db, "link-joiner@example.com");
      const group = await createLoosePublic(db, {
        name: "Link Crew",
        sport: "padel",
        userId: creator,
      });
      await createInviteLink(db, {
        groupId: group.id,
        userId: creator,
        origin: "http://localhost:3000",
      });
      const link = await db.query.groupInviteLinks.findFirst({
        where: eq(groupInviteLinks.groupId, group.id),
      });
      if (!link) {
        throw new Error("Failed to mint Invite link");
      }

      await acceptInviteLink(db, { token: link.token, userId: joiner });

      const rows = await groupJoinedRecipients(db, group.id);
      expect(rows.map((row) => row.recipientUserId)).toEqual([creator]);
      expect(rows[0]?.actorUserId).toBe(joiner);
    } finally {
      await close();
    }
  });

  it("notifies the creator when a Group Lookup invite is accepted", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const creator = await insertUser(db, "lookup-creator@example.com");
      const invitee = await insertUser(db, "lookup-invitee@example.com");
      const group = await createLoosePublic(db, {
        name: "Lookup Crew",
        sport: "padel",
        userId: creator,
      });
      const sent = await sendLookupInvite(db, {
        groupId: group.id,
        userId: creator,
        userIds: [invitee],
      });
      const inviteId = sent.sent[0]?.id;
      if (!inviteId) {
        throw new Error("Failed to send Lookup invite");
      }

      await acceptLookupInvite(db, { inviteId, userId: invitee });

      const rows = await groupJoinedRecipients(db, group.id);
      expect(rows.map((row) => row.recipientUserId)).toEqual([creator]);
      expect(rows[0]?.actorUserId).toBe(invitee);
    } finally {
      await close();
    }
  });
});
