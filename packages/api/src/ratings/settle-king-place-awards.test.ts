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
import { KING_FINAL_ORDER_CHANGE_MS } from "@repo/domain/tournament-king";

import { wrongScoreReversalEligibility } from "#src/games/wrong-score-reversal";
import {
  insertKingPlayers,
  insertKingTournament,
  insertKingUser,
  seatKingTeams,
} from "#src/games/king-of-the-court.test-support";
import { handle } from "#src/jobs/handlers/king.place-awards";
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
const CLOSED = new Date(POSTED.getTime() + KING_FINAL_ORDER_CHANGE_MS);

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

function settle(drawn: Drawn, now = CLOSED) {
  return handle(asDb(drawn.database), { gameId: drawn.gameId }, undefined, now);
}

async function awardsOf(drawn: Drawn) {
  return drawn.database.query.kingPlaceAwards.findMany({
    where: eq(kingPlaceAwards.gameId, drawn.gameId),
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

describe("settleKingPlaceAwards", () => {
  const jobs = recordJobs();

  it("waits for the Final order to close, then counts first to fourth place as 2, 1, a half and a quarter of a win", async () => {
    const drawn = await drawnTournament();
    const { database, gameId, teamIds, players } = drawn;
    await postOrder(drawn, teamIds.slice(0, 6));

    expect(
      jobs.added.find((job) => job.name === "king.place-awards"),
    ).toMatchObject({ payload: { gameId }, runAt: CLOSED });

    await settle(drawn, new Date(CLOSED.getTime() - 1000));
    expect(await awardsOf(drawn)).toHaveLength(0);

    await settle(drawn);
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

    const king = await database.query.ratings.findFirst({
      where: eq(ratings.userId, players[0]!.id),
    });
    const kingAward = awards.find((row) => row.userId === players[0]!.id);
    expect(king?.mu).toBe(kingAward?.muAfter);
    expect(king?.lastRatedAt).toEqual(CLOSED);

    const game = await database.query.games.findFirst({
      where: eq(games.id, gameId),
    });
    expect(game?.placeAwardsSettledAt).toEqual(CLOSED);
  });

  it("writes once, however often it runs", async () => {
    const drawn = await drawnTournament();
    await postOrder(drawn, drawn.teamIds.slice(0, 4));
    await settle(drawn);
    const first = await awardsOf(drawn);

    await settle(drawn, new Date(CLOSED.getTime() + 60_000));
    const second = await awardsOf(drawn);
    expect(second).toHaveLength(8);
    expect(second.map((row) => row.muAfter).sort()).toEqual(
      first.map((row) => row.muAfter).sort(),
    );
  });

  it("goes by the order as it stood when the 24 hours ended", async () => {
    const drawn = await drawnTournament();
    const { teamIds, players } = drawn;
    await postOrder(drawn, teamIds.slice(0, 4));
    await postOrder(
      drawn,
      [teamIds[7]!, teamIds[0]!, teamIds[1]!],
      new Date(POSTED.getTime() + 60 * 60 * 1000),
    );
    await settle(drawn);

    const awards = await awardsOf(drawn);
    expect(awards).toHaveLength(6);
    expect(
      awards.find((row) => row.userId === players[14]!.id)?.finalPlace,
    ).toBe(1);
    expect(awards.find((row) => row.userId === players[0]!.id)?.wins).toBe(1);
    expect(gainOf(awards, players[6]!.id)).toBeNull();
  });

  it("gains more the stronger the field is", async () => {
    const weak = await drawnTournament();
    await setLevel(
      weak.database,
      weak.players.map((player) => player.id),
      1500,
    );
    const strong = await drawnTournament();
    await setLevel(
      strong.database,
      strong.players.slice(0, 2).map((player) => player.id),
      1500,
    );
    await setLevel(
      strong.database,
      strong.players.slice(2).map((player) => player.id),
      2000,
    );
    for (const drawn of [weak, strong]) {
      await postOrder(drawn, drawn.teamIds.slice(0, 3));
      await settle(drawn);
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

    expect(jobs.added.some((job) => job.name === "king.place-awards")).toBe(
      false,
    );
    await settle(drawn);
    expect(await awardsOf(drawn)).toHaveLength(0);
    const game = await drawn.database.query.games.findFirst({
      where: eq(games.id, drawn.gameId),
    });
    expect(game?.placeAwardsSettledAt).toBeNull();
  });

  it("neither rates a Guest player nor counts them in the field", async () => {
    const drawn = await drawnTournament();
    const { database, players, teamIds } = drawn;
    const guest = players[1]!;
    await setLevel(
      database,
      players.filter((player) => player.id !== guest.id).map((p) => p.id),
      1600,
    );
    await database
      .update(user)
      .set({ guestAt: START, addedAt: START, email: null })
      .where(eq(user.id, guest.id));
    await postOrder(drawn, teamIds.slice(0, 3));
    await settle(drawn);

    const awards = await awardsOf(drawn);
    expect(gainOf(awards, guest.id)).toBeNull();
    const partner = awards.find((row) => row.userId === players[0]!.id);
    expect(partner?.fieldMu).toBeCloseTo(1600, 6);
    expect(partner?.wins).toBe(2);
  });

  it("tells each player who moved, once", async () => {
    const drawn = await drawnTournament();
    await postOrder(drawn, drawn.teamIds.slice(0, 5));
    await settle(drawn);
    await settle(drawn, new Date(CLOSED.getTime() + 60_000));

    const rows = await drawn.database.query.notifications.findMany({
      where: and(
        eq(notifications.gameId, drawn.gameId),
        eq(notifications.type, "king_place_awarded"),
      ),
    });
    expect(rows.map((row) => row.recipientUserId).sort()).toEqual(
      drawn.players
        .slice(0, 8)
        .map((player) => player.id)
        .sort(),
    );
  });
});

describe("a Place award on the screens that read the Level", () => {
  recordJobs();

  it("is written by the Game read when the Job is late, with the viewer's own move", async () => {
    const drawn = await drawnTournament();
    const { database, gameId, players, teamIds } = drawn;
    await postOrder(drawn, teamIds.slice(0, 4));

    vi.setSystemTime(new Date(CLOSED.getTime() - 60_000));
    const open = await gameById(database, { gameId, userId: players[0]!.id });
    expect(open.placeAwardsSettledAt).toBeNull();
    expect(open.viewerPlaceAward).toBeNull();

    vi.setSystemTime(new Date(CLOSED.getTime() + 60_000));
    const closed = await gameById(database, { gameId, userId: players[0]!.id });
    expect(closed.placeAwardsSettledAt).not.toBeNull();
    expect(closed.viewerPlaceAward?.wins).toBe(2);
    expect(closed.viewerPlaceAward?.muAfter).toBeGreaterThan(
      closed.viewerPlaceAward?.muBefore ?? Infinity,
    );
    const unplaced = await gameById(database, {
      gameId,
      userId: players[15]!.id,
    });
    expect(unplaced.viewerPlaceAward).toBeNull();
    vi.setSystemTime(new Date("2026-09-01T12:00:00"));
  });

  it("is a line of Rating history, a point on the trend and the move on the Played row", async () => {
    const drawn = await drawnTournament();
    const { database, gameId, players, teamIds } = drawn;
    const runnerUp = players[2]!;
    await postOrder(drawn, teamIds.slice(0, 4));
    await settle(drawn);

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

    const played = await listMyMatchHistoryRows(database, runnerUp.id, CLOSED, {
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
    await settle(drawn);

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
