import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import { games } from "@repo/db/schema";

import { createPgliteDb, type TestDatabase } from "@repo/db/testing";

import {
  completePadelMatch,
  completedFootballFriendlyGame,
  gameMvpColumns,
  seatPadelFriendlyGame,
} from "#src/marks/marks.test-support";
import { createGame } from "#src/routers/games/create";
import { forGame } from "#src/routers/marks/forGame";
import { setMvpMode } from "#src/routers/marks/setMvpMode";

async function withDb(run: (db: TestDatabase) => Promise<void>) {
  const { db, close } = await createPgliteDb();
  try {
    await run(db);
  } finally {
    await close();
  }
}

describe("marks.setMvpMode", () => {
  it("lets an Organizer change the mode until the Match completes, never after", async () => {
    await withDb(async (db) => {
      const game = await seatPadelFriendlyGame(db);
      expect((await gameMvpColumns(db, game.gameId)).mvpMode).toBe("vote");

      await expect(
        setMvpMode(db, {
          gameId: game.gameId,
          userId: game.organizer.id,
          mode: "none",
        }),
      ).resolves.toEqual({ mode: "none" });
      await setMvpMode(db, {
        gameId: game.gameId,
        userId: game.organizer.id,
        mode: "organizer",
      });
      expect((await gameMvpColumns(db, game.gameId)).mvpMode).toBe("organizer");
      await expect(
        setMvpMode(db, {
          gameId: game.gameId,
          userId: game.a.id,
          mode: "vote",
        }),
      ).rejects.toMatchObject({ code: "FORBIDDEN" });

      await completePadelMatch(db, game);
      await expect(
        setMvpMode(db, {
          gameId: game.gameId,
          userId: game.organizer.id,
          mode: "vote",
        }),
      ).rejects.toMatchObject({ code: "FORBIDDEN" });
      expect((await gameMvpColumns(db, game.gameId)).mvpMode).toBe("organizer");
    });
  });

  it("refuses a Game that is not a Friendly game", async () => {
    await withDb(async (db) => {
      const friendly = await seatPadelFriendlyGame(db);
      const row = await db.query.games.findFirst({
        where: eq(games.id, friendly.gameId),
        columns: { venueId: true },
      });
      const windowStart = new Date(Date.now() + 60 * 60 * 1000);
      const tournament = await createGame(db, {
        createdBy: friendly.organizer.id,
        groupId: friendly.groupId,
        isPublic: false,
        format: "friendly_tournament",
        registrationMode: "individual",
        playersAllowed: 8,
        venueId: row!.venueId,
        windowStart,
        windowEnd: new Date(windowStart.getTime() + 60 * 60 * 1000),
      });
      await expect(
        setMvpMode(db, {
          gameId: tournament.id,
          userId: friendly.organizer.id,
          mode: "vote",
        }),
      ).rejects.toMatchObject({ code: "BAD_REQUEST" });
      expect((await gameMvpColumns(db, tournament.id)).mvpMode).toBe("none");
    });
  });

  it("gives a football Friendly game a vote and exposes no MVP state in none mode", async () => {
    await withDb(async (db) => {
      const football = await completedFootballFriendlyGame(db);
      const view = await forGame(db, {
        gameId: football.gameId,
        userId: football.black[0]!.id,
      });
      expect(view.mvp).toMatchObject({
        mode: "vote",
        state: "pending",
        votes: { cast: 0, eligible: 5 },
      });

      const padel = await seatPadelFriendlyGame(db);
      await setMvpMode(db, {
        gameId: padel.gameId,
        userId: padel.organizer.id,
        mode: "none",
      });
      await completePadelMatch(db, padel);
      const none = await forGame(db, {
        gameId: padel.gameId,
        userId: padel.a.id,
      });
      expect(none.mvp).toMatchObject({
        mode: "none",
        state: "none",
        userId: null,
        votes: { cast: 0, eligible: 0 },
        tally: null,
        tiedUserIds: null,
      });
      expect(none.viewer).toMatchObject({ canVote: false, canPickMvp: false });
    });
  });
});
