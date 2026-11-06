import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import {
  groupInviteLinks,
  groupMembers,
  GroupMemberRoleEnum,
  groups,
  notifications,
  user,
  venues,
} from "@repo/db/schema";

import { acceptInviteLink } from "#src/routers/groups/acceptInviteLink";
import { acceptLookupInvite } from "#src/routers/groups/acceptLookupInvite";
import { approveJoinRequest } from "#src/routers/groups/approveJoinRequest";
import { createInviteLink } from "#src/routers/groups/createInviteLink";
import { createLoosePrivate } from "#src/routers/groups/createLoosePrivate";
import { createLoosePublic } from "#src/routers/groups/createLoosePublic";
import { joinPublic } from "#src/routers/groups/joinPublic";
import { requestJoin } from "#src/routers/groups/requestJoin";
import { sendLookupInvite } from "#src/routers/groups/sendLookupInvite";
import { setOrganizer } from "#src/routers/groups/setOrganizer";
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
  const creator = await insertUser(database, "club-creator@example.com");
  const organizer = await insertUser(database, "club-organizer@example.com");
  const coOrganizer = await insertUser(
    database,
    "club-co-organizer@example.com",
  );
  const member = await insertUser(database, "club-member@example.com");
  const joiner = await insertUser(database, "club-joiner@example.com");
  const [venue] = await database
    .insert(venues)
    .values({ name: "Notify Club", city: "Manama", country: "BH" })
    .returning({ id: venues.id });
  if (!venue) {
    throw new Error("Failed to insert venue");
  }
  return { venueId: venue.id, creator, organizer, coOrganizer, member, joiner };
}

/** A Club Group: created by `creator`, with two Appointed Organizers and one member. */
async function insertClubGroup(
  database: TestDatabase,
  club: Awaited<ReturnType<typeof insertClub>>,
  requiresApproval = false,
) {
  const group = await createLoosePublic(database, {
    name: "Club Squad",
    sport: "padel",
    userId: club.creator,
    requiresApproval,
  });
  await database
    .update(groups)
    .set({ venueId: club.venueId })
    .where(eq(groups.id, group.id));
  await database.insert(groupMembers).values([
    {
      groupId: group.id,
      userId: club.organizer,
      role: GroupMemberRoleEnum.ORGANIZER,
    },
    {
      groupId: group.id,
      userId: club.coOrganizer,
      role: GroupMemberRoleEnum.ORGANIZER,
    },
    { groupId: group.id, userId: club.member },
  ]);
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

      await joinPublic(db, { groupId: group.id, userId: joiner });

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

      await joinPublic(db, { groupId: group.id, userId: club.joiner });

      const rows = await joinedRows(db);
      expect(sortedRecipients(rows)).toEqual(
        [club.creator, club.organizer, club.coOrganizer].sort(),
      );
      expect(rows.every((row) => row.actor === club.joiner)).toBe(true);
      expect(rows.every((row) => row.audience === "admin")).toBe(true);
    } finally {
      await close();
    }
  });

  it("skips an Organizer whose appointment was removed", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const club = await insertClub(db);
      const group = await insertClubGroup(db, club);
      await setOrganizer(db, {
        groupId: group.id,
        approverUserId: club.creator,
        userId: club.coOrganizer,
        organizer: false,
      });

      await joinPublic(db, { groupId: group.id, userId: club.joiner });

      expect(sortedRecipients(await joinedRows(db))).toEqual(
        [club.creator, club.organizer].sort(),
      );
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
        userId: club.organizer,
      });

      expect(sortedRecipients(await joinedRows(db))).toEqual(
        [club.creator, club.coOrganizer].sort(),
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
