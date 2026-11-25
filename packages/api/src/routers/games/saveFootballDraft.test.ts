import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import {
  GroupMemberRoleEnum,
  challenges,
  courts,
  footballLineupDraftPlayers,
  footballLineupDrafts,
  gamePlayers,
  gameTeams,
  games,
  groupMembers,
  groups,
  matches,
  teams,
  user,
  venueVerifiers,
  venues,
} from "@repo/db/schema";
import { createPgliteDb, type TestDatabase } from "@repo/db/testing";
import { footballDraftSummary } from "@repo/domain/football-draft";
import { messagesFor } from "@repo/i18n/messages";

import {
  NOW,
  asDb,
  insertBooking,
  withBookableVenue,
} from "#src/bookings/booking.test-support";
import { loadPayers } from "#src/game-payments/ledger";
import { listMyGamesHubRows } from "#src/games/list-my-games";
import { liveBoardContent } from "#src/live-boards/board-content";
import { createBookingGame } from "#src/routers/bookings/createGame";
import { addGroupMembers } from "#src/routers/games/addGroupMembers";
import { answerFootballDraft } from "#src/routers/games/answerFootballDraft";
import { gameById } from "#src/routers/games/byId";
import { createGame } from "#src/routers/games/create";
import { createInviteLink } from "#src/routers/games/createInviteLink";
import { footballBoard } from "#src/routers/games/footballBoard";
import { kick } from "#src/routers/games/kick";
import { leaveGame } from "#src/routers/games/leave";
import { previewInviteLink } from "#src/routers/games/previewInviteLink";
import { publishFootballTeams } from "#src/routers/games/publishFootballTeams";
import { register } from "#src/routers/games/register";
import {
  saveFootballDraft,
  saveFootballDraftInputSchema,
} from "#src/routers/games/saveFootballDraft";
import { updateGameCaps } from "#src/routers/games/updateCaps";

const HOUR = 60 * 60 * 1000;
const errors = messagesFor("en").football.errors;

async function insertUser(database: TestDatabase, name: string) {
  const [row] = await database
    .insert(user)
    .values({ name, email: `${name}-${crypto.randomUUID()}@example.com` })
    .returning({ id: user.id });
  if (!row) {
    throw new Error("Failed to insert user");
  }
  return row;
}

type Fixture = {
  db: TestDatabase;
  organizer: { id: string };
  groupId: string;
  venueId: string;
  gameId: string;
};

async function withFootballGame(
  run: (f: Fixture) => Promise<void>,
  extra: { playersAllowed?: number } = {},
) {
  const { db, close } = await createPgliteDb();
  try {
    const organizer = await insertUser(db, "organizer");
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
      ...extra,
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

function ids(players: { id: string }[]) {
  return players.map((player) => player.id);
}

function save(
  f: Fixture,
  slot1: { id: string }[],
  slot2: { id: string }[],
  extra: Partial<Parameters<typeof saveFootballDraft>[1]> = {},
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
      ...extra,
    },
    now,
  );
}

function boardFor(f: Fixture, userId: string) {
  return footballBoard(f.db, { gameId: f.gameId, userId });
}

async function draftRows(f: Fixture) {
  return f.db.query.footballLineupDrafts.findMany({
    where: eq(footballLineupDrafts.gameId, f.gameId),
  });
}

async function teamsAndMatches(f: Fixture) {
  return {
    teams: await f.db.query.gameTeams.findMany({
      where: eq(gameTeams.gameId, f.gameId),
    }),
    matches: await f.db.query.matches.findMany({
      where: eq(matches.gameId, f.gameId),
    }),
  };
}

describe("games.saveFootballDraft", () => {
  it("stores the two sides and the bibs and makes no Game team or Match", async () => {
    await withFootballGame(async (f) => {
      const [a, b, c, d] = await addPlayers(f, 4);
      const saved = await save(f, [a!, b!], [c!, d!], {
        method: "level",
        bibs: { slot1: "red", slot2: "sky" },
      });

      const board = await boardFor(f, f.organizer.id);
      expect(board.draft).toMatchObject({
        updatedAt: saved.updatedAt,
        savedByName: "organizer",
        method: "level",
        bibs: { slot1: "red", slot2: "sky" },
        sides: { slot1: ids([a!, b!]), slot2: ids([c!, d!]) },
      });
      expect(board.teams).toBeNull();
      expect(board.viewer.canSaveDraft).toBe(true);
      expect(board.players.every((player) => player.sideIndex === null)).toBe(
        true,
      );
      expect(await teamsAndMatches(f)).toEqual({ teams: [], matches: [] });
    });
  });

  it("replaces the draft, and keeps an incomplete one", async () => {
    await withFootballGame(async (f) => {
      const [a, b, c, d] = await addPlayers(f, 4);
      await save(f, [a!, b!], [c!, d!]);
      await save(f, [d!], [], { bibs: { slot1: "green", slot2: "pink" } });

      expect(await draftRows(f)).toHaveLength(1);
      const board = await boardFor(f, f.organizer.id);
      expect(board.draft?.sides).toEqual({ slot1: [d!.id], slot2: [] });
      expect(board.draft?.bibs).toEqual({ slot1: "green", slot2: "pink" });
      expect(
        footballDraftSummary(
          { ...board.draft!.sides, ...board.draft! },
          board.players.map((player) => player.userId),
          { groupId: f.groupId },
          "en",
        ),
      ).toEqual({ line: "3 still to place.", canPublish: false });
    });
  });

  it("refuses nobody placed, a player on both sides, someone not registered and one colour", async () => {
    await withFootballGame(async (f) => {
      const [a, b] = await addPlayers(f, 2);
      const outsider = await insertUser(f.db, "outsider");
      await expect(save(f, [], [])).rejects.toThrow(errors.draftNeedsPlayer);
      await expect(save(f, [a!], [a!])).rejects.toThrow(errors.oneTeamOnly);
      await expect(save(f, [a!], [outsider])).rejects.toThrow(
        errors.registeredOnly,
      );
      await expect(
        save(f, [a!], [b!], { bibs: { slot1: "red", slot2: "red" } }),
      ).rejects.toThrow(errors.differentBibs);
      expect(await draftRows(f)).toHaveLength(0);
    });
  });

  it("is for an Organizer only", async () => {
    await withFootballGame(async (f) => {
      const [a, b] = await addPlayers(f, 2);
      await expect(save(f, [a!], [b!], { userId: a!.id })).rejects.toThrow();
      expect(await draftRows(f)).toHaveLength(0);
    });
  });

  it("is refused once the teams are published, on a cancelled Game and on a Challenge Game", async () => {
    await withFootballGame(async (f) => {
      const [a, b] = await addPlayers(f, 2);
      await publishFootballTeams(f.db, {
        gameId: f.gameId,
        userId: f.organizer.id,
        method: "manual",
        bibs: { slot1: "black", slot2: "white" },
        slot1: [a!.id],
        slot2: [b!.id],
      });
      await expect(save(f, [a!], [b!])).rejects.toThrow(
        errors.draftTeamsPublished,
      );
      expect((await boardFor(f, f.organizer.id)).viewer.canSaveDraft).toBe(
        false,
      );
    });

    await withFootballGame(async (f) => {
      const [a, b] = await addPlayers(f, 2);
      await f.db
        .update(games)
        .set({ cancelledAt: new Date() })
        .where(eq(games.id, f.gameId));
      await expect(save(f, [a!], [b!])).rejects.toThrow(
        messagesFor("en").game.errors.cancelled,
      );
    });

    await withFootballGame(async (f) => {
      const [a, b] = await addPlayers(f, 2);
      const [team] = await f.db
        .insert(teams)
        .values({ name: "Team", createdBy: f.organizer.id })
        .returning({ id: teams.id });
      const [challenge] = await f.db
        .insert(challenges)
        .values({
          teamId: team!.id,
          sport: "football",
          postedBy: f.organizer.id,
          durationMinutes: 60,
          expiresAt: new Date(Date.now() + 24 * HOUR),
        })
        .returning({ id: challenges.id });
      await f.db
        .update(games)
        .set({ challengeId: challenge!.id })
        .where(eq(games.id, f.gameId));
      await expect(save(f, [a!], [b!])).rejects.toThrow(
        messagesFor("en").challenge.errors.setByChallenge,
      );
    });
  });

  it("refuses a save made from a draft that changed since", async () => {
    await withFootballGame(async (f) => {
      const [a, b, c, d] = await addPlayers(f, 4);
      const first = await save(f, [a!, b!], [c!, d!], {}, new Date(1_000));
      const coOrganizer = await addMember(
        f,
        "co-organizer",
        GroupMemberRoleEnum.ORGANIZER,
      );
      await save(
        f,
        [a!],
        [b!],
        { userId: coOrganizer.id, draftUpdatedAt: first.updatedAt },
        new Date(2_000),
      );

      await expect(
        save(f, [a!, c!], [b!, d!], { draftUpdatedAt: first.updatedAt }),
      ).rejects.toMatchObject({
        code: "CONFLICT",
        message: errors.draftChanged,
      });
      expect((await boardFor(f, f.organizer.id)).draft?.sides).toEqual({
        slot1: [a!.id],
        slot2: [b!.id],
      });
    });
  });

  it("refuses a first save made when there was no draft once a co-Organizer has saved one", async () => {
    await withFootballGame(async (f) => {
      const [a, b, c, d] = await addPlayers(f, 4);
      const coOrganizer = await addMember(
        f,
        "co-organizer",
        GroupMemberRoleEnum.ORGANIZER,
      );
      await save(f, [a!, b!], [c!, d!], {
        userId: coOrganizer.id,
        draftUpdatedAt: null,
      });

      await expect(
        save(f, [a!, c!], [b!, d!], { draftUpdatedAt: null }),
      ).rejects.toMatchObject({
        code: "CONFLICT",
        message: errors.draftChanged,
      });
      const board = await boardFor(f, f.organizer.id);
      expect(board.draft).toMatchObject({
        savedByName: "co-organizer",
        sides: { slot1: ids([a!, b!]), slot2: ids([c!, d!]) },
      });

      await save(f, [a!, c!], [b!, d!], {
        draftUpdatedAt: board.draft!.updatedAt,
      });
      await save(f, [a!], [b!]);
      expect((await boardFor(f, f.organizer.id)).draft?.sides).toEqual({
        slot1: [a!.id],
        slot2: [b!.id],
      });
    });
  });

  it("takes By level and Manual only: a Captain pick is never saved from Make teams", async () => {
    const input = {
      gameId: crypto.randomUUID(),
      bibs: { slot1: "black", slot2: "white" },
      slot1: [crypto.randomUUID()],
      slot2: [crypto.randomUUID()],
    };
    for (const method of ["level", "manual"]) {
      expect(
        saveFootballDraftInputSchema.safeParse({ ...input, method }).success,
      ).toBe(true);
    }
    expect(
      saveFootballDraftInputSchema.safeParse({
        ...input,
        method: "captain_pick",
      }).success,
    ).toBe(false);
    expect(
      saveFootballDraftInputSchema.safeParse({
        ...input,
        method: "manual",
        draftUpdatedAt: null,
      }).success,
    ).toBe(true);
  });
});

describe("a saved Draft line-up changes nothing else (ADR-0107)", () => {
  it("leaves byId, the invite preview, the payments ledger, the hub list and the Live board reading teams not set", async () => {
    await withFootballGame(async (f) => {
      const [a, b, c, d] = await addPlayers(f, 4);
      await save(f, [a!, b!], [c!, d!]);

      const view = await gameById(f.db, { gameId: f.gameId, userId: a!.id });
      expect(view.gameTeams).toEqual([]);
      const organizerView = await gameById(f.db, {
        gameId: f.gameId,
        userId: f.organizer.id,
      });
      expect(organizerView.gameTeams).toEqual([]);

      const link = await createInviteLink(f.db, {
        gameId: f.gameId,
        userId: f.organizer.id,
        origin: "https://temba.test",
      });
      const joiner = await addMember(f, "joiner");
      const preview = await previewInviteLink(f.db, {
        token: link.inviteUrl.split("/").pop()!,
        userId: joiner.id,
      });
      expect(preview.status === "ready" && preview.football?.teamsSet).toBe(
        false,
      );

      const game = await f.db.query.games.findFirst({
        where: eq(games.id, f.gameId),
      });
      const ledger = await loadPayers(f.db, game!, new Date());
      expect(ledger.sides).toEqual([]);
      expect(ledger.payers.every((payer) => payer.sideIndex === null)).toBe(
        true,
      );

      const hub = await listMyGamesHubRows(f.db, a!.id);
      const row = hub.find((item) => item.id === f.gameId);
      expect(row?.football?.sides).toBeNull();
      expect(row?.registeredTeamCount).toBe(0);

      const board = await liveBoardContent(f.db, game!, new Date(), "en");
      expect(board).toMatchObject({ kind: "football", sides: null });
    });
  });

  it("still lets updateCaps change the Side size", async () => {
    await withFootballGame(async (f) => {
      const [a, b] = await addPlayers(f, 2);
      await save(f, [a!], [b!]);
      await updateGameCaps(f.db, {
        gameId: f.gameId,
        userId: f.organizer.id,
        sideSize: 7,
        playersAllowed: 14,
      });
      const game = await f.db.query.games.findFirst({
        where: eq(games.id, f.gameId),
      });
      expect(game).toMatchObject({ sideSize: 7, playersAllowed: 14 });
      expect((await boardFor(f, f.organizer.id)).draft).not.toBeNull();
    });
  });
});

describe("who reads footballBoard.draft", () => {
  it("is every Organizer of the Game, and nobody else", async () => {
    await withFootballGame(async (f) => {
      const [a, b] = await addPlayers(f, 2);
      await save(f, [a!], [b!]);
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

      expect((await boardFor(f, f.organizer.id)).draft).not.toBeNull();
      const asCoOrganizer = await boardFor(f, coOrganizer.id);
      expect(asCoOrganizer.draft?.sides).toEqual({
        slot1: [a!.id],
        slot2: [b!.id],
      });
      expect(asCoOrganizer.viewer.canSaveDraft).toBe(true);

      for (const viewer of [a!, member, verifier]) {
        const board = await boardFor(f, viewer.id);
        expect(board.draft).toBeNull();
        expect(board.viewer.canSaveDraft).toBe(false);
        expect(board.players.every((player) => player.sideIndex === null)).toBe(
          true,
        );
      }
    });
  });

  it("is null on a cancelled Game", async () => {
    await withFootballGame(async (f) => {
      const [a, b] = await addPlayers(f, 2);
      await save(f, [a!], [b!]);
      await f.db
        .update(games)
        .set({ cancelledAt: new Date() })
        .where(eq(games.id, f.gameId));
      expect((await boardFor(f, f.organizer.id)).draft).toBeNull();
      expect(await draftRows(f)).toHaveLength(1);
    });
  });

  it("reads the creator alone as Organizer on a Public Game", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const creator = await insertUser(db, "creator");
      const [venue] = await db
        .insert(venues)
        .values({
          name: "Partner",
          city: "Manama",
          country: "BH",
          partnerAt: new Date("2026-11-01T10:00:00.000Z"),
        })
        .returning({ id: venues.id });
      const [pitch] = await db
        .insert(courts)
        .values({ venueId: venue!.id, name: "Pitch 1", sport: "football" })
        .returning({ id: courts.id });
      const kickoff = new Date(Date.now() + HOUR);
      const created = await createGame(db, {
        createdBy: creator.id,
        isPublic: true,
        sport: "football",
        format: "friendly_game",
        registrationMode: "individual",
        venueId: venue!.id,
        courtId: pitch!.id,
        windowStart: kickoff,
        windowEnd: new Date(kickoff.getTime() + HOUR),
      });
      const player = await insertUser(db, "player");
      const viewer = await insertUser(db, "viewer");
      await register(db, { gameId: created.id, userId: creator.id });
      await register(db, { gameId: created.id, userId: player.id });

      await saveFootballDraft(db, {
        gameId: created.id,
        userId: creator.id,
        method: "manual",
        bibs: { slot1: "black", slot2: "white" },
        slot1: [creator.id],
        slot2: [player.id],
      });
      await expect(
        saveFootballDraft(db, {
          gameId: created.id,
          userId: player.id,
          method: "manual",
          bibs: { slot1: "black", slot2: "white" },
          slot1: [player.id],
          slot2: [creator.id],
        }),
      ).rejects.toThrow();

      const asCreator = await footballBoard(db, {
        gameId: created.id,
        userId: creator.id,
      });
      expect(asCreator.draft?.sides).toEqual({
        slot1: [creator.id],
        slot2: [player.id],
      });
      for (const userId of [player.id, viewer.id]) {
        expect(
          (await footballBoard(db, { gameId: created.id, userId })).draft,
        ).toBeNull();
      }
    } finally {
      await close();
    }
  });

  it("reads the creator alone as Organizer on a Booking Game", async () => {
    await withBookableVenue(async (db, f) => {
      await db
        .update(courts)
        .set({ sport: "football" })
        .where(eq(courts.id, f.court1));
      const booking = await insertBooking(db, f);
      const created = await createBookingGame(asDb(db), {
        bookingId: booking.id,
        userId: f.customer,
        now: NOW,
      });
      await db.insert(gamePlayers).values([
        { gameId: created.gameId, userId: f.customer },
        { gameId: created.gameId, userId: f.other },
      ]);
      await saveFootballDraft(asDb(db), {
        gameId: created.gameId,
        userId: f.customer,
        method: "manual",
        bibs: { slot1: "black", slot2: "white" },
        slot1: [f.customer],
        slot2: [f.other],
      });
      const asCreator = await footballBoard(asDb(db), {
        gameId: created.gameId,
        userId: f.customer,
      });
      expect(asCreator.draft?.sides).toEqual({
        slot1: [f.customer],
        slot2: [f.other],
      });
      const asPlayer = await footballBoard(asDb(db), {
        gameId: created.gameId,
        userId: f.other,
      });
      expect(asPlayer.draft).toBeNull();
    });
  });
});

describe("publishing from a Draft line-up", () => {
  it("creates the Football sides and the one Match and removes the draft", async () => {
    await withFootballGame(async (f) => {
      const [a, b, c, d] = await addPlayers(f, 4);
      const saved = await save(f, [a!, b!], [c!, d!], {
        bibs: { slot1: "navy", slot2: "yellow" },
      });
      const board = await boardFor(f, f.organizer.id);
      await publishFootballTeams(f.db, {
        gameId: f.gameId,
        userId: f.organizer.id,
        method: board.draft!.method,
        bibs: board.draft!.bibs,
        slot1: board.draft!.sides.slot1,
        slot2: board.draft!.sides.slot2,
        draftUpdatedAt: saved.updatedAt,
      });

      expect(await draftRows(f)).toHaveLength(0);
      expect(await f.db.query.footballLineupDraftPlayers.findMany()).toEqual(
        [],
      );
      const { teams: sides, matches: played } = await teamsAndMatches(f);
      expect(sides.map((side) => side.bib).sort()).toEqual(["navy", "yellow"]);
      expect(played).toHaveLength(1);
      const after = await boardFor(f, f.organizer.id);
      expect(after.draft).toBeNull();
      expect(after.teams?.bibs).toEqual({ slot1: "navy", slot2: "yellow" });
    });
  });

  it("refuses a publish made from a draft that changed or is gone", async () => {
    await withFootballGame(async (f) => {
      const [a, b, c, d] = await addPlayers(f, 4);
      const first = await save(f, [a!, b!], [c!, d!], {}, new Date(1_000));
      await save(f, [a!, c!], [b!, d!], {}, new Date(2_000));
      const publish = (draftUpdatedAt: Date) =>
        publishFootballTeams(f.db, {
          gameId: f.gameId,
          userId: f.organizer.id,
          method: "manual",
          bibs: { slot1: "black", slot2: "white" },
          slot1: [a!.id, b!.id],
          slot2: [c!.id, d!.id],
          draftUpdatedAt,
        });

      await expect(publish(first.updatedAt)).rejects.toMatchObject({
        code: "CONFLICT",
        message: errors.draftChanged,
      });
      expect(await teamsAndMatches(f)).toEqual({ teams: [], matches: [] });
      expect(await draftRows(f)).toHaveLength(1);

      const current = (await boardFor(f, f.organizer.id)).draft!.updatedAt;
      await publish(current);
      await expect(publish(current)).rejects.toMatchObject({
        code: "CONFLICT",
      });
    });
  });

  it("publishes as before without a draft", async () => {
    await withFootballGame(async (f) => {
      const [a, b] = await addPlayers(f, 2);
      await publishFootballTeams(f.db, {
        gameId: f.gameId,
        userId: f.organizer.id,
        method: "manual",
        bibs: { slot1: "black", slot2: "white" },
        slot1: [a!.id],
        slot2: [b!.id],
      });
      expect((await teamsAndMatches(f)).matches).toHaveLength(1);
    });
  });

  it("refuses a publish made when there was no draft once a co-Organizer has saved one", async () => {
    await withFootballGame(async (f) => {
      const [a, b, c, d] = await addPlayers(f, 4);
      const coOrganizer = await addMember(
        f,
        "co-organizer",
        GroupMemberRoleEnum.ORGANIZER,
      );
      const publish = (
        slot1: { id: string }[],
        slot2: { id: string }[],
        draftUpdatedAt?: Date | null,
      ) =>
        publishFootballTeams(f.db, {
          gameId: f.gameId,
          userId: f.organizer.id,
          method: "manual",
          bibs: { slot1: "black", slot2: "white" },
          slot1: ids(slot1),
          slot2: ids(slot2),
          draftUpdatedAt,
        });
      await save(f, [a!, b!], [c!, d!], { userId: coOrganizer.id });

      await expect(publish([a!, c!], [b!, d!], null)).rejects.toMatchObject({
        code: "CONFLICT",
        message: errors.draftChanged,
      });
      expect(await teamsAndMatches(f)).toEqual({ teams: [], matches: [] });
      expect(await draftRows(f)).toHaveLength(1);

      await publish([a!, c!], [b!, d!]);
      expect(await draftRows(f)).toHaveLength(0);
      expect((await teamsAndMatches(f)).matches).toHaveLength(1);
    });
  });

  it("publishes, and publishes again over the published teams, saying there was no draft", async () => {
    await withFootballGame(async (f) => {
      const [a, b, c, d] = await addPlayers(f, 4);
      const publish = (slot1: { id: string }[], slot2: { id: string }[]) =>
        publishFootballTeams(f.db, {
          gameId: f.gameId,
          userId: f.organizer.id,
          method: "manual",
          bibs: { slot1: "black", slot2: "white" },
          slot1: ids(slot1),
          slot2: ids(slot2),
          draftUpdatedAt: null,
        });

      await publish([a!, b!], [c!, d!]);
      await publish([a!, c!], [b!, d!]);
      const board = await boardFor(f, f.organizer.id);
      expect(
        board.players
          .filter((player) => player.sideIndex === 1)
          .map((player) => player.userId)
          .sort(),
      ).toEqual(ids([a!, c!]).sort());
      expect((await teamsAndMatches(f)).matches).toHaveLength(1);
    });
  });
});

describe("a Draft line-up follows the roster", () => {
  it("drops a player who leaves or is kicked, sides not rebalanced", async () => {
    await withFootballGame(async (f) => {
      const [a, b, c, d] = await addPlayers(f, 4);
      await save(f, [a!, b!], [c!, d!]);
      await leaveGame(f.db, { gameId: f.gameId, userId: a!.id });
      await kick(f.db, {
        gameId: f.gameId,
        organizerUserId: f.organizer.id,
        userId: d!.id,
      });

      const board = await boardFor(f, f.organizer.id);
      expect(board.draft?.sides).toEqual({ slot1: [b!.id], slot2: [c!.id] });
      expect(
        await f.db.query.footballLineupDraftPlayers.findMany(),
      ).toHaveLength(2);
    });
  });

  it("puts a player who joins, or comes off the Waitlist, on neither side", async () => {
    await withFootballGame(
      async (f) => {
        const roster = await addPlayers(f, 10);
        await save(f, roster.slice(0, 5), roster.slice(5));
        const [waiting] = await addPlayers(f, 1);
        await leaveGame(f.db, { gameId: f.gameId, userId: roster[0]!.id });

        const board = await boardFor(f, f.organizer.id);
        expect(board.players.map((player) => player.userId)).toContain(
          waiting!.id,
        );
        const placed = [
          ...board.draft!.sides.slot1,
          ...board.draft!.sides.slot2,
        ];
        expect(placed).toHaveLength(9);
        expect(placed).not.toContain(waiting!.id);
        expect(
          footballDraftSummary(
            { ...board.draft!.sides, ...board.draft! },
            board.players.map((player) => player.userId),
            { groupId: f.groupId },
            "en",
          ),
        ).toEqual({ line: "1 still to place.", canPublish: false });

        await updateGameCaps(f.db, {
          gameId: f.gameId,
          userId: f.organizer.id,
          playersAllowed: 12,
        });
        await addPlayers(f, 1);
        const later = await boardFor(f, f.organizer.id);
        expect(
          footballDraftSummary(
            { ...later.draft!.sides, ...later.draft! },
            later.players.map((player) => player.userId),
            { groupId: f.groupId },
            "en",
          ).line,
        ).toBe("2 still to place.");
      },
      { playersAllowed: 10 },
    );
  });

  it("puts a player the Organizer adds on neither side", async () => {
    await withFootballGame(async (f) => {
      const [a, b, c, d] = await addPlayers(f, 4);
      await save(f, [a!, b!], [c!, d!]);
      const added = await addMember(f, "added");
      await addGroupMembers(f.db, {
        gameId: f.gameId,
        organizerUserId: f.organizer.id,
        players: [{ userId: added.id }],
      });

      const board = await boardFor(f, f.organizer.id);
      expect(board.players.map((player) => player.userId)).toContain(added.id);
      expect(board.draft?.sides).toEqual({
        slot1: ids([a!, b!]),
        slot2: ids([c!, d!]),
      });
      expect(
        footballDraftSummary(
          { ...board.draft!.sides, ...board.draft! },
          board.players.map((player) => player.userId),
          { groupId: f.groupId },
          "en",
        ),
      ).toEqual({ line: "1 still to place.", canPublish: false });
    });
  });

  it("drops the latest joiners when players allowed is cut, and asks the captain of a changed side again", async () => {
    await withFootballGame(
      async (f) => {
        const roster = await addPlayers(f, 12);
        for (const [index, player] of roster.entries()) {
          await f.db
            .update(gamePlayers)
            .set({ createdAt: new Date(Date.UTC(2026, 10, 1, 10, index)) })
            .where(eq(gamePlayers.userId, player.id));
        }
        const black = roster.slice(0, 6);
        const white = roster.slice(6);
        await save(f, black, white, {
          captains: { slot1: black[0]!.id, slot2: white[0]!.id },
        });
        for (const captain of [black[0]!, white[0]!]) {
          await answerFootballDraft(f.db, {
            gameId: f.gameId,
            userId: captain.id,
            answer: "approved",
          });
        }

        const cut = await updateGameCaps(f.db, {
          gameId: f.gameId,
          userId: f.organizer.id,
          playersAllowed: 10,
        });
        expect(cut.movedToWaitlist).toEqual(ids([roster[11]!, roster[10]!]));

        const board = await boardFor(f, f.organizer.id);
        expect(board.draft?.sides).toEqual({
          slot1: ids(black),
          slot2: ids(white.slice(0, 4)),
        });
        expect(board.draft?.captains).toEqual({
          slot1: black[0]!.id,
          slot2: white[0]!.id,
        });
        expect(board.draft?.answers.slot1.state).toBe("approved");
        expect(board.draft?.answers.slot2.state).toBe("waiting");
        expect(
          await f.db.query.footballLineupDraftPlayers.findMany(),
        ).toHaveLength(10);
      },
      { playersAllowed: 12 },
    );
  });
});
