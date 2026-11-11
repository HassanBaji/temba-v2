import { describe, expect, it } from "vitest";

import { GameFormatEnum, games, matches, user, venues } from "@repo/db/schema";
import { createPgliteDb, type TestDatabase } from "@repo/db/testing";

import { resultLink } from "#src/routers/games/resultLink";

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

async function insertPublicFriendlyGame(
  database: TestDatabase,
  createdBy: string,
) {
  const [venue] = await database
    .insert(venues)
    .values({ name: "Ocean Padel", city: "Manama", country: "BH" })
    .returning({ id: venues.id });
  const windowStart = new Date(Date.now() + 60 * 60 * 1000);
  const [game] = await database
    .insert(games)
    .values({
      format: GameFormatEnum.FRIENDLY_GAME,
      venueId: venue!.id,
      createdBy,
      isPublic: true,
      playersAllowed: 4,
      windowStart,
      windowEnd: new Date(windowStart.getTime() + 60 * 60 * 1000),
    })
    .returning({ id: games.id });
  await database.insert(matches).values({ gameId: game!.id });
  return game!;
}

describe("games.resultLink", () => {
  it("links the Game's web page on the given origin", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const organizer = await insertUser(db, "result-organizer@example.com");
      const game = await insertPublicFriendlyGame(db, organizer.id);

      const link = await resultLink(db, {
        gameId: game.id,
        userId: organizer.id,
        origin: "https://temba.app",
      });

      expect(link.url).toBe(`https://temba.app/dashboard/games/${game.id}`);
    } finally {
      await close();
    }
  });
});
