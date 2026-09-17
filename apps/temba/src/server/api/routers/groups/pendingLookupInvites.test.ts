import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import { groups, user } from "@repo/db/schema";

import { createLoosePublic } from "~/server/api/routers/groups/createLoosePublic";
import { pendingLookupInvites } from "~/server/api/routers/groups/pendingLookupInvites";
import { sendLookupInvite } from "~/server/api/routers/groups/sendLookupInvite";
import { createPgliteDb, type TestDatabase } from "~/server/test/pglite";

const STORED_URL =
  "https://example.supabase.co/storage/v1/object/public/group-images/invite/image";

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
