import { describe, expect, it } from "vitest";

import { messagesFor } from "@repo/i18n/messages";

import {
  addPlayers,
  notificationsOf,
  open,
  withFootballGame,
} from "#src/routers/games/football-pick-room.test-support";
import { remindFootballCaptain } from "#src/routers/games/remindFootballCaptain";
import { stopFootballPick } from "#src/routers/games/stopFootballPick";

const errors = messagesFor("en").football.errors;
const notFound = messagesFor("en").game.errors.notFound;

describe("games.remindFootballCaptain", () => {
  it("sends no reminder within five minutes of the last one, across a clock boundary too", async () => {
    await withFootballGame(async (f) => {
      const [a, , c] = await addPlayers(f, 4);
      await open(f, { slot1: a!, slot2: c! });
      const fiveMinutes = 5 * 60_000;
      const boundary = Math.ceil(Date.now() / fiveMinutes) * fiveMinutes;
      const remind = (msFromBoundary: number) =>
        remindFootballCaptain(
          f.db,
          { gameId: f.gameId, userId: a!.id, side: 2 },
          new Date(boundary + msFromBoundary),
        );

      expect(await remind(-1_000)).toEqual({ sent: true });
      expect(await remind(1_000)).toEqual({ sent: false });
      expect(await remind(fiveMinutes - 1_001)).toEqual({ sent: false });
      const reminders = await notificationsOf(f, "football_pick_reminder");
      expect(reminders).toEqual([
        {
          type: "football_pick_reminder",
          recipientUserId: c!.id,
          actorUserId: a!.id,
        },
      ]);
      expect(await remind(fiveMinutes - 1_000)).toEqual({ sent: true });
      expect(await remind(fiveMinutes)).toEqual({ sent: false });
      expect(await notificationsOf(f, "football_pick_reminder")).toHaveLength(
        2,
      );
    });
  });

  it("sends one reminder for two presses at once", async () => {
    await withFootballGame(async (f) => {
      const [a, , c] = await addPlayers(f, 4);
      await open(f, { slot1: a!, slot2: c! });
      const now = new Date();
      const results = await Promise.all(
        [a!.id, f.organizer.id].map((userId) =>
          remindFootballCaptain(
            f.db,
            { gameId: f.gameId, userId, side: 2 },
            now,
          ),
        ),
      );

      expect(results.map((result) => result.sent).sort()).toEqual([
        false,
        true,
      ]);
      expect(await notificationsOf(f, "football_pick_reminder")).toHaveLength(
        1,
      );
    });
  });

  it("lets a captain remind the other side only, and an Organizer either; nobody else", async () => {
    await withFootballGame(async (f) => {
      const [a, b, c] = await addPlayers(f, 4);
      await open(f, { slot1: a!, slot2: c! });
      const remind = (userId: string, side: 1 | 2) =>
        remindFootballCaptain(f.db, { gameId: f.gameId, userId, side });

      await expect(remind(a!.id, 1)).rejects.toThrow(
        errors.pickRemindOtherSide,
      );
      await expect(remind(b!.id, 1)).rejects.toThrow(notFound);
      expect(await remind(f.organizer.id, 1)).toEqual({ sent: true });
      expect(await remind(c!.id, 1)).toEqual({ sent: false });
      expect(await remind(f.organizer.id, 2)).toEqual({ sent: true });
    });
  });

  it("is refused once the pick is stopped", async () => {
    await withFootballGame(async (f) => {
      const [a, , c] = await addPlayers(f, 4);
      await open(f, { slot1: a!, slot2: c! });
      await stopFootballPick(f.db, {
        gameId: f.gameId,
        userId: f.organizer.id,
      });
      await expect(
        remindFootballCaptain(f.db, {
          gameId: f.gameId,
          userId: a!.id,
          side: 2,
        }),
      ).rejects.toThrow(errors.pickNotRunning);
    });
  });
});
