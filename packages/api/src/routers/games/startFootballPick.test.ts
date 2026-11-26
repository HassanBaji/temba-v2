import { describe, expect, it } from "vitest";

import { messagesFor } from "@repo/i18n/messages";

import {
  addPlayers,
  draftRow,
  live,
  open,
  room,
  withFootballGame,
} from "#src/routers/games/football-pick-room.test-support";
import { startFootballPick } from "#src/routers/games/startFootballPick";

const errors = messagesFor("en").football.errors;

describe("games.startFootballPick", () => {
  it("lets the Organizer start with a captain missing, making the toss", async () => {
    await withFootballGame(async (f) => {
      const [a, , c] = await addPlayers(f, 4);
      await open(f, { slot1: a!, slot2: c! });
      await room(f, a!);

      const started = await startFootballPick(
        f.db,
        { gameId: f.gameId, userId: f.organizer.id },
        new Date(),
        () => 0.2,
      );
      expect(started.firstPickSide).toBe(1);
      const view = live(await room(f, c!));
      expect(view.status).toBe("live");
      expect(view.firstPickSide).toBe(1);

      await expect(
        startFootballPick(f.db, { gameId: f.gameId, userId: f.organizer.id }),
      ).rejects.toThrow(errors.pickNotWaiting);
    });
  });

  it("is for an Organizer only", async () => {
    await withFootballGame(async (f) => {
      const [a, , c] = await addPlayers(f, 4);
      await open(f, { slot1: a!, slot2: c! });
      await expect(
        startFootballPick(f.db, { gameId: f.gameId, userId: a!.id }),
      ).rejects.toThrow();
      expect((await draftRow(f)).pickStatus).toBe("waiting");
    });
  });
});
