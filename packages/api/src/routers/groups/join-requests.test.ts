import { TRPCError } from "@trpc/server";
import { and, eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import {
  groupInviteLinks,
  groupJoinRequests,
  GroupJoinRequestStatusEnum,
  groupMembers,
  GroupMemberRoleEnum,
  groups,
  GroupTypeEnum,
  user,
  venueManagers,
  venues,
} from "@repo/db/schema";

import { acceptInviteLink } from "#src/routers/groups/acceptInviteLink";
import { acceptLookupInvite } from "#src/routers/groups/acceptLookupInvite";
import { approveJoinRequest } from "#src/routers/groups/approveJoinRequest";
import { groupById } from "#src/routers/groups/byId";
import { createInviteLink } from "#src/routers/groups/createInviteLink";
import { createLoosePrivate } from "#src/routers/groups/createLoosePrivate";
import { createLoosePublic } from "#src/routers/groups/createLoosePublic";
import { joinPublic } from "#src/routers/groups/joinPublic";
import { leaveGroup } from "#src/routers/groups/leave";
import { listJoinRequests } from "#src/routers/groups/listJoinRequests";
import { rejectJoinRequest } from "#src/routers/groups/rejectJoinRequest";
import { requestJoin } from "#src/routers/groups/requestJoin";
import { sendLookupInvite } from "#src/routers/groups/sendLookupInvite";
import { setRequiresApproval } from "#src/routers/groups/setRequiresApproval";
import { createPgliteDb, type TestDatabase } from "@repo/db/testing";

async function insertUser(database: TestDatabase, email: string) {
  const [row] = await database
    .insert(user)
    .values({ name: email.split("@")[0] ?? "User", email })
    .returning({ id: user.id, name: user.name });
  if (!row) {
    throw new Error("Failed to insert user");
  }
  return row;
}

async function insertVenue(database: TestDatabase, name: string) {
  const [row] = await database
    .insert(venues)
    .values({ name, city: "Manama", country: "BH" })
    .returning({ id: venues.id, name: venues.name });
  if (!row) {
    throw new Error("Failed to insert venue");
  }
  return row;
}

/** A Public Club Group: a Loose Group linked to a Venue. */
async function createClubPublic(
  database: TestDatabase,
  args: {
    venueId: string;
    name: string;
    userId: string;
    requiresApproval?: boolean;
  },
) {
  const group = await createLoosePublic(database, {
    name: args.name,
    sport: "padel",
    userId: args.userId,
    requiresApproval: args.requiresApproval,
  });
  await database
    .update(groups)
    .set({ venueId: args.venueId })
    .where(eq(groups.id, group.id));
  return group;
}

async function memberCount(database: TestDatabase, groupId: string) {
  return database.query.groupMembers.findMany({
    where: eq(groupMembers.groupId, groupId),
    columns: { userId: true },
  });
}

function expectTrpc(error: unknown, code: TRPCError["code"], message?: string) {
  expect(error).toBeInstanceOf(TRPCError);
  if (!(error instanceof TRPCError)) {
    return;
  }
  expect(error.code).toBe(code);
  if (message) {
    expect(error.message).toBe(message);
  }
}

describe("group join requests", () => {
  it("defaults requires_approval to false on existing Groups", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const creator = await insertUser(db, "default-flag@example.com");
      const [group] = await db
        .insert(groups)
        .values({
          name: "Legacy Crew",
          createdBy: creator.id,
          type: GroupTypeEnum.PUBLIC,
        })
        .returning({
          id: groups.id,
          requiresApproval: groups.requiresApproval,
        });
      expect(group?.requiresApproval).toBe(false);
    } finally {
      await close();
    }
  });

  it("admits via joinPublic when Require approval is off", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const creator = await insertUser(db, "join-off-creator@example.com");
      const joiner = await insertUser(db, "join-off-joiner@example.com");
      const group = await createLoosePublic(db, {
        name: "Open Crew",
        sport: "padel",
        userId: creator.id,
      });

      await joinPublic(db, { groupId: group.id, userId: joiner.id });

      const members = await memberCount(db, group.id);
      expect(members.map((row) => row.userId).sort()).toEqual(
        [creator.id, joiner.id].sort(),
      );
      await expect(
        joinPublic(db, { groupId: group.id, userId: joiner.id }),
      ).rejects.toSatisfy((error) => {
        expectTrpc(error, "CONFLICT", "You are already a member of this Group");
        return true;
      });
    } finally {
      await close();
    }
  });

  it("refuses joinPublic on a Private Group", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const creator = await insertUser(db, "join-private-creator@example.com");
      const joiner = await insertUser(db, "join-private-joiner@example.com");
      const group = await createLoosePrivate(db, {
        name: "Private Crew",
        sport: "padel",
        userId: creator.id,
      });

      await expect(
        joinPublic(db, { groupId: group.id, userId: joiner.id }),
      ).rejects.toSatisfy((error) => {
        expectTrpc(
          error,
          "BAD_REQUEST",
          "Private Groups cannot be joined via the Group URL",
        );
        return true;
      });
      expect(
        (await memberCount(db, group.id)).map((row) => row.userId),
      ).toEqual([creator.id]);
    } finally {
      await close();
    }
  });

  it("refuses joinPublic when the flag is on, then the creator can approve", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const creator = await insertUser(db, "join-on-creator@example.com");
      const joiner = await insertUser(db, "join-on-joiner@example.com");
      const stranger = await insertUser(db, "join-on-stranger@example.com");
      const group = await createLoosePublic(db, {
        name: "Gated Crew",
        sport: "padel",
        userId: creator.id,
        requiresApproval: true,
      });

      const stored = await db.query.groups.findFirst({
        where: eq(groups.id, group.id),
        columns: { requiresApproval: true },
      });
      expect(stored?.requiresApproval).toBe(true);

      await expect(
        joinPublic(db, { groupId: group.id, userId: joiner.id }),
      ).rejects.toSatisfy((error) => {
        expectTrpc(
          error,
          "BAD_REQUEST",
          "This Group requires approval. Request to join instead.",
        );
        return true;
      });

      const requested = await requestJoin(db, {
        groupId: group.id,
        userId: joiner.id,
      });
      expect(requested.status).toBe("pending");

      const again = await requestJoin(db, {
        groupId: group.id,
        userId: joiner.id,
      });
      expect(again.id).toBe(requested.id);

      const viewer = await groupById(db, {
        groupId: group.id,
        userId: joiner.id,
      });
      expect(viewer.joinMode).toBe("requested");
      expect(viewer.canJoin).toBe(false);

      const pending = await listJoinRequests(db, {
        groupId: group.id,
        userId: creator.id,
      });
      expect(pending).toHaveLength(1);
      expect(pending[0]?.user.name).toBe(joiner.name);
      expect(pending[0]?.id).toBe(requested.id);

      await expect(
        listJoinRequests(db, { groupId: group.id, userId: stranger.id }),
      ).rejects.toSatisfy((error) => {
        expectTrpc(error, "FORBIDDEN");
        return true;
      });
      await expect(
        approveJoinRequest(db, {
          requestId: requested.id,
          userId: stranger.id,
        }),
      ).rejects.toSatisfy((error) => {
        expectTrpc(error, "FORBIDDEN");
        return true;
      });
      await expect(
        rejectJoinRequest(db, {
          requestId: requested.id,
          userId: stranger.id,
        }),
      ).rejects.toSatisfy((error) => {
        expectTrpc(error, "FORBIDDEN");
        return true;
      });

      await approveJoinRequest(db, {
        requestId: requested.id,
        userId: creator.id,
      });

      const members = await memberCount(db, group.id);
      expect(members.map((row) => row.userId).sort()).toEqual(
        [creator.id, joiner.id].sort(),
      );

      const row = await db.query.groupJoinRequests.findFirst({
        where: eq(groupJoinRequests.id, requested.id),
      });
      expect(row?.status).toBe(GroupJoinRequestStatusEnum.APPROVED);
      expect(row?.decidedBy).toBe(creator.id);

      const after = await listJoinRequests(db, {
        groupId: group.id,
        userId: creator.id,
      });
      expect(after).toEqual([]);
    } finally {
      await close();
    }
  });

  it("lets a rejected or departed User request again", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const creator = await insertUser(db, "rerequest-creator@example.com");
      const joiner = await insertUser(db, "rerequest-joiner@example.com");
      const group = await createLoosePublic(db, {
        name: "Rejoin Crew",
        sport: "padel",
        userId: creator.id,
        requiresApproval: true,
      });

      const first = await requestJoin(db, {
        groupId: group.id,
        userId: joiner.id,
      });
      await rejectJoinRequest(db, {
        requestId: first.id,
        userId: creator.id,
      });

      const membersAfterReject = await memberCount(db, group.id);
      expect(membersAfterReject.map((row) => row.userId)).toEqual([creator.id]);

      const second = await requestJoin(db, {
        groupId: group.id,
        userId: joiner.id,
      });
      expect(second.id).toBe(first.id);
      expect(second.status).toBe("pending");

      await approveJoinRequest(db, {
        requestId: second.id,
        userId: creator.id,
      });
      await leaveGroup(db, { groupId: group.id, userId: joiner.id });

      const third = await requestJoin(db, {
        groupId: group.id,
        userId: joiner.id,
      });
      expect(third.id).toBe(first.id);
      expect(third.status).toBe("pending");
    } finally {
      await close();
    }
  });

  it("refuses requestJoin when the join mode is join, member, or none", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const creator = await insertUser(db, "mode-creator@example.com");
      const outsider = await insertUser(db, "mode-outsider@example.com");
      const open = await createLoosePublic(db, {
        name: "Open Mode",
        sport: "padel",
        userId: creator.id,
      });
      const privateGroup = await createLoosePrivate(db, {
        name: "Private Mode",
        sport: "padel",
        userId: creator.id,
      });

      await expect(
        requestJoin(db, { groupId: open.id, userId: outsider.id }),
      ).rejects.toSatisfy((error) => {
        expectTrpc(
          error,
          "BAD_REQUEST",
          "You cannot request to join this Group",
        );
        return true;
      });
      await expect(
        requestJoin(db, { groupId: open.id, userId: creator.id }),
      ).rejects.toSatisfy((error) => {
        expectTrpc(
          error,
          "BAD_REQUEST",
          "You cannot request to join this Group",
        );
        return true;
      });
      await expect(
        requestJoin(db, { groupId: privateGroup.id, userId: outsider.id }),
      ).rejects.toSatisfy((error) => {
        expectTrpc(
          error,
          "BAD_REQUEST",
          "You cannot request to join this Group",
        );
        return true;
      });
    } finally {
      await close();
    }
  });

  it("refuses setRequiresApproval on Private Groups and for non-approvers, and turning it off leaves pending", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const creator = await insertUser(db, "flag-creator@example.com");
      const outsider = await insertUser(db, "flag-outsider@example.com");
      const privateGroup = await createLoosePrivate(db, {
        name: "Private Flag",
        sport: "padel",
        userId: creator.id,
      });
      const publicGroup = await createLoosePublic(db, {
        name: "Public Flag",
        sport: "padel",
        userId: creator.id,
        requiresApproval: true,
      });

      await expect(
        setRequiresApproval(db, {
          groupId: privateGroup.id,
          requiresApproval: true,
          userId: creator.id,
        }),
      ).rejects.toSatisfy((error) => {
        expectTrpc(
          error,
          "BAD_REQUEST",
          "Require approval only applies to Public Groups",
        );
        return true;
      });

      await expect(
        setRequiresApproval(db, {
          groupId: publicGroup.id,
          requiresApproval: false,
          userId: outsider.id,
        }),
      ).rejects.toSatisfy((error) => {
        expectTrpc(error, "FORBIDDEN");
        return true;
      });

      const pending = await requestJoin(db, {
        groupId: publicGroup.id,
        userId: outsider.id,
      });
      await setRequiresApproval(db, {
        groupId: publicGroup.id,
        requiresApproval: false,
        userId: creator.id,
      });

      const stored = await db.query.groups.findFirst({
        where: eq(groups.id, publicGroup.id),
        columns: { requiresApproval: true },
      });
      expect(stored?.requiresApproval).toBe(false);

      const stillPending = await db.query.groupJoinRequests.findFirst({
        where: eq(groupJoinRequests.id, pending.id),
      });
      expect(stillPending?.status).toBe(GroupJoinRequestStatusEnum.PENDING);

      const listed = await listJoinRequests(db, {
        groupId: publicGroup.id,
        userId: creator.id,
      });
      expect(listed.map((row) => row.id)).toEqual([pending.id]);
    } finally {
      await close();
    }
  });

  it("on a Club Group lets the creator or an Appointed Organizer approve, not the Venue manager, and refuses joinPublic", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const manager = await insertUser(db, "club-manager@example.com");
      const organizer = await insertUser(db, "club-organizer@example.com");
      const creator = await insertUser(db, "club-creator@example.com");
      const member = await insertUser(db, "club-member@example.com");
      const venue = await insertVenue(db, "Live Club");
      await db
        .insert(venueManagers)
        .values({ venueId: venue.id, userId: manager.id });

      const group = await createClubPublic(db, {
        venueId: venue.id,
        name: "Club Squad",
        userId: creator.id,
        requiresApproval: true,
      });
      await db.insert(groupMembers).values({
        groupId: group.id,
        userId: organizer.id,
        role: GroupMemberRoleEnum.ORGANIZER,
      });

      await expect(
        joinPublic(db, { groupId: group.id, userId: member.id }),
      ).rejects.toSatisfy((error) => {
        expectTrpc(
          error,
          "BAD_REQUEST",
          "This Group requires approval. Request to join instead.",
        );
        return true;
      });

      const managerRequest = await requestJoin(db, {
        groupId: group.id,
        userId: member.id,
      });
      await expect(
        listJoinRequests(db, { groupId: group.id, userId: manager.id }),
      ).rejects.toSatisfy((error) => {
        expectTrpc(error, "FORBIDDEN");
        return true;
      });
      await expect(
        approveJoinRequest(db, {
          requestId: managerRequest.id,
          userId: manager.id,
        }),
      ).rejects.toSatisfy((error) => {
        expectTrpc(error, "FORBIDDEN");
        return true;
      });

      await approveJoinRequest(db, {
        requestId: managerRequest.id,
        userId: organizer.id,
      });
      await leaveGroup(db, { groupId: group.id, userId: member.id });

      const creatorRequest = await requestJoin(db, {
        groupId: group.id,
        userId: member.id,
      });
      await approveJoinRequest(db, {
        requestId: creatorRequest.id,
        userId: creator.id,
      });

      const members = await memberCount(db, group.id);
      expect(members.map((row) => row.userId)).toContain(member.id);
    } finally {
      await close();
    }
  });

  it("keeps request, approve, reject, and setRequiresApproval open while the Venue is Soft-archived", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const creator = await insertUser(db, "archive-creator@example.com");
      const member = await insertUser(db, "archive-member@example.com");
      const later = await insertUser(db, "archive-later@example.com");
      const venue = await insertVenue(db, "Archived Club");
      const group = await createClubPublic(db, {
        venueId: venue.id,
        name: "Still Open Squad",
        userId: creator.id,
        requiresApproval: true,
      });
      const pending = await requestJoin(db, {
        groupId: group.id,
        userId: member.id,
      });

      await db
        .update(venues)
        .set({ archivedAt: new Date() })
        .where(eq(venues.id, venue.id));

      const second = await requestJoin(db, {
        groupId: group.id,
        userId: later.id,
      });
      expect(second.status).toBe("pending");
      await expect(
        approveJoinRequest(db, { requestId: pending.id, userId: creator.id }),
      ).resolves.toEqual({ ok: true, heldSeat: null });
      await expect(
        rejectJoinRequest(db, { requestId: second.id, userId: creator.id }),
      ).resolves.toEqual({ ok: true });
      await expect(
        setRequiresApproval(db, {
          groupId: group.id,
          requiresApproval: false,
          userId: creator.id,
        }),
      ).resolves.toEqual({ id: group.id, requiresApproval: false });
      expect(
        (await memberCount(db, group.id)).map((row) => row.userId),
      ).toEqual(expect.arrayContaining([creator.id, member.id]));
    } finally {
      await close();
    }
  });

  it("marks a pending Group join request approved after Lookup invite, and keeps it pending after Invite link accept", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const creator = await insertUser(db, "invite-creator@example.com");
      const lookupUser = await insertUser(db, "invite-lookup@example.com");
      const linkUser = await insertUser(db, "invite-link@example.com");
      const lookupGroup = await createLoosePublic(db, {
        name: "Lookup Crew",
        sport: "padel",
        userId: creator.id,
        requiresApproval: true,
      });
      const linkGroup = await createLoosePublic(db, {
        name: "Link Crew",
        sport: "padel",
        userId: creator.id,
        requiresApproval: true,
      });

      const lookupRequest = await requestJoin(db, {
        groupId: lookupGroup.id,
        userId: lookupUser.id,
      });
      const sent = await sendLookupInvite(db, {
        groupId: lookupGroup.id,
        userId: creator.id,
        userIds: [lookupUser.id],
      });
      const inviteId = sent.sent[0]?.id;
      if (!inviteId) {
        throw new Error("Failed to send Lookup invite");
      }
      await acceptLookupInvite(db, {
        inviteId,
        userId: lookupUser.id,
      });
      const lookupRow = await db.query.groupJoinRequests.findFirst({
        where: eq(groupJoinRequests.id, lookupRequest.id),
      });
      expect(lookupRow?.status).toBe(GroupJoinRequestStatusEnum.APPROVED);
      expect(
        await db.query.groupMembers.findFirst({
          where: and(
            eq(groupMembers.groupId, lookupGroup.id),
            eq(groupMembers.userId, lookupUser.id),
          ),
        }),
      ).toBeTruthy();

      const linkRequest = await requestJoin(db, {
        groupId: linkGroup.id,
        userId: linkUser.id,
      });
      await createInviteLink(db, {
        groupId: linkGroup.id,
        userId: creator.id,
        origin: "http://localhost:3000",
      });
      const link = await db.query.groupInviteLinks.findFirst({
        where: eq(groupInviteLinks.groupId, linkGroup.id),
      });
      if (!link) {
        throw new Error("Failed to mint Invite link");
      }
      const accepted = await acceptInviteLink(db, {
        token: link.token,
        userId: linkUser.id,
      });
      expect(accepted.requested).toBe(true);
      const linkRow = await db.query.groupJoinRequests.findFirst({
        where: eq(groupJoinRequests.id, linkRequest.id),
      });
      expect(linkRow?.status).toBe(GroupJoinRequestStatusEnum.PENDING);
      expect(
        await db.query.groupMembers.findFirst({
          where: and(
            eq(groupMembers.groupId, linkGroup.id),
            eq(groupMembers.userId, linkUser.id),
          ),
        }),
      ).toBeUndefined();
    } finally {
      await close();
    }
  });
});
