import { describe, expect, it } from "vitest";

import { messagesFor } from "@repo/i18n/messages";

import {
  addPlayers,
  boardFor,
  draftRow,
  open,
  room,
  withFootballGame,
} from "#src/routers/games/football-pick-room.test-support";
import { saveFootballDraft } from "#src/routers/games/saveFootballDraft";
import { startFootballPick } from "#src/routers/games/startFootballPick";
import { stopFootballPick } from "#src/routers/games/stopFootballPick";

const errors = messagesFor("en").football.errors;

describe("games.stopFootballPick", () => {
  it("leaves a Manual Draft line-up with the captains on their sides, readable as any draft", async () => {
    await withFootballGame(async (f) => {
      const [a, b, c, d] = await addPlayers(f, 4);
      await open(f, { slot1: a!, slot2: c! });
      await startFootballPick(f.db, {
        gameId: f.gameId,
        userId: f.organizer.id,
      });
      await stopFootballPick(f.db, {
        gameId: f.gameId,
        userId: f.organizer.id,
      });

      expect(await draftRow(f)).toMatchObject({
        method: "manual",
        pickStatus: null,
        firstPick: null,
        firstPickSide: null,
        slot1CaptainSeenAt: null,
        slot2CaptainSeenAt: null,
      });
      const board = await boardFor(f, f.organizer.id);
      expect(board.draft).toMatchObject({
        method: "manual",
        sides: { slot1: [a!.id], slot2: [c!.id] },
        captains: { slot1: a!.id, slot2: c!.id },
        pick: null,
      });
      expect(board.viewer.canSaveDraft).toBe(true);
      expect(board.viewer.canOpenPickRoom).toBe(true);
      expect((await boardFor(f, a!.id)).viewer.canAnswerDraft).toBe(true);
      expect((await boardFor(f, b!.id)).draft).toBeNull();
      expect((await room(f, c!)).status).toBe("stopped");

      await expect(
        stopFootballPick(f.db, { gameId: f.gameId, userId: f.organizer.id }),
      ).rejects.toThrow(errors.pickNotRunning);
      await saveFootballDraft(f.db, {
        gameId: f.gameId,
        userId: f.organizer.id,
        method: "manual",
        bibs: { slot1: "black", slot2: "white" },
        slot1: [a!.id, b!.id],
        slot2: [c!.id, d!.id],
      });
    });
  });

  it("is for an Organizer only", async () => {
    await withFootballGame(async (f) => {
      const [a, , c] = await addPlayers(f, 4);
      await open(f, { slot1: a!, slot2: c! });
      await expect(
        stopFootballPick(f.db, { gameId: f.gameId, userId: a!.id }),
      ).rejects.toThrow();
      expect((await draftRow(f)).pickStatus).toBe("waiting");
    });
  });
});
