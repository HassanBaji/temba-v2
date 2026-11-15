import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import {
  afterAll,
  beforeAll,
  describe,
  expect,
  it,
  onTestFinished,
  vi,
} from "vitest";

import { gameTeams, gameWaitlist, games } from "@repo/db/schema";
import { createPgliteDb, type TestDatabase } from "@repo/db/testing";

import {
  insertKingPlayers,
  insertKingTournament,
  insertKingUser,
  seatKingTeams,
} from "#src/games/king-of-the-court.test-support";
import { createTournament } from "#src/routers/games/createTournament";
import { drawPools } from "#src/routers/games/drawPools";
import { gameById } from "#src/routers/games/byId";
import { kick } from "#src/routers/games/kick";
import { postKingCourts } from "#src/routers/games/postKingCourts";
import { postKingFinalOrder } from "#src/routers/games/postKingFinalOrder";
import { postPoolDraw } from "#src/routers/games/postPoolDraw";
import { registerSeat } from "#src/routers/games/registerSeat";

const START = new Date("2026-09-25T09:00:00");
const END = new Date("2026-09-25T11:00:00");

beforeAll(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-09-01T12:00:00"));
});

afterAll(() => {
  vi.useRealTimers();
});

async function testDatabase() {
  const { db, close } = await createPgliteDb();
  onTestFinished(close);
  return db;
}

async function expectRefused(run: () => Promise<unknown>, message: RegExp) {
  const error = await run().then(
    () => null,
    (caught: unknown) => caught,
  );
  expect(error).toBeInstanceOf(TRPCError);
  expect((error as TRPCError).message).toMatch(message);
}

async function startCourts(database: TestDatabase, gameId: string) {
  const rows = await database.query.gameTeams.findMany({
    where: eq(gameTeams.gameId, gameId),
    columns: { id: true, startCourt: true },
  });
  return new Map(rows.map((row) => [row.id, row.startCourt]));
}

describe("createTournament, king of the court", () => {
  it("stores two teams a court, no Pools or Match length, and counts for Temba Level on a Verified Group", async () => {
    const database = await testDatabase();
    const organizer = await insertKingUser(database, "Hassan Haji");
    const gameId = await insertKingTournament(database, {
      createdBy: organizer.id,
      courts: 4,
      windowStart: START,
      windowEnd: END,
    });
    const game = await database.query.games.findFirst({
      where: eq(games.id, gameId),
    });
    expect(game).toMatchObject({
      tournamentShape: "king_of_the_court",
      teamsAllowed: 8,
      playersAllowed: 16,
      poolCount: null,
      roundCount: null,
      matchMinutes: null,
      rated: true,
      groupRated: false,
    });
  });

  it("refuses an odd field or more than six courts", async () => {
    const database = await testDatabase();
    const organizer = await insertKingUser(database, "Hassan Haji");
    const base = {
      createdBy: organizer.id,
      name: "Sunday Social",
      groupId: crypto.randomUUID(),
      isPublic: false,
      tournamentShape: "king_of_the_court" as const,
      venueId: crypto.randomUUID(),
      matchMinutes: 45,
      windowStart: START,
      windowEnd: END,
    };
    await expectRefused(
      () => createTournament(database, { ...base, teamCount: 14 }),
      /2 to 6 courts/,
    );
    await expectRefused(
      () => createTournament(database, { ...base, teamCount: 7 }),
      /2 to 6 courts/,
    );
  });
});

describe("postKingCourts", () => {
  async function fullTournament() {
    const database = await testDatabase();
    const organizer = await insertKingUser(database, "Hassan Haji");
    const gameId = await insertKingTournament(database, {
      createdBy: organizer.id,
      courts: 3,
      windowStart: START,
      windowEnd: END,
    });
    const teamIds = await seatKingTeams(
      database,
      gameId,
      await insertKingPlayers(database, 12),
    );
    return { database, organizer, gameId, teamIds };
  }

  it("puts the drawn order two a court from Court 1 down and closes the seats", async () => {
    const { database, organizer, gameId, teamIds } = await fullTournament();
    const order = [...teamIds].reverse();
    await database.insert(gameWaitlist).values({
      gameId,
      userId: (await insertKingUser(database, "Waiting Player")).id,
    });

    await postKingCourts(database, {
      gameId,
      organizerUserId: organizer.id,
      gameTeamIds: order,
    });

    const courts = await startCourts(database, gameId);
    expect(order.map((id) => courts.get(id))).toEqual([1, 1, 2, 2, 3, 3]);
    const game = await database.query.games.findFirst({
      where: eq(games.id, gameId),
    });
    expect(game?.drawPostedAt).not.toBeNull();
    expect(game?.registrationClosedAt).not.toBeNull();
    expect(
      await database.query.gameWaitlist.findMany({
        where: eq(gameWaitlist.gameId, gameId),
      }),
    ).toHaveLength(0);
  });

  it("replaces the courts when posted again, and byId reads them back", async () => {
    const { database, organizer, gameId, teamIds } = await fullTournament();
    await postKingCourts(database, {
      gameId,
      organizerUserId: organizer.id,
      gameTeamIds: teamIds,
    });
    const swapped = [
      teamIds[2]!,
      teamIds[1]!,
      teamIds[0]!,
      ...teamIds.slice(3),
    ];
    await postKingCourts(database, {
      gameId,
      organizerUserId: organizer.id,
      gameTeamIds: swapped,
    });

    const detail = await gameById(database, {
      gameId,
      userId: organizer.id,
    });
    const byTeam = new Map(
      detail.gameTeams.map((team) => [team.id, team.startCourt]),
    );
    expect(swapped.map((id) => byTeam.get(id))).toEqual([1, 1, 2, 2, 3, 3]);
  });

  it("needs every complete team exactly once, from the Organizer", async () => {
    const { database, organizer, gameId, teamIds } = await fullTournament();
    await expectRefused(
      () =>
        postKingCourts(database, {
          gameId,
          organizerUserId: organizer.id,
          gameTeamIds: teamIds.slice(1),
        }),
      /exactly once/,
    );
    await expectRefused(
      () =>
        postKingCourts(database, {
          gameId,
          organizerUserId: organizer.id,
          gameTeamIds: [teamIds[0]!, ...teamIds.slice(0, -1)],
        }),
      /exactly once/,
    );
    const stranger = await insertKingUser(database, "Someone Else");
    const error = await postKingCourts(database, {
      gameId,
      organizerUserId: stranger.id,
      gameTeamIds: teamIds,
    }).then(
      () => null,
      (caught: unknown) => caught,
    );
    expect(error).toBeInstanceOf(TRPCError);
  });

  it("needs an even number of complete teams, and no Half team", async () => {
    const database = await testDatabase();
    const organizer = await insertKingUser(database, "Hassan Haji");
    const gameId = await insertKingTournament(database, {
      createdBy: organizer.id,
      courts: 3,
      windowStart: START,
      windowEnd: END,
    });
    const players = await insertKingPlayers(database, 11);
    const teamIds = await seatKingTeams(database, gameId, players.slice(0, 10));
    await expectRefused(
      () =>
        postKingCourts(database, {
          gameId,
          organizerUserId: organizer.id,
          gameTeamIds: teamIds,
        }),
      /even number/,
    );

    await registerSeat(database, {
      gameId,
      userId: players[10]!.id,
      sideIndex: 6,
      position: "left",
    });
    await expectRefused(
      () =>
        postKingCourts(database, {
          gameId,
          organizerUserId: organizer.id,
          gameTeamIds: teamIds,
        }),
      /missing a partner/,
    );
  });

  it("keeps a team that lost a player on its court, and can still move it", async () => {
    const { database, organizer, gameId, teamIds } = await fullTournament();
    await postKingCourts(database, {
      gameId,
      organizerUserId: organizer.id,
      gameTeamIds: teamIds,
    });
    const first = await database.query.gameTeams.findFirst({
      where: eq(gameTeams.id, teamIds[0]!),
      with: { players: { with: { gamePlayer: true } } },
    });
    await kick(database, {
      gameId,
      organizerUserId: organizer.id,
      userId: first!.players[0]!.gamePlayer.userId!,
    });

    const moved = [...teamIds].reverse();
    await postKingCourts(database, {
      gameId,
      organizerUserId: organizer.id,
      gameTeamIds: moved,
    });

    const courts = await startCourts(database, gameId);
    expect(courts.get(teamIds[0]!)).toBe(3);
    const detail = await gameById(database, { gameId, userId: organizer.id });
    const half = detail.gameTeams.find((team) => team.id === teamIds[0]);
    expect(half?.members).toHaveLength(1);
    expect(half?.startCourt).toBe(3);

    await postKingFinalOrder(database, {
      gameId,
      organizerUserId: organizer.id,
      gameTeamIds: [teamIds[0]!, teamIds[1]!, teamIds[2]!],
      now: new Date("2026-09-25T11:05:00"),
    });
  });

  it("is closed once the final order is posted", async () => {
    const { database, organizer, gameId, teamIds } = await fullTournament();
    await postKingCourts(database, {
      gameId,
      organizerUserId: organizer.id,
      gameTeamIds: teamIds,
    });
    await postKingFinalOrder(database, {
      gameId,
      organizerUserId: organizer.id,
      gameTeamIds: teamIds.slice(0, 3),
      now: new Date("2026-09-25T11:05:00"),
    });
    await expectRefused(
      () =>
        postKingCourts(database, {
          gameId,
          organizerUserId: organizer.id,
          gameTeamIds: teamIds,
        }),
      /final order is posted/,
    );
  });

  it("keeps the Pool draw doors away from King of the court", async () => {
    const { database, organizer, gameId } = await fullTournament();
    await expectRefused(
      () => drawPools(database, { gameId, organizerUserId: organizer.id }),
      /starting courts/,
    );
    await expectRefused(
      () => postPoolDraw(database, { gameId, organizerUserId: organizer.id }),
      /starting courts/,
    );
  });
});
