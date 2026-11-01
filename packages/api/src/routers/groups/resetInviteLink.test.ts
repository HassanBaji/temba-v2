import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import { groupInviteLinks, user } from "@repo/db/schema";

import { createInviteLink } from "#src/routers/groups/createInviteLink";
import { createLoosePublic } from "#src/routers/groups/createLoosePublic";
import { getInviteLink } from "#src/routers/groups/getInviteLink";
import { resetInviteLink } from "#src/routers/groups/resetInviteLink";
import { createPgliteDb, type TestDatabase } from "@repo/db/testing";

const ORIGIN = "https://temba.test";

async function insertUser(database: TestDatabase, email: string) {
  const [row] = await database
    .insert(user)
    .values({
      name: email.split("@")[0] ?? "User",
      email,
      clerkId: `user_${crypto.randomUUID()}`,
    })
    .returning({ id: user.id });
  if (!row) {
    throw new Error("Failed to insert user");
  }
  return row;
}

describe("resetInviteLink", () => {
  it("expires every live link and mints a fresh one", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const owner = await insertUser(db, "owner@example.com");
      const group = await createLoosePublic(db, {
        name: "Crew",
        sport: "padel",
        userId: owner.id,
      });
      const first = await createInviteLink(db, {
        groupId: group.id,
        userId: owner.id,
        origin: ORIGIN,
      });

      const reset = await resetInviteLink(db, {
        groupId: group.id,
        userId: owner.id,
        origin: ORIGIN,
      });
      expect(reset.id).not.toBe(first.id);

      const live = await getInviteLink(db, {
        groupId: group.id,
        userId: owner.id,
        origin: ORIGIN,
      });
      expect(live?.id).toBe(reset.id);

      const old = await db.query.groupInviteLinks.findFirst({
        where: eq(groupInviteLinks.id, first.id),
      });
      expect(old?.expiresAt).not.toBeNull();
      expect(old!.expiresAt!.getTime()).toBeLessThanOrEqual(Date.now());
    } finally {
      await close();
    }
  });
});
