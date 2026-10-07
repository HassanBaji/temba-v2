import { describe, expect, it } from "vitest";

import { communities, groups, GroupTypeEnum, user } from "@repo/db/schema";

import { gameNotificationsSuppressed } from "#src/notifications/game-notifications-suppressed";
import { commit } from "#src/soft-archive";
import { createPgliteDb, type TestDatabase } from "@repo/db/testing";

async function insertUser(database: TestDatabase, email: string) {
  const [row] = await database
    .insert(user)
    .values({ name: "Suppressed", email })
    .returning({ id: user.id });
  if (!row) {
    throw new Error("Failed to insert user");
  }
  return row.id;
}

async function insertGroup(
  database: TestDatabase,
  args: { createdBy: string; communityId?: string },
) {
  const [row] = await database
    .insert(groups)
    .values({
      name: "Suppressed Group",
      type: GroupTypeEnum.PUBLIC,
      createdBy: args.createdBy,
      communityId: args.communityId ?? null,
    })
    .returning({ id: groups.id });
  if (!row) {
    throw new Error("Failed to insert group");
  }
  return row.id;
}

describe("gameNotificationsSuppressed", () => {
  it("is true only for a Club Group Game in a Soft-archived Community", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const owner = await insertUser(db, "suppressed-owner@example.com");
      const [community] = await db
        .insert(communities)
        .values({ name: "Suppressed Club", type: "public", createdBy: owner })
        .returning({ id: communities.id });
      if (!community) {
        throw new Error("Failed to insert community");
      }
      const clubGroupId = await insertGroup(db, {
        createdBy: owner,
        communityId: community.id,
      });
      const looseGroupId = await insertGroup(db, { createdBy: owner });

      expect(
        await gameNotificationsSuppressed(db, { groupId: clubGroupId }),
      ).toBe(false);

      await commit(db, { communityId: community.id }, "archived");

      expect(
        await gameNotificationsSuppressed(db, { groupId: clubGroupId }),
      ).toBe(true);
      expect(
        await gameNotificationsSuppressed(db, { groupId: looseGroupId }),
      ).toBe(false);
      expect(await gameNotificationsSuppressed(db, { groupId: null })).toBe(
        false,
      );
    } finally {
      await close();
    }
  });
});
