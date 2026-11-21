import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import {
  MatchStatusEnum,
  americanoSeats,
  games,
  matchSets,
  matches,
} from "@repo/db/schema";

import {
  insertAmericano,
  insertAmericanoPlayers,
  registerAmericanoPlayers,
} from "#src/games/americano.test-support";
import { cancelGame } from "#src/routers/games/cancel";
import { createSeries } from "#src/routers/series/create";
import { loadSeriesEditions } from "#src/series/load-series-editions";
import {
  footballGame,
  newSeries,
  padelGame,
  playFriendly,
  seriesFixture,
  seriesTestWindow,
  type SeriesFixture,
} from "#src/series/series.test-support";

function countQueries(f: SeriesFixture) {
  const original = f.client.query.bind(f.client);
  const counter = { value: 0 };
  // Drizzle's pglite driver runs every statement through `client.query`.
  f.client.query = ((...callArgs: Parameters<typeof original>) => {
    counter.value += 1;
    return original(...callArgs);
  }) as typeof f.client.query;
  return counter;
}

function day(offset: number) {
  const date = new Date(Date.UTC(2026, 11, 1 + offset));
  return date.toISOString().slice(0, 10);
}

async function playedGame(f: SeriesFixture, offset: number, seriesId: string) {
  const gameId = await padelGame(f, day(offset), seriesId);
  await playFriendly(
    f.db,
    gameId,
    [
      { userIds: [f.qasim.id, f.ahmed.id] },
      { userIds: [f.layla.id, f.nora.id] },
    ],
    [
      [6, 3],
      [6, 4],
    ],
    seriesTestWindow(day(offset)).windowEnd,
  );
  return gameId;
}

describe("loadSeriesEditions", () => {
  it("runs the same number of queries for one Game and for twenty", async () => {
    const f = await seriesFixture();
    const one = await newSeries(f, f.padel.id, "Sunday Social");
    const twenty = await newSeries(f, f.padel.id, "Thursday Ladder");
    const single = await playedGame(f, 0, one);
    const many: string[] = [];
    for (let offset = 0; offset < 20; offset += 1) {
      many.push(
        offset % 2 === 0
          ? await playedGame(f, offset, twenty)
          : await padelGame(f, day(offset), twenty),
      );
    }

    const counter = countQueries(f);
    const oneBySeries = await loadSeriesEditions(f.db, { seriesIds: [one] });
    const oneSeriesQueries = counter.value;
    counter.value = 0;
    const twentyBySeries = await loadSeriesEditions(f.db, {
      seriesIds: [twenty],
    });
    const twentySeriesQueries = counter.value;
    counter.value = 0;
    const oneByGame = await loadSeriesEditions(f.db, { gameIds: [single] });
    const oneGameQueries = counter.value;
    counter.value = 0;
    const twentyByGame = await loadSeriesEditions(f.db, { gameIds: many });
    const twentyGameQueries = counter.value;

    expect(oneBySeries).toHaveLength(1);
    expect(twentyBySeries).toHaveLength(20);
    expect(oneByGame).toHaveLength(1);
    expect(twentyByGame).toHaveLength(20);
    expect(oneSeriesQueries).toBe(5);
    expect(twentySeriesQueries).toBe(oneSeriesQueries);
    expect(oneGameQueries).toBe(oneSeriesQueries);
    expect(twentyGameQueries).toBe(oneSeriesQueries);
  });

  it("numbers Editions against every Game of the Series when asked for some of its Games", async () => {
    const f = await seriesFixture();
    const seriesId = await newSeries(f, f.padel.id, "Sunday Social");
    const cancelled = await padelGame(f, day(0), seriesId);
    await padelGame(f, day(1), seriesId);
    await padelGame(f, day(2), seriesId);
    const asked = await padelGame(f, day(3), seriesId);
    await cancelGame(f.db, { gameId: cancelled, userId: f.owner.id });

    const editions = await loadSeriesEditions(f.db, {
      gameIds: [asked, cancelled],
    });
    expect(editions.map((entry) => [entry.game.id, entry.edition])).toEqual([
      [asked, 3],
    ]);
  });

  it("reads what the Series reads need around a decided Friendly game", async () => {
    const f = await seriesFixture();
    const seriesId = await newSeries(f, f.football.id, "Friday Classic");
    const gameId = await footballGame(f, day(3), seriesId);
    const completedAt = seriesTestWindow(day(3)).windowEnd;
    await playFriendly(
      f.db,
      gameId,
      [
        { userIds: [f.qasim.id, f.ahmed.id], bib: "black" },
        { userIds: [f.layla.id, f.guest.id] },
      ],
      [[2, 4]],
      completedAt,
    );

    const [edition] = await loadSeriesEditions(f.db, { seriesIds: [seriesId] });
    expect(edition).toMatchObject({
      game: {
        id: gameId,
        seriesId,
        format: "friendly_game",
        sport: "football",
      },
      edition: 1,
      result: { state: "won" },
      winnerBib: "white",
      decidedAt: completedAt,
    });
    expect(edition?.winners).toEqual([
      { userId: f.layla.id, name: "Layla Haddad", image: null, isGuest: false },
      { userId: f.guest.id, name: "Guest Gamer", image: null, isGuest: true },
    ]);
    expect(edition?.score?.sets).toEqual([
      { slot1GamesWon: 2, slot2GamesWon: 4 },
    ]);
    expect(new Set(edition?.seatedUserIds)).toEqual(
      new Set([f.qasim.id, f.ahmed.id, f.layla.id, f.guest.id]),
    );
  });

  it("leaves an undecided Edition without a score or a moment", async () => {
    const f = await seriesFixture();
    const seriesId = await newSeries(f, f.padel.id, "Sunday Social");
    await padelGame(f, day(3), seriesId);
    const [edition] = await loadSeriesEditions(f.db, { seriesIds: [seriesId] });
    expect(edition).toMatchObject({
      result: { state: "upcoming" },
      winners: [],
      winnerBib: null,
      score: null,
      decidedAt: null,
      seatedUserIds: [],
    });
  });

  it("gives an Americano to the player the Americano table puts first", async () => {
    const f = await seriesFixture();
    const windowStart = new Date("2026-12-06T07:00:00Z");
    const gameId = await insertAmericano(f.db, {
      createdBy: f.owner.id,
      players: 8,
      rounds: 1,
      windowStart,
      windowEnd: new Date("2026-12-06T09:00:00Z"),
    });
    const game = await f.db.query.games.findFirst({
      where: eq(games.id, gameId),
      columns: { groupId: true },
    });
    const { id: seriesId } = await createSeries(f.db, {
      groupId: game!.groupId!,
      userId: f.owner.id,
      name: "Sunday Americano",
      emblem: "moon",
      colour: "teal",
    });
    await f.db.update(games).set({ seriesId }).where(eq(games.id, gameId));
    const players = await insertAmericanoPlayers(f.db, 8);
    const seats = await registerAmericanoPlayers(f.db, gameId, players);

    const courtMatch = async (
      seated: readonly [string, string, string, string],
      score: readonly [number, number] | null,
    ) => {
      const [row] = await f.db
        .insert(matches)
        .values({
          gameId,
          roundNumber: 1,
          startTime: windowStart,
          status: score ? MatchStatusEnum.COMPLETED : MatchStatusEnum.PENDING,
          completedAt: score ? windowStart : null,
        })
        .returning({ id: matches.id });
      await f.db.insert(americanoSeats).values(
        seated.map((gamePlayerId, index) => ({
          matchId: row!.id,
          gamePlayerId,
          slot: index < 2 ? 1 : 2,
        })),
      );
      if (score) {
        await f.db.insert(matchSets).values({
          matchId: row!.id,
          setNumber: 1,
          slot1GamesWon: score[0],
          slot2GamesWon: score[1],
        });
      }
      return row!.id;
    };
    const [p1, p2, p3, p4, p5, p6, p7, p8] = seats as [
      string,
      string,
      string,
      string,
      string,
      string,
      string,
      string,
    ];
    await courtMatch([p1, p2, p3, p4], [14, 10]);
    const second = await courtMatch([p5, p6, p7, p8], null);

    const [playing] = await loadSeriesEditions(f.db, { seriesIds: [seriesId] });
    expect(playing?.result).toEqual({ state: "upcoming" });

    await f.db
      .update(matches)
      .set({ status: MatchStatusEnum.COMPLETED, completedAt: windowStart })
      .where(eq(matches.id, second));
    await f.db.insert(matchSets).values({
      matchId: second,
      setNumber: 1,
      slot1GamesWon: 16,
      slot2GamesWon: 8,
    });
    const [won] = await loadSeriesEditions(f.db, { seriesIds: [seriesId] });
    expect(won?.result).toEqual({
      state: "won",
      gameTeamIds: [],
      userIds: [players[4]!.id],
    });
    expect(won?.winners.map((winner) => winner.name)).toEqual([
      players[4]!.name,
    ]);
  });
});
