import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import {
  GroupMemberRoleEnum,
  footballLineupDrafts,
  games,
  venueVerifiers,
} from "@repo/db/schema";
import { messagesFor } from "@repo/i18n/messages";

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
  startLive,
  undo,
  withFootballGame,
} from "#src/routers/games/football-pick-room.test-support";
import { kick } from "#src/routers/games/kick";
import { leaveGame } from "#src/routers/games/leave";
import { publishFootballTeams } from "#src/routers/games/publishFootballTeams";
import { saveFootballDraft } from "#src/routers/games/saveFootballDraft";
import { stopFootballPick } from "#src/routers/games/stopFootballPick";

const errors = messagesFor("en").football.errors;
const notFound = messagesFor("en").game.errors.notFound;

describe("games.footballPickRoom", () => {
  it("is read by the Organizers and the two captains, and by nobody else", async () => {
    await withFootballGame(async (f) => {
      const [a, b, c, d] = await addPlayers(f, 4);
      await open(f, { slot1: a!, slot2: c! });
      const coOrganizer = await addMember(
        f,
        "co-organizer",
        GroupMemberRoleEnum.ORGANIZER,
      );
      const member = await addMember(f, "member");
      const verifier = await insertUser(f.db, "verifier");
      await f.db
        .insert(venueVerifiers)
        .values({ venueId: f.venueId, userId: verifier.id, kind: "referee" });

      for (const viewer of [f.organizer, coOrganizer, a!]) {
        expect((await room(f, viewer)).status).toBe("waiting");
      }
      expect((await room(f, c!)).status).toBe("live");
      for (const viewer of [b!, d!, member, verifier]) {
        await expect(room(f, viewer)).rejects.toThrow(notFound);
      }
    });
  });

  it("shows each captain the other in the room within the window, and gone after ten seconds", async () => {
    await withFootballGame(async (f) => {
      const [a, , c] = await addPlayers(f, 4);
      await open(f, { slot1: a!, slot2: c! }, { firstPick: "slot1" });
      const t0 = new Date();
      const at = (ms: number) => new Date(t0.getTime() + ms);

      const first = live(await room(f, a!, t0));
      expect(first.viewer).toEqual({
        role: "captain",
        side: 1,
        isOrganizer: false,
      });
      expect(first.captains.slot1).toEqual({ userId: a!.id, inRoom: true });
      expect(first.captains.slot2).toEqual({ userId: c!.id, inRoom: false });

      const organizer = live(await room(f, f.organizer, at(9_000)));
      expect(organizer.captains.slot1?.inRoom).toBe(true);
      expect(organizer.status).toBe("waiting");
      const later = live(await room(f, f.organizer, at(11_000)));
      expect(later.captains.slot1?.inRoom).toBe(false);
    });
  });

  it("writes a captain's presence at most once every three seconds", async () => {
    await withFootballGame(async (f) => {
      const [a, , c] = await addPlayers(f, 4);
      await open(f, { slot1: a!, slot2: c! });
      const t0 = new Date();
      await room(f, a!, t0);
      await room(f, a!, new Date(t0.getTime() + 2_000));
      expect((await draftRow(f)).slot1CaptainSeenAt).toEqual(t0);
      const t3 = new Date(t0.getTime() + 3_000);
      await room(f, a!, t3);
      expect((await draftRow(f)).slot1CaptainSeenAt).toEqual(t3);
      expect((await draftRow(f)).slot2CaptainSeenAt).toBeNull();
    });
  });

  it("goes live on the read that finds both captains in, with the toss made once", async () => {
    await withFootballGame(async (f) => {
      const [a, , c] = await addPlayers(f, 4);
      await open(f, { slot1: a!, slot2: c! });
      const t0 = new Date();
      let tosses = 0;
      const toss = () => {
        tosses += 1;
        return 0.9;
      };

      expect((await room(f, a!, t0, toss)).status).toBe("waiting");
      const started = live(
        await room(f, c!, new Date(t0.getTime() + 1_000), toss),
      );
      expect(started.status).toBe("live");
      expect(started.firstPickSide).toBe(2);
      expect(tosses).toBe(1);

      const again = live(
        await room(f, a!, new Date(t0.getTime() + 4_000), () => 0.1),
      );
      expect(again.status).toBe("live");
      expect(again.firstPickSide).toBe(2);
      expect((await boardFor(f, f.organizer.id)).draft?.pick).toEqual({
        status: "live",
      });
    });
  });

  it("starts once under concurrent reads", async () => {
    await withFootballGame(async (f) => {
      const [a, , c] = await addPlayers(f, 4);
      await open(f, { slot1: a!, slot2: c! });
      const t0 = new Date();
      await room(f, a!, t0);
      await f.db
        .update(footballLineupDrafts)
        .set({ slot2CaptainSeenAt: t0 })
        .where(eq(footballLineupDrafts.gameId, f.gameId));
      let tosses = 0;
      const toss = () => {
        tosses += 1;
        return tosses === 1 ? 0.1 : 0.9;
      };
      const at = new Date(t0.getTime() + 1_000);
      const reads = await Promise.all([
        room(f, a!, at, toss),
        room(f, c!, at, toss),
        room(f, f.organizer, at, toss),
      ]);
      expect(reads.map((read) => read.status)).toEqual([
        "live",
        "live",
        "live",
      ]);
      expect(tosses).toBe(1);
      expect((await draftRow(f)).firstPickSide).toBe(1);
      expect(reads.map((read) => live(read).firstPickSide)).toEqual([1, 1, 1]);
    });
  });

  it("goes first with the side the Organizer named", async () => {
    await withFootballGame(async (f) => {
      const [a, , c] = await addPlayers(f, 4);
      await open(f, { slot1: a!, slot2: c! }, { firstPick: "slot2" });
      const t0 = new Date();
      await room(f, a!, t0, () => 0.1);
      const started = live(await room(f, c!, t0, () => 0.1));
      expect(started.firstPick).toBe("slot2");
      expect(started.firstPickSide).toBe(2);
    });
  });

  it("stops the pick when a captain leaves or is kicked, keeping the sides", async () => {
    await withFootballGame(async (f) => {
      const [a, b, c, d] = await addPlayers(f, 5);
      await open(f, { slot1: a!, slot2: c! });
      await leaveGame(f.db, { gameId: f.gameId, userId: c!.id });

      expect((await boardFor(f, f.organizer.id)).draft?.pick).toBeNull();
      expect((await room(f, a!)).status).toBe("stopped");
      const row = await draftRow(f);
      expect(row).toMatchObject({
        method: "manual",
        pickStatus: null,
        firstPick: null,
      });
      expect(row.pickStoppedAt).not.toBeNull();
      const board = await boardFor(f, f.organizer.id);
      expect(board.draft).toMatchObject({
        method: "manual",
        sides: { slot1: [a!.id], slot2: [] },
        captains: { slot1: a!.id, slot2: null },
        pick: null,
      });
      expect(board.viewer.canSaveDraft).toBe(true);

      await open(f, { slot1: b!, slot2: d! });
      await kick(f.db, {
        gameId: f.gameId,
        organizerUserId: f.organizer.id,
        userId: b!.id,
      });
      expect((await room(f, f.organizer)).status).toBe("stopped");
      expect((await draftRow(f)).pickStatus).toBeNull();
    });
  });

  it("reads a live pick that lost a captain as stopped, naming the pick, to everyone still in it", async () => {
    await withFootballGame(async (f) => {
      const [a, b, c, d] = await addPlayers(f, 5);
      await startLive(f, { slot1: a!, slot2: c! });
      await pick(f, a!, b!, 1);
      const { pickId } = live(await room(f, a!));
      await leaveGame(f.db, { gameId: f.gameId, userId: c!.id });

      const now = new Date();
      expect(await room(f, a!, now)).toEqual({
        status: "stopped",
        pickId,
        serverNow: now,
      });
      expect(await room(f, f.organizer)).toMatchObject({
        status: "stopped",
        pickId,
      });
      expect(await draftRow(f)).toMatchObject({
        pickStatus: null,
        pickStoppedAt: now,
      });
      for (const viewer of [b!, c!, d!]) {
        await expect(room(f, viewer)).rejects.toThrow(notFound);
      }
    });
  });

  it("names the same pick on every read, through picks, an undo and the finish", async () => {
    await withFootballGame(async (f) => {
      const [a, b, c, d] = await addPlayers(f, 4);
      await open(f, { slot1: a!, slot2: c! }, { firstPick: "slot1" });
      const pickIds = new Set<string>();
      const read = async (viewer: { id: string }) => {
        const view = live(await room(f, viewer));
        pickIds.add(view.pickId);
        return view.status;
      };

      expect(await read(f.organizer)).toBe("waiting");
      await read(a!);
      expect(await read(c!)).toBe("live");
      await pick(f, a!, b!, 1);
      await read(c!);
      await undo(f, f.organizer, 1);
      await read(a!);
      await pick(f, a!, d!, 1);
      await pick(f, c!, b!, 2);
      for (const viewer of [f.organizer, a!, c!]) {
        expect(await read(viewer)).toBe("done");
      }

      expect([...pickIds]).toEqual([(await draftRow(f)).pickId]);
    });
  });

  it("reads closed, never stopped, once a finished pick is published", async () => {
    await withFootballGame(async (f) => {
      const [a, b, c, d] = await addPlayers(f, 4);
      await startLive(f, { slot1: a!, slot2: c! });
      await pick(f, a!, b!, 1);
      await pick(f, c!, d!, 2);
      expect((await room(f, a!)).status).toBe("done");
      const draft = (await boardFor(f, f.organizer.id)).draft!;
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

      const now = new Date();
      expect(await room(f, f.organizer, now)).toEqual({
        status: "closed",
        serverNow: now,
      });
      for (const viewer of [a!, c!, b!]) {
        await expect(room(f, viewer)).rejects.toThrow(notFound);
      }
    });
  });

  it("reads closed for a draft that was never a Captain pick", async () => {
    await withFootballGame(async (f) => {
      const [a, b, c, d] = await addPlayers(f, 4);
      await saveFootballDraft(f.db, {
        gameId: f.gameId,
        userId: f.organizer.id,
        method: "manual",
        bibs: { slot1: "black", slot2: "white" },
        slot1: [a!.id, b!.id],
        slot2: [c!.id, d!.id],
        captains: { slot1: a!.id, slot2: null },
      });

      expect((await room(f, f.organizer)).status).toBe("closed");
      expect((await room(f, a!)).status).toBe("closed");
      await expect(room(f, b!)).rejects.toThrow(notFound);
    });
  });

  it("reads closed to the Organizers alone once a stopped pick is published", async () => {
    await withFootballGame(async (f) => {
      const [a, b, c, d] = await addPlayers(f, 4);
      await open(f, { slot1: a!, slot2: c! });
      await stopFootballPick(f.db, {
        gameId: f.gameId,
        userId: f.organizer.id,
      });
      expect((await room(f, a!)).status).toBe("stopped");
      await publishFootballTeams(f.db, {
        gameId: f.gameId,
        userId: f.organizer.id,
        method: "manual",
        bibs: { slot1: "black", slot2: "white" },
        slot1: [a!.id, b!.id],
        slot2: [c!.id, d!.id],
      });
      expect((await room(f, f.organizer)).status).toBe("closed");
      await expect(room(f, a!)).rejects.toThrow(notFound);
    });
  });

  it("refuses a cancelled Game to the Organizer and the captains, running or finished", async () => {
    await withFootballGame(async (f) => {
      const [a, b, c, d] = await addPlayers(f, 4);
      await startLive(f, { slot1: a!, slot2: c! });
      const cancel = () =>
        f.db
          .update(games)
          .set({ cancelledAt: new Date() })
          .where(eq(games.id, f.gameId));
      const refused = {
        code: "FORBIDDEN",
        message: messagesFor("en").game.errors.cancelled,
      };

      await cancel();
      for (const viewer of [f.organizer, a!, c!]) {
        await expect(room(f, viewer)).rejects.toMatchObject(refused);
      }
      await expect(room(f, b!)).rejects.toThrow(notFound);
      expect((await draftRow(f)).pickStatus).toBe("live");

      await f.db
        .update(games)
        .set({ cancelledAt: null })
        .where(eq(games.id, f.gameId));
      await pick(f, a!, b!, 1);
      await pick(f, c!, d!, 2);
      expect((await room(f, a!)).status).toBe("done");
      await cancel();
      await expect(room(f, a!)).rejects.toMatchObject(refused);
    });
  });
});

describe("a pick whose pool empties without a pick", () => {
  it("finishes on the next read when the last player in the pool leaves, telling every Game admin once", async () => {
    await withFootballGame(async (f) => {
      const [a, b, c, d, e] = await addPlayers(f, 5);
      await startLive(f, { slot1: a!, slot2: c! });
      await pick(f, a!, b!, 1);
      await pick(f, c!, d!, 2);

      await leaveGame(f.db, { gameId: f.gameId, userId: e!.id });
      const [first, second] = await Promise.all([
        room(f, a!),
        room(f, f.organizer),
      ]);
      expect(first.status).toBe("done");
      expect(second.status).toBe("done");

      expect((await draftRow(f)).pickStatus).toBe("done");
      const board = await boardFor(f, c!.id);
      expect(board.draft?.answers.slot1.state).toBe("approved");
      expect(board.draft?.answers.slot2.state).toBe("approved");
      const done = await notificationsOf(f, "football_pick_done");
      expect(done.map((row) => row.recipientUserId)).toEqual([f.organizer.id]);
      expect(done[0]?.actorUserId).toBeNull();
      await expect(pick(f, a!, e!, 3)).rejects.toThrow(errors.pickNotLive);
    });
  });
});
