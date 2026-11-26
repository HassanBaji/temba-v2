import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import { GroupMemberRoleEnum, footballLineupDrafts } from "@repo/db/schema";
import { messagesFor } from "@repo/i18n/messages";

import {
  addMember,
  addPlayers,
  boardFor,
  draftRow,
  live,
  notificationsOf,
  open,
  pick,
  room,
  startLive,
  undo,
  withFootballGame,
} from "#src/routers/games/football-pick-room.test-support";
import { leaveGame } from "#src/routers/games/leave";
import { pickFootballPlayer } from "#src/routers/games/pickFootballPlayer";
import { publishFootballTeams } from "#src/routers/games/publishFootballTeams";
import { register } from "#src/routers/games/register";
import { startFootballPick } from "#src/routers/games/startFootballPick";

const errors = messagesFor("en").football.errors;
const notFound = messagesFor("en").game.errors.notFound;

describe("games.pickFootballPlayer", () => {
  it("lets the captains pick in turn, each seeing the other's pick on the next read", async () => {
    await withFootballGame(async (f) => {
      const [a, b, c, d, e, g] = await addPlayers(f, 6);
      await startLive(f, { slot1: a!, slot2: c! });

      const before = live(await room(f, c!));
      expect(before.turn).toBe(1);
      expect(before.picks).toEqual({ made: 0, total: 4, next: 1 });

      expect(await pick(f, a!, b!, 1)).toEqual({
        ok: true,
        pickNumber: 1,
        side: 1,
        done: false,
      });
      const seen = live(await room(f, c!));
      expect(seen.sides.slot1).toEqual([
        { userId: a!.id, pickNumber: null },
        { userId: b!.id, pickNumber: 1 },
      ]);
      expect(seen.pool).toEqual([d!.id, e!.id, g!.id]);
      expect(seen.turn).toBe(2);
      expect(seen.picks).toEqual({ made: 1, total: 4, next: 2 });

      await pick(f, c!, e!, 2);
      const after = live(await room(f, a!));
      expect(after.sides.slot2).toEqual([
        { userId: c!.id, pickNumber: null },
        { userId: e!.id, pickNumber: 2 },
      ]);
      expect(after.turn).toBe(1);
    });
  });

  it("refuses a pick out of turn, of a player not in the pool, on a stale pick number, or before the pick is live", async () => {
    await withFootballGame(async (f) => {
      const [a, b, c, d] = await addPlayers(f, 5);
      const outsider = await addMember(f, "outsider");
      await open(f, { slot1: a!, slot2: c! }, { firstPick: "slot1" });
      await expect(pick(f, a!, b!, 1)).rejects.toThrow(errors.pickNotLive);
      await startFootballPick(f.db, {
        gameId: f.gameId,
        userId: f.organizer.id,
      });

      await expect(pick(f, c!, b!, 1)).rejects.toThrow(errors.pickNotYourTurn);
      await expect(pick(f, a!, c!, 1)).rejects.toThrow(errors.pickNotInPool);
      await expect(pick(f, a!, outsider, 1)).rejects.toThrow(
        errors.pickNotInPool,
      );
      await expect(pick(f, a!, b!, 2)).rejects.toMatchObject({
        code: "CONFLICT",
        message: errors.pickMovedOn,
      });
      await pick(f, a!, b!, 1);
      await expect(pick(f, c!, d!, 1)).rejects.toThrow(errors.pickMovedOn);
      await expect(pick(f, c!, b!, 2)).rejects.toThrow(errors.pickNotInPool);
      expect(live(await room(f, f.organizer)).picks.made).toBe(1);
    });
  });

  it("is refused to a player who is not a captain, and to an Organizer who does not name the side", async () => {
    await withFootballGame(async (f) => {
      const [a, b, c, d] = await addPlayers(f, 4);
      await startLive(f, { slot1: a!, slot2: c! });
      await expect(pick(f, b!, d!, 1)).rejects.toThrow(notFound);
      await expect(pick(f, b!, d!, 1, 1)).rejects.toThrow(notFound);
      await expect(pick(f, f.organizer, d!, 1)).rejects.toThrow(
        errors.pickOnTurnOnly,
      );
      await expect(pick(f, a!, d!, 1, 1)).rejects.toThrow(
        errors.pickOnTurnOnly,
      );
      await expect(room(f, b!)).rejects.toThrow(notFound);
      expect(live(await room(f, f.organizer)).picks.made).toBe(0);
    });
  });

  it("lets an Organizer pick for the side on turn, whether or not its captain is in the room", async () => {
    await withFootballGame(async (f) => {
      const [a, b, c, d, e] = await addPlayers(f, 6);
      await startLive(f, { slot1: a!, slot2: c! }, "slot2");
      expect(live(await room(f, f.organizer)).captains.slot2?.inRoom).toBe(
        false,
      );

      await expect(pick(f, f.organizer, b!, 1, 1)).rejects.toThrow(
        errors.pickNotYourTurn,
      );
      await pick(f, f.organizer, b!, 1, 2);
      await room(f, a!);
      await pick(f, f.organizer, d!, 2, 1);
      const view = live(await room(f, f.organizer));
      expect(view.sides.slot2.map((row) => row.userId)).toEqual([c!.id, b!.id]);
      expect(view.sides.slot1.map((row) => row.userId)).toEqual([a!.id, d!.id]);
      expect(view.turn).toBe(2);
      await pick(f, c!, e!, 3);
    });
  });

  it("lands one of two picks sent at once for the same pick number", async () => {
    await withFootballGame(async (f) => {
      const [a, b, c, d] = await addPlayers(f, 6);
      await startLive(f, { slot1: a!, slot2: c! });

      const results = await Promise.allSettled([
        pick(f, a!, b!, 1),
        pick(f, f.organizer, d!, 1, 1),
      ]);
      expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
      const refused = results.find((r) => r.status === "rejected");
      expect(refused?.reason).toMatchObject({
        code: "CONFLICT",
        message: errors.pickMovedOn,
      });
      const view = live(await room(f, f.organizer));
      expect(view.picks).toMatchObject({ made: 1, next: 2 });
      expect(view.sides.slot1).toHaveLength(2);
      expect(view.sides.slot2).toHaveLength(1);
    });
  });

  it("finishes on the last pick: the draft is saved with both answers approved and the Game admins hear once", async () => {
    await withFootballGame(async (f) => {
      const coOrganizer = await addMember(
        f,
        "co-organizer",
        GroupMemberRoleEnum.ORGANIZER,
      );
      const [a, b, c, d, e] = await addPlayers(f, 5);
      await startLive(f, { slot1: a!, slot2: c! });
      const openedAt = (await draftRow(f)).savedAt;

      await pick(f, a!, b!, 1);
      await pick(f, c!, d!, 2);
      const finishedAt = new Date(openedAt.getTime() + 60_000);
      expect(
        await pickFootballPlayer(
          f.db,
          {
            gameId: f.gameId,
            userId: a!.id,
            pickedUserId: e!.id,
            pickNumber: 3,
          },
          finishedAt,
        ),
      ).toMatchObject({ side: 1, done: true });

      expect(await draftRow(f)).toMatchObject({
        method: "captain_pick",
        pickStatus: "done",
        savedAt: finishedAt,
      });
      const answers = await f.db.query.footballLineupDraftAnswers.findMany();
      expect(
        answers.map((row) => [row.sideIndex, row.captainUserId, row.answer]),
      ).toEqual(
        expect.arrayContaining([
          [1, a!.id, "approved"],
          [2, c!.id, "approved"],
        ]),
      );
      for (const captain of [a!, c!]) {
        const board = await boardFor(f, captain.id);
        expect(board.draft).toMatchObject({
          sides: {
            slot1: expect.arrayContaining([a!.id, b!.id, e!.id]),
            slot2: expect.arrayContaining([c!.id, d!.id]),
          },
          pick: { status: "done" },
        });
        expect(board.draft?.answers.slot1.state).toBe("approved");
        expect(board.draft?.answers.slot2.state).toBe("approved");
      }
      const done = await notificationsOf(f, "football_pick_done");
      expect(done.map((row) => row.recipientUserId).sort()).toEqual(
        [f.organizer.id, coOrganizer.id].sort(),
      );
      expect(done.every((row) => row.actorUserId === a!.id)).toBe(true);
      expect(await notificationsOf(f, "football_draft_approved")).toEqual([]);

      const finished = live(await room(f, c!));
      expect(finished.status).toBe("done");
      expect(finished.turn).toBeNull();
      expect(finished.pool).toEqual([]);
      await expect(pick(f, c!, e!, 4)).rejects.toThrow(errors.pickNotLive);
      await expect(undo(f, f.organizer, 3)).rejects.toThrow(errors.pickNotLive);
      expect(await notificationsOf(f, "football_pick_done")).toHaveLength(2);
    });
  });

  it("never tells the Organizer who makes the last pick", async () => {
    await withFootballGame(async (f) => {
      const [a, b, c, d] = await addPlayers(f, 4);
      await startLive(f, { slot1: a!, slot2: c! }, "slot2");
      await pick(f, f.organizer, b!, 1, 2);
      expect(await pick(f, f.organizer, d!, 2, 1)).toMatchObject({
        done: true,
      });
      expect((await draftRow(f)).pickStatus).toBe("done");
      expect(await notificationsOf(f, "football_pick_done")).toEqual([]);
    });
  });

  it("publishes a finished pick from its draft, as a Captain pick with both captains", async () => {
    await withFootballGame(async (f) => {
      const [a, b, c, d] = await addPlayers(f, 4);
      await startLive(f, { slot1: a!, slot2: c! });
      await pick(f, a!, b!, 1);
      await pick(f, c!, d!, 2);
      const draft = (await boardFor(f, f.organizer.id)).draft!;
      expect(draft.method).toBe("captain_pick");

      await publishFootballTeams(f.db, {
        gameId: f.gameId,
        userId: f.organizer.id,
        method: draft.method,
        bibs: draft.bibs,
        slot1: draft.sides.slot1,
        slot2: draft.sides.slot2,
        captains: draft.captains,
        draftUpdatedAt: draft.updatedAt,
      });

      const board = await boardFor(f, b!.id);
      expect(board.draft).toBeNull();
      expect(board.teams).toMatchObject({
        method: "captain_pick",
        captains: { slot1: a!.id, slot2: c!.id },
      });
    });
  });

  it("follows the roster: a picked player who leaves gives their side the turn, a late joiner joins the pool", async () => {
    await withFootballGame(async (f) => {
      const [a, b, c, d, e, g] = await addPlayers(f, 6);
      await startLive(f, { slot1: a!, slot2: c! });
      await pick(f, a!, b!, 1);
      await pick(f, c!, d!, 2);
      expect(live(await room(f, f.organizer)).turn).toBe(1);

      await leaveGame(f.db, { gameId: f.gameId, userId: d!.id });
      const afterLeave = live(await room(f, f.organizer));
      expect(afterLeave.status).toBe("live");
      expect(afterLeave.turn).toBe(2);
      expect(afterLeave.picks).toEqual({ made: 1, total: 3, next: 2 });
      await expect(pick(f, a!, e!, 2)).rejects.toThrow(errors.pickNotYourTurn);
      await pick(f, c!, e!, 2);

      const late = await addMember(f, "late");
      await register(f.db, { gameId: f.gameId, userId: late.id });
      const afterJoin = live(await room(f, a!));
      expect(afterJoin.pool).toEqual([g!.id, late.id]);
      expect(afterJoin.picks).toEqual({ made: 2, total: 4, next: 3 });
      expect(afterJoin.turn).toBe(1);
      await pick(f, a!, late, 3);
      expect(live(await room(f, c!)).turn).toBe(2);
    });
  });

  it("refuses a pick while a live pick has no first pick side, placing nobody", async () => {
    await withFootballGame(async (f) => {
      const [a, b, c] = await addPlayers(f, 4);
      await startLive(f, { slot1: a!, slot2: c! }, "slot2");
      await f.db
        .update(footballLineupDrafts)
        .set({ firstPickSide: null })
        .where(eq(footballLineupDrafts.gameId, f.gameId));

      await expect(pick(f, a!, b!, 1)).rejects.toMatchObject({
        code: "INTERNAL_SERVER_ERROR",
      });
      expect(
        await f.db.query.footballLineupDraftPlayers.findMany(),
      ).toHaveLength(2);
    });
  });
});
