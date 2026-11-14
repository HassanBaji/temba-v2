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

import { gameTeams, games } from "@repo/db/schema";
import { createPgliteDb } from "@repo/db/testing";

import {
  insertKingPlayers,
  insertKingTournament,
  insertKingUser,
  seatKingTeams,
} from "#src/games/king-of-the-court.test-support";
import { listMyGamesHubRows } from "#src/games/list-my-games";
import { gameById } from "#src/routers/games/byId";
import { listMyMatchHistoryRows } from "#src/routers/games/listMyMatchHistory";
import { postKingCourts } from "#src/routers/games/postKingCourts";
import { postKingFinalOrder } from "#src/routers/games/postKingFinalOrder";

const START = new Date("2026-09-25T09:00:00");
const END = new Date("2026-09-25T11:00:00");
const AFTER = new Date("2026-09-25T11:05:00");
const NEXT_DAY = new Date("2026-09-26T11:05:00");

beforeAll(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-09-01T12:00:00"));
});

afterAll(() => {
  vi.useRealTimers();
});

async function drawnTournament() {
  const { db: database, close } = await createPgliteDb();
  onTestFinished(close);
  const organizer = await insertKingUser(database, "Hassan Haji");
  const gameId = await insertKingTournament(database, {
    createdBy: organizer.id,
    courts: 3,
    windowStart: START,
    windowEnd: END,
  });
  const players = await insertKingPlayers(database, 12);
  const teamIds = await seatKingTeams(database, gameId, players);
  await postKingCourts(database, {
    gameId,
    organizerUserId: organizer.id,
    gameTeamIds: teamIds,
  });
  return { database, organizer, gameId, teamIds, players };
}

async function expectRefused(run: () => Promise<unknown>, message: RegExp) {
  const error = await run().then(
    () => null,
    (caught: unknown) => caught,
  );
  expect(error).toBeInstanceOf(TRPCError);
  expect((error as TRPCError).message).toMatch(message);
}

describe("postKingFinalOrder", () => {
  it("places the teams in the order given and leaves the rest unplaced", async () => {
    const { database, organizer, gameId, teamIds } = await drawnTournament();
    const order = [teamIds[3]!, teamIds[0]!, teamIds[5]!, teamIds[1]!];

    await postKingFinalOrder(database, {
      gameId,
      organizerUserId: organizer.id,
      gameTeamIds: order,
      now: AFTER,
    });

    const rows = await database.query.gameTeams.findMany({
      where: eq(gameTeams.gameId, gameId),
      columns: { id: true, finalPlace: true },
    });
    const places = new Map(rows.map((row) => [row.id, row.finalPlace]));
    expect(order.map((id) => places.get(id))).toEqual([1, 2, 3, 4]);
    expect(places.get(teamIds[2]!)).toBeNull();
    expect(places.get(teamIds[4]!)).toBeNull();

    const detail = await gameById(database, {
      gameId,
      userId: organizer.id,
    });
    expect(detail.finalOrderPostedAt).toEqual(AFTER);
  });

  it("needs the top three, the posted courts, and a started day", async () => {
    const { database, organizer, gameId, teamIds } = await drawnTournament();
    await expectRefused(
      () =>
        postKingFinalOrder(database, {
          gameId,
          organizerUserId: organizer.id,
          gameTeamIds: teamIds.slice(0, 2),
          now: AFTER,
        }),
      /top 3/,
    );
    await expectRefused(
      () =>
        postKingFinalOrder(database, {
          gameId,
          organizerUserId: organizer.id,
          gameTeamIds: [teamIds[0]!, teamIds[0]!, teamIds[1]!],
          now: AFTER,
        }),
      /each once/,
    );
    await expectRefused(
      () =>
        postKingFinalOrder(database, {
          gameId,
          organizerUserId: organizer.id,
          gameTeamIds: teamIds.slice(0, 3),
          now: new Date("2026-09-25T08:00:00"),
        }),
      /has started/,
    );
  });

  it("can change for 24 hours after the first post, then closes", async () => {
    const { database, organizer, gameId, teamIds } = await drawnTournament();
    await postKingFinalOrder(database, {
      gameId,
      organizerUserId: organizer.id,
      gameTeamIds: teamIds.slice(0, 3),
      now: AFTER,
    });
    await postKingFinalOrder(database, {
      gameId,
      organizerUserId: organizer.id,
      gameTeamIds: [teamIds[1]!, teamIds[0]!, teamIds[2]!],
      now: new Date("2026-09-26T10:00:00"),
    });
    const game = await database.query.games.findFirst({
      where: eq(games.id, gameId),
    });
    expect(game?.finalOrderPostedAt).toEqual(AFTER);
    await expectRefused(
      () =>
        postKingFinalOrder(database, {
          gameId,
          organizerUserId: organizer.id,
          gameTeamIds: teamIds.slice(0, 3),
          now: NEXT_DAY,
        }),
      /24 hours/,
    );
  });
});

describe("King of the court on the Games lists", () => {
  it("is one Played row with the viewer's place and the king once posted", async () => {
    const { database, organizer, gameId, teamIds, players } =
      await drawnTournament();
    const viewer = players[4]!;
    await postKingFinalOrder(database, {
      gameId,
      organizerUserId: organizer.id,
      gameTeamIds: [teamIds[0]!, teamIds[1]!, teamIds[2]!],
      now: AFTER,
    });

    const rows = await listMyMatchHistoryRows(database, viewer.id, AFTER, {
      limit: 20,
      kingOfTheCourt: true,
    });
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      id: gameId,
      matchId: gameId,
      rated: false,
      kingOfTheCourt: {
        posted: true,
        place: 3,
        teamCount: 6,
        courtCount: 3,
        startCourt: 2,
        king: { name: "Player & Player", isViewer: false },
      },
    });

    const withoutFlag = await listMyMatchHistoryRows(
      database,
      viewer.id,
      AFTER,
      { limit: 20 },
    );
    expect(withoutFlag).toHaveLength(0);
  });

  it("leaves My Games once the final order is posted", async () => {
    const { database, organizer, gameId, teamIds, players } =
      await drawnTournament();
    const viewer = players[0]!;
    const before = await listMyGamesHubRows(database, viewer.id, START);
    expect(before.some((row) => row.id === gameId)).toBe(true);

    await postKingFinalOrder(database, {
      gameId,
      organizerUserId: organizer.id,
      gameTeamIds: teamIds.slice(0, 3),
      now: START,
    });

    const after = await listMyGamesHubRows(database, viewer.id, START);
    expect(after.some((row) => row.id === gameId)).toBe(false);
  });

  it("is a Played row waiting for the order once the window has passed", async () => {
    const { database, gameId, players } = await drawnTournament();
    const rows = await listMyMatchHistoryRows(database, players[0]!.id, AFTER, {
      limit: 20,
      kingOfTheCourt: true,
    });
    expect(rows).toHaveLength(1);
    expect(rows[0]?.id).toBe(gameId);
    expect(rows[0]?.kingOfTheCourt).toMatchObject({
      posted: false,
      place: null,
      king: null,
    });
  });
});
