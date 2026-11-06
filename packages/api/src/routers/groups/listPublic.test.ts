import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import {
  groupMembers,
  groups,
  GroupSportEnum,
  GroupTypeEnum,
  user,
  venues,
} from "@repo/db/schema";

import { createLoosePrivate } from "#src/routers/groups/createLoosePrivate";
import { createLoosePublic } from "#src/routers/groups/createLoosePublic";
import { joinPublic } from "#src/routers/groups/joinPublic";
import { listPublic } from "#src/routers/groups/listPublic";
import { requestJoin } from "#src/routers/groups/requestJoin";
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

describe("listPublic", () => {
  it("lists live Public Groups of every sport the viewer is not in, with joinMode and venueName", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const viewer = await insertUser(db, "list-viewer@example.com");
      const creator = await insertUser(db, "list-creator@example.com");
      const owner = await insertUser(db, "list-owner@example.com");
      const member = await insertUser(db, "list-member@example.com");

      const looseOpen = await createLoosePublic(db, {
        name: "Zebra Open",
        sport: "padel",
        userId: creator.id,
      });
      const looseGated = await createLoosePublic(db, {
        name: "Alpha Gated",
        sport: "padel",
        userId: creator.id,
        requiresApproval: true,
      });
      const mine = await createLoosePublic(db, {
        name: "Mine Crew",
        sport: "padel",
        userId: viewer.id,
      });
      const privateGroup = await createLoosePrivate(db, {
        name: "Private Crew",
        sport: "padel",
        userId: creator.id,
      });
      const [football] = await db
        .insert(groups)
        .values({
          name: "Football Public",
          createdBy: creator.id,
          type: GroupTypeEnum.PUBLIC,
          sport: GroupSportEnum.FOOTBALL,
        })
        .returning({ id: groups.id });
      if (!football) {
        throw new Error("Failed to insert football Group");
      }

      const openVenue = await insertVenue(db, { name: "Open Club" });
      const archivedVenue = await insertVenue(db, {
        name: "Archived Club",
        archivedAt: new Date(),
      });

      const clubOpen = await createClubPublic(db, {
        venueId: openVenue.id,
        name: "Club Open",
        userId: owner.id,
      });
      const clubGated = await createClubPublic(db, {
        venueId: openVenue.id,
        name: "Club Gated",
        userId: owner.id,
        requiresApproval: true,
      });
      const clubArchived = await createClubPublic(db, {
        venueId: archivedVenue.id,
        name: "Club Archived",
        userId: owner.id,
      });
      const deleted = await createLoosePublic(db, {
        name: "Deleted Crew",
        sport: "padel",
        userId: creator.id,
      });
      await db
        .update(groups)
        .set({ deletedAt: new Date(), deletedBy: creator.id })
        .where(eq(groups.id, deleted.id));

      await db.insert(groupMembers).values({
        groupId: looseOpen.id,
        userId: member.id,
      });

      const viewerRows = await listPublic(db, { userId: viewer.id });
      expect(viewerRows.map((row) => row.id).sort()).toEqual(
        [
          looseOpen.id,
          looseGated.id,
          clubOpen.id,
          clubGated.id,
          clubArchived.id,
          football.id,
        ].sort(),
      );
      expect(viewerRows.map((row) => row.id)).not.toContain(mine.id);
      expect(viewerRows.map((row) => row.id)).not.toContain(privateGroup.id);
      expect(viewerRows.map((row) => row.id)).not.toContain(deleted.id);

      const byId = new Map(viewerRows.map((row) => [row.id, row]));
      expect(byId.get(looseOpen.id)?.joinMode).toBe("join");
      expect(byId.get(looseOpen.id)?.venueName).toBeNull();
      expect(byId.get(looseGated.id)?.joinMode).toBe("request");
      expect(byId.get(clubOpen.id)?.joinMode).toBe("join");
      expect(byId.get(clubOpen.id)?.venueName).toBe("Open Club");
      expect(byId.get(clubGated.id)?.joinMode).toBe("request");
      expect(byId.get(clubArchived.id)?.venueName).toBe("Archived Club");
      expect(byId.get(looseOpen.id)?.memberCount).toBe(2);
      expect(byId.get(looseOpen.id)).not.toHaveProperty("communityName");

      const footballRows = await listPublic(db, {
        userId: viewer.id,
        sport: "football",
      });
      expect(footballRows.map((row) => row.id)).toEqual([football.id]);
      expect(footballRows[0]?.sport).toBe("football");

      const padelRows = await listPublic(db, {
        userId: viewer.id,
        sport: "padel",
      });
      expect(padelRows.map((row) => row.id)).not.toContain(football.id);
      expect(padelRows.map((row) => row.id)).toContain(looseOpen.id);

      const memberRows = await listPublic(db, { userId: member.id });
      const memberById = new Map(memberRows.map((row) => [row.id, row]));
      expect(memberById.get(clubOpen.id)?.joinMode).toBe("join");
      expect(memberById.has(looseOpen.id)).toBe(false);

      await requestJoin(db, {
        groupId: looseGated.id,
        userId: viewer.id,
      });
      const afterRequest = await listPublic(db, { userId: viewer.id });
      expect(
        afterRequest.find((row) => row.id === looseGated.id)?.joinMode,
      ).toBe("requested");

      await joinPublic(db, {
        groupId: looseOpen.id,
        userId: viewer.id,
      });
      await joinPublic(db, {
        groupId: clubOpen.id,
        userId: viewer.id,
      });
      const afterJoin = await listPublic(db, { userId: viewer.id });
      expect(afterJoin.map((row) => row.id)).not.toContain(looseOpen.id);
      expect(afterJoin.map((row) => row.id)).not.toContain(clubOpen.id);

      const created = await createLoosePublic(db, {
        name: "Brand New",
        sport: "padel",
        userId: creator.id,
      });
      const afterCreate = await listPublic(db, { userId: viewer.id });
      expect(afterCreate.map((row) => row.id)).toContain(created.id);
    } finally {
      await close();
    }
  });

  it("orders by member count desc, then name", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const viewer = await insertUser(db, "order-viewer@example.com");
      const creator = await insertUser(db, "order-creator@example.com");
      const extra = await insertUser(db, "order-extra@example.com");
      const beta = await createLoosePublic(db, {
        name: "Beta",
        sport: "padel",
        userId: creator.id,
      });
      const alpha = await createLoosePublic(db, {
        name: "Alpha",
        sport: "padel",
        userId: creator.id,
      });
      const crowded = await createLoosePublic(db, {
        name: "Crowded",
        sport: "padel",
        userId: creator.id,
      });
      await db.insert(groupMembers).values({
        groupId: crowded.id,
        userId: extra.id,
      });

      const rows = await listPublic(db, { userId: viewer.id });
      expect(rows.map((row) => row.id)).toEqual([
        crowded.id,
        alpha.id,
        beta.id,
      ]);
    } finally {
      await close();
    }
  });

  it("returns a stored imageUrl when the column is set, and null otherwise", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const viewer = await insertUser(db, "public-image-viewer@example.com");
      const creator = await insertUser(db, "public-image-creator@example.com");
      const pictured = await createLoosePublic(db, {
        name: "Pictured Public",
        sport: "padel",
        userId: creator.id,
      });
      const plain = await createLoosePublic(db, {
        name: "Plain Public",
        sport: "padel",
        userId: creator.id,
      });
      await db
        .update(groups)
        .set({
          imageUrl: "/api/media/group-images/public/image?v=1",
        })
        .where(eq(groups.id, pictured.id));

      const rows = await listPublic(db, { userId: viewer.id });
      const byId = new Map(rows.map((row) => [row.id, row]));
      expect(byId.get(pictured.id)?.imageUrl).toBe(
        "/api/media/group-images/public/image?v=1",
      );
      expect(byId.get(plain.id)?.imageUrl).toBeNull();
    } finally {
      await close();
    }
  });
});
