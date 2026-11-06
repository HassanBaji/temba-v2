import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import {
  games,
  groupLinkRequests,
  groupMembers,
  groups,
  user,
  venueManagers,
  venues,
} from "@repo/db/schema";
import { createPgliteDb, type TestDatabase } from "@repo/db/testing";

import { groupIsVerified } from "#src/groups/group-is-verified";
import { groupJoinMode } from "#src/groups/helpers/group-join-mode";
import { loadGameCreateVenueContext } from "#src/games/helpers/load-game-create-venue-context";
import { createGame } from "#src/routers/games/create";
import { groupById } from "#src/routers/groups/byId";
import { acceptLinkRequest } from "#src/routers/groups/acceptLinkRequest";
import { declineLinkRequest } from "#src/routers/groups/declineLinkRequest";
import { listForOperator } from "#src/routers/groups/listForOperator";
import { pendingLinkRequests } from "#src/routers/groups/pendingLinkRequests";
import { cancelGroupLinkRequest } from "#src/routers/venues/cancelGroupLinkRequest";
import { listLinkedGroups } from "#src/routers/venues/listLinkedGroups";
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
    venueId?: string;
  },
) {
  const [row] = await database
    .insert(groups)
    .values({
      name: args.name,
      createdBy: args.createdBy,
      type: args.type ?? "public",
      sport: args.sport ?? "padel",
      venueId: args.venueId,
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

async function readGroup(database: TestDatabase, groupId: string) {
  const row = await database.query.groups.findFirst({
    where: eq(groups.id, groupId),
  });
  if (!row) {
    throw new Error("Group missing");
  }
  return row;
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
      const other = await insertVenue(db, { name: "Other Club" });
      const club = await insertGroup(db, {
        name: "Club side",
        createdBy: creator.id,
        venueId: other.id,
      });
      await expect(
        send(db, {
          venueId: venue.id,
          groupId: club.id,
          managerId: manager.id,
        }),
      ).rejects.toMatchObject({
        code: "BAD_REQUEST",
        message: "Only a Loose Group can be linked to a Venue",
      });
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

describe("searchLinkableGroups and listLinkedGroups", () => {
  it("finds live Loose Group Public by name and hides pending and Club ones", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const { venue, manager, creator, group } = await setup(db);
      await insertGroup(db, {
        name: "Tuesday Secret",
        createdBy: creator.id,
        type: "private",
      });
      const other = await insertVenue(db, { name: "Other Club" });
      await insertGroup(db, {
        name: "Tuesday Club",
        createdBy: creator.id,
        venueId: other.id,
      });

      const found = await searchLinkableGroups(db, {
        venueId: venue.id,
        query: "tuesday",
        actor: actor(manager.id),
      });
      expect(found.map((row) => row.id)).toEqual([group.id]);
      expect(found[0]?.memberCount).toBe(2);

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

  it("lists no Club Groups, then the linked Group with its requests", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const { venue, manager, creator, group } = await setup(db);
      const empty = await listLinkedGroups(db, {
        venueId: venue.id,
        actor: actor(manager.id),
      });
      expect(empty.venue).toEqual({ id: venue.id, archived: false });
      expect(empty.groups).toEqual([]);
      expect(empty.pendingRequests).toEqual([]);
      expect(empty.declinedRequests).toEqual([]);

      const second = await insertGroup(db, {
        name: "Friday Crew",
        createdBy: creator.id,
      });
      const third = await insertGroup(db, {
        name: "Sunday Crew",
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
      const open = await send(db, {
        venueId: venue.id,
        groupId: third.id,
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

      const listed = await listLinkedGroups(db, {
        venueId: venue.id,
        actor: actor(manager.id),
      });
      expect(listed.venue).toEqual({ id: venue.id, archived: false });
      expect(listed.groups).toEqual([
        {
          id: group.id,
          name: "Tuesday Crew",
          type: "public",
          sport: "padel",
          memberCount: 2,
          canUnlink: true,
        },
      ]);
      expect(listed.pendingRequests.map((row) => row.id)).toEqual([open.id]);
      expect(listed.pendingRequests[0]?.group).toEqual({
        id: third.id,
        name: "Sunday Crew",
        sport: "padel",
      });
      expect(listed.declinedRequests.map((row) => row.id)).toEqual([
        declined.id,
      ]);
    } finally {
      await close();
    }
  });

  it("is refused for a caller who is not a manager of the Venue", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const { venue, creator } = await setup(db);
      await expect(
        listLinkedGroups(db, { venueId: venue.id, actor: actor(creator.id) }),
      ).rejects.toMatchObject({ code: "FORBIDDEN" });
      await expect(
        searchLinkableGroups(db, {
          venueId: venue.id,
          query: "tuesday",
          actor: actor(creator.id),
        }),
      ).rejects.toMatchObject({ code: "FORBIDDEN" });
    } finally {
      await close();
    }
  });
});

describe("acceptLinkRequest", () => {
  it("links the Group to the Venue, approves the request and cancels the Group's other pending requests", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const { venue, manager, creator, group } = await setup(db);
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
      expect(result).toEqual({
        ok: true,
        groupId: group.id,
        venueId: venue.id,
      });

      const updated = await readGroup(db, group.id);
      expect(updated.venueId).toBe(venue.id);
      expect(updated.type).toBe("public");
      expect(updated.createdBy).toBe(creator.id);

      const members = await db.query.groupMembers.findMany({
        where: eq(groupMembers.groupId, group.id),
      });
      expect(members).toHaveLength(2);

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

  it("links a second Group to the same Venue", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const { venue, manager, creator, group } = await setup(db);
      const first = await send(db, {
        venueId: venue.id,
        groupId: group.id,
        managerId: manager.id,
      });
      await acceptLinkRequest(db, { requestId: first.id, userId: creator.id });

      const otherCreator = await insertUser(db, "OtherCreator");
      const football = await insertGroup(db, {
        name: "Football Crew",
        createdBy: otherCreator.id,
        sport: "football",
      });
      const second = await send(db, {
        venueId: venue.id,
        groupId: football.id,
        managerId: manager.id,
      });
      await acceptLinkRequest(db, {
        requestId: second.id,
        userId: otherCreator.id,
      });

      const linked = await db.query.groups.findMany({
        where: eq(groups.venueId, venue.id),
      });
      expect(linked.map((row) => row.id).sort()).toEqual(
        [group.id, football.id].sort(),
      );
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
        acceptLinkRequest(db, { requestId: request.id, userId: manager.id }),
      ).rejects.toMatchObject({ code: "FORBIDDEN" });
      await expect(
        declineLinkRequest(db, { requestId: request.id, userId: member.id }),
      ).rejects.toMatchObject({ code: "FORBIDDEN" });
      expect((await readGroup(db, group.id)).venueId).toBeNull();
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
      const other = await insertVenue(db, { name: "Other Club" });
      await db
        .update(groups)
        .set({ venueId: other.id })
        .where(eq(groups.id, group.id));
      await expect(
        acceptLinkRequest(db, { requestId: request.id, userId: creator.id }),
      ).rejects.toMatchObject({
        code: "BAD_REQUEST",
        message: "Only a Loose Group can be linked to a Venue",
      });
      expect((await readGroup(db, group.id)).venueId).toBe(other.id);

      await db
        .update(groups)
        .set({ venueId: null })
        .where(eq(groups.id, group.id));
      await cancelGroupLinkRequest(db, {
        requestId: request.id,
        actor: actor(manager.id),
      });
      await expect(
        acceptLinkRequest(db, { requestId: request.id, userId: creator.id }),
      ).rejects.toMatchObject({ code: "CONFLICT" });
      expect((await readGroup(db, group.id)).venueId).toBeNull();
    } finally {
      await close();
    }
  });

  it("is refused for an unknown request", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const { creator } = await setup(db);
      await expect(
        acceptLinkRequest(db, {
          requestId: crypto.randomUUID(),
          userId: creator.id,
        }),
      ).rejects.toMatchObject({ code: "NOT_FOUND" });
      await expect(
        declineLinkRequest(db, {
          requestId: crypto.randomUUID(),
          userId: creator.id,
        }),
      ).rejects.toMatchObject({ code: "NOT_FOUND" });
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
      expect((await readGroup(db, group.id)).venueId).toBeNull();
      const row = await db.query.groupLinkRequests.findFirst({
        where: eq(groupLinkRequests.id, request.id),
      });
      expect(row?.status).toBe("pending");
    } finally {
      await close();
    }
  });

  it("applies Club Group rules afterwards: Game create is locked to the Venue and the Group is Verified", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const { venue, manager, creator, group } = await setup(db);
      const outsider = await insertUser(db, "Outsider");
      expect(await loadGameCreateVenueContext(db, group.id)).toEqual({
        locked: false,
        groupKind: "loose",
        linkedVenueId: null,
      });
      expect(groupIsVerified(await readGroup(db, group.id))).toBe(false);

      const request = await send(db, {
        venueId: venue.id,
        groupId: group.id,
        managerId: manager.id,
      });
      await acceptLinkRequest(db, {
        requestId: request.id,
        userId: creator.id,
      });

      const linked = await readGroup(db, group.id);
      expect(groupIsVerified(linked)).toBe(true);
      expect(await groupJoinMode(db, linked, outsider.id)).toBe("join");
      expect(await loadGameCreateVenueContext(db, group.id)).toEqual({
        locked: true,
        groupKind: "club",
        linkedVenueId: venue.id,
      });

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
      expect((await readGroup(db, group.id)).venueId).toBeNull();
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
  it("lists a creator's pending requests and reports the count and the Venue on byId", async () => {
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
        {
          id: request.id,
          groupId: group.id,
          groupName: "Tuesday Crew",
          venueId: venue.id,
          venueName: "Smash Club",
        },
      ]);
      await expect(
        pendingLinkRequests(db, { userId: member.id }),
      ).resolves.toEqual([]);

      const asCreator = await groupById(db, {
        groupId: group.id,
        userId: creator.id,
      });
      expect(asCreator.pendingLinkRequestCount).toBe(1);
      expect(asCreator.venue).toBeNull();
      expect(asCreator.isLoose).toBe(true);
      expect(asCreator.verified).toBe(false);
      const asMember = await groupById(db, {
        groupId: group.id,
        userId: member.id,
      });
      expect(asMember.pendingLinkRequestCount).toBeNull();

      await acceptLinkRequest(db, {
        requestId: request.id,
        userId: creator.id,
      });
      await expect(
        pendingLinkRequests(db, { userId: creator.id }),
      ).resolves.toEqual([]);
      const linked = await groupById(db, {
        groupId: group.id,
        userId: member.id,
      });
      expect(linked.venue).toEqual({ id: venue.id, name: "Smash Club" });
      expect(linked.isLoose).toBe(false);
      expect(linked.verified).toBe(true);
      expect(linked.pendingLinkRequestCount).toBeNull();
    } finally {
      await close();
    }
  });

  it("hides a pending request from a Soft-archived Venue", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const { venue, manager, creator, group } = await setup(db);
      await send(db, {
        venueId: venue.id,
        groupId: group.id,
        managerId: manager.id,
      });
      await db
        .update(venues)
        .set({ archivedAt: new Date() })
        .where(eq(venues.id, venue.id));

      await expect(
        pendingLinkRequests(db, { userId: creator.id }),
      ).resolves.toEqual([]);
      const asCreator = await groupById(db, {
        groupId: group.id,
        userId: creator.id,
      });
      expect(asCreator.pendingLinkRequestCount).toBe(0);
    } finally {
      await close();
    }
  });
});

describe("listForOperator verification source", () => {
  it("reports the Venue link with the Venue name", async () => {
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
        verificationSource: "venue_link",
        venueName: "Smash Club",
      });
      expect(byId.get(plain.id)).toMatchObject({
        verificationSource: "none",
        venueName: null,
      });
    } finally {
      await close();
    }
  });
});
