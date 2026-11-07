import { and, eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import {
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
import { loadGameCreateVenueContext } from "#src/games/helpers/load-game-create-venue-context";
import { createGame } from "#src/routers/games/create";
import { groupById } from "#src/routers/groups/byId";
import { acceptLinkRequest } from "#src/routers/groups/acceptLinkRequest";
import { unlinkFromVenue } from "#src/routers/groups/unlinkFromVenue";
import { listLinkedGroups } from "#src/routers/venues/listLinkedGroups";
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

async function readGroup(database: TestDatabase, groupId: string) {
  const row = await database.query.groups.findFirst({
    where: eq(groups.id, groupId),
  });
  if (!row) {
    throw new Error("Group missing");
  }
  return row;
}

describe("unlinking a Club Group from its Venue", () => {
  it("lets the Venue manager unlink and keeps memberships, Games and pending requests", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const s = await setup(db);
      await linkGroup(db, s);
      expect((await readGroup(db, s.group.id)).venueId).toBe(s.venue.id);

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
      expect(result).toEqual({
        ok: true,
        groupId: s.group.id,
        venueId: s.venue.id,
      });

      const after = await readGroup(db, s.group.id);
      expect(after).toMatchObject({
        venueId: null,
        type: "public",
        createdBy: s.creator.id,
      });
      expect(groupIsVerified(after)).toBe(false);
      expect(await loadGameCreateVenueContext(db, s.group.id)).toEqual({
        locked: false,
        groupKind: "loose",
        linkedVenueId: null,
      });

      const members = await db.query.groupMembers.findMany({
        where: eq(groupMembers.groupId, s.group.id),
      });
      expect(members).toHaveLength(2);

      const gameAfter = await db.query.games.findFirst({
        where: eq(games.id, created.id),
      });
      expect(gameAfter).toMatchObject({
        rated: gameBefore?.rated,
        isPublic: gameBefore?.isPublic,
        venueId: s.venue.id,
        cancelledAt: null,
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

      const listed = await listLinkedGroups(db, {
        venueId: s.venue.id,
        actor: actor(s.manager.id),
      });
      expect(listed.groups).toEqual([]);
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

      const result = await unlinkFromVenue(db, {
        groupId: s.group.id,
        userId: s.creator.id,
      });
      expect(result).toEqual({
        ok: true,
        groupId: s.group.id,
        venueId: s.venue.id,
      });

      const after = await readGroup(db, s.group.id);
      expect(after.venueId).toBeNull();
      expect(groupIsVerified(after)).toBe(true);
    } finally {
      await close();
    }
  });

  it("is refused for callers on neither side", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const s = await setup(db);
      await linkGroup(db, s);
      await db
        .update(groupMembers)
        .set({ role: "organizer" })
        .where(
          and(
            eq(groupMembers.groupId, s.group.id),
            eq(groupMembers.userId, s.member.id),
          ),
        );

      await expect(
        unlinkFromVenue(db, { groupId: s.group.id, userId: s.member.id }),
      ).rejects.toMatchObject({
        code: "FORBIDDEN",
        message: "Only the Group creator can unlink the Group from its Venue",
      });
      await expect(
        unlinkFromVenue(db, { groupId: s.group.id, userId: s.manager.id }),
      ).rejects.toMatchObject({ code: "FORBIDDEN" });
      await expect(
        unlinkGroup(db, {
          venueId: s.venue.id,
          groupId: s.group.id,
          actor: actor(s.creator.id),
        }),
      ).rejects.toMatchObject({ code: "FORBIDDEN" });

      expect((await readGroup(db, s.group.id)).venueId).toBe(s.venue.id);
    } finally {
      await close();
    }
  });

  it("lets every Club Group be unlinked, however it was linked", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const s = await setup(db);
      const [direct] = await db
        .insert(groups)
        .values({
          name: "Direct Club",
          createdBy: s.creator.id,
          type: "public",
          sport: "padel",
          venueId: s.venue.id,
        })
        .returning();
      await db
        .insert(groupMembers)
        .values({ groupId: direct!.id, userId: s.creator.id });

      const byId = await groupById(db, {
        groupId: direct!.id,
        userId: s.creator.id,
      });
      expect(byId.canUnlinkFromVenue).toBe(true);
      const listed = await listLinkedGroups(db, {
        venueId: s.venue.id,
        actor: actor(s.manager.id),
      });
      expect(listed.groups.map((row) => row.canUnlink)).toEqual([true]);

      await unlinkFromVenue(db, { groupId: direct!.id, userId: s.creator.id });
      expect((await readGroup(db, direct!.id)).venueId).toBeNull();
    } finally {
      await close();
    }
  });

  it("is still allowed while the Venue is Soft-archived", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const s = await setup(db);
      await linkGroup(db, s);
      await db
        .update(venues)
        .set({ archivedAt: new Date() })
        .where(eq(venues.id, s.venue.id));

      const listed = await listLinkedGroups(db, {
        venueId: s.venue.id,
        actor: actor(s.manager.id),
      });
      expect(listed.venue).toEqual({ id: s.venue.id, archived: true });
      expect(listed.groups.map((row) => row.canUnlink)).toEqual([true]);

      await unlinkGroup(db, {
        venueId: s.venue.id,
        groupId: s.group.id,
        actor: actor(s.manager.id),
      });
      expect((await readGroup(db, s.group.id)).venueId).toBeNull();
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
      ).rejects.toMatchObject({
        code: "BAD_REQUEST",
        message: "This Group is not linked to the Venue",
      });
      await expect(
        unlinkGroup(db, {
          venueId: s.venue.id,
          groupId: s.group.id,
          actor: actor(s.manager.id),
        }),
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
      ).rejects.toMatchObject({
        code: "BAD_REQUEST",
        message: "This Group is not linked to the Venue",
      });
      expect((await readGroup(db, s.group.id)).venueId).toBe(s.venue.id);
    } finally {
      await close();
    }
  });

  it("is refused for an unknown or deleted Group", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const s = await setup(db);
      await linkGroup(db, s);
      await expect(
        unlinkFromVenue(db, {
          groupId: crypto.randomUUID(),
          userId: s.creator.id,
        }),
      ).rejects.toMatchObject({ code: "NOT_FOUND" });
      await expect(
        unlinkGroup(db, {
          venueId: s.venue.id,
          groupId: crypto.randomUUID(),
          actor: actor(s.manager.id),
        }),
      ).rejects.toMatchObject({ code: "NOT_FOUND" });

      await db
        .update(groups)
        .set({ deletedAt: new Date(), deletedBy: s.creator.id })
        .where(eq(groups.id, s.group.id));
      await expect(
        unlinkFromVenue(db, { groupId: s.group.id, userId: s.creator.id }),
      ).rejects.toMatchObject({ code: "NOT_FOUND" });
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
      expect(asCreator.isLoose).toBe(false);
      expect(asCreator.venue).toEqual({ id: s.venue.id, name: "Smash Club" });
      expect(asMember.canUnlinkFromVenue).toBe(false);

      const listed = await listLinkedGroups(db, {
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
      expect(loose.venue).toBeNull();
      expect(loose.verified).toBe(false);
    } finally {
      await close();
    }
  });
});
