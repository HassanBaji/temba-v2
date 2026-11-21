import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import { groupMembers, groups, user } from "@repo/db/schema";
import { messagesFor } from "@repo/i18n/messages";

import { seriesEdition } from "#src/routers/series/edition";
import { seriesForPlayer } from "#src/routers/series/forPlayer";
import { seriesPlayerWins } from "#src/routers/series/playerWins";
import {
  SERIES_TEST_NOW,
  footballGame,
  newSeries,
  padelGame,
  playFriendly,
  roundsSocial,
  seriesFixture,
  seriesTestWindow,
  setMatchScore,
  type SeriesFixture,
} from "#src/series/series.test-support";

const playerNotFound = messagesFor("en").profile.errors.playerNotFound;
const gameNotFound = messagesFor("en").game.errors.notFound;

type Pair = readonly [string, string];
type Sets = readonly (readonly [number, number])[];

const WIN: Sets = [
  [6, 3],
  [6, 4],
];

async function rejection(promise: Promise<unknown>) {
  const error = await promise.then(
    () => null,
    (caught: unknown) => caught,
  );
  expect(error).toBeInstanceOf(TRPCError);
  return error as TRPCError;
}

function finished(day: string) {
  return seriesTestWindow(day).windowEnd;
}

/** A padel Edition the first pair wins, decided when its window ends unless told otherwise. */
async function playPadel(
  f: SeriesFixture,
  seriesId: string,
  day: string,
  winners: Pair,
  losers: Pair,
  options: { sets?: Sets; completedAt?: Date } = {},
) {
  const gameId = await padelGame(f, day, seriesId);
  const matchId = await playFriendly(
    f.db,
    gameId,
    [{ userIds: winners }, { userIds: losers }],
    options.sets ?? WIN,
    options.completedAt ?? finished(day),
  );
  return { gameId, matchId };
}

function edition(f: SeriesFixture, gameId: string, userId = f.owner.id) {
  return seriesEdition(f.db, { gameId, userId });
}

function forPlayer(f: SeriesFixture, playerId: string, viewerId = playerId) {
  return seriesForPlayer(f.db, { playerId, viewerId });
}

function playerWins(
  f: SeriesFixture,
  userId: string,
  seriesId: string,
  viewerId = userId,
) {
  return seriesPlayerWins(f.db, { userId, seriesId, viewerId });
}

/** A Private Group the outsider shares with the given players, so they may open their profiles. */
async function shareAnotherGroup(f: SeriesFixture, userIds: string[]) {
  const [other] = await f.db
    .insert(groups)
    .values({ name: "Other Group", createdBy: f.outsider.id, sport: "padel" })
    .returning({ id: groups.id });
  if (!other) {
    throw new Error("Failed to insert group");
  }
  await f.db.insert(groupMembers).values(
    [f.outsider.id, ...userIds].map((userId) => ({
      groupId: other.id,
      userId,
    })),
  );
}

describe("series.edition", () => {
  it("is null on a Game with no Series, and the Game's not-found to someone who may not view it", async () => {
    const f = await seriesFixture();
    const gameId = await padelGame(f, "2026-12-01");
    expect(await edition(f, gameId)).toBeNull();

    const seriesId = await newSeries(f, f.padel.id, "Sunday Social");
    const inSeries = await padelGame(f, "2026-12-02", seriesId);
    const hidden = await rejection(edition(f, inSeries, f.outsider.id));
    expect(hidden.code).toBe("NOT_FOUND");
    expect(hidden.message).toBe(gameNotFound);
  });

  it("gives an upcoming Edition its rule and the last Edition's winners", async () => {
    const f = await seriesFixture();
    const seriesId = await newSeries(f, f.padel.id, "Sunday Social");
    await playPadel(
      f,
      seriesId,
      "2026-12-01",
      [f.layla.id, f.nora.id],
      [f.qasim.id, f.ahmed.id],
    );
    await playPadel(
      f,
      seriesId,
      "2026-12-02",
      [f.qasim.id, f.ahmed.id],
      [f.layla.id, f.nora.id],
      {
        sets: [
          [6, 3],
          [3, 6],
        ],
      },
    );
    const next = await padelGame(f, "2026-12-08", seriesId);

    expect(await edition(f, next, f.member.id)).toEqual({
      series: {
        id: seriesId,
        name: "Sunday Social",
        emblem: "cup",
        colour: "gold",
        groupName: "Tuesday Night Padel",
        endedAt: null,
      },
      edition: 3,
      rule: "side",
      state: "upcoming",
      lastWinners: {
        edition: 1,
        winners: [{ name: "Layla Haddad" }, { name: "Nora Nasser" }],
        winnerBib: null,
      },
      winners: [],
      winnerBib: null,
      canOpenSeries: true,
    });
  });

  it("reads a drawn Friendly game as no winner", async () => {
    const f = await seriesFixture();
    const seriesId = await newSeries(f, f.padel.id, "Sunday Social");
    const { gameId } = await playPadel(
      f,
      seriesId,
      "2026-12-01",
      [f.qasim.id, f.ahmed.id],
      [f.layla.id, f.nora.id],
      {
        sets: [
          [6, 3],
          [3, 6],
        ],
      },
    );
    expect(await edition(f, gameId)).toMatchObject({
      edition: 1,
      state: "no_winner",
      lastWinners: null,
      winners: [],
    });
  });

  it("names a Social's rule by its shape", async () => {
    const f = await seriesFixture();
    const seriesId = await newSeries(f, f.padel.id, "Sunday Social");
    const gameId = await roundsSocial(f, "2026-12-06", seriesId);
    expect(await edition(f, gameId)).toMatchObject({
      rule: "table",
      state: "upcoming",
    });
  });

  it("gives a football side's winners their Game team and the side's Bib", async () => {
    const f = await seriesFixture();
    const seriesId = await newSeries(f, f.football.id, "Friday Classic");
    const gameId = await footballGame(f, "2026-12-04", seriesId);
    await playFriendly(
      f.db,
      gameId,
      [
        { userIds: [f.layla.id, f.nora.id], bib: "white" },
        { userIds: [f.qasim.id, f.ahmed.id, f.reem.id], bib: "black" },
      ],
      [[3, 5]],
      finished("2026-12-04"),
    );
    const result = await edition(f, gameId, f.qasim.id);
    expect(result?.state).toBe("won");
    expect(result?.winnerBib).toBe("black");
    const teams = new Set(result?.winners.map((winner) => winner.gameTeamId));
    expect(teams.size).toBe(1);
    expect([...teams][0]).toEqual(expect.any(String));
    expect(
      result?.winners.map((winner) => [winner.name, winner.isViewer]),
    ).toEqual(
      expect.arrayContaining([
        ["Qasim Albaqali", true],
        ["Ahmed Buhazza", false],
        ["Reem Faraj", false],
      ]),
    );
  });

  it("counts each winner's wins in Edition order and says where it leaves them", async () => {
    const f = await seriesFixture();
    const seriesId = await newSeries(f, f.padel.id, "Sunday Social");
    const { qasim, ahmed, layla, nora, reem, khalid, guest } = f;
    await playPadel(
      f,
      seriesId,
      "2026-12-01",
      [qasim.id, ahmed.id],
      [layla.id, nora.id],
    );
    const second = await playPadel(
      f,
      seriesId,
      "2026-12-02",
      [layla.id, nora.id],
      [qasim.id, ahmed.id],
    );
    const third = await playPadel(
      f,
      seriesId,
      "2026-12-03",
      [qasim.id, layla.id],
      [ahmed.id, nora.id],
    );
    const fourth = await playPadel(
      f,
      seriesId,
      "2026-12-04",
      [ahmed.id, nora.id],
      [qasim.id, layla.id],
    );
    const fifth = await playPadel(
      f,
      seriesId,
      "2026-12-05",
      [qasim.id, reem.id],
      [ahmed.id, khalid.id],
    );
    const sixth = await playPadel(
      f,
      seriesId,
      "2026-12-06",
      [reem.id, guest.id],
      [qasim.id, khalid.id],
    );

    const standings = async (gameId: string) => {
      const result = await edition(f, gameId, qasim.id);
      return Object.fromEntries(
        (result?.winners ?? []).map((winner) => [
          winner.name,
          {
            winCount: winner.winCount,
            standing: winner.standing,
            levelWith: winner.levelWith,
          },
        ]),
      );
    };

    expect(await standings(second.gameId)).toEqual({
      "Layla Haddad": { winCount: 1, standing: "new", levelWith: null },
      "Nora Nasser": { winCount: 1, standing: "new", levelWith: null },
    });
    expect(await standings(third.gameId)).toEqual({
      "Qasim Albaqali": {
        winCount: 2,
        standing: "level",
        levelWith: { name: "Layla Haddad" },
      },
      "Layla Haddad": {
        winCount: 2,
        standing: "level",
        levelWith: { name: "Qasim Albaqali" },
      },
    });
    expect(await standings(fourth.gameId)).toEqual({
      "Ahmed Buhazza": {
        winCount: 2,
        standing: "level",
        levelWith: { count: 3 },
      },
      "Nora Nasser": {
        winCount: 2,
        standing: "level",
        levelWith: { count: 3 },
      },
    });
    expect(await standings(fifth.gameId)).toEqual({
      "Qasim Albaqali": { winCount: 3, standing: "most", levelWith: null },
      "Reem Faraj": { winCount: 1, standing: "new", levelWith: null },
    });
    expect(await standings(sixth.gameId)).toEqual({
      "Reem Faraj": { winCount: 2, standing: null, levelWith: null },
      "Guest Gamer": { winCount: 1, standing: null, levelWith: null },
    });

    const viewed = await edition(f, sixth.gameId, qasim.id);
    expect(viewed?.lastWinners).toEqual({
      edition: 5,
      winners: [{ name: "Qasim Albaqali" }, { name: "Reem Faraj" }],
      winnerBib: null,
    });
    expect(
      viewed?.winners.find((winner) => winner.name === "Guest Gamer"),
    ).toMatchObject({ isGuest: true, isViewer: false });
  });

  it("cannot open the Series for a player outside its Private Group, or once the Group is deleted", async () => {
    const f = await seriesFixture();
    const seriesId = await newSeries(f, f.padel.id, "Sunday Social");
    const { gameId } = await playPadel(
      f,
      seriesId,
      "2026-12-01",
      [f.qasim.id, f.ahmed.id],
      [f.outsider.id, f.nora.id],
    );
    expect(await edition(f, gameId, f.outsider.id)).toMatchObject({
      state: "won",
      canOpenSeries: false,
    });
    expect(await edition(f, gameId)).toMatchObject({ canOpenSeries: true });

    await f.db
      .update(groups)
      .set({ deletedAt: SERIES_TEST_NOW })
      .where(eq(groups.id, f.padel.id));
    expect(await edition(f, gameId)).toMatchObject({ canOpenSeries: false });
  });
});

describe("series.forPlayer", () => {
  async function qasimsWins(f: SeriesFixture) {
    const padelSeries = await newSeries(f, f.padel.id, "Sunday Social");
    const footballSeries = await newSeries(f, f.football.id, "Friday Classic");
    const first = await playPadel(
      f,
      padelSeries,
      "2026-12-01",
      [f.qasim.id, f.ahmed.id],
      [f.layla.id, f.nora.id],
      { completedAt: finished("2026-12-04") },
    );
    await playPadel(
      f,
      padelSeries,
      "2026-12-02",
      [f.layla.id, f.nora.id],
      [f.qasim.id, f.ahmed.id],
    );
    const third = await playPadel(
      f,
      padelSeries,
      "2026-12-03",
      [f.khalid.id, f.qasim.id],
      [f.layla.id, f.nora.id],
    );
    await padelGame(f, "2026-12-20", padelSeries);
    const football = await footballGame(f, "2026-12-05", footballSeries);
    const footballMatch = await playFriendly(
      f.db,
      football,
      [
        { userIds: [f.layla.id, f.nora.id], bib: "white" },
        { userIds: [f.qasim.id, f.ahmed.id, f.reem.id], bib: "black" },
      ],
      [[3, 5]],
      finished("2026-12-05"),
    );
    return {
      padelSeries,
      footballSeries,
      first,
      third,
      football,
      footballMatch,
    };
  }

  it("lists one badge per Series won, most recent win first, and every win newest first", async () => {
    const f = await seriesFixture();
    const s = await qasimsWins(f);

    const result = await forPlayer(f, f.qasim.id, f.layla.id);
    expect(result).toEqual({
      hidden: false,
      totalWins: 3,
      badges: [
        {
          seriesId: s.footballSeries,
          name: "Friday Classic",
          emblem: "cup",
          colour: "gold",
          groupName: "Karbabad Friday Football",
          wins: 1,
          lastWonAt: finished("2026-12-05"),
          canOpenSeries: true,
        },
        {
          seriesId: s.padelSeries,
          name: "Sunday Social",
          emblem: "cup",
          colour: "gold",
          groupName: "Tuesday Night Padel",
          wins: 2,
          lastWonAt: finished("2026-12-04"),
          canOpenSeries: true,
        },
      ],
      wins: [
        {
          gameId: s.football,
          seriesId: s.footballSeries,
          edition: 1,
          playedAt: seriesTestWindow("2026-12-05").windowStart,
          wonAt: finished("2026-12-05"),
          ordinal: 1,
          with: { names: [], bib: "black", score: { mine: 5, theirs: 3 } },
        },
        {
          gameId: s.first.gameId,
          seriesId: s.padelSeries,
          edition: 1,
          playedAt: seriesTestWindow("2026-12-01").windowStart,
          wonAt: finished("2026-12-04"),
          ordinal: 1,
          with: { names: ["Ahmed Buhazza"], bib: null, score: null },
        },
        {
          gameId: s.third.gameId,
          seriesId: s.padelSeries,
          edition: 3,
          playedAt: seriesTestWindow("2026-12-03").windowStart,
          wonAt: finished("2026-12-03"),
          ordinal: 2,
          with: { names: ["Khalid Janahi"], bib: null, score: null },
        },
      ],
    });
  });

  it("is hidden when the owner's Match history visibility excludes the viewer, and not found to someone who may not open the profile", async () => {
    const f = await seriesFixture();
    await qasimsWins(f);

    const outsider = await rejection(forPlayer(f, f.qasim.id, f.outsider.id));
    expect(outsider.code).toBe("NOT_FOUND");
    expect(outsider.message).toBe(playerNotFound);

    await f.db
      .update(user)
      .set({ matchHistoryVisibility: "only_me" })
      .where(eq(user.id, f.qasim.id));
    expect(await forPlayer(f, f.qasim.id, f.layla.id)).toEqual({
      hidden: true,
    });
    expect(await forPlayer(f, f.qasim.id)).toMatchObject({
      hidden: false,
      totalWins: 3,
    });
  });

  it("keeps the badge but cannot open the Series outside a Private Group, or once the Group is deleted", async () => {
    const f = await seriesFixture();
    const s = await qasimsWins(f);
    await shareAnotherGroup(f, [f.qasim.id]);

    const outside = await forPlayer(f, f.qasim.id, f.outsider.id);
    expect(outside.hidden).toBe(false);
    if (outside.hidden) {
      return;
    }
    expect(
      outside.badges.map((badge) => [badge.name, badge.canOpenSeries]),
    ).toEqual([
      ["Friday Classic", false],
      ["Sunday Social", false],
    ]);

    await f.db
      .update(groups)
      .set({ deletedAt: SERIES_TEST_NOW })
      .where(eq(groups.id, f.padel.id));
    const own = await forPlayer(f, f.qasim.id);
    if (own.hidden) {
      throw new Error("The owner always sees their wins");
    }
    expect(
      own.badges.map((badge) => [
        badge.seriesId,
        badge.groupName,
        badge.wins,
        badge.canOpenSeries,
      ]),
    ).toEqual([
      [s.footballSeries, "Karbabad Friday Football", 1, true],
      [s.padelSeries, "Tuesday Night Padel", 2, false],
    ]);
  });

  it("answers no wins for a player who has won nothing", async () => {
    const f = await seriesFixture();
    await qasimsWins(f);
    expect(await forPlayer(f, f.member.id)).toEqual({
      hidden: false,
      totalWins: 0,
      badges: [],
      wins: [],
    });
  });
});

describe("series.playerWins", () => {
  it("counts the Series' decided Editions and the ones the player played, and lists the wins newest first", async () => {
    const f = await seriesFixture();
    const seriesId = await newSeries(f, f.padel.id, "Sunday Social");
    const first = await playPadel(
      f,
      seriesId,
      "2026-12-01",
      [f.qasim.id, f.ahmed.id],
      [f.layla.id, f.nora.id],
    );
    await playPadel(
      f,
      seriesId,
      "2026-12-02",
      [f.layla.id, f.nora.id],
      [f.reem.id, f.khalid.id],
    );
    await playPadel(
      f,
      seriesId,
      "2026-12-03",
      [f.layla.id, f.nora.id],
      [f.qasim.id, f.khalid.id],
    );
    const fourth = await playPadel(
      f,
      seriesId,
      "2026-12-04",
      [f.qasim.id, f.khalid.id],
      [f.layla.id, f.nora.id],
    );
    await padelGame(f, "2026-12-20", seriesId);

    expect(await playerWins(f, f.qasim.id, seriesId, f.layla.id)).toEqual({
      series: {
        id: seriesId,
        name: "Sunday Social",
        emblem: "cup",
        colour: "gold",
        groupName: "Tuesday Night Padel",
      },
      wins: 2,
      playedBySeries: 4,
      playedByPlayer: 3,
      editions: [
        {
          gameId: fourth.gameId,
          edition: 4,
          playedAt: seriesTestWindow("2026-12-04").windowStart,
          with: { names: ["Khalid Janahi"], bib: null, score: null },
        },
        {
          gameId: first.gameId,
          edition: 1,
          playedAt: seriesTestWindow("2026-12-01").windowStart,
          with: { names: ["Ahmed Buhazza"], bib: null, score: null },
        },
      ],
      canOpenSeries: true,
    });
  });

  it("is the profile's not-found when the profile is hidden or may not be opened", async () => {
    const f = await seriesFixture();
    const seriesId = await newSeries(f, f.padel.id, "Sunday Social");
    const outsider = await rejection(
      playerWins(f, f.qasim.id, seriesId, f.outsider.id),
    );
    expect(outsider.message).toBe(playerNotFound);

    await f.db
      .update(user)
      .set({ matchHistoryVisibility: "only_me" })
      .where(eq(user.id, f.qasim.id));
    const hidden = await rejection(
      playerWins(f, f.qasim.id, seriesId, f.layla.id),
    );
    expect(hidden.code).toBe("NOT_FOUND");
    expect(hidden.message).toBe(playerNotFound);
  });

  it("still opens a deleted Group's badge, without the way to the Series", async () => {
    const f = await seriesFixture();
    const seriesId = await newSeries(f, f.padel.id, "Sunday Social");
    await playPadel(
      f,
      seriesId,
      "2026-12-01",
      [f.qasim.id, f.ahmed.id],
      [f.layla.id, f.nora.id],
    );
    await f.db
      .update(groups)
      .set({ deletedAt: SERIES_TEST_NOW })
      .where(eq(groups.id, f.padel.id));
    expect(await playerWins(f, f.qasim.id, seriesId)).toMatchObject({
      wins: 1,
      canOpenSeries: false,
    });
  });
});

describe("a corrected score", () => {
  it("moves the win in all three reads", async () => {
    const f = await seriesFixture();
    const seriesId = await newSeries(f, f.padel.id, "Sunday Social");
    const { gameId, matchId } = await playPadel(
      f,
      seriesId,
      "2026-12-01",
      [f.qasim.id, f.ahmed.id],
      [f.layla.id, f.nora.id],
    );

    expect(
      (await edition(f, gameId))?.winners.map((winner) => winner.name).sort(),
    ).toEqual(["Ahmed Buhazza", "Qasim Albaqali"]);
    expect(await forPlayer(f, f.qasim.id)).toMatchObject({ totalWins: 1 });
    expect(await playerWins(f, f.qasim.id, seriesId)).toMatchObject({
      wins: 1,
    });

    await setMatchScore(f.db, matchId, [
      [3, 6],
      [4, 6],
    ]);

    expect(
      (await edition(f, gameId))?.winners.map((winner) => winner.name).sort(),
    ).toEqual(["Layla Haddad", "Nora Nasser"]);
    expect(await forPlayer(f, f.qasim.id)).toMatchObject({
      totalWins: 0,
      badges: [],
    });
    expect(await forPlayer(f, f.layla.id)).toMatchObject({ totalWins: 1 });
    expect(await playerWins(f, f.qasim.id, seriesId)).toMatchObject({
      wins: 0,
      playedBySeries: 1,
      playedByPlayer: 1,
      editions: [],
    });
  });
});
