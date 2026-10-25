import { and, eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import {
  communities,
  communityMembers,
  games,
  groupJoinRequests,
  groupMemberInvites,
  groupMembers,
  groups,
  user,
  venueManagers,
  venues,
} from "@repo/db/schema";
import { createPgliteDb, type TestDatabase } from "@repo/db/testing";

import { groupIsVerified } from "#src/groups/group-is-verified";
import { createGame } from "#src/routers/games/create";
import { groupById } from "#src/routers/groups/byId";
import { acceptLinkRequest } from "#src/routers/groups/acceptLinkRequest";
import { unlinkFromVenue } from "#src/routers/groups/unlinkFromVenue";
import { listCommunityGroups } from "#src/routers/venues/listCommunityGroups";
import { sendGroupLinkRequest } from "#src/routers/venues/sendGroupLinkRequest";
import { unlinkGroup } from "#src/routers/venues/unlinkGroup";

async function insertUser(database: TestDatabase, name: string) {
  const [row] = await database
    .insert(user)
    .values({ name, email: `${name.toLowerCase()}@example.com` })
    .returning({ id: user.id });
  if (!row) {
    throw new Error("Failed to insert user");
  }
  return row;
}

function actor(userId: string) {
  return { userId, publicMetadata: undefined };
}

async function setup(database: TestDatabase) {
  const [venue] = await database
    .insert(venues)
    .values({ name: "Smash Club", city: "Manama", country: "BH" })
    .returning({ id: venues.id });
  if (!venue) {
    throw new Error("Failed to insert venue");
  }
  const manager = await insertUser(database, "Manager");
  await database
    .insert(venueManagers)
    .values({ venueId: venue.id, userId: manager.id });
  const creator = await insertUser(database, "Creator");
  const member = await insertUser(database, "Member");
  const [group] = await database
    .insert(groups)
    .values({
      name: "Tuesday Crew",
      createdBy: creator.id,
      type: "public",
      sport: "padel",
    })
    .returning();
  if (!group) {
    throw new Error("Failed to insert group");
  }
  await database.insert(groupMembers).values([
    { groupId: group.id, userId: creator.id },
    { groupId: group.id, userId: member.id },
  ]);
  return { venue, manager, creator, member, group };
}

async function linkGroup(
  database: TestDatabase,
  s: Awaited<ReturnType<typeof setup>>,
) {
  const request = await sendGroupLinkRequest(database, {
    venueId: s.venue.id,
    groupId: s.group.id,
    actor: actor(s.manager.id),
  });
  await acceptLinkRequest(database, {
    requestId: request.id,
    userId: s.creator.id,
  });
}

describe("unlinking a Group from its Venue Community", () => {
  it("lets the Venue manager unlink and keeps memberships, Games and pending requests", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const s = await setup(db);
      await linkGroup(db, s);
      const linked = await db.query.groups.findFirst({
        where: eq(groups.id, s.group.id),
      });
      const communityId = linked?.communityId;
      expect(communityId).toBeTruthy();

      const created = await createGame(db, {
        createdBy: s.creator.id,
        groupId: s.group.id,
        venueId: s.venue.id,
        isPublic: false,
        format: "friendly_game",
        registrationMode: "individual",
        windowStart: new Date("2026-12-20T10:00:00"),
        windowEnd: new Date("2026-12-20T12:00:00"),
      });
      const gameBefore = await db.query.games.findFirst({
        where: eq(games.id, created.id),
      });

      const requester = await insertUser(db, "Requester");
      const [joinRequest] = await db
        .insert(groupJoinRequests)
        .values({ groupId: s.group.id, userId: requester.id })
        .returning();
      const invitee = await insertUser(db, "Invitee");
      await db.insert(groupMemberInvites).values({
        groupId: s.group.id,
        userId: invitee.id,
        invitedBy: s.creator.id,
      });

      const result = await unlinkGroup(db, {
        venueId: s.venue.id,
        groupId: s.group.id,
        actor: actor(s.manager.id),
      });
      expect(result).toMatchObject({ ok: true, groupId: s.group.id });

      const after = await db.query.groups.findFirst({
        where: eq(groups.id, s.group.id),
      });
      expect(after).toMatchObject({
        communityId: null,
        type: "public",
        createdBy: s.creator.id,
      });
      expect(await groupIsVerified(db, after!)).toBe(false);

      const members = await db.query.groupMembers.findMany({
        where: eq(groupMembers.groupId, s.group.id),
      });
      expect(members).toHaveLength(2);
      const communityUsers = await db.query.communityMembers.findMany({
        where: eq(communityMembers.communityId, communityId!),
      });
      expect(communityUsers.map((row) => row.userId)).toEqual(
        expect.arrayContaining([s.creator.id, s.member.id]),
      );
      expect(
        await db.query.communities.findFirst({
          where: eq(communities.id, communityId!),
        }),
      ).toBeTruthy();

      const gameAfter = await db.query.games.findFirst({
        where: eq(games.id, created.id),
      });
      expect(gameAfter).toMatchObject({
        rated: gameBefore?.rated,
        isPublic: gameBefore?.isPublic,
        venueId: s.venue.id,
      });

      const stillPending = await db.query.groupJoinRequests.findFirst({
        where: eq(groupJoinRequests.id, joinRequest!.id),
      });
      expect(stillPending?.status).toBe("pending");
      const invite = await db.query.groupMemberInvites.findFirst({
        where: and(
          eq(groupMemberInvites.groupId, s.group.id),
          eq(groupMemberInvites.userId, invitee.id),
        ),
      });
      expect(invite?.revokedAt).toBeNull();
    } finally {
      await close();
    }
  });

  it("lets the Group creator unlink, and a verified_at Group stays Verified", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const s = await setup(db);
      await linkGroup(db, s);
      await db
        .update(groups)
        .set({ verifiedAt: new Date(), verifiedBy: s.manager.id })
        .where(eq(groups.id, s.group.id));

      await unlinkFromVenue(db, {
        groupId: s.group.id,
        userId: s.creator.id,
      });

      const after = await db.query.groups.findFirst({
        where: eq(groups.id, s.group.id),
      });
      expect(after?.communityId).toBeNull();
      expect(await groupIsVerified(db, after!)).toBe(true);
    } finally {
      await close();
    }
  });

  it("is refused for callers on neither side", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const s = await setup(db);
      await linkGroup(db, s);

      await expect(
        unlinkFromVenue(db, { groupId: s.group.id, userId: s.member.id }),
      ).rejects.toMatchObject({ code: "FORBIDDEN" });
      await expect(
        unlinkGroup(db, {
          venueId: s.venue.id,
          groupId: s.group.id,
          actor: actor(s.creator.id),
        }),
      ).rejects.toMatchObject({ code: "FORBIDDEN" });

      const after = await db.query.groups.findFirst({
        where: eq(groups.id, s.group.id),
      });
      expect(after?.communityId).not.toBeNull();
    } finally {
      await close();
    }
  });

  it("is refused for a Group created directly in the Venue Community", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const s = await setup(db);
      await linkGroup(db, s);
      const linked = await db.query.groups.findFirst({
        where: eq(groups.id, s.group.id),
      });
      const [direct] = await db
        .insert(groups)
        .values({
          name: "Direct Club",
          createdBy: s.creator.id,
          type: "public",
          sport: "padel",
          communityId: linked!.communityId,
        })
        .returning();
      await db
        .insert(groupMembers)
        .values({ groupId: direct!.id, userId: s.creator.id });

      await expect(
        unlinkFromVenue(db, { groupId: direct!.id, userId: s.creator.id }),
      ).rejects.toMatchObject({ code: "BAD_REQUEST" });
      await expect(
        unlinkGroup(db, {
          venueId: s.venue.id,
          groupId: direct!.id,
          actor: actor(s.manager.id),
        }),
      ).rejects.toMatchObject({ code: "BAD_REQUEST" });

      const byId = await groupById(db, {
        groupId: direct!.id,
        userId: s.creator.id,
      });
      expect(byId.canUnlinkFromVenue).toBe(false);
    } finally {
      await close();
    }
  });

  it("is refused while the Venue Community is Soft-archived", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const s = await setup(db);
      await linkGroup(db, s);
      const linked = await db.query.groups.findFirst({
        where: eq(groups.id, s.group.id),
      });
      await db
        .update(communities)
        .set({ archivedAt: new Date() })
        .where(eq(communities.id, linked!.communityId!));

      await expect(
        unlinkFromVenue(db, { groupId: s.group.id, userId: s.creator.id }),
      ).rejects.toMatchObject({ code: "BAD_REQUEST" });
      await expect(
        unlinkGroup(db, {
          venueId: s.venue.id,
          groupId: s.group.id,
          actor: actor(s.manager.id),
        }),
      ).rejects.toMatchObject({ code: "BAD_REQUEST" });

      const listed = await listCommunityGroups(db, {
        venueId: s.venue.id,
        actor: actor(s.manager.id),
      });
      expect(listed.groups.map((row) => row.canUnlink)).toEqual([false]);
      const after = await db.query.groups.findFirst({
        where: eq(groups.id, s.group.id),
      });
      expect(after?.communityId).toBe(linked!.communityId);
    } finally {
      await close();
    }
  });

  it("is refused for a Loose Group and for another Venue's manager", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const s = await setup(db);
      await expect(
        unlinkFromVenue(db, { groupId: s.group.id, userId: s.creator.id }),
      ).rejects.toMatchObject({ code: "BAD_REQUEST" });

      await linkGroup(db, s);
      const [other] = await db
        .insert(venues)
        .values({ name: "Other Club", city: "Manama", country: "BH" })
        .returning({ id: venues.id });
      await db
        .insert(venueManagers)
        .values({ venueId: other!.id, userId: s.member.id });
      await expect(
        unlinkGroup(db, {
          venueId: other!.id,
          groupId: s.group.id,
          actor: actor(s.member.id),
        }),
      ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    } finally {
      await close();
    }
  });

  it("reports canUnlinkFromVenue only to the Group creator and canUnlink to the console", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const s = await setup(db);
      await linkGroup(db, s);

      const asCreator = await groupById(db, {
        groupId: s.group.id,
        userId: s.creator.id,
      });
      const asMember = await groupById(db, {
        groupId: s.group.id,
        userId: s.member.id,
      });
      expect(asCreator.canUnlinkFromVenue).toBe(true);
      expect(asMember.canUnlinkFromVenue).toBe(false);

      const listed = await listCommunityGroups(db, {
        venueId: s.venue.id,
        actor: actor(s.manager.id),
      });
      expect(listed.groups.map((row) => row.canUnlink)).toEqual([true]);

      await unlinkFromVenue(db, { groupId: s.group.id, userId: s.creator.id });
      const loose = await groupById(db, {
        groupId: s.group.id,
        userId: s.creator.id,
      });
      expect(loose.canUnlinkFromVenue).toBe(false);
      expect(loose.isLoose).toBe(true);
    } finally {
      await close();
    }
  });
});
