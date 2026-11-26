import { describe, expect, it } from "vitest";

import { messagesFor } from "@repo/i18n/messages";

import {
  addPlayers,
  live,
  open,
  pick,
  room,
  startLive,
  undo,
  withFootballGame,
} from "#src/routers/games/football-pick-room.test-support";
import { startFootballPick } from "#src/routers/games/startFootballPick";

const errors = messagesFor("en").football.errors;

describe("games.undoFootballPick", () => {
  it("returns the last pick to the pool and gives the turn back", async () => {
    await withFootballGame(async (f) => {
      const [a, b, c, d, e] = await addPlayers(f, 6);
      await startLive(f, { slot1: a!, slot2: c! });
      await pick(f, a!, b!, 1);
      await pick(f, c!, d!, 2);

      await expect(undo(f, f.organizer, 1)).rejects.toMatchObject({
        code: "CONFLICT",
        message: errors.pickMovedOn,
      });
      expect(await undo(f, f.organizer, 2)).toEqual({
        ok: true,
        userId: d!.id,
      });
      const view = live(await room(f, a!));
      expect(view.sides.slot2).toEqual([{ userId: c!.id, pickNumber: null }]);
      expect(view.pool).toContain(d!.id);
      expect(view.turn).toBe(2);
      expect(view.picks).toMatchObject({ made: 1, next: 2 });
      await pick(f, c!, e!, 2);

      await undo(f, f.organizer, 2);
      await undo(f, f.organizer, 1);
      await expect(undo(f, f.organizer, 1)).rejects.toThrow(
        errors.pickNothingToUndo,
      );
      expect(live(await room(f, f.organizer)).turn).toBe(1);
    });
  });

  it("is for an Organizer only, while the pick is live", async () => {
    await withFootballGame(async (f) => {
      const [a, b, c] = await addPlayers(f, 4);
      await open(f, { slot1: a!, slot2: c! }, { firstPick: "slot1" });
      await expect(undo(f, f.organizer, 1)).rejects.toThrow(errors.pickNotLive);
      await startFootballPick(f.db, {
        gameId: f.gameId,
        userId: f.organizer.id,
      });
      await pick(f, a!, b!, 1);
      await expect(undo(f, a!, 1)).rejects.toThrow();
      await expect(undo(f, b!, 1)).rejects.toThrow();
      expect(live(await room(f, f.organizer)).picks.made).toBe(1);
    });
  });
});
