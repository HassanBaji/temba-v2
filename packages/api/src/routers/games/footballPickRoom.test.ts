import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import {
  GroupMemberRoleEnum,
  courts,
  footballLineupDraftAnswers,
  footballLineupDraftPlayers,
  footballLineupDrafts,
  gamePlayers,
  groupMembers,
  groups,
  user,
  venueVerifiers,
  venues,
} from "@repo/db/schema";
import { createPgliteDb, type TestDatabase } from "@repo/db/testing";
import { messagesFor } from "@repo/i18n/messages";

import { answerFootballDraft } from "#src/routers/games/answerFootballDraft";
import { createGame } from "#src/routers/games/create";
import { footballBoard } from "#src/routers/games/footballBoard";
import { footballPickRoom } from "#src/routers/games/footballPickRoom";
import { kick } from "#src/routers/games/kick";
import { leaveGame } from "#src/routers/games/leave";
import { openFootballPickRoom } from "#src/routers/games/openFootballPickRoom";
import { publishFootballTeams } from "#src/routers/games/publishFootballTeams";
import { register } from "#src/routers/games/register";
import { remindFootballCaptain } from "#src/routers/games/remindFootballCaptain";
import { saveFootballDraft } from "#src/routers/games/saveFootballDraft";
import { startFootballPick } from "#src/routers/games/startFootballPick";
import { stopFootballPick } from "#src/routers/games/stopFootballPick";

const HOUR = 60 * 60 * 1000;
const errors = messagesFor("en").football.errors;
const notFound = messagesFor("en").game.errors.notFound;

type Fixture = {
  db: TestDatabase;
  organizer: { id: string };
  groupId: string;
  venueId: string;
  gameId: string;
};

async function insertUser(
  database: TestDatabase,
  name: string,
  extra: Partial<typeof user.$inferInsert> = {},
) {
  const [row] = await database
    .insert(user)
    .values({
      name,
      email: `${name}-${crypto.randomUUID()}@example.com`,
      ...extra,
    })
    .returning({ id: user.id });
  if (!row) {
    throw new Error("Failed to insert user");
  }
  return row;
}

async function withFootballGame(run: (f: Fixture) => Promise<void>) {
  const { db, close } = await createPgliteDb();
  try {
    const organizer = await insertUser(db, "Hassan Haji");
    const [venue] = await db
      .insert(venues)
      .values({
        name: `Venue ${crypto.randomUUID()}`,
        city: "Manama",
        country: "BH",
      })
      .returning({ id: venues.id });
    const [pitch] = await db
      .insert(courts)
      .values({ venueId: venue!.id, name: "Pitch 1", sport: "football" })
      .returning({ id: courts.id });
    const [group] = await db
      .insert(groups)
      .values({
        name: "Friday Football",
        createdBy: organizer.id,
        sport: "football",
      })
      .returning({ id: groups.id });
    await db
      .insert(groupMembers)
      .values({ groupId: group!.id, userId: organizer.id });
    const windowStart = new Date(Date.now() + HOUR);
    const created = await createGame(db, {
      createdBy: organizer.id,
      groupId: group!.id,
      isPublic: false,
      format: "friendly_game",
      registrationMode: "individual",
      venueId: venue!.id,
      courtId: pitch!.id,
      windowStart,
      windowEnd: new Date(windowStart.getTime() + HOUR),
    });
    await run({
      db,
      organizer,
      groupId: group!.id,
      venueId: venue!.id,
      gameId: created.id,
    });
  } finally {
    await close();
  }
}

async function addMember(
  f: Fixture,
  name: string,
  role: GroupMemberRoleEnum = GroupMemberRoleEnum.MEMBER,
) {
  const member = await insertUser(f.db, name);
  await f.db
    .insert(groupMembers)
    .values({ groupId: f.groupId, userId: member.id, role });
  return member;
}

async function addPlayers(f: Fixture, count: number) {
  const players: { id: string }[] = [];
  for (let index = 0; index < count; index += 1) {
    const player = await addMember(f, `p${index}`);
    await register(f.db, { gameId: f.gameId, userId: player.id });
    players.push(player);
  }
  return players;
}

function open(
  f: Fixture,
  captains: { slot1: { id: string }; slot2: { id: string } },
  extra: Partial<Parameters<typeof openFootballPickRoom>[1]> = {},
  now?: Date,
) {
  return openFootballPickRoom(
    f.db,
    {
      gameId: f.gameId,
      userId: f.organizer.id,
      bibs: { slot1: "black", slot2: "white" },
      captains: { slot1: captains.slot1.id, slot2: captains.slot2.id },
      firstPick: "toss",
      ...extra,
    },
    now,
  );
}

function room(
  f: Fixture,
  viewer: { id: string },
  now?: Date,
  random?: () => number,
) {
  return footballPickRoom(
    f.db,
    { gameId: f.gameId, userId: viewer.id },
    now,
    random,
  );
}

function boardFor(f: Fixture, userId: string) {
  return footballBoard(f.db, { gameId: f.gameId, userId });
}

async function draftRow(f: Fixture) {
  const row = await f.db.query.footballLineupDrafts.findFirst({
    where: eq(footballLineupDrafts.gameId, f.gameId),
  });
  if (!row) {
    throw new Error("No draft");
  }
  return row;
}

async function notificationsOf(f: Fixture, type: string) {
  const rows = await f.db.query.notifications.findMany({
    columns: { type: true, recipientUserId: true, actorUserId: true },
  });
  return rows.filter((row) => row.type === type);
}

function live<T extends { status: string }>(view: T) {
  if (view.status === "stopped") {
    throw new Error("The room is stopped");
  }
  return view as Exclude<T, { status: "stopped" }>;
}

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

  it("reads stopped once the teams are published or the room is replaced by a save", async () => {
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
      expect((await room(f, f.organizer)).status).toBe("stopped");
      await expect(room(f, a!)).rejects.toThrow(notFound);
    });
  });
});

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

describe("games.remindFootballCaptain", () => {
  it("sends one reminder per five minutes; a second press inside the window sends nothing", async () => {
    await withFootballGame(async (f) => {
      const [a, , c] = await addPlayers(f, 4);
      await open(f, { slot1: a!, slot2: c! });
      const t0 = new Date("2026-11-21T10:00:00Z");
      const remind = (at: Date) =>
        remindFootballCaptain(
          f.db,
          { gameId: f.gameId, userId: a!.id, side: 2 },
          at,
        );

      expect(await remind(t0)).toEqual({ sent: true });
      expect(await remind(new Date(t0.getTime() + 60_000))).toEqual({
        sent: false,
      });
      const reminders = await notificationsOf(f, "football_pick_reminder");
      expect(reminders).toEqual([
        {
          type: "football_pick_reminder",
          recipientUserId: c!.id,
          actorUserId: a!.id,
        },
      ]);
      expect(await remind(new Date(t0.getTime() + 5 * 60_000))).toEqual({
        sent: true,
      });
      expect(await notificationsOf(f, "football_pick_reminder")).toHaveLength(
        2,
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
