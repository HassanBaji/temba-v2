import { and, eq, inArray } from "drizzle-orm";
import {
  afterAll,
  beforeAll,
  describe,
  expect,
  it,
  onTestFinished,
  vi,
} from "vitest";

import type { Db } from "@repo/db";
import {
  games,
  kingPlaceAwards,
  matches,
  notifications,
  ratingEvents,
  ratings,
  user,
} from "@repo/db/schema";
import { createPgliteDb, type TestDatabase } from "@repo/db/testing";
import { wrongScoreReversalEligibility } from "#src/games/wrong-score-reversal";
import {
  insertKingPlayers,
  insertKingTournament,
  insertKingUser,
  seatKingTeams,
} from "#src/games/king-of-the-court.test-support";
import { recordJobs } from "#src/jobs/job-sink.test-support";
import { gameById } from "#src/routers/games/byId";
import { listMyMatchHistoryRows } from "#src/routers/games/listMyMatchHistory";
import { postKingCourts } from "#src/routers/games/postKingCourts";
import { postKingFinalOrder } from "#src/routers/games/postKingFinalOrder";
import { ratingHistory } from "#src/routers/ratings/history";
import { loadRatingsMe } from "#src/routers/ratings/me";

const START = new Date("2026-09-25T09:00:00");
const END = new Date("2026-09-25T11:00:00");
const POSTED = new Date("2026-09-25T11:05:00");
const CORRECTED = new Date("2026-09-25T12:05:00");

beforeAll(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-09-01T12:00:00"));
});

afterAll(() => {
  vi.useRealTimers();
});

function asDb(database: TestDatabase): Db {
  return database as unknown as Db;
}

/** Four courts drawn: eight Game teams, team `n` holding players `2n` and `2n + 1`. */
async function drawnTournament() {
  const { db: database, close } = await createPgliteDb();
  onTestFinished(close);
  const organizer = await insertKingUser(database, "Hassan Haji");
  const gameId = await insertKingTournament(database, {
    createdBy: organizer.id,
    courts: 4,
    windowStart: START,
    windowEnd: END,
  });
  const players = await insertKingPlayers(database, 16);
  const teamIds = await seatKingTeams(database, gameId, players);
  await postKingCourts(database, {
    gameId,
    organizerUserId: organizer.id,
    gameTeamIds: teamIds,
  });
  return { database, organizer, gameId, teamIds, players };
}

type Drawn = Awaited<ReturnType<typeof drawnTournament>>;

async function postOrder(
  drawn: Drawn,
  gameTeamIds: readonly string[],
  now = POSTED,
) {
  await postKingFinalOrder(drawn.database, {
    gameId: drawn.gameId,
    organizerUserId: drawn.organizer.id,
    gameTeamIds,
    now,
  });
}

async function awardsOf(drawn: Drawn) {
  return drawn.database.query.kingPlaceAwards.findMany({
    where: eq(kingPlaceAwards.gameId, drawn.gameId),
  });
}

async function ratingOf(drawn: Drawn, userId: string) {
  return drawn.database.query.ratings.findFirst({
    where: eq(ratings.userId, userId),
  });
}

async function setLevel(
  database: TestDatabase,
  userIds: readonly string[],
  mu: number,
) {
  await database.insert(ratings).values(
    userIds.map((userId) => ({
      userId,
      sport: "padel" as const,
      mu,
      phi: 150,
      sigma: 0.06,
      levelBand: "C2" as const,
    })),
  );
}

function gainOf(
  awards: Awaited<ReturnType<typeof awardsOf>>,
  userId: string | undefined,
) {
  const award = awards.find((row) => row.userId === userId);
  return award ? award.muAfter - award.muBefore : null;
}

async function toldOf(drawn: Drawn) {
  const rows = await drawn.database.query.notifications.findMany({
    where: and(
      eq(notifications.gameId, drawn.gameId),
      eq(notifications.type, "king_place_awarded"),
    ),
  });
  return rows.map((row) => row.recipientUserId).sort();
}

function idsOf(players: readonly { id: string }[]) {
  return players.map((player) => player.id).sort();
}

describe("applyKingPlaceAwards", () => {
  const jobs = recordJobs();

  it("counts first to fourth place as 2, 1, a half and a quarter of a win the moment the order is posted", async () => {
    const drawn = await drawnTournament();
    const { players, teamIds } = drawn;
    await postOrder(drawn, teamIds.slice(0, 6));

    const awards = await awardsOf(drawn);
    expect(awards).toHaveLength(8);
    expect(
      [0, 2, 4, 6].map((index) => {
        const award = awards.find((row) => row.userId === players[index]?.id);
        return [award?.finalPlace, award?.wins];
      }),
    ).toEqual([
      [1, 2],
      [2, 1],
      [3, 0.5],
      [4, 0.25],
    ]);
    const gains = [0, 2, 4, 6].map((index) =>
      gainOf(awards, players[index]?.id),
    );
    expect(gains.every((gain) => gain != null && gain > 0)).toBe(true);
    expect(gains).toEqual([...gains].sort((a, b) => (b ?? 0) - (a ?? 0)));
    // Fifth and sixth place, and the two teams left unplaced, move nothing.
    expect(gainOf(awards, players[8]?.id)).toBeNull();
    expect(gainOf(awards, players[14]?.id)).toBeNull();

    const king = await ratingOf(drawn, players[0]!.id);
    const kingAward = awards.find((row) => row.userId === players[0]!.id);
    expect(king?.mu).toBe(kingAward?.muAfter);
    expect(king?.lastRatedAt).toEqual(POSTED);
    expect(jobs.added.some((job) => job.name.startsWith("king."))).toBe(false);
  });

  it("redoes the awards when the order is corrected, as if the right order had been posted first", async () => {
    const corrected = await drawnTournament();
    const { teamIds, players } = corrected;
    await postOrder(corrected, teamIds.slice(0, 4));
    const fixedOrder = [teamIds[7]!, teamIds[0]!, teamIds[1]!];
    await postOrder(corrected, fixedOrder, CORRECTED);

    const awards = await awardsOf(corrected);
    expect(awards).toHaveLength(6);
    expect(
      awards.find((row) => row.userId === players[14]!.id)?.finalPlace,
    ).toBe(1);
    expect(awards.find((row) => row.userId === players[0]!.id)?.wins).toBe(1);
    // Third and fourth place of the first order are placed no longer: their
    // Rating rows, which the first award created, are gone with it.
    for (const index of [4, 5, 6, 7]) {
      expect(gainOf(awards, players[index]!.id)).toBeNull();
      expect(await ratingOf(corrected, players[index]!.id)).toBeUndefined();
    }

    const direct = await drawnTournament();
    await postOrder(
      direct,
      [direct.teamIds[7]!, direct.teamIds[0]!, direct.teamIds[1]!],
      CORRECTED,
    );
    const directAwards = await awardsOf(direct);
    for (const index of [14, 15, 0, 1, 2, 3]) {
      expect(gainOf(awards, players[index]!.id)).toBeCloseTo(
        gainOf(directAwards, direct.players[index]!.id) ?? NaN,
        9,
      );
      const rating = await ratingOf(corrected, players[index]!.id);
      const directRating = await ratingOf(direct, direct.players[index]!.id);
      expect(rating?.mu).toBeCloseTo(directRating?.mu ?? NaN, 9);
      expect(rating?.phi).toBeCloseTo(directRating?.phi ?? NaN, 9);
    }
  });

  it("restores a Rating that was there before to exactly what it was", async () => {
    const drawn = await drawnTournament();
    const { database, teamIds, players } = drawn;
    await setLevel(database, idsOf(players), 1700);
    await postOrder(drawn, teamIds.slice(0, 4));
    expect((await ratingOf(drawn, players[6]!.id))?.mu).toBeGreaterThan(1700);

    await postOrder(drawn, teamIds.slice(0, 3), CORRECTED);
    expect(await ratingOf(drawn, players[6]!.id)).toMatchObject({
      mu: 1700,
      phi: 150,
      sigma: 0.06,
      levelBand: "C2",
      lastRatedAt: null,
    });
  });

  it("leaves the same awards when the same order is posted again", async () => {
    const drawn = await drawnTournament();
    await postOrder(drawn, drawn.teamIds.slice(0, 4));
    const first = await awardsOf(drawn);
    await postOrder(drawn, drawn.teamIds.slice(0, 4), CORRECTED);
    const second = await awardsOf(drawn);

    expect(second).toHaveLength(8);
    for (const award of first) {
      const again = second.find((row) => row.userId === award.userId);
      expect(again?.muBefore).toBe(award.muBefore);
      expect(again?.muAfter).toBeCloseTo(award.muAfter, 9);
    }
  });

  it("takes only its own move off a Rating something else has moved since", async () => {
    const drawn = await drawnTournament();
    const { database, teamIds, players } = drawn;
    const fourth = players[6]!;
    await setLevel(database, idsOf(players), 1700);
    await postOrder(drawn, teamIds.slice(0, 4));
    const award = (await awardsOf(drawn)).find(
      (row) => row.userId === fourth.id,
    );
    const gain = (award?.muAfter ?? 0) - (award?.muBefore ?? 0);
    const later = new Date("2026-09-25T11:30:00");
    await database
      .update(ratings)
      .set({ mu: 1900, phi: 120, lastRatedAt: later })
      .where(eq(ratings.userId, fourth.id));

    await postOrder(drawn, teamIds.slice(0, 3), CORRECTED);
    const rating = await ratingOf(drawn, fourth.id);
    expect(rating?.mu).toBeCloseTo(1900 - gain, 9);
    expect(rating?.phi).toBe(120);
    expect(rating?.lastRatedAt).toEqual(later);
  });

  it("gains more the stronger the field is", async () => {
    const weak = await drawnTournament();
    await setLevel(weak.database, idsOf(weak.players), 1500);
    const strong = await drawnTournament();
    await setLevel(strong.database, idsOf(strong.players.slice(0, 2)), 1500);
    await setLevel(strong.database, idsOf(strong.players.slice(2)), 2000);
    for (const drawn of [weak, strong]) {
      await postOrder(drawn, drawn.teamIds.slice(0, 3));
    }

    const [weakAwards, strongAwards] = await Promise.all([
      awardsOf(weak),
      awardsOf(strong),
    ]);
    const inWeakField = gainOf(weakAwards, weak.players[0]!.id) ?? 0;
    const inStrongField = gainOf(strongAwards, strong.players[0]!.id) ?? 0;
    expect(inWeakField).toBeGreaterThan(0);
    expect(inStrongField).toBeGreaterThan(inWeakField);
    expect(
      strongAwards.find((row) => row.userId === strong.players[0]!.id)?.fieldMu,
    ).toBeCloseTo((2 * 1500 + 14 * 2000) / 16, 6);
  });

  it("moves nothing on a Game its creator made Unrated", async () => {
    const drawn = await drawnTournament();
    await drawn.database
      .update(games)
      .set({ rated: false })
      .where(eq(games.id, drawn.gameId));
    await postOrder(drawn, drawn.teamIds.slice(0, 4));

    expect(await awardsOf(drawn)).toHaveLength(0);
    expect(await ratingOf(drawn, drawn.players[0]!.id)).toBeUndefined();
    expect(await toldOf(drawn)).toEqual([]);
  });

  it("neither rates a Guest player nor counts them in the field", async () => {
    const drawn = await drawnTournament();
    const { database, players, teamIds } = drawn;
    const guest = players[1]!;
    await setLevel(
      database,
      idsOf(players.filter((player) => player.id !== guest.id)),
      1600,
    );
    await database
      .update(user)
      .set({ guestAt: START, addedAt: START, email: null })
      .where(eq(user.id, guest.id));
    await postOrder(drawn, teamIds.slice(0, 3));

    const awards = await awardsOf(drawn);
    expect(gainOf(awards, guest.id)).toBeNull();
    const partner = awards.find((row) => row.userId === players[0]!.id);
    expect(partner?.fieldMu).toBeCloseTo(1600, 6);
    expect(partner?.wins).toBe(2);
  });

  it("tells each player who moved once, and a corrected order tells only who it places", async () => {
    const drawn = await drawnTournament();
    const { teamIds, players } = drawn;
    await postOrder(drawn, teamIds.slice(0, 4));
    expect(await toldOf(drawn)).toEqual(idsOf(players.slice(0, 8)));

    await postOrder(drawn, teamIds.slice(0, 4), CORRECTED);
    expect(await toldOf(drawn)).toEqual(idsOf(players.slice(0, 8)));

    await postOrder(
      drawn,
      [teamIds[7]!, teamIds[0]!, teamIds[1]!],
      new Date(CORRECTED.getTime() + 60_000),
    );
    expect(await toldOf(drawn)).toEqual(
      idsOf([...players.slice(0, 4), ...players.slice(14)]),
    );
  });
});

describe("a Place award on the screens that read the Level", () => {
  recordJobs();

  it("is on the Game read with the viewer's own move, before and after a correction", async () => {
    const drawn = await drawnTournament();
    const { database, gameId, players, teamIds } = drawn;
    const before = await gameById(database, { gameId, userId: players[0]!.id });
    expect(before.viewerPlaceAward).toBeNull();

    await postOrder(drawn, teamIds.slice(0, 4));
    const posted = await gameById(database, { gameId, userId: players[0]!.id });
    expect(posted.viewerPlaceAward?.wins).toBe(2);
    expect(posted.viewerPlaceAward?.muAfter).toBeGreaterThan(
      posted.viewerPlaceAward?.muBefore ?? Infinity,
    );
    const unplaced = await gameById(database, {
      gameId,
      userId: players[15]!.id,
    });
    expect(unplaced.viewerPlaceAward).toBeNull();

    await postOrder(drawn, [teamIds[1]!, teamIds[0]!, teamIds[2]!], CORRECTED);
    const corrected = await gameById(database, {
      gameId,
      userId: players[0]!.id,
    });
    expect(corrected.viewerPlaceAward?.wins).toBe(1);
  });

  it("is a line of Rating history, a point on the trend and the move on the Played row", async () => {
    const drawn = await drawnTournament();
    const { database, gameId, players, teamIds } = drawn;
    const runnerUp = players[2]!;
    await postOrder(drawn, teamIds.slice(0, 4));

    const history = await ratingHistory(asDb(database) as never, {
      userId: runnerUp.id,
      ladder: "all",
    });
    expect(history.entries).toHaveLength(1);
    expect(history.entries[0]).toMatchObject({
      kind: "king_place",
      sport: "padel",
      finalPlace: 2,
      teamCount: 8,
      venueName: "Janabiyah Padel Park",
    });

    const me = await loadRatingsMe(asDb(database) as never, {
      userId: runnerUp.id,
    });
    expect(me.historySteps).toEqual(["placed"]);
    expect(me.history).toHaveLength(2);
    expect(me.historyMatchCount).toBe(0);
    expect(me.ratedMatchCount).toBe(0);
    expect(me.rating?.provisional).toBe(true);

    const played = await listMyMatchHistoryRows(database, runnerUp.id, POSTED, {
      limit: 20,
      kingOfTheCourt: true,
    });
    expect(played[0]).toMatchObject({
      id: gameId,
      rated: true,
      ratingScope: "temba",
    });
    expect(played[0]?.levelMove?.muAfter).toBeGreaterThan(
      played[0]?.levelMove?.muBefore ?? Infinity,
    );
  });

  it("refuses to reverse an earlier Rated Match of a player it moved", async () => {
    const drawn = await drawnTournament();
    const { database, gameId, players, teamIds } = drawn;
    const king = players[0]!;
    const [match] = await database
      .insert(matches)
      .values({ gameId })
      .returning({ id: matches.id });
    await database.insert(ratingEvents).values({
      userId: king.id,
      sport: "padel",
      matchId: match!.id,
      outcomeScore: 1,
      weight: 1,
      muBefore: 1500,
      phiBefore: 350,
      sigmaBefore: 0.06,
      muAfter: 1600,
      phiAfter: 300,
      sigmaAfter: 0.06,
      createdAt: START,
    });
    expect(
      await wrongScoreReversalEligibility(asDb(database), match!.id),
    ).toEqual({ eligible: true });

    await postOrder(drawn, teamIds.slice(0, 3));

    const eligibility = await wrongScoreReversalEligibility(
      asDb(database),
      match!.id,
    );
    expect(eligibility.eligible).toBe(false);
    expect(eligibility.reason).toMatch(/King of the court/);
    expect(
      await database.query.kingPlaceAwards.findMany({
        where: inArray(kingPlaceAwards.userId, [king.id]),
      }),
    ).toHaveLength(1);
  });
});
