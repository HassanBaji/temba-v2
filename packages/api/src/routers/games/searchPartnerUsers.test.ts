import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import { games, groupMembers, groups, user, venues } from "@repo/db/schema";

import { searchPartnerUsers } from "#src/routers/games/searchPartnerUsers";
import { createFriendlyGame } from "#src/games/create-friendly";
import { createPgliteDb, type TestDatabase } from "@repo/db/testing";

async function insertUser(
  database: TestDatabase,
  values: { name: string; email?: string; phoneNumber?: string },
) {
  const [row] = await database
    .insert(user)
    .values(values)
    .returning({ id: user.id });
  if (!row) {
    throw new Error("Failed to insert user");
  }
  return row.id;
}

async function insertUnclaimed(
  database: TestDatabase,
  args: { name: string; phoneNumber: string; addedByUserId: string },
) {
  const [row] = await database
    .insert(user)
    .values({ ...args, addedAt: new Date() })
    .returning({ id: user.id });
  if (!row) {
    throw new Error("Failed to insert Unclaimed player");
  }
  return row.id;
}

async function insertGroupGame(
  database: TestDatabase,
  args: { createdBy: string; isPublic: boolean },
) {
  const [venue] = await database
    .insert(venues)
    .values({
      name: `Venue ${crypto.randomUUID()}`,
      city: "Manama",
      country: "BH",
    })
    .returning({ id: venues.id });
  const [group] = await database
    .insert(groups)
    .values({ name: "Tuesday Crew", createdBy: args.createdBy })
    .returning({ id: groups.id });
  if (!venue || !group) {
    throw new Error("Failed to insert venue or group");
  }
  await database
    .insert(groupMembers)
    .values({ groupId: group.id, userId: args.createdBy });

  const windowStart = new Date(Date.now() + 24 * 60 * 60 * 1000);
  const created = await createFriendlyGame(database, {
    createdBy: args.createdBy,
    venueId: venue.id,
    groupId: group.id,
    windowStart,
    windowEnd: new Date(windowStart.getTime() + 60 * 60 * 1000),
  });
  await database
    .update(games)
    .set({ isPublic: args.isPublic })
    .where(eq(games.id, created.game.id));
  return { gameId: created.game.id, groupId: group.id };
}

describe("searchPartnerUsers", () => {
  for (const isPublic of [true, false]) {
    it(`never returns an Unclaimed player on a ${isPublic ? "public" : "private"} Group Game`, async () => {
      const { db, close } = await createPgliteDb();
      try {
        const caller = await insertUser(db, {
          name: "Caller",
          email: "caller@example.com",
        });
        const member = await insertUser(db, {
          name: "Ali Member",
          phoneNumber: "+97336120001",
        });
        const { gameId, groupId } = await insertGroupGame(db, {
          createdBy: caller,
          isPublic,
        });
        const unclaimed = await insertUnclaimed(db, {
          name: "Ali Unclaimed",
          phoneNumber: "+97336124408",
          addedByUserId: caller,
        });
        await db.insert(groupMembers).values([
          { groupId, userId: member },
          { groupId, userId: unclaimed },
        ]);

        const byName = await searchPartnerUsers(db, {
          gameId,
          userId: caller,
          query: "Ali",
        });
        expect(byName.map((row) => row.id)).toEqual([member]);

        expect(
          await searchPartnerUsers(db, {
            gameId,
            userId: caller,
            query: "+97336124408",
          }),
        ).toEqual([]);
      } finally {
        await close();
      }
    });
  }
});
