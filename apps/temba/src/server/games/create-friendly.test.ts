import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import {
  communities,
  GameFormatEnum,
  games,
  groups,
  matches,
  matchSets,
  user,
  venues,
} from "@repo/db/schema";

import {
  backfillFriendlySetShells,
  createFriendlyGame,
  FRIENDLY_SET_SHELL_COUNT,
} from "~/server/games/create-friendly";
import { commit } from "~/server/soft-archive";
import { createPgliteDb, type TestDatabase } from "~/server/test/pglite";

async function insertUser(database: TestDatabase, email: string) {
  const [row] = await database
    .insert(user)
    .values({ name: "Test User", email })
    .returning({ id: user.id });
  if (!row) {
    throw new Error("Failed to insert user");
  }
  return row;
}

async function insertVenue(
  database: TestDatabase,
  name: string,
  archivedAt: Date | null = null,
) {
  const [row] = await database
    .insert(venues)
    .values({
      name,
      city: "Lisbon",
      country: "PT",
      archivedAt,
    })
    .returning({ id: venues.id });
  if (!row) {
    throw new Error("Failed to insert venue");
  }
  return row;
}

describe("Friendly Game create", () => {
  it("creates a Match and three Set shells", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const owner = await insertUser(db, "create-owner@example.com");
      const venue = await insertVenue(
        db,
        `Create Venue ${crypto.randomUUID()}`,
      );
      const windowStart = new Date();
      const windowEnd = new Date(windowStart.getTime() + 60 * 60 * 1000);

      const created = await createFriendlyGame(db, {
        createdBy: owner.id,
        venueId: venue.id,
        windowStart,
        windowEnd,
      });

      expect(created.game.format).toBe("friendly_game");
      const shells = await db.query.matchSets.findMany({
        where: eq(matchSets.matchId, created.matchId),
      });
      expect(shells).toHaveLength(FRIENDLY_SET_SHELL_COUNT);
    } finally {
      await close();
    }
  });

  it("refuses an unlocked Soft-archived Venue and allows skip Court on a locked one", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const owner = await insertUser(db, "create-archive-owner@example.com");
      const unlocked = await insertVenue(db, `Unlocked ${crypto.randomUUID()}`);
      await commit(db, { venueId: unlocked.id }, "archived");
      const windowStart = new Date();
      const windowEnd = new Date(windowStart.getTime() + 60 * 60 * 1000);

      await expect(
        createFriendlyGame(db, {
          createdBy: owner.id,
          venueId: unlocked.id,
          windowStart,
          windowEnd,
        }),
      ).rejects.toBeInstanceOf(TRPCError);

      const lockedVenue = await insertVenue(
        db,
        `Locked ${crypto.randomUUID()}`,
      );
      const [community] = await db
        .insert(communities)
        .values({
          name: "Locked Club",
          type: "private",
          createdBy: owner.id,
          venueId: lockedVenue.id,
        })
        .returning({ id: communities.id });
      if (!community) {
        throw new Error("Failed to insert community");
      }
      const [clubGroup] = await db
        .insert(groups)
        .values({
          name: "Club Group",
          createdBy: owner.id,
          communityId: community.id,
        })
        .returning({ id: groups.id });
      if (!clubGroup) {
        throw new Error("Failed to insert club group");
      }
      await commit(db, { venueId: lockedVenue.id }, "archived");

      const created = await createFriendlyGame(db, {
        createdBy: owner.id,
        groupId: clubGroup.id,
        venueId: lockedVenue.id,
        windowStart,
        windowEnd,
      });
      expect(created.game.groupId).toBe(clubGroup.id);
      const match = await db.query.matches.findFirst({
        where: eq(matches.gameId, created.game.id),
      });
      expect(match?.courtId).toBeNull();
    } finally {
      await close();
    }
  });

  it("backfills historical Friendly matches to three Set shells", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const owner = await insertUser(db, "backfill-owner@example.com");
      const venue = await insertVenue(
        db,
        `Backfill Venue ${crypto.randomUUID()}`,
      );
      const [game] = await db
        .insert(games)
        .values({
          format: GameFormatEnum.FRIENDLY_GAME,
          venueId: venue.id,
          createdBy: owner.id,
        })
        .returning({ id: games.id });
      if (!game) {
        throw new Error("Failed to insert game");
      }
      const [match] = await db
        .insert(matches)
        .values({ gameId: game.id })
        .returning({ id: matches.id });
      if (!match) {
        throw new Error("Failed to insert match");
      }
      await db.insert(matchSets).values({ matchId: match.id });

      await backfillFriendlySetShells(db);
      const shells = await db.query.matchSets.findMany({
        where: eq(matchSets.matchId, match.id),
      });
      expect(shells).toHaveLength(FRIENDLY_SET_SHELL_COUNT);
    } finally {
      await close();
    }
  });
});
