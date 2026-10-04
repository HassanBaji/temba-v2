import { describe, expect, it } from "vitest";

import {
  CommunityRoleEnum,
  GroupTypeEnum,
  communities,
  communityMembers,
  groupMembers,
  groups,
  user,
  venues,
} from "@repo/db/schema";

import { mine } from "~/server/api/routers/communities/mine";
import { createPgliteDb, type TestDatabase } from "@repo/db/testing";

async function insertUser(database: TestDatabase, email: string) {
  const [row] = await database
    .insert(user)
    .values({ name: email.split("@")[0] ?? "User", email })
    .returning({ id: user.id });
  if (!row) {
    throw new Error("Failed to insert user");
  }
  return row;
}

async function insertVenue(
  database: TestDatabase,
  logoImageUrl: string | null,
) {
  const [row] = await database
    .insert(venues)
    .values({
      name: `Venue ${crypto.randomUUID()}`,
      city: "Lisbon",
      country: "PT",
      logoImageUrl,
    })
    .returning({ id: venues.id });
  if (!row) {
    throw new Error("Failed to insert venue");
  }
  return row;
}

async function insertCommunity(
  database: TestDatabase,
  args: {
    name: string;
    createdBy: string;
    venueId?: string;
    members: { userId: string; role: CommunityRoleEnum }[];
  },
) {
  const [row] = await database
    .insert(communities)
    .values({
      name: args.name,
      type: "public",
      createdBy: args.createdBy,
      venueId: args.venueId ?? null,
    })
    .returning({ id: communities.id });
  if (!row) {
    throw new Error("Failed to insert community");
  }
  for (const member of args.members) {
    await database.insert(communityMembers).values({
      communityId: row.id,
      userId: member.userId,
      role: member.role,
    });
  }
  return row;
}

async function insertClubGroup(
  database: TestDatabase,
  args: {
    name: string;
    communityId: string;
    createdBy: string;
    imageUrl?: string;
    memberIds: string[];
  },
) {
  const [row] = await database
    .insert(groups)
    .values({
      name: args.name,
      communityId: args.communityId,
      createdBy: args.createdBy,
      type: GroupTypeEnum.PUBLIC,
      imageUrl: args.imageUrl ?? null,
    })
    .returning({ id: groups.id });
  if (!row) {
    throw new Error("Failed to insert group");
  }
  for (const userId of args.memberIds) {
    await database.insert(groupMembers).values({ groupId: row.id, userId });
  }
  return row;
}

describe("communities.mine list facts", () => {
  it("counts Community members and Club Group members, including zero", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const viewer = await insertUser(db, "cm-viewer@example.com");
      const admin = await insertUser(db, "cm-admin@example.com");
      const member = await insertUser(db, "cm-member@example.com");
      const community = await insertCommunity(db, {
        name: "Riverside",
        createdBy: viewer.id,
        members: [
          { userId: viewer.id, role: CommunityRoleEnum.OWNER },
          { userId: admin.id, role: CommunityRoleEnum.ADMIN },
          { userId: member.id, role: CommunityRoleEnum.MEMBER },
        ],
      });
      const busy = await insertClubGroup(db, {
        name: "A Busy Crew",
        communityId: community.id,
        createdBy: viewer.id,
        memberIds: [viewer.id, admin.id],
      });
      const empty = await insertClubGroup(db, {
        name: "B Empty Crew",
        communityId: community.id,
        createdBy: viewer.id,
        memberIds: [],
      });

      const rows = await mine(db, { userId: viewer.id });

      expect(rows).toHaveLength(1);
      const [row] = rows;
      expect(row?.memberCount).toBe(3);
      expect(row?.groups.map((group) => group.id)).toEqual([busy.id, empty.id]);
      expect(row?.groups[0]).toMatchObject({ memberCount: 2, isMember: true });
      expect(row?.groups[1]).toMatchObject({ memberCount: 0, isMember: false });
    } finally {
      await close();
    }
  });

  it("returns the Group image when set and null otherwise", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const viewer = await insertUser(db, "cm-image@example.com");
      const community = await insertCommunity(db, {
        name: "Harbour",
        createdBy: viewer.id,
        members: [{ userId: viewer.id, role: CommunityRoleEnum.OWNER }],
      });
      await insertClubGroup(db, {
        name: "A Pictured",
        communityId: community.id,
        createdBy: viewer.id,
        imageUrl: "https://cdn.example.com/groups/pictured.png",
        memberIds: [viewer.id],
      });
      await insertClubGroup(db, {
        name: "B Plain",
        communityId: community.id,
        createdBy: viewer.id,
        memberIds: [viewer.id],
      });

      const [row] = await mine(db, { userId: viewer.id });

      expect(row?.groups.map((group) => group.imageUrl)).toEqual([
        "https://cdn.example.com/groups/pictured.png",
        null,
      ]);
    } finally {
      await close();
    }
  });

  it("returns the linked Venue logo, and null without a Venue link", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const viewer = await insertUser(db, "cm-logo@example.com");
      const venue = await insertVenue(
        db,
        "https://cdn.example.com/venues/logo.png",
      );
      const linked = await insertCommunity(db, {
        name: "Linked",
        createdBy: viewer.id,
        venueId: venue.id,
        members: [{ userId: viewer.id, role: CommunityRoleEnum.OWNER }],
      });
      const unlinked = await insertCommunity(db, {
        name: "Unlinked",
        createdBy: viewer.id,
        members: [{ userId: viewer.id, role: CommunityRoleEnum.MEMBER }],
      });

      const rows = await mine(db, { userId: viewer.id });
      const byId = new Map(rows.map((row) => [row.id, row]));

      expect(byId.get(linked.id)?.logoImageUrl).toBe(
        "https://cdn.example.com/venues/logo.png",
      );
      expect(byId.get(unlinked.id)?.logoImageUrl).toBeNull();
      expect(byId.get(unlinked.id)?.memberCount).toBe(1);
      expect(byId.get(unlinked.id)?.groups).toEqual([]);
    } finally {
      await close();
    }
  });

  it("returns null when the linked Venue has no logo", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const viewer = await insertUser(db, "cm-nologo@example.com");
      const venue = await insertVenue(db, null);
      await insertCommunity(db, {
        name: "No Logo",
        createdBy: viewer.id,
        venueId: venue.id,
        members: [{ userId: viewer.id, role: CommunityRoleEnum.OWNER }],
      });

      const [row] = await mine(db, { userId: viewer.id });

      expect(row?.logoImageUrl).toBeNull();
    } finally {
      await close();
    }
  });
});
