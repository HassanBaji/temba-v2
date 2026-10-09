import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import {
  communities,
  communityMembers,
  CommunityRoleEnum,
  communitySports,
  groupInviteLinks,
  groupMembers,
  groups,
  GroupSportEnum,
  notifications,
  user,
} from "@repo/db/schema";

import { leave as leaveCommunity } from "#src/community-membership";
import { notifyGroupJoined } from "#src/notifications/notify-group-joined";
import { acceptInviteLink } from "#src/routers/groups/acceptInviteLink";
import { acceptLookupInvite } from "#src/routers/groups/acceptLookupInvite";
import { approveJoinRequest } from "#src/routers/groups/approveJoinRequest";
import { createClubPublic } from "#src/routers/groups/createClubPublic";
import { createInviteLink } from "#src/routers/groups/createInviteLink";
import { createLoosePrivate } from "#src/routers/groups/createLoosePrivate";
import { createLoosePublic } from "#src/routers/groups/createLoosePublic";
import { joinClubPublic } from "#src/routers/groups/joinClubPublic";
import { joinLoosePublic } from "#src/routers/groups/joinLoosePublic";
import { requestJoin } from "#src/routers/groups/requestJoin";
import { sendLookupInvite } from "#src/routers/groups/sendLookupInvite";
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

async function insertClub(database: TestDatabase) {
  const owner = await insertUser(database, "club-owner@example.com");
  const admin = await insertUser(database, "club-admin@example.com");
  const creator = await insertUser(database, "club-creator@example.com");
  const member = await insertUser(database, "club-member@example.com");
  const joiner = await insertUser(database, "club-joiner@example.com");
  const [community] = await database
    .insert(communities)
    .values({ name: "Notify Club", type: "public", createdBy: owner })
    .returning({ id: communities.id });
  if (!community) {
    throw new Error("Failed to insert community");
  }
  await database.insert(communitySports).values({
    communityId: community.id,
    sport: GroupSportEnum.PADEL,
  });
  await database.insert(communityMembers).values(
    [
      { userId: owner, role: CommunityRoleEnum.OWNER },
      { userId: admin, role: CommunityRoleEnum.ADMIN },
      { userId: creator, role: CommunityRoleEnum.MEMBER },
      { userId: member, role: CommunityRoleEnum.MEMBER },
      { userId: joiner, role: CommunityRoleEnum.MEMBER },
    ].map((row) => ({ ...row, communityId: community.id })),
  );
  return { communityId: community.id, owner, admin, creator, member, joiner };
}

async function insertClubGroup(
  database: TestDatabase,
  club: Awaited<ReturnType<typeof insertClub>>,
  requiresApproval = false,
) {
  const group = await createClubPublic(database, {
    communityId: club.communityId,
    name: "Club Squad",
    sport: "padel",
    userId: club.owner,
    requiresApproval,
  });
  await database
    .update(groups)
    .set({ createdBy: club.creator })
    .where(eq(groups.id, group.id));
  return group;
}

async function joinedRows(database: TestDatabase) {
  const rows = await database.query.notifications.findMany({
    where: eq(notifications.type, "group_member_joined"),
  });
  return rows.map((row) => ({
    recipient: row.recipientUserId,
    actor: row.actorUserId,
    group: row.groupId,
    audience: row.audience,
  }));
}

function sortedRecipients(rows: Awaited<ReturnType<typeof joinedRows>>) {
  return rows.map((row) => row.recipient).sort();
}

describe("Group joined Notifications", () => {
  it("tells the Loose Group creator about a Group URL join, and nobody about Group create", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const creator = await insertUser(db, "loose-creator@example.com");
      const joiner = await insertUser(db, "loose-joiner@example.com");
      const group = await createLoosePublic(db, {
        name: "Open Crew",
        sport: "padel",
        userId: creator,
      });
      expect(await joinedRows(db)).toEqual([]);

      await joinLoosePublic(db, { groupId: group.id, userId: joiner });

      expect(await joinedRows(db)).toEqual([
        {
          recipient: creator,
          actor: joiner,
          group: group.id,
          audience: "admin",
        },
      ]);
    } finally {
      await close();
    }
  });

  it("tells every Club Group approver about a Club Group Public join, once each", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const club = await insertClub(db);
      const group = await insertClubGroup(db, club);
      expect(await joinedRows(db)).toEqual([]);

      await joinClubPublic(db, { groupId: group.id, userId: club.joiner });

      const rows = await joinedRows(db);
      expect(sortedRecipients(rows)).toEqual(
        [club.owner, club.admin, club.creator].sort(),
      );
      expect(rows.every((row) => row.actor === club.joiner)).toBe(true);
    } finally {
      await close();
    }
  });

  it("skips a Club Group creator who left the Community", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const club = await insertClub(db);
      const group = await insertClubGroup(db, club);
      const left = await leaveCommunity(db, {
        communityId: club.communityId,
        userId: club.creator,
      });
      expect(left.ok).toBe(true);

      await joinClubPublic(db, { groupId: group.id, userId: club.joiner });

      expect(sortedRecipients(await joinedRows(db))).toEqual(
        [club.owner, club.admin].sort(),
      );
    } finally {
      await close();
    }
  });

  it("writes nothing while the Community is Soft-archived", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const club = await insertClub(db);
      const group = await insertClubGroup(db, club);
      await commit(db, { communityId: club.communityId }, "archived");

      await notifyGroupJoined(db, {
        group: { ...group, createdBy: club.creator },
        joinerUserId: club.joiner,
      });

      expect(await joinedRows(db)).toEqual([]);
    } finally {
      await close();
    }
  });

  it("leaves out the deciding approver on an approved Group join request", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const club = await insertClub(db);
      const group = await insertClubGroup(db, club, true);
      const request = await requestJoin(db, {
        groupId: group.id,
        userId: club.joiner,
      });

      await approveJoinRequest(db, {
        requestId: request.id,
        userId: club.admin,
      });

      expect(sortedRecipients(await joinedRows(db))).toEqual(
        [club.owner, club.creator].sort(),
      );
    } finally {
      await close();
    }
  });

  it("writes nothing when the only approver approves", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const creator = await insertUser(db, "only-creator@example.com");
      const joiner = await insertUser(db, "only-joiner@example.com");
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

      await approveJoinRequest(db, {
        requestId: request.id,
        userId: creator,
      });

      expect(await joinedRows(db)).toEqual([]);
      const members = await db.query.groupMembers.findMany({
        where: eq(groupMembers.groupId, group.id),
      });
      expect(members.map((row) => row.userId)).toContain(joiner);
    } finally {
      await close();
    }
  });

  it("tells the approver about a Group Invite link accept", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const creator = await insertUser(db, "link-creator@example.com");
      const joiner = await insertUser(db, "link-joiner@example.com");
      const group = await createLoosePrivate(db, {
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

      expect(await joinedRows(db)).toEqual([
        {
          recipient: creator,
          actor: joiner,
          group: group.id,
          audience: "admin",
        },
      ]);
    } finally {
      await close();
    }
  });

  it("tells the approver about a Group Lookup invite accept", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const creator = await insertUser(db, "lookup-creator@example.com");
      const joiner = await insertUser(db, "lookup-joiner@example.com");
      const group = await createLoosePrivate(db, {
        name: "Lookup Crew",
        sport: "padel",
        userId: creator,
      });
      const sent = await sendLookupInvite(db, {
        groupId: group.id,
        userId: creator,
        userIds: [joiner],
      });
      const inviteId = sent.sent[0]?.id;
      if (!inviteId) {
        throw new Error("Failed to send Lookup invite");
      }

      await acceptLookupInvite(db, { inviteId, userId: joiner });

      expect(await joinedRows(db)).toEqual([
        {
          recipient: creator,
          actor: joiner,
          group: group.id,
          audience: "admin",
        },
      ]);
    } finally {
      await close();
    }
  });
});
