import { and, eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import {
  GroupMemberRoleEnum,
  courts,
  footballLineupDraftAnswers,
  footballLineupDrafts,
  gamePlayers,
  gameTeams,
  groupMembers,
  groups,
  notifications,
  user,
  venues,
} from "@repo/db/schema";
import { createPgliteDb, type TestDatabase } from "@repo/db/testing";
import { messagesFor } from "@repo/i18n/messages";

import { answerFootballDraft } from "#src/routers/games/answerFootballDraft";
import { createGame } from "#src/routers/games/create";
import { footballBoard } from "#src/routers/games/footballBoard";
import { kick } from "#src/routers/games/kick";
import { leaveGame } from "#src/routers/games/leave";
import { publishFootballTeams } from "#src/routers/games/publishFootballTeams";
import { register } from "#src/routers/games/register";
import { saveFootballDraft } from "#src/routers/games/saveFootballDraft";
import { setFootballRole } from "#src/routers/games/setFootballRole";

const HOUR = 60 * 60 * 1000;
const errors = messagesFor("en").football.errors;

type Fixture = {
  db: TestDatabase;
  organizer: { id: string };
  groupId: string;
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
    await run({ db, organizer, groupId: group!.id, gameId: created.id });
  } finally {
    await close();
  }
}

async function addPlayers(f: Fixture, count: number) {
  const players: { id: string }[] = [];
  for (let index = 0; index < count; index += 1) {
    const player = await insertUser(f.db, `p${index}`);
    await f.db
      .insert(groupMembers)
      .values({ groupId: f.groupId, userId: player.id });
    await register(f.db, { gameId: f.gameId, userId: player.id });
    players.push(player);
  }
  return players;
}

/** A Guest player or an Unclaimed player, seated by hand as the Organizer adds them. */
async function seatWithoutAccount(f: Fixture, kind: "guest" | "unclaimed") {
  const player = await insertUser(
    f.db,
    kind,
    kind === "guest"
      ? { email: null, guestAt: new Date(), addedAt: new Date() }
      : {
          email: null,
          phoneNumber: `+9733${Math.floor(1_000_000 + Math.random() * 8_999_999)}`,
          addedAt: new Date(),
        },
  );
  await f.db.insert(gamePlayers).values({
    gameId: f.gameId,
    userId: player.id,
    footballRole: "outfield",
    footballPosition: "mid",
  });
  return player;
}

function ids(players: { id: string }[]) {
  return players.map((player) => player.id);
}

function save(
  f: Fixture,
  slot1: { id: string }[],
  slot2: { id: string }[],
  captains?: { slot1: { id: string } | null; slot2: { id: string } | null },
  now?: Date,
) {
  return saveFootballDraft(
    f.db,
    {
      gameId: f.gameId,
      userId: f.organizer.id,
      method: "manual",
      bibs: { slot1: "black", slot2: "white" },
      slot1: ids(slot1),
      slot2: ids(slot2),
      captains: captains
        ? {
            slot1: captains.slot1?.id ?? null,
            slot2: captains.slot2?.id ?? null,
          }
        : undefined,
    },
    now,
  );
}

function answer(
  f: Fixture,
  captain: { id: string },
  value: "approved" | "change_asked" | null,
  note?: string,
) {
  return answerFootballDraft(f.db, {
    gameId: f.gameId,
    userId: captain.id,
    answer: value,
    note,
  });
}

function boardFor(f: Fixture, userId: string) {
  return footballBoard(f.db, { gameId: f.gameId, userId });
}

async function notificationsOf(f: Fixture, type: string) {
  const rows = await f.db.query.notifications.findMany({
    columns: { type: true, recipientUserId: true, actorUserId: true },
  });
  return rows.filter((row) => row.type === type);
}

describe("naming Side captains on a Draft line-up (ADR-0108)", () => {
  it("stores one captain per side, or none", async () => {
    await withFootballGame(async (f) => {
      const [a, b, c, d] = await addPlayers(f, 4);
      await save(f, [a!, b!], [c!, d!], { slot1: a!, slot2: null });

      const board = await boardFor(f, f.organizer.id);
      expect(board.draft?.captains).toEqual({ slot1: a!.id, slot2: null });
      expect(board.draft?.answers).toEqual({
        slot1: { state: "waiting", answeredAt: null, note: null },
        slot2: { state: "none", answeredAt: null, note: null },
      });
    });
  });

  it("refuses a captain from the other side, a Guest player and an Unclaimed player", async () => {
    await withFootballGame(async (f) => {
      const [a, b] = await addPlayers(f, 2);
      const guest = await seatWithoutAccount(f, "guest");
      const unclaimed = await seatWithoutAccount(f, "unclaimed");

      await expect(
        save(f, [a!], [b!], { slot1: b!, slot2: null }),
      ).rejects.toThrow(errors.captainOnSide);
      await expect(
        save(f, [a!, guest], [b!], { slot1: guest, slot2: null }),
      ).rejects.toThrow(errors.captainNeedsAccount);
      await expect(
        save(f, [a!], [b!, unclaimed], { slot1: null, slot2: unclaimed }),
      ).rejects.toThrow(errors.captainNeedsAccount);
      expect(await f.db.query.footballLineupDrafts.findMany()).toHaveLength(0);
    });
  });

  it("keeps a saved captain on a save without captains while they stay on their side", async () => {
    await withFootballGame(async (f) => {
      const [a, b, c, d] = await addPlayers(f, 4);
      await save(f, [a!, b!], [c!, d!], { slot1: a!, slot2: c! });
      await save(f, [a!, c!], [b!, d!]);

      const board = await boardFor(f, f.organizer.id);
      expect(board.draft?.captains).toEqual({ slot1: a!.id, slot2: null });
    });
  });

  it("tells a captain once when first named, and never the Organizer who saved", async () => {
    await withFootballGame(async (f) => {
      const [a, b, c, d] = await addPlayers(f, 4);
      await save(f, [a!, b!], [c!, d!]);
      expect(await notificationsOf(f, "football_draft_shared")).toHaveLength(0);

      await save(f, [a!, b!], [c!, d!], { slot1: a!, slot2: c! });
      await save(f, [a!, b!], [c!, d!], { slot1: null, slot2: c! });
      await save(f, [a!, b!], [c!, d!], { slot1: a!, slot2: c! });

      const shared = await notificationsOf(f, "football_draft_shared");
      expect(shared.map((row) => row.recipientUserId).sort()).toEqual(
        [a!.id, c!.id].sort(),
      );
      expect(shared.every((row) => row.actorUserId === f.organizer.id)).toBe(
        true,
      );
    });
  });

  it("does not ask an Organizer who captains a side: nobody to ask", async () => {
    await withFootballGame(async (f) => {
      const [a, b, c] = await addPlayers(f, 3);
      const coOrganizer = await insertUser(f.db, "co");
      await f.db.insert(groupMembers).values({
        groupId: f.groupId,
        userId: coOrganizer.id,
        role: GroupMemberRoleEnum.ORGANIZER,
      });
      await register(f.db, { gameId: f.gameId, userId: coOrganizer.id });
      await save(f, [a!, coOrganizer], [b!, c!], {
        slot1: coOrganizer,
        slot2: null,
      });

      const board = await boardFor(f, f.organizer.id);
      expect(board.draft?.answers.slot1.state).toBe("none");
      expect(await notificationsOf(f, "football_draft_shared")).toHaveLength(0);
      const own = await boardFor(f, coOrganizer.id);
      expect(own.viewer.canAnswerDraft).toBe(false);
      await expect(answer(f, coOrganizer, "approved")).rejects.toThrow(
        errors.draftNotCaptain,
      );
    });
  });
});

describe("who reads the draft with Side captains", () => {
  it("is each captain, who sees both sides; another player still gets null", async () => {
    await withFootballGame(async (f) => {
      const [a, b, c, d] = await addPlayers(f, 4);
      await save(f, [a!, b!], [c!, d!], { slot1: a!, slot2: c! });

      const captain = await boardFor(f, a!.id);
      expect(captain.draft?.sides).toEqual({
        slot1: [a!.id, b!.id],
        slot2: [c!.id, d!.id],
      });
      expect(captain.viewer.captainOf).toBe(1);
      expect(captain.viewer.canAnswerDraft).toBe(true);
      expect(captain.viewer.canSaveDraft).toBe(false);
      expect((await boardFor(f, c!.id)).viewer.captainOf).toBe(2);

      const player = await boardFor(f, b!.id);
      expect(player.draft).toBeNull();
      expect(player.viewer.captainOf).toBeNull();
      expect(player.viewer.canAnswerDraft).toBe(false);
    });
  });

  it("drops a captain who is replaced", async () => {
    await withFootballGame(async (f) => {
      const [a, b, c, d] = await addPlayers(f, 4);
      await save(f, [a!, b!], [c!, d!], { slot1: a!, slot2: c! });
      await save(f, [a!, b!], [c!, d!], { slot1: b!, slot2: c! });

      expect((await boardFor(f, a!.id)).draft).toBeNull();
      expect((await boardFor(f, b!.id)).draft).not.toBeNull();
      await expect(answer(f, a!, "approved")).rejects.toThrow(
        errors.draftNotCaptain,
      );
    });
  });

  it("sends a note to the Organizers and its writer; the other captain gets the state only", async () => {
    await withFootballGame(async (f) => {
      const [a, b, c, d] = await addPlayers(f, 4);
      await save(f, [a!, b!], [c!, d!], { slot1: a!, slot2: c! });
      await answer(f, a!, "change_asked", "Swap b and d please");

      const organizer = await boardFor(f, f.organizer.id);
      expect(organizer.draft?.answers.slot1).toMatchObject({
        state: "change_asked",
        note: "Swap b and d please",
      });
      const writer = await boardFor(f, a!.id);
      expect(writer.draft?.answers.slot1.note).toBe("Swap b and d please");
      const other = await boardFor(f, c!.id);
      expect(other.draft?.answers.slot1).toMatchObject({
        state: "change_asked",
        note: null,
      });
    });
  });
});

describe("games.answerFootballDraft", () => {
  it("approves, asks for a change with a note, and undoes, for the captain's own side", async () => {
    await withFootballGame(async (f) => {
      const [a, b, c, d] = await addPlayers(f, 4);
      await save(f, [a!, b!], [c!, d!], { slot1: a!, slot2: c! });

      await answer(f, a!, "approved");
      let board = await boardFor(f, f.organizer.id);
      expect(board.draft?.answers.slot1.state).toBe("approved");
      expect(board.draft?.answers.slot1.answeredAt).toBeInstanceOf(Date);
      expect(board.draft?.answers.slot2.state).toBe("waiting");

      await answer(f, c!, "change_asked", "  More keepers  ");
      board = await boardFor(f, f.organizer.id);
      expect(board.draft?.answers.slot2).toMatchObject({
        state: "change_asked",
        note: "More keepers",
      });

      await answer(f, a!, null);
      board = await boardFor(f, f.organizer.id);
      expect(board.draft?.answers.slot1.state).toBe("waiting");
      expect(board.draft?.answers.slot2.state).toBe("change_asked");
    });
  });

  it("is refused to a player who is not a captain, and to the Organizer", async () => {
    await withFootballGame(async (f) => {
      const [a, b, c, d] = await addPlayers(f, 4);
      await save(f, [a!, b!], [c!, d!], { slot1: a!, slot2: null });

      await expect(answer(f, b!, "approved")).rejects.toThrow(
        errors.draftNotCaptain,
      );
      await expect(answer(f, f.organizer, "approved")).rejects.toThrow(
        errors.draftNotCaptain,
      );
      expect(
        await f.db.query.footballLineupDraftAnswers.findMany(),
      ).toHaveLength(0);
    });
  });

  it("refuses an empty note and one over 140 characters", async () => {
    await withFootballGame(async (f) => {
      const [a, b] = await addPlayers(f, 2);
      await save(f, [a!], [b!], { slot1: a!, slot2: null });

      const message = errors.draftNoteLength(140);
      await expect(answer(f, a!, "change_asked")).rejects.toThrow(message);
      await expect(answer(f, a!, "change_asked", "   ")).rejects.toThrow(
        message,
      );
      await expect(
        answer(f, a!, "change_asked", "x".repeat(141)),
      ).rejects.toThrow(message);
      await answer(f, a!, "change_asked", "x".repeat(140));
      expect((await boardFor(f, a!.id)).draft?.answers.slot1.state).toBe(
        "change_asked",
      );
    });
  });

  it("reads Waiting once the side changes by a save, a leave or a kick, and keeps the answer on a role change", async () => {
    await withFootballGame(async (f) => {
      const [a, b, c, d, e, g] = await addPlayers(f, 6);
      await save(f, [a!, b!, e!], [c!, d!, g!], { slot1: a!, slot2: c! });
      await answer(f, a!, "approved");
      await answer(f, c!, "approved");

      await setFootballRole(f.db, {
        gameId: f.gameId,
        userId: b!.id,
        role: "keeper",
        position: "mid",
      });
      let board = await boardFor(f, f.organizer.id);
      expect(board.draft?.answers.slot1.state).toBe("approved");

      await leaveGame(f.db, { gameId: f.gameId, userId: e!.id });
      board = await boardFor(f, f.organizer.id);
      expect(board.draft?.answers.slot1.state).toBe("waiting");
      expect(board.draft?.answers.slot2.state).toBe("approved");

      await kick(f.db, {
        gameId: f.gameId,
        organizerUserId: f.organizer.id,
        userId: g!.id,
      });
      board = await boardFor(f, f.organizer.id);
      expect(board.draft?.answers.slot2.state).toBe("waiting");

      await answer(f, a!, "approved");
      await save(f, [a!], [c!, d!, b!]);
      board = await boardFor(f, f.organizer.id);
      expect(board.draft?.answers.slot1.state).toBe("waiting");
    });
  });

  it("drops a side's answer when the Organizer changes its captain", async () => {
    await withFootballGame(async (f) => {
      const [a, b, c, d] = await addPlayers(f, 4);
      await save(f, [a!, b!], [c!, d!], { slot1: a!, slot2: c! });
      await answer(f, a!, "approved");
      await answer(f, c!, "approved");
      await save(f, [a!, b!], [c!, d!], { slot1: b!, slot2: c! });

      const answers = await f.db.query.footballLineupDraftAnswers.findMany();
      expect(answers.map((row) => row.sideIndex)).toEqual([2]);
      const board = await boardFor(f, f.organizer.id);
      expect(board.draft?.answers.slot1.state).toBe("waiting");
      expect(board.draft?.answers.slot2.state).toBe("approved");
    });
  });

  it("tells the Game admins once per answer for the side as it stands, never the captain, and nothing on Undo", async () => {
    await withFootballGame(async (f) => {
      const [a, b, c, d] = await addPlayers(f, 4);
      await save(f, [a!, b!], [c!, d!], { slot1: a!, slot2: c! });

      await answer(f, a!, "approved");
      await answer(f, a!, null);
      await answer(f, a!, "approved");
      let approved = await notificationsOf(f, "football_draft_approved");
      expect(approved).toEqual([
        {
          type: "football_draft_approved",
          recipientUserId: f.organizer.id,
          actorUserId: a!.id,
        },
      ]);

      await answer(f, a!, "change_asked", "Swap b and d");
      expect(
        await notificationsOf(f, "football_draft_change_asked"),
      ).toHaveLength(1);

      await save(f, [a!, d!], [c!, b!]);
      await answer(f, a!, "approved");
      approved = await notificationsOf(f, "football_draft_approved");
      expect(approved).toHaveLength(2);
    });
  });

  it("tells a captain when a save changes their side after they answered", async () => {
    await withFootballGame(async (f) => {
      const [a, b, c, d] = await addPlayers(f, 4);
      await save(f, [a!, b!], [c!, d!], { slot1: a!, slot2: c! });
      await answer(f, a!, "approved");

      await save(f, [a!, b!], [c!, d!]);
      expect(await notificationsOf(f, "football_draft_changed")).toHaveLength(
        0,
      );

      await save(f, [a!, d!], [c!, b!], undefined, new Date(Date.now() + 1000));
      const changed = await notificationsOf(f, "football_draft_changed");
      expect(changed).toEqual([
        {
          type: "football_draft_changed",
          recipientUserId: a!.id,
          actorUserId: f.organizer.id,
        },
      ]);
    });
  });

  it("is refused once the teams are published", async () => {
    await withFootballGame(async (f) => {
      const [a, b] = await addPlayers(f, 2);
      await save(f, [a!], [b!], { slot1: a!, slot2: null });
      await publishFootballTeams(f.db, {
        gameId: f.gameId,
        userId: f.organizer.id,
        method: "manual",
        bibs: { slot1: "black", slot2: "white" },
        slot1: [a!.id],
        slot2: [b!.id],
      });
      await expect(answer(f, a!, "approved")).rejects.toThrow(
        errors.draftTeamsPublished,
      );
    });
  });
});

describe("Side captains on the published teams", () => {
  async function sideCaptains(f: Fixture) {
    const rows = await f.db.query.gameTeams.findMany({
      where: eq(gameTeams.gameId, f.gameId),
      columns: { sideIndex: true, captainGamePlayerId: true },
    });
    return rows.sort((x, y) => (x.sideIndex ?? 0) - (y.sideIndex ?? 0));
  }

  async function gamePlayerId(f: Fixture, userId: string) {
    const row = await f.db.query.gamePlayers.findFirst({
      where: and(
        eq(gamePlayers.gameId, f.gameId),
        eq(gamePlayers.userId, userId),
      ),
      columns: { id: true },
    });
    return row!.id;
  }

  it("carries the draft's captains onto the Football sides without waiting on an answer, for every viewer", async () => {
    await withFootballGame(async (f) => {
      const [a, b, c, d] = await addPlayers(f, 4);
      await save(f, [a!, b!], [c!, d!], { slot1: a!, slot2: c! });
      await publishFootballTeams(f.db, {
        gameId: f.gameId,
        userId: f.organizer.id,
        method: "manual",
        bibs: { slot1: "black", slot2: "white" },
        slot1: [a!.id, b!.id],
        slot2: [c!.id, d!.id],
      });

      expect(await sideCaptains(f)).toEqual([
        { sideIndex: 1, captainGamePlayerId: await gamePlayerId(f, a!.id) },
        { sideIndex: 2, captainGamePlayerId: await gamePlayerId(f, c!.id) },
      ]);
      const player = await boardFor(f, d!.id);
      expect(player.teams?.captains).toEqual({ slot1: a!.id, slot2: c!.id });
      expect((await boardFor(f, a!.id)).viewer.captainOf).toBe(1);
      expect(await f.db.query.footballLineupDraftAnswers.findMany()).toEqual(
        [],
      );
    });
  });

  it("names and changes captains with no draft ever saved, until the Score is in", async () => {
    await withFootballGame(async (f) => {
      const [a, b, c, d] = await addPlayers(f, 4);
      const publish = (captains?: {
        slot1: string | null;
        slot2: string | null;
      }) =>
        publishFootballTeams(f.db, {
          gameId: f.gameId,
          userId: f.organizer.id,
          method: "manual",
          bibs: { slot1: "black", slot2: "white" },
          slot1: [a!.id, b!.id],
          slot2: [c!.id, d!.id],
          captains,
        });
      await publish({ slot1: b!.id, slot2: null });
      expect((await boardFor(f, c!.id)).teams?.captains).toEqual({
        slot1: b!.id,
        slot2: null,
      });

      await publish();
      expect((await boardFor(f, c!.id)).teams?.captains).toEqual({
        slot1: b!.id,
        slot2: null,
      });
      await publish({ slot1: null, slot2: d!.id });
      expect((await boardFor(f, c!.id)).teams?.captains).toEqual({
        slot1: null,
        slot2: d!.id,
      });
      await expect(publish({ slot1: c!.id, slot2: null })).rejects.toThrow(
        errors.captainOnSide,
      );
    });
  });

  it("refuses a Guest player as a published captain", async () => {
    await withFootballGame(async (f) => {
      const [a] = await addPlayers(f, 1);
      const guest = await seatWithoutAccount(f, "guest");
      await expect(
        publishFootballTeams(f.db, {
          gameId: f.gameId,
          userId: f.organizer.id,
          method: "manual",
          bibs: { slot1: "black", slot2: "white" },
          slot1: [a!.id],
          slot2: [guest.id],
          captains: { slot1: null, slot2: guest.id },
        }),
      ).rejects.toThrow(errors.captainNeedsAccount);
    });
  });

  it("clears a captain who leaves or is kicked, on a draft and on published teams", async () => {
    await withFootballGame(async (f) => {
      const [a, b, c, d, e, g] = await addPlayers(f, 6);
      await save(f, [a!, b!, e!], [c!, d!, g!], { slot1: a!, slot2: c! });
      await leaveGame(f.db, { gameId: f.gameId, userId: a!.id });
      await kick(f.db, {
        gameId: f.gameId,
        organizerUserId: f.organizer.id,
        userId: c!.id,
      });
      const [draft] = await f.db.query.footballLineupDrafts.findMany({
        where: eq(footballLineupDrafts.gameId, f.gameId),
      });
      expect(draft).toMatchObject({
        slot1CaptainGamePlayerId: null,
        slot2CaptainGamePlayerId: null,
      });
      expect((await boardFor(f, f.organizer.id)).draft?.captains).toEqual({
        slot1: null,
        slot2: null,
      });

      await publishFootballTeams(f.db, {
        gameId: f.gameId,
        userId: f.organizer.id,
        method: "manual",
        bibs: { slot1: "black", slot2: "white" },
        slot1: [b!.id, e!.id],
        slot2: [d!.id, g!.id],
        captains: { slot1: b!.id, slot2: d!.id },
      });
      await leaveGame(f.db, { gameId: f.gameId, userId: b!.id });
      await kick(f.db, {
        gameId: f.gameId,
        organizerUserId: f.organizer.id,
        userId: d!.id,
      });
      expect(await sideCaptains(f)).toEqual([
        { sideIndex: 1, captainGamePlayerId: null },
        { sideIndex: 2, captainGamePlayerId: null },
      ]);
    });
  });
});

describe("answers are kept apart", () => {
  it("writes one row per side with the players it was given for", async () => {
    await withFootballGame(async (f) => {
      const [a, b, c] = await addPlayers(f, 3);
      await save(f, [a!, b!], [c!], { slot1: a!, slot2: null });
      await answer(f, a!, "approved");
      await answer(f, a!, "change_asked", "One more");

      const rows = await f.db.query.footballLineupDraftAnswers.findMany({
        where: eq(footballLineupDraftAnswers.sideIndex, 1),
      });
      expect(rows).toHaveLength(1);
      expect(rows[0]).toMatchObject({
        captainUserId: a!.id,
        answer: "change_asked",
        note: "One more",
      });
      expect(rows[0]!.answeredPlayerIds.sort()).toEqual(
        [await idOf(f, a!.id), await idOf(f, b!.id)].sort(),
      );
      expect(
        await f.db.query.notifications.findMany({
          where: eq(notifications.recipientUserId, a!.id),
          columns: { type: true },
        }),
      ).toEqual([{ type: "football_draft_shared" }]);
    });
  });
});

async function idOf(f: Fixture, userId: string) {
  const row = await f.db.query.gamePlayers.findFirst({
    where: and(
      eq(gamePlayers.gameId, f.gameId),
      eq(gamePlayers.userId, userId),
    ),
    columns: { id: true },
  });
  return row!.id;
}
