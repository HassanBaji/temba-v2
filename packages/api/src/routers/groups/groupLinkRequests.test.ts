import { and, eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import {
  communities,
  communityMembers,
  communitySports,
  games,
  groupLinkRequests,
  groupMemberInvites,
  groupMembers,
  groups,
  user,
  venueManagers,
  venues,
} from "@repo/db/schema";
import { createPgliteDb, type TestDatabase } from "@repo/db/testing";

import { groupIsVerified } from "#src/groups/group-is-verified";
import { groupJoinMode } from "#src/groups/helpers/group-join-mode";
import { createGame } from "#src/routers/games/create";
import { requestVenueLink } from "#src/routers/communities/requestVenueLink";
import { unlinkVenue } from "#src/routers/communities/unlinkVenue";
import { groupById } from "#src/routers/groups/byId";
import { acceptLinkRequest } from "#src/routers/groups/acceptLinkRequest";
import { declineLinkRequest } from "#src/routers/groups/declineLinkRequest";
import { listForOperator } from "#src/routers/groups/listForOperator";
import { pendingLinkRequests } from "#src/routers/groups/pendingLinkRequests";
import { cancelGroupLinkRequest } from "#src/routers/venues/cancelGroupLinkRequest";
import { listCommunityGroups } from "#src/routers/venues/listCommunityGroups";
import { searchLinkableGroups } from "#src/routers/venues/searchLinkableGroups";
import { sendGroupLinkRequest } from "#src/routers/venues/sendGroupLinkRequest";

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

async function insertVenue(
  database: TestDatabase,
  args: { name: string; archivedAt?: Date },
) {
  const [row] = await database
    .insert(venues)
    .values({
      name: args.name,
      city: "Manama",
      country: "BH",
      archivedAt: args.archivedAt,
    })
    .returning({ id: venues.id, name: venues.name });
  if (!row) {
    throw new Error("Failed to insert venue");
  }
  return row;
}

async function insertManager(
  database: TestDatabase,
  args: { venueId: string; userId: string },
) {
  await database.insert(venueManagers).values(args);
}

async function insertGroup(
  database: TestDatabase,
  args: {
    name: string;
    createdBy: string;
    memberIds?: string[];
    type?: "public" | "private";
    sport?: "padel" | "football";
    communityId?: string;
  },
) {
  const [row] = await database
    .insert(groups)
    .values({
      name: args.name,
      createdBy: args.createdBy,
      type: args.type ?? "public",
      sport: args.sport ?? "padel",
      communityId: args.communityId,
    })
    .returning();
  if (!row) {
    throw new Error("Failed to insert group");
  }
  for (const userId of new Set([args.createdBy, ...(args.memberIds ?? [])])) {
    await database.insert(groupMembers).values({ groupId: row.id, userId });
  }
  return row;
}

function actor(userId: string) {
  return { userId, publicMetadata: undefined };
}

async function setup(database: TestDatabase) {
  const venue = await insertVenue(database, { name: "Smash Club" });
  const manager = await insertUser(database, "Manager");
  await insertManager(database, { venueId: venue.id, userId: manager.id });
  const creator = await insertUser(database, "Creator");
  const member = await insertUser(database, "Member");
  const group = await insertGroup(database, {
    name: "Tuesday Crew",
    createdBy: creator.id,
    memberIds: [member.id],
  });
  return { venue, manager, creator, member, group };
}

async function send(
  database: TestDatabase,
  args: { venueId: string; groupId: string; managerId: string },
) {
  return sendGroupLinkRequest(database, {
    venueId: args.venueId,
    groupId: args.groupId,
    actor: actor(args.managerId),
  });
}

async function venueCommunities(database: TestDatabase, venueId: string) {
  return database.query.communities.findMany({
    where: and(
      eq(communities.venueId, venueId),
      eq(communities.isVenueCommunity, true),
    ),
  });
}

describe("sendGroupLinkRequest and cancelGroupLinkRequest", () => {
  it("creates a pending request for a Venue manager", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const { venue, manager, group } = await setup(db);
      const created = await send(db, {
        venueId: venue.id,
        groupId: group.id,
        managerId: manager.id,
      });
      expect(created.status).toBe("pending");
    } finally {
      await close();
    }
  });

  it("is refused for a caller who is not a manager", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const { venue, group } = await setup(db);
      const stranger = await insertUser(db, "Stranger");
      await expect(
        send(db, {
          venueId: venue.id,
          groupId: group.id,
          managerId: stranger.id,
        }),
      ).rejects.toMatchObject({ code: "FORBIDDEN" });
    } finally {
      await close();
    }
  });

  it("is refused for a Club Group target", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const { venue, manager, creator } = await setup(db);
      const [community] = await db
        .insert(communities)
        .values({ name: "Ordinary", createdBy: creator.id })
        .returning();
      const club = await insertGroup(db, {
        name: "Club side",
        createdBy: creator.id,
        communityId: community?.id,
      });
      await expect(
        send(db, {
          venueId: venue.id,
          groupId: club.id,
          managerId: manager.id,
        }),
      ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    } finally {
      await close();
    }
  });

  it("is refused on a Soft-archived Venue", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const { manager, group } = await setup(db);
      const archived = await insertVenue(db, {
        name: "Closed Club",
        archivedAt: new Date(),
      });
      await insertManager(db, { venueId: archived.id, userId: manager.id });
      await expect(
        send(db, {
          venueId: archived.id,
          groupId: group.id,
          managerId: manager.id,
        }),
      ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    } finally {
      await close();
    }
  });

  it("refuses a duplicate pending request but allows another Venue", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const { venue, manager, group } = await setup(db);
      await send(db, {
        venueId: venue.id,
        groupId: group.id,
        managerId: manager.id,
      });
      await expect(
        send(db, {
          venueId: venue.id,
          groupId: group.id,
          managerId: manager.id,
        }),
      ).rejects.toMatchObject({ code: "CONFLICT" });

      const other = await insertVenue(db, { name: "Other Club" });
      await insertManager(db, { venueId: other.id, userId: manager.id });
      await expect(
        send(db, {
          venueId: other.id,
          groupId: group.id,
          managerId: manager.id,
        }),
      ).resolves.toMatchObject({ status: "pending" });
    } finally {
      await close();
    }
  });

  it("cancels only while pending and only for a manager", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const { venue, manager, group } = await setup(db);
      const stranger = await insertUser(db, "Stranger");
      const request = await send(db, {
        venueId: venue.id,
        groupId: group.id,
        managerId: manager.id,
      });

      await expect(
        cancelGroupLinkRequest(db, {
          requestId: request.id,
          actor: actor(stranger.id),
        }),
      ).rejects.toMatchObject({ code: "FORBIDDEN" });

      await cancelGroupLinkRequest(db, {
        requestId: request.id,
        actor: actor(manager.id),
      });
      const row = await db.query.groupLinkRequests.findFirst({
        where: eq(groupLinkRequests.id, request.id),
      });
      expect(row?.status).toBe("cancelled");

      await expect(
        cancelGroupLinkRequest(db, {
          requestId: request.id,
          actor: actor(manager.id),
        }),
      ).rejects.toMatchObject({ code: "CONFLICT" });

      await expect(
        send(db, {
          venueId: venue.id,
          groupId: group.id,
          managerId: manager.id,
        }),
      ).resolves.toMatchObject({ status: "pending" });
    } finally {
      await close();
    }
  });
});

describe("searchLinkableGroups and listCommunityGroups", () => {
  it("finds live Loose Group Public by name and hides pending ones", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const { venue, manager, creator, group } = await setup(db);
      await insertGroup(db, {
        name: "Tuesday Secret",
        createdBy: creator.id,
        type: "private",
      });
      const [community] = await db
        .insert(communities)
        .values({ name: "Ordinary", createdBy: creator.id })
        .returning();
      await insertGroup(db, {
        name: "Tuesday Club",
        createdBy: creator.id,
        communityId: community?.id,
      });

      const found = await searchLinkableGroups(db, {
        venueId: venue.id,
        query: "tuesday",
        actor: actor(manager.id),
      });
      expect(found.map((row) => row.id)).toEqual([group.id]);

      await send(db, {
        venueId: venue.id,
        groupId: group.id,
        managerId: manager.id,
      });
      await expect(
        searchLinkableGroups(db, {
          venueId: venue.id,
          query: "tuesday",
          actor: actor(manager.id),
        }),
      ).resolves.toEqual([]);
    } finally {
      await close();
    }
  });

  it("lists no Community, then the Venue Community with its Groups and requests", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const { venue, manager, creator, group } = await setup(db);
      const empty = await listCommunityGroups(db, {
        venueId: venue.id,
        actor: actor(manager.id),
      });
      expect(empty.community).toBeNull();
      expect(empty.groups).toEqual([]);

      const second = await insertGroup(db, {
        name: "Friday Crew",
        createdBy: creator.id,
      });
      const request = await send(db, {
        venueId: venue.id,
        groupId: group.id,
        managerId: manager.id,
      });
      const declined = await send(db, {
        venueId: venue.id,
        groupId: second.id,
        managerId: manager.id,
      });
      await declineLinkRequest(db, {
        requestId: declined.id,
        userId: creator.id,
      });
      await acceptLinkRequest(db, {
        requestId: request.id,
        userId: creator.id,
      });

      const listed = await listCommunityGroups(db, {
        venueId: venue.id,
        actor: actor(manager.id),
      });
      expect(listed.community?.name).toBe("Smash Club");
      expect(listed.groups.map((row) => row.id)).toEqual([group.id]);
      expect(listed.groups[0]?.memberCount).toBe(2);
      expect(listed.pendingRequests).toEqual([]);
      expect(listed.declinedRequests.map((row) => row.id)).toEqual([
        declined.id,
      ]);
    } finally {
      await close();
    }
  });
});

describe("acceptLinkRequest", () => {
  it("creates one Private Venue Community owned by the requester and admits every member", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const { venue, manager, creator, member, group } = await setup(db);
      const invitee = await insertUser(db, "Invitee");
      const insider = await insertUser(db, "Insider");
      await db.insert(groupMemberInvites).values([
        { groupId: group.id, userId: invitee.id, invitedBy: creator.id },
        { groupId: group.id, userId: insider.id, invitedBy: creator.id },
      ]);
      const other = await insertVenue(db, { name: "Other Club" });
      await insertManager(db, { venueId: other.id, userId: manager.id });
      const request = await send(db, {
        venueId: venue.id,
        groupId: group.id,
        managerId: manager.id,
      });
      const otherRequest = await send(db, {
        venueId: other.id,
        groupId: group.id,
        managerId: manager.id,
      });

      const result = await acceptLinkRequest(db, {
        requestId: request.id,
        userId: creator.id,
      });

      const found = await venueCommunities(db, venue.id);
      expect(found).toHaveLength(1);
      const community = found[0];
      expect(community).toMatchObject({
        id: result.communityId,
        name: "Smash Club",
        type: "private",
        createdBy: manager.id,
        venueId: venue.id,
      });
      const sports = await db.query.communitySports.findMany({
        where: eq(communitySports.communityId, result.communityId),
      });
      expect(sports.map((row) => row.sport)).toEqual(["padel"]);

      const roles = new Map(
        (
          await db.query.communityMembers.findMany({
            where: eq(communityMembers.communityId, result.communityId),
          })
        ).map((row) => [row.userId, row.role]),
      );
      expect(roles.get(manager.id)).toBe("owner");
      expect(roles.get(creator.id)).toBe("member");
      expect(roles.get(member.id)).toBe("member");
      expect(roles.has(invitee.id)).toBe(false);

      const updated = await db.query.groups.findFirst({
        where: eq(groups.id, group.id),
      });
      expect(updated?.communityId).toBe(result.communityId);
      expect(updated?.type).toBe("public");

      const invites = await db.query.groupMemberInvites.findMany({
        where: eq(groupMemberInvites.groupId, group.id),
      });
      expect(invites.every((row) => row.revokedAt !== null)).toBe(true);

      const approved = await db.query.groupLinkRequests.findFirst({
        where: eq(groupLinkRequests.id, request.id),
      });
      expect(approved).toMatchObject({
        status: "approved",
        decidedBy: creator.id,
      });
      const cancelled = await db.query.groupLinkRequests.findFirst({
        where: eq(groupLinkRequests.id, otherRequest.id),
      });
      expect(cancelled?.status).toBe("cancelled");
    } finally {
      await close();
    }
  });

  it("keeps Lookup invites to users who are already Community Members", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const { venue, manager, creator, group } = await setup(db);
      const first = await insertGroup(db, {
        name: "First",
        createdBy: creator.id,
      });
      const insider = await insertUser(db, "Insider");
      const firstRequest = await send(db, {
        venueId: venue.id,
        groupId: first.id,
        managerId: manager.id,
      });
      const accepted = await acceptLinkRequest(db, {
        requestId: firstRequest.id,
        userId: creator.id,
      });
      await db.insert(communityMembers).values({
        communityId: accepted.communityId,
        userId: insider.id,
        role: "member",
      });
      await db.insert(groupMemberInvites).values({
        groupId: group.id,
        userId: insider.id,
        invitedBy: creator.id,
      });
      const request = await send(db, {
        venueId: venue.id,
        groupId: group.id,
        managerId: manager.id,
      });
      await acceptLinkRequest(db, {
        requestId: request.id,
        userId: creator.id,
      });

      const invite = await db.query.groupMemberInvites.findFirst({
        where: eq(groupMemberInvites.userId, insider.id),
      });
      expect(invite?.revokedAt).toBeNull();
    } finally {
      await close();
    }
  });

  it("reuses the Venue Community for a second Group, adds a missing sport and keeps an Admin", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const { venue, manager, creator, group } = await setup(db);
      const first = await send(db, {
        venueId: venue.id,
        groupId: group.id,
        managerId: manager.id,
      });
      const accepted = await acceptLinkRequest(db, {
        requestId: first.id,
        userId: creator.id,
      });

      const otherCreator = await insertUser(db, "OtherCreator");
      const admin = await insertUser(db, "Admin");
      await db.insert(communityMembers).values({
        communityId: accepted.communityId,
        userId: admin.id,
        role: "admin",
      });
      const football = await insertGroup(db, {
        name: "Football Crew",
        createdBy: otherCreator.id,
        memberIds: [admin.id],
        sport: "football",
      });
      const second = await send(db, {
        venueId: venue.id,
        groupId: football.id,
        managerId: manager.id,
      });
      const result = await acceptLinkRequest(db, {
        requestId: second.id,
        userId: otherCreator.id,
      });

      expect(result.communityId).toBe(accepted.communityId);
      expect(await venueCommunities(db, venue.id)).toHaveLength(1);
      const sports = await db.query.communitySports.findMany({
        where: eq(communitySports.communityId, result.communityId),
      });
      expect(sports.map((row) => row.sport).sort()).toEqual([
        "football",
        "padel",
      ]);
      const adminRow = await db.query.communityMembers.findFirst({
        where: and(
          eq(communityMembers.communityId, result.communityId),
          eq(communityMembers.userId, admin.id),
        ),
      });
      expect(adminRow?.role).toBe("admin");
    } finally {
      await close();
    }
  });

  it("is refused for a caller who is not the Group creator", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const { venue, manager, member, group } = await setup(db);
      const request = await send(db, {
        venueId: venue.id,
        groupId: group.id,
        managerId: manager.id,
      });
      await expect(
        acceptLinkRequest(db, { requestId: request.id, userId: member.id }),
      ).rejects.toMatchObject({ code: "FORBIDDEN" });
      await expect(
        declineLinkRequest(db, { requestId: request.id, userId: member.id }),
      ).rejects.toMatchObject({ code: "FORBIDDEN" });
      expect(await venueCommunities(db, venue.id)).toHaveLength(0);
    } finally {
      await close();
    }
  });

  it("is refused for a Group that is already Club, and when the request is no longer pending", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const { venue, manager, creator, group } = await setup(db);
      const request = await send(db, {
        venueId: venue.id,
        groupId: group.id,
        managerId: manager.id,
      });
      const [community] = await db
        .insert(communities)
        .values({ name: "Ordinary", createdBy: creator.id })
        .returning();
      await db
        .update(groups)
        .set({ communityId: community?.id })
        .where(eq(groups.id, group.id));
      await expect(
        acceptLinkRequest(db, { requestId: request.id, userId: creator.id }),
      ).rejects.toMatchObject({ code: "BAD_REQUEST" });

      await db
        .update(groups)
        .set({ communityId: null })
        .where(eq(groups.id, group.id));
      await cancelGroupLinkRequest(db, {
        requestId: request.id,
        actor: actor(manager.id),
      });
      await expect(
        acceptLinkRequest(db, { requestId: request.id, userId: creator.id }),
      ).rejects.toMatchObject({ code: "CONFLICT" });
    } finally {
      await close();
    }
  });

  it("is refused on a Soft-archived Venue", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const { venue, manager, creator, group } = await setup(db);
      const request = await send(db, {
        venueId: venue.id,
        groupId: group.id,
        managerId: manager.id,
      });
      await db
        .update(venues)
        .set({ archivedAt: new Date() })
        .where(eq(venues.id, venue.id));
      await expect(
        acceptLinkRequest(db, { requestId: request.id, userId: creator.id }),
      ).rejects.toMatchObject({ code: "BAD_REQUEST" });
      expect(await venueCommunities(db, venue.id)).toHaveLength(0);
    } finally {
      await close();
    }
  });

  it("produces exactly one Venue Community for concurrent first accepts", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const { venue, manager, creator, group } = await setup(db);
      const otherCreator = await insertUser(db, "OtherCreator");
      const other = await insertGroup(db, {
        name: "Other Crew",
        createdBy: otherCreator.id,
      });
      const first = await send(db, {
        venueId: venue.id,
        groupId: group.id,
        managerId: manager.id,
      });
      const second = await send(db, {
        venueId: venue.id,
        groupId: other.id,
        managerId: manager.id,
      });

      const results = await Promise.all([
        acceptLinkRequest(db, { requestId: first.id, userId: creator.id }),
        acceptLinkRequest(db, {
          requestId: second.id,
          userId: otherCreator.id,
        }),
      ]);

      expect(results[0].communityId).toBe(results[1].communityId);
      expect(await venueCommunities(db, venue.id)).toHaveLength(1);
    } finally {
      await close();
    }
  });

  it("rejects a second Venue Community for one Venue at the database", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const { venue, manager } = await setup(db);
      const values = {
        name: "Dup",
        createdBy: manager.id,
        venueId: venue.id,
        isVenueCommunity: true,
      };
      await db.insert(communities).values(values);
      await expect(db.insert(communities).values(values)).rejects.toThrow();
      await expect(
        db.insert(communities).values({
          name: "No Venue",
          createdBy: manager.id,
          isVenueCommunity: true,
        }),
      ).rejects.toThrow();
    } finally {
      await close();
    }
  });

  it("applies Club Group rules afterwards: join becomes a request, Game create is locked, Group is Verified", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const { venue, manager, creator, group } = await setup(db);
      const outsider = await insertUser(db, "Outsider");
      const request = await send(db, {
        venueId: venue.id,
        groupId: group.id,
        managerId: manager.id,
      });
      await acceptLinkRequest(db, {
        requestId: request.id,
        userId: creator.id,
      });

      const linked = await db.query.groups.findFirst({
        where: eq(groups.id, group.id),
      });
      if (!linked) {
        throw new Error("Group missing");
      }
      expect(await groupJoinMode(db, linked, outsider.id)).toBe("request");
      expect(await groupIsVerified(db, linked)).toBe(true);

      const otherVenue = await insertVenue(db, { name: "Elsewhere" });
      const windowStart = new Date("2026-12-20T10:00:00");
      const windowEnd = new Date("2026-12-20T12:00:00");
      await expect(
        createGame(db, {
          createdBy: creator.id,
          groupId: group.id,
          venueId: otherVenue.id,
          isPublic: false,
          format: "friendly_game",
          registrationMode: "individual",
          windowStart,
          windowEnd,
        }),
      ).rejects.toMatchObject({ code: "FORBIDDEN" });

      const created = await createGame(db, {
        createdBy: creator.id,
        groupId: group.id,
        venueId: venue.id,
        isPublic: false,
        format: "friendly_game",
        registrationMode: "individual",
        windowStart,
        windowEnd,
      });
      const row = await db.query.games.findFirst({
        where: eq(games.id, created.id),
      });
      expect(row?.rated).toBe(true);
    } finally {
      await close();
    }
  });

  it("refuses to unlink a Venue or request a Venue link on a Venue Community", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const { venue, manager, creator, group } = await setup(db);
      const request = await send(db, {
        venueId: venue.id,
        groupId: group.id,
        managerId: manager.id,
      });
      const { communityId } = await acceptLinkRequest(db, {
        requestId: request.id,
        userId: creator.id,
      });
      await expect(
        unlinkVenue(db, { communityId, userId: manager.id }),
      ).rejects.toMatchObject({ code: "BAD_REQUEST" });
      await expect(
        requestVenueLink(db, {
          communityId,
          userId: manager.id,
          venueId: venue.id,
        }),
      ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    } finally {
      await close();
    }
  });
});

describe("declineLinkRequest", () => {
  it("sets the request to rejected and lets a new one be sent", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const { venue, manager, creator, group } = await setup(db);
      const request = await send(db, {
        venueId: venue.id,
        groupId: group.id,
        managerId: manager.id,
      });
      await declineLinkRequest(db, {
        requestId: request.id,
        userId: creator.id,
      });
      const row = await db.query.groupLinkRequests.findFirst({
        where: eq(groupLinkRequests.id, request.id),
      });
      expect(row).toMatchObject({ status: "rejected", decidedBy: creator.id });
      await expect(
        declineLinkRequest(db, { requestId: request.id, userId: creator.id }),
      ).rejects.toMatchObject({ code: "CONFLICT" });
      await expect(
        send(db, {
          venueId: venue.id,
          groupId: group.id,
          managerId: manager.id,
        }),
      ).resolves.toMatchObject({ status: "pending" });
    } finally {
      await close();
    }
  });
});

describe("pendingLinkRequests and groupById", () => {
  it("lists a creator's pending requests and reports the count and Venue Community on byId", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const { venue, manager, creator, member, group } = await setup(db);
      const request = await send(db, {
        venueId: venue.id,
        groupId: group.id,
        managerId: manager.id,
      });

      const pending = await pendingLinkRequests(db, { userId: creator.id });
      expect(pending).toMatchObject([
        { id: request.id, groupName: "Tuesday Crew", venueName: "Smash Club" },
      ]);
      await expect(
        pendingLinkRequests(db, { userId: member.id }),
      ).resolves.toEqual([]);

      const asCreator = await groupById(db, {
        groupId: group.id,
        userId: creator.id,
      });
      expect(asCreator.pendingLinkRequestCount).toBe(1);
      expect(asCreator.venueCommunity).toBeNull();
      const asMember = await groupById(db, {
        groupId: group.id,
        userId: member.id,
      });
      expect(asMember.pendingLinkRequestCount).toBeNull();

      await acceptLinkRequest(db, {
        requestId: request.id,
        userId: creator.id,
      });
      const linked = await groupById(db, {
        groupId: group.id,
        userId: member.id,
      });
      expect(linked.venueCommunity).toEqual({
        venueId: venue.id,
        venueName: "Smash Club",
      });
      expect(linked.verified).toBe(true);
    } finally {
      await close();
    }
  });
});

describe("listForOperator verification source", () => {
  it("reports Venue Community verification with the Venue name", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const { venue, manager, creator, group } = await setup(db);
      const plain = await insertGroup(db, {
        name: "Plain Crew",
        createdBy: creator.id,
      });
      const request = await send(db, {
        venueId: venue.id,
        groupId: group.id,
        managerId: manager.id,
      });
      await acceptLinkRequest(db, {
        requestId: request.id,
        userId: creator.id,
      });

      const { items } = await listForOperator(db, {});
      const byId = new Map(items.map((item) => [item.id, item]));
      expect(byId.get(group.id)).toMatchObject({
        verificationSource: "venue_community",
        venueCommunityVenueName: "Smash Club",
      });
      expect(byId.get(plain.id)).toMatchObject({
        verificationSource: "none",
        venueCommunityVenueName: null,
      });
    } finally {
      await close();
    }
  });
});

describe("migration M2", () => {
  it("creates no Communities and defaults is_venue_community to false", async () => {
    const { db, close } = await createPgliteDb();
    try {
      expect(await db.query.communities.findMany()).toEqual([]);
      const { venue, creator } = await setup(db);
      const [community] = await db
        .insert(communities)
        .values({ name: "Ordinary", createdBy: creator.id, venueId: venue.id })
        .returning();
      expect(community?.isVenueCommunity).toBe(false);
    } finally {
      await close();
    }
  });
});
