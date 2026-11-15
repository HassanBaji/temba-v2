import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import { groups, user } from "@repo/db/schema";

import { createLoosePublic } from "#src/routers/groups/createLoosePublic";
import { pendingLookupInvites } from "#src/routers/groups/pendingLookupInvites";
import { sendLookupInvite } from "#src/routers/groups/sendLookupInvite";
import { createPgliteDb, type TestDatabase } from "@repo/db/testing";

const STORED_URL = "/api/media/group-images/invite/image?v=1";

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

describe("pendingLookupInvites imageUrl", () => {
  it("returns a stored imageUrl when the column is set, and null otherwise", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const creator = await insertUser(db, "invite-creator@example.com");
      const invitee = await insertUser(db, "invite-target@example.com");
      const withImage = await createLoosePublic(db, {
        name: "Pictured",
        sport: "padel",
        userId: creator.id,
      });
      const withoutImage = await createLoosePublic(db, {
        name: "Plain",
        sport: "padel",
        userId: creator.id,
      });
      await db
        .update(groups)
        .set({ imageUrl: STORED_URL })
        .where(eq(groups.id, withImage.id));

      await sendLookupInvite(db, {
        groupId: withImage.id,
        userId: creator.id,
        userIds: [invitee.id],
      });
      await sendLookupInvite(db, {
        groupId: withoutImage.id,
        userId: creator.id,
        userIds: [invitee.id],
      });

      const rows = await pendingLookupInvites(db, { userId: invitee.id });
      const byGroup = new Map(rows.map((row) => [row.groupId, row]));
      expect(byGroup.get(withImage.id)?.imageUrl).toBe(STORED_URL);
      expect(byGroup.get(withoutImage.id)?.imageUrl).toBeNull();
    } finally {
      await close();
    }
  });
});

describe("pendingLookupInvites privacy", () => {
  it("leaves out invites to deleted Groups and never carries the inviter's email", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const creator = await insertUser(db, "invite-owner@example.com");
      const invitee = await insertUser(db, "invite-guest@example.com");
      const kept = await createLoosePublic(db, {
        name: "Kept",
        sport: "padel",
        userId: creator.id,
      });
      const deleted = await createLoosePublic(db, {
        name: "Deleted",
        sport: "padel",
        userId: creator.id,
      });
      for (const group of [kept, deleted]) {
        await sendLookupInvite(db, {
          groupId: group.id,
          userId: creator.id,
          userIds: [invitee.id],
        });
      }
      await db
        .update(groups)
        .set({ deletedAt: new Date() })
        .where(eq(groups.id, deleted.id));

      const rows = await pendingLookupInvites(db, { userId: invitee.id });
      expect(rows.map((row) => row.groupId)).toEqual([kept.id]);
      expect(rows[0]?.invitedBy).toEqual({
        id: creator.id,
        name: creator.name,
        image: null,
      });
      expect(JSON.stringify(rows)).not.toContain("invite-owner@example.com");
    } finally {
      await close();
    }
  });
});
