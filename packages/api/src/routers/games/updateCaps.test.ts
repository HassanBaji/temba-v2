import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import {
  GameFormatEnum,
  GameRegistrationModeEnum,
  gamePlayers,
  gameWaitlist,
  games,
  groups,
  user,
  venues,
} from "@repo/db/schema";
import { createPgliteDb, type TestDatabase } from "@repo/db/testing";

import { register } from "#src/routers/games/register";
import { registerSeat } from "#src/routers/games/registerSeat";
import { updateGameCaps } from "#src/routers/games/updateCaps";

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

async function insertGame(
  database: TestDatabase,
  createdBy: string,
  format: GameFormatEnum,
) {
  const [venue] = await database
    .insert(venues)
    .values({
      name: `Venue ${crypto.randomUUID()}`,
      city: "Lisbon",
      country: "PT",
    })
    .returning({ id: venues.id });
  const [group] = await database
    .insert(groups)
    .values({ name: `Group ${crypto.randomUUID()}`, createdBy })
    .returning({ id: groups.id });
  if (!venue || !group) {
    throw new Error("Failed to insert Venue or Group");
  }
  const windowStart = new Date(Date.now() + 60 * 60 * 1000);
  const [game] = await database
    .insert(games)
    .values({
      format,
      registrationMode: GameRegistrationModeEnum.INDIVIDUAL,
      groupId: group.id,
      venueId: venue.id,
      isPublic: true,
      windowStart,
      windowEnd: new Date(windowStart.getTime() + 2 * 60 * 60 * 1000),
      playersAllowed: 4,
      createdBy,
    })
    .returning();
  if (!game) {
    throw new Error("Failed to insert Game");
  }
  return game;
}

async function rosterUserIds(database: TestDatabase, gameId: string) {
  const rows = await database.query.gamePlayers.findMany({
    where: eq(gamePlayers.gameId, gameId),
  });
  return rows.map((row) => row.userId);
}

async function waitlistUserIds(database: TestDatabase, gameId: string) {
  const rows = await database.query.gameWaitlist.findMany({
    where: eq(gameWaitlist.gameId, gameId),
  });
  return rows.map((row) => row.userId);
}

describe("updateGameCaps raising the cap", () => {
  it("promotes the Waitlist into the new places before a newcomer registers", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const owner = await insertUser(db, "Owner");
      const game = await insertGame(db, owner.id, GameFormatEnum.AMERICANO);
      const users = [];
      for (let index = 0; index < 6; index += 1) {
        users.push(await insertUser(db, `Player${index}`));
      }
      for (const player of users.slice(0, 6)) {
        await register(db, { gameId: game.id, userId: player.id });
      }
      expect(await waitlistUserIds(db, game.id)).toEqual([
        users[4]!.id,
        users[5]!.id,
      ]);

      await updateGameCaps(db, {
        gameId: game.id,
        userId: owner.id,
        playersAllowed: 8,
      });

      expect(await waitlistUserIds(db, game.id)).toEqual([]);
      expect((await rosterUserIds(db, game.id)).sort()).toEqual(
        users.map((player) => player.id).sort(),
      );

      const newcomer = await insertUser(db, "Newcomer");
      await expect(
        register(db, { gameId: game.id, userId: newcomer.id }),
      ).resolves.toEqual({ ok: true, waitlisted: false });
    } finally {
      await close();
    }
  });

  it("fills one new seat per waitlisted User on a seat tournament", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const owner = await insertUser(db, "Owner");
      const game = await insertGame(
        db,
        owner.id,
        GameFormatEnum.FRIENDLY_TOURNAMENT,
      );
      const seats = [
        [1, "left"],
        [1, "right"],
        [2, "left"],
        [2, "right"],
      ] as const;
      for (const [index, [sideIndex, position]] of seats.entries()) {
        const player = await insertUser(db, `Seated${index}`);
        await registerSeat(db, {
          gameId: game.id,
          userId: player.id,
          sideIndex,
          position,
        });
      }
      const first = await insertUser(db, "First");
      const second = await insertUser(db, "Second");
      for (const player of [first, second]) {
        await expect(
          registerSeat(db, { gameId: game.id, userId: player.id }),
        ).resolves.toEqual({ ok: true, waitlisted: true });
      }

      await updateGameCaps(db, {
        gameId: game.id,
        userId: owner.id,
        playersAllowed: 8,
      });

      expect(await waitlistUserIds(db, game.id)).toEqual([]);
      const roster = await rosterUserIds(db, game.id);
      expect(roster).toHaveLength(6);
      expect(roster).toEqual(expect.arrayContaining([first.id, second.id]));
    } finally {
      await close();
    }
  });
});
