import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import {
  footballLineupDraftAnswers,
  footballLineupDraftPlayers,
  gamePlayers,
} from "@repo/db/schema";
import { messagesFor } from "@repo/i18n/messages";

import { answerFootballDraft } from "#src/routers/games/answerFootballDraft";
import {
  addMember,
  addPlayers,
  boardFor,
  draftRow,
  insertUser,
  live,
  notificationsOf,
  open,
  pick,
  room,
  withFootballGame,
} from "#src/routers/games/football-pick-room.test-support";
import { publishFootballTeams } from "#src/routers/games/publishFootballTeams";
import { register } from "#src/routers/games/register";
import { saveFootballDraft } from "#src/routers/games/saveFootballDraft";
import { startFootballPick } from "#src/routers/games/startFootballPick";
import { stopFootballPick } from "#src/routers/games/stopFootballPick";

const errors = messagesFor("en").football.errors;

describe("games.openFootballPickRoom", () => {
  it("seats the two captains, leaves everyone else in the pool and tells both captains", async () => {
    await withFootballGame(async (f) => {
      const [a, b, c, d, e] = await addPlayers(f, 5);
      await open(f, { slot1: a!, slot2: c! });

      const row = await draftRow(f);
      expect(row).toMatchObject({
        method: "captain_pick",
        pickStatus: "waiting",
        firstPick: "toss",
        firstPickSide: null,
      });
      const view = live(await room(f, f.organizer));
      expect(view.status).toBe("waiting");
      expect(view.sides).toEqual({
        slot1: [{ userId: a!.id, pickNumber: null }],
        slot2: [{ userId: c!.id, pickNumber: null }],
      });
      expect(view.pool).toEqual([b!.id, d!.id, e!.id]);
      expect(view.picks).toEqual({ made: 0, total: 3, next: 1 });

      const told = await notificationsOf(f, "football_pick_room_opened");
      expect(told.map((row) => row.recipientUserId).sort()).toEqual(
        [a!.id, c!.id].sort(),
      );
      expect(told.every((row) => row.actorUserId === f.organizer.id)).toBe(
        true,
      );
    });
  });

  it("never tells the Organizer who opens it, when they captain a side", async () => {
    await withFootballGame(async (f) => {
      const [a, b, c] = await addPlayers(f, 3);
      await register(f.db, { gameId: f.gameId, userId: f.organizer.id });
      await open(f, { slot1: f.organizer, slot2: a! });
      expect(
        (await notificationsOf(f, "football_pick_room_opened")).map(
          (row) => row.recipientUserId,
        ),
      ).toEqual([a!.id]);
      expect(live(await room(f, f.organizer)).viewer).toEqual({
        role: "captain",
        side: 1,
        isOrganizer: true,
      });
      expect([b, c]).toHaveLength(2);
    });
  });

  it("replaces a saved draft and its answers", async () => {
    await withFootballGame(async (f) => {
      const [a, b, c, d] = await addPlayers(f, 4);
      await saveFootballDraft(f.db, {
        gameId: f.gameId,
        userId: f.organizer.id,
        method: "manual",
        bibs: { slot1: "red", slot2: "navy" },
        slot1: [a!.id, b!.id],
        slot2: [c!.id, d!.id],
        captains: { slot1: a!.id, slot2: c!.id },
      });
      await answerFootballDraft(f.db, {
        gameId: f.gameId,
        userId: a!.id,
        answer: "approved",
      });
      await open(f, { slot1: b!, slot2: d! });

      const players = await f.db.query.footballLineupDraftPlayers.findMany();
      expect(players).toHaveLength(2);
      expect(await f.db.query.footballLineupDraftAnswers.findMany()).toEqual(
        [],
      );
      const board = await boardFor(f, f.organizer.id);
      expect(board.draft).toMatchObject({
        method: "captain_pick",
        bibs: { slot1: "black", slot2: "white" },
        sides: { slot1: [b!.id], slot2: [d!.id] },
        captains: { slot1: b!.id, slot2: d!.id },
        pick: { status: "waiting" },
      });
    });
  });

  it("names each opening anew, and a room opened after a stop is no longer stopped", async () => {
    await withFootballGame(async (f) => {
      const [a, b, c, d] = await addPlayers(f, 4);
      await open(f, { slot1: a!, slot2: c! });
      const first = live(await room(f, f.organizer));
      expect((await draftRow(f)).pickId).toBe(first.pickId);
      await stopFootballPick(f.db, {
        gameId: f.gameId,
        userId: f.organizer.id,
      });
      expect(await room(f, f.organizer)).toMatchObject({
        status: "stopped",
        pickId: first.pickId,
      });

      await open(f, { slot1: a!, slot2: c! }, { firstPick: "slot1" });
      expect((await draftRow(f)).pickStoppedAt).toBeNull();
      const second = live(await room(f, a!));
      expect(second.status).toBe("waiting");
      expect(second.pickId).not.toBe(first.pickId);

      await startFootballPick(f.db, {
        gameId: f.gameId,
        userId: f.organizer.id,
      });
      await pick(f, a!, b!, 1);
      await pick(f, c!, d!, 2);
      expect(live(await room(f, a!))).toMatchObject({
        status: "done",
        pickId: second.pickId,
      });
      await open(f, { slot1: b!, slot2: d! });
      const third = live(await room(f, f.organizer));
      expect([first.pickId, second.pickId]).not.toContain(third.pickId);
    });
  });

  it("needs four registered players and two different captains with an account", async () => {
    await withFootballGame(async (f) => {
      const [a, b, c] = await addPlayers(f, 3);
      await expect(open(f, { slot1: a!, slot2: b! })).rejects.toThrow(
        errors.pickNeedsPlayers(4),
      );
      const [d] = await addPlayers(f, 1);
      await expect(open(f, { slot1: a!, slot2: a! })).rejects.toThrow(
        errors.pickCaptainsDiffer,
      );
      const guest = await insertUser(f.db, "guest", {
        email: null,
        guestAt: new Date(),
        addedAt: new Date(),
      });
      await f.db.insert(gamePlayers).values({
        gameId: f.gameId,
        userId: guest.id,
        footballRole: "outfield",
        footballPosition: "mid",
      });
      await expect(open(f, { slot1: a!, slot2: guest })).rejects.toThrow(
        errors.captainNeedsAccount,
      );
      const outsider = await addMember(f, "outsider");
      await expect(open(f, { slot1: a!, slot2: outsider })).rejects.toThrow(
        errors.registeredOnly,
      );
      await expect(
        open(f, { slot1: a!, slot2: b! }, { userId: c!.id }),
      ).rejects.toThrow();
      expect(await f.db.query.footballLineupDrafts.findMany()).toHaveLength(0);
      expect(d).toBeDefined();
    });
  });

  it("is refused once the teams are published, and while a pick runs", async () => {
    await withFootballGame(async (f) => {
      const [a, b, c, d] = await addPlayers(f, 4);
      await open(f, { slot1: a!, slot2: c! });
      await expect(open(f, { slot1: b!, slot2: d! })).rejects.toThrow(
        errors.pickRunning,
      );
      await publishFootballTeams(f.db, {
        gameId: f.gameId,
        userId: f.organizer.id,
        method: "manual",
        bibs: { slot1: "black", slot2: "white" },
        slot1: [a!.id, b!.id],
        slot2: [c!.id, d!.id],
      });
      await expect(open(f, { slot1: b!, slot2: d! })).rejects.toThrow(
        errors.draftTeamsPublished,
      );
    });
  });
});

describe("while a Captain pick runs", () => {
  it("refuses Save draft and a Captain's answer, waiting or live", async () => {
    await withFootballGame(async (f) => {
      const [a, b, c, d] = await addPlayers(f, 4);
      await open(f, { slot1: a!, slot2: c! });
      const save = () =>
        saveFootballDraft(f.db, {
          gameId: f.gameId,
          userId: f.organizer.id,
          method: "manual",
          bibs: { slot1: "black", slot2: "white" },
          slot1: [a!.id, b!.id],
          slot2: [c!.id, d!.id],
        });
      const answer = () =>
        answerFootballDraft(f.db, {
          gameId: f.gameId,
          userId: a!.id,
          answer: "approved",
        });

      await expect(save()).rejects.toThrow(errors.pickRunning);
      await expect(answer()).rejects.toThrow(errors.pickRunning);
      await startFootballPick(f.db, {
        gameId: f.gameId,
        userId: f.organizer.id,
      });
      await expect(save()).rejects.toThrow(errors.pickRunning);
      await expect(answer()).rejects.toThrow(errors.pickRunning);
      expect(
        await f.db.query.footballLineupDraftAnswers.findMany({
          where: eq(footballLineupDraftAnswers.captainUserId, a!.id),
        }),
      ).toEqual([]);
      expect(
        await f.db.query.footballLineupDraftPlayers.findMany({
          where: eq(footballLineupDraftPlayers.sideIndex, 1),
        }),
      ).toHaveLength(1);
    });
  });

  it("reads the pick on the board, and offers neither Save draft nor a new room", async () => {
    await withFootballGame(async (f) => {
      const [a, , c] = await addPlayers(f, 4);
      expect((await boardFor(f, f.organizer.id)).viewer.canOpenPickRoom).toBe(
        true,
      );
      await open(f, { slot1: a!, slot2: c! });

      const board = await boardFor(f, f.organizer.id);
      expect(board.draft?.pick).toEqual({ status: "waiting" });
      expect(board.viewer).toMatchObject({
        canMakeTeams: true,
        canSaveDraft: false,
        canOpenPickRoom: false,
      });
      const asCaptain = await boardFor(f, a!.id);
      expect(asCaptain.draft?.pick).toEqual({ status: "waiting" });
      expect(asCaptain.viewer).toMatchObject({
        captainOf: 1,
        canAnswerDraft: false,
      });
    });
  });
});
