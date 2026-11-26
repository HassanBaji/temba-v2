import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import { groupSeries, groups } from "@repo/db/schema";
import { messagesFor } from "@repo/i18n/messages";

import { cancelGame } from "#src/routers/games/cancel";
import { reportWrongScore } from "#src/routers/games/reportWrongScore";
import { seriesById } from "#src/routers/series/byId";
import { endSeries } from "#src/routers/series/end";
import { listSeriesForGroup } from "#src/routers/series/listForGroup";
import {
  SERIES_TEST_NOW,
  drawRoundsSocial,
  footballGame,
  newSeries,
  padelGame,
  playFriendly,
  playRound,
  roundsSocial,
  seriesFixture,
  seriesTestWindow,
  setMatchScore,
  type SeriesFixture,
} from "#src/series/series.test-support";

const errors = messagesFor("en").series.errors;
const BEFORE_DECEMBER = SERIES_TEST_NOW;
const DECEMBER_10 = new Date("2026-12-10T10:00:00Z");

async function rejection(promise: Promise<unknown>) {
  const error = await promise.then(
    () => null,
    (caught: unknown) => caught,
  );
  expect(error).toBeInstanceOf(TRPCError);
  return error as TRPCError;
}

function page(f: SeriesFixture, id: string, now: Date, userId = f.owner.id) {
  return seriesById(f.db, { id, userId, now });
}

function winnerNames(edition: { winners: readonly { name: string }[] }) {
  return edition.winners.map((winner) => winner.name).sort();
}

function finished(day: string) {
  return seriesTestWindow(day).windowEnd;
}

async function playRoundRobin(
  f: SeriesFixture,
  gameId: string,
  [a, b, c, d]: readonly string[],
  completedAt: Date,
) {
  if (!a || !b || !c || !d) {
    throw new Error("Four Game teams are needed");
  }
  const [ab] = await playRound(
    f.db,
    gameId,
    1,
    [
      [a, b, [6, 2]],
      [c, d, [6, 3]],
    ],
    completedAt,
  );
  await playRound(
    f.db,
    gameId,
    2,
    [
      [a, c, [6, 4]],
      [b, d, [6, 1]],
    ],
    completedAt,
  );
  return { ab: ab!, completedAt };
}

async function playLastRound(
  f: SeriesFixture,
  gameId: string,
  [a, b, c, d]: readonly string[],
  completedAt: Date,
) {
  await playRound(
    f.db,
    gameId,
    3,
    [
      [a!, d!, [6, 0]],
      [b!, c!, [6, 3]],
    ],
    completedAt,
  );
}

describe("Series results end to end", () => {
  it("gives a padel Friendly game to the winning pair, then to nobody once the score is a draw", async () => {
    const f = await seriesFixture();
    const seriesId = await newSeries(f, f.padel.id, "Sunday Social");
    const gameId = await padelGame(f, "2026-12-01", seriesId);
    const matchId = await playFriendly(
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
      finished("2026-12-01"),
    );

    const won = await page(f, seriesId, DECEMBER_10);
    expect(won.editions).toHaveLength(1);
    expect(won.editions[0]).toMatchObject({
      gameId,
      edition: 1,
      state: "won",
      winnerBib: null,
    });
    expect(winnerNames(won.editions[0]!)).toEqual([
      "Ahmed Buhazza",
      "Qasim Albaqali",
    ]);

    await setMatchScore(f.db, matchId, [
      [6, 3],
      [3, 6],
    ]);
    const drawn = await page(f, seriesId, DECEMBER_10);
    expect(drawn.editions[0]).toMatchObject({
      state: "no_winner",
      winners: [],
    });
    expect(drawn.playedCount).toBe(1);
    expect(drawn.mostWins).toEqual([]);
  });

  it("gives a football Game to everyone on the winning side, with its Bib", async () => {
    const f = await seriesFixture();
    const seriesId = await newSeries(f, f.football.id, "Friday Classic");
    const gameId = await footballGame(f, "2026-12-04", seriesId);
    await playFriendly(
      f.db,
      gameId,
      [
        { userIds: [f.qasim.id, f.ahmed.id, f.layla.id], bib: "black" },
        {
          userIds: [f.nora.id, f.reem.id, f.khalid.id, f.guest.id],
          bib: "navy",
        },
      ],
      [[3, 5]],
      finished("2026-12-04"),
    );

    const result = await page(f, seriesId, DECEMBER_10);
    expect(result.sport).toBe("football");
    expect(result.editions[0]).toMatchObject({
      state: "won",
      winnerBib: "navy",
    });
    expect(winnerNames(result.editions[0]!)).toEqual([
      "Guest Gamer",
      "Khalid Janahi",
      "Nora Nasser",
      "Reem Faraj",
    ]);
    expect(result.differentWinners).toBe(3);
  });

  it("gives a Rounds Social to the top team once its last Round is played", async () => {
    const f = await seriesFixture();
    const seriesId = await newSeries(f, f.padel.id, "Sunday Social");
    const gameId = await roundsSocial(f, "2026-12-06", seriesId);
    const teams = await drawRoundsSocial(f.db, gameId, [
      [f.qasim.id, f.ahmed.id],
      [f.layla.id, f.nora.id],
      [f.reem.id, f.khalid.id],
      [f.member.id, f.organizer.id],
    ]);
    const completedAt = finished("2026-12-06");
    await playRoundRobin(f, gameId, teams, completedAt);

    const playing = await page(f, seriesId, BEFORE_DECEMBER);
    expect(playing.editions[0]?.state).toBe("upcoming");
    expect(playing.playedCount).toBe(0);

    await playLastRound(f, gameId, teams, completedAt);
    const won = await page(f, seriesId, BEFORE_DECEMBER);
    expect(won.editions[0]?.state).toBe("won");
    expect(winnerNames(won.editions[0]!)).toEqual([
      "Ahmed Buhazza",
      "Qasim Albaqali",
    ]);
    expect(won.playedCount).toBe(1);
  });

  it("moves the win when a corrected score puts another team on top", async () => {
    const f = await seriesFixture();
    const seriesId = await newSeries(f, f.padel.id, "Sunday Social");
    const gameId = await roundsSocial(f, "2026-12-06", seriesId);
    const teams = await drawRoundsSocial(f.db, gameId, [
      [f.qasim.id, f.ahmed.id],
      [f.layla.id, f.nora.id],
      [f.reem.id, f.khalid.id],
      [f.member.id, f.organizer.id],
    ]);
    const completedAt = finished("2026-12-06");
    const { ab } = await playRoundRobin(f, gameId, teams, completedAt);
    await playLastRound(f, gameId, teams, completedAt);

    await setMatchScore(f.db, ab, [[2, 6]]);
    const corrected = await page(f, seriesId, DECEMBER_10);
    expect(winnerNames(corrected.editions[0]!)).toEqual([
      "Layla Haddad",
      "Nora Nasser",
    ]);
  });

  it("takes the win away when the score is reported wrong", async () => {
    const f = await seriesFixture();
    const seriesId = await newSeries(f, f.padel.id, "Sunday Social");
    const gameId = await padelGame(f, "2026-12-01", seriesId);
    const matchId = await playFriendly(
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
      finished("2026-12-01"),
    );
    expect((await page(f, seriesId, DECEMBER_10)).editions[0]?.state).toBe(
      "won",
    );

    await reportWrongScore(f.db, { gameId, matchId, userId: f.owner.id });
    const reported = await page(f, seriesId, DECEMBER_10);
    expect(reported.editions[0]).toMatchObject({
      state: "awaiting",
      winners: [],
    });
    expect(reported.playedCount).toBe(0);
    expect(reported.mostWins).toEqual([]);
  });

  it("drops a cancelled Game's Edition and its win, and the later Editions move up one", async () => {
    const f = await seriesFixture();
    const seriesId = await newSeries(f, f.padel.id, "Sunday Social");
    const socialId = await roundsSocial(f, "2026-12-01", seriesId);
    const teams = await drawRoundsSocial(f.db, socialId, [
      [f.qasim.id, f.ahmed.id],
      [f.layla.id, f.nora.id],
      [f.reem.id, f.khalid.id],
      [f.member.id, f.organizer.id],
    ]);
    const completedAt = finished("2026-12-01");
    await playRoundRobin(f, socialId, teams, completedAt);
    await playLastRound(f, socialId, teams, completedAt);
    const laterId = await padelGame(f, "2026-12-08", seriesId);

    const before = await page(f, seriesId, BEFORE_DECEMBER);
    expect(before.editions.map((row) => [row.gameId, row.edition])).toEqual([
      [laterId, 2],
      [socialId, 1],
    ]);
    expect(before.mostWins.map((row) => row.name)).toEqual([
      "Ahmed Buhazza",
      "Qasim Albaqali",
    ]);

    await cancelGame(f.db, { gameId: socialId, userId: f.owner.id });
    const after = await page(f, seriesId, BEFORE_DECEMBER);
    expect(after.editions.map((row) => [row.gameId, row.edition])).toEqual([
      [laterId, 1],
    ]);
    expect(after.playedCount).toBe(0);
    expect(after.mostWins).toEqual([]);
  });
});

describe("series.byId", () => {
  async function playedSeries(f: SeriesFixture) {
    const seriesId = await newSeries(f, f.padel.id, "Sunday Social");
    const play = async (
      day: string,
      winners: readonly [string, string],
      losers: readonly [string, string],
      sets: readonly (readonly [number, number])[] = [
        [6, 3],
        [6, 4],
      ],
    ) => {
      const gameId = await padelGame(f, day, seriesId);
      await playFriendly(
        f.db,
        gameId,
        [{ userIds: winners }, { userIds: losers }],
        sets,
        finished(day),
      );
      return gameId;
    };
    const first = await play(
      "2026-12-01",
      [f.nora.id, f.reem.id],
      [f.qasim.id, f.ahmed.id],
    );
    const second = await play(
      "2026-12-02",
      [f.layla.id, f.guest.id],
      [f.qasim.id, f.khalid.id],
    );
    const third = await play(
      "2026-12-03",
      [f.ahmed.id, f.layla.id],
      [f.nora.id, f.khalid.id],
    );
    const drawn = await play(
      "2026-12-04",
      [f.qasim.id, f.khalid.id],
      [f.nora.id, f.reem.id],
      [
        [6, 3],
        [3, 6],
      ],
    );
    const awaiting = await padelGame(f, "2026-12-05", seriesId);
    const upcoming = await padelGame(f, "2026-12-20", seriesId);
    return { seriesId, first, second, third, drawn, awaiting, upcoming };
  }

  it("counts what was played and who won, and lists every Edition newest first", async () => {
    const f = await seriesFixture();
    const s = await playedSeries(f);
    const result = await page(f, s.seriesId, DECEMBER_10, f.layla.id);

    expect(result).toMatchObject({
      id: s.seriesId,
      name: "Sunday Social",
      emblem: "cup",
      colour: "gold",
      sport: "padel",
      group: { id: f.padel.id, name: "Tuesday Night Padel" },
      endedAt: null,
      canEnd: false,
      playedCount: 4,
      differentWinners: 4,
    });
    expect(result.createdAt).toEqual(SERIES_TEST_NOW);
    expect(result.mostWins).toEqual([
      {
        userId: f.layla.id,
        name: "Layla Haddad",
        image: null,
        wins: 2,
        lastWonEdition: 3,
        isViewer: true,
      },
      {
        userId: f.ahmed.id,
        name: "Ahmed Buhazza",
        image: null,
        wins: 1,
        lastWonEdition: 3,
        isViewer: false,
      },
      {
        userId: f.nora.id,
        name: "Nora Nasser",
        image: null,
        wins: 1,
        lastWonEdition: 1,
        isViewer: false,
      },
      {
        userId: f.reem.id,
        name: "Reem Faraj",
        image: null,
        wins: 1,
        lastWonEdition: 1,
        isViewer: false,
      },
    ]);
    expect(
      result.editions.map((row) => [row.edition, row.gameId, row.state]),
    ).toEqual([
      [6, s.upcoming, "upcoming"],
      [5, s.awaiting, "awaiting"],
      [4, s.drawn, "no_winner"],
      [3, s.third, "won"],
      [2, s.second, "won"],
      [1, s.first, "won"],
    ]);
    expect(result.editions[0]?.startsAt).toEqual(
      seriesTestWindow("2026-12-20").windowStart,
    );
  });

  it("names a Guest player among their Edition's winners and nowhere else", async () => {
    const f = await seriesFixture();
    const s = await playedSeries(f);
    const result = await page(f, s.seriesId, DECEMBER_10);
    const second = result.editions.find((row) => row.gameId === s.second);
    expect(second?.winners).toEqual(
      expect.arrayContaining([
        { userId: f.guest.id, name: "Guest Gamer", isGuest: true },
        { userId: f.layla.id, name: "Layla Haddad", isGuest: false },
      ]),
    );
    expect(result.mostWins.map((row) => row.userId)).not.toContain(f.guest.id);
    expect(result.differentWinners).toBe(4);
  });

  it("lets a Group approver end a running Series, and nobody an ended one", async () => {
    const f = await seriesFixture();
    const s = await playedSeries(f);
    expect((await page(f, s.seriesId, DECEMBER_10)).canEnd).toBe(true);
    expect(
      (await page(f, s.seriesId, DECEMBER_10, f.organizer.id)).canEnd,
    ).toBe(true);
    expect((await page(f, s.seriesId, DECEMBER_10, f.member.id)).canEnd).toBe(
      false,
    );
    await endSeries(f.db, {
      id: s.seriesId,
      userId: f.owner.id,
      now: DECEMBER_10,
    });
    const ended = await page(f, s.seriesId, DECEMBER_10);
    expect(ended.canEnd).toBe(false);
    expect(ended.endedAt).toEqual(DECEMBER_10);
    expect(ended.playedCount).toBe(4);
  });

  it("says ending removes the Series only while no Game points at it, cancelled ones included", async () => {
    const f = await seriesFixture();
    const seriesId = await newSeries(f, f.padel.id, "Sunday Social");
    expect((await page(f, seriesId, BEFORE_DECEMBER)).endRemoves).toBe(true);

    const gameId = await padelGame(f, "2026-12-01", seriesId);
    expect((await page(f, seriesId, BEFORE_DECEMBER)).endRemoves).toBe(false);

    await cancelGame(f.db, { gameId, userId: f.owner.id });
    const cancelled = await page(f, seriesId, BEFORE_DECEMBER);
    expect(cancelled.editions).toEqual([]);
    expect(cancelled.endRemoves).toBe(false);
    expect(
      await endSeries(f.db, {
        id: seriesId,
        userId: f.owner.id,
        now: DECEMBER_10,
      }),
    ).toEqual({ ended: true });
  });

  it("is not found for someone who may not view the Private Group, or once the Group is deleted", async () => {
    const f = await seriesFixture();
    const seriesId = await newSeries(f, f.padel.id, "Sunday Social");
    const hidden = await rejection(
      page(f, seriesId, DECEMBER_10, f.outsider.id),
    );
    expect(hidden.code).toBe("NOT_FOUND");
    expect(hidden.message).toBe(errors.notFound);

    await f.db
      .update(groups)
      .set({ deletedAt: DECEMBER_10 })
      .where(eq(groups.id, f.padel.id));
    const deleted = await rejection(page(f, seriesId, DECEMBER_10));
    expect(deleted.code).toBe("NOT_FOUND");
    expect(deleted.message).toBe(errors.notFound);
  });
});

describe("series.listForGroup", () => {
  async function groupWithSeries(f: SeriesFixture) {
    const sunday = await newSeries(f, f.padel.id, "Sunday Social");
    const played = await padelGame(f, "2026-12-01", sunday);
    await playFriendly(
      f.db,
      played,
      [
        { userIds: [f.qasim.id, f.ahmed.id] },
        { userIds: [f.layla.id, f.nora.id] },
      ],
      [
        [6, 3],
        [6, 4],
      ],
      finished("2026-12-01"),
    );
    const social = await roundsSocial(f, "2026-12-20", sunday);

    const thursday = await newSeries(f, f.padel.id, "Thursday Ladder");
    const ladder = await padelGame(f, "2026-12-15", thursday);

    const alpha = await newSeries(f, f.padel.id, "Alpha Empty");
    const beta = await newSeries(f, f.padel.id, "Beta Waiting");
    await padelGame(f, "2026-12-05", beta);

    const octoberEnded = await newSeries(f, f.padel.id, "Old Autumn");
    const novemberEnded = await newSeries(f, f.padel.id, "Old Winter");
    for (const [id, endedAt] of [
      [octoberEnded, new Date("2026-10-01T10:00:00Z")],
      [novemberEnded, new Date("2026-11-01T10:00:00Z")],
    ] as const) {
      await f.db
        .update(groupSeries)
        .set({ endedAt, endedBy: f.owner.id })
        .where(eq(groupSeries.id, id));
    }
    return {
      sunday,
      social,
      thursday,
      ladder,
      alpha,
      beta,
      octoberEnded,
      novemberEnded,
    };
  }

  it("splits running from ended and orders each, with the kind and the next Edition", async () => {
    const f = await seriesFixture();
    const s = await groupWithSeries(f);
    const result = await listSeriesForGroup(f.db, {
      groupId: f.padel.id,
      userId: f.member.id,
      now: DECEMBER_10,
    });

    expect(result.enabled).toBe(true);
    expect(result.canManage).toBe(false);
    expect(result.running).toEqual([
      {
        id: s.thursday,
        name: "Thursday Ladder",
        emblem: "cup",
        colour: "gold",
        sport: "padel",
        kind: "game",
        playedCount: 0,
        next: {
          gameId: s.ladder,
          edition: 1,
          startsAt: seriesTestWindow("2026-12-15").windowStart,
        },
        endedAt: null,
      },
      {
        id: s.sunday,
        name: "Sunday Social",
        emblem: "cup",
        colour: "gold",
        sport: "padel",
        kind: "social",
        playedCount: 1,
        next: {
          gameId: s.social,
          edition: 2,
          startsAt: seriesTestWindow("2026-12-20").windowStart,
        },
        endedAt: null,
      },
      {
        id: s.alpha,
        name: "Alpha Empty",
        emblem: "cup",
        colour: "gold",
        sport: "padel",
        kind: null,
        playedCount: 0,
        next: null,
        endedAt: null,
      },
      {
        id: s.beta,
        name: "Beta Waiting",
        emblem: "cup",
        colour: "gold",
        sport: "padel",
        kind: "game",
        playedCount: 0,
        next: null,
        endedAt: null,
      },
    ]);
    expect(result.ended.map((row) => row.id)).toEqual([
      s.novemberEnded,
      s.octoberEnded,
    ]);
    expect(result.ended[0]?.endedAt).toEqual(new Date("2026-11-01T10:00:00Z"));
  });

  it("lets a Group approver manage", async () => {
    const f = await seriesFixture();
    await newSeries(f, f.padel.id, "Sunday Social");
    for (const userId of [f.owner.id, f.organizer.id]) {
      const result = await listSeriesForGroup(f.db, {
        groupId: f.padel.id,
        userId,
        now: DECEMBER_10,
      });
      expect(result.canManage).toBe(true);
      expect(result.running).toHaveLength(1);
    }
  });

  it("hides a Private Group from someone who is not a member", async () => {
    const f = await seriesFixture();
    await newSeries(f, f.padel.id, "Sunday Social");
    const error = await rejection(
      listSeriesForGroup(f.db, {
        groupId: f.padel.id,
        userId: f.outsider.id,
        now: DECEMBER_10,
      }),
    );
    expect(error.code).toBe("NOT_FOUND");
  });

  it("answers enabled false with empty lists on a Group that is not Verified", async () => {
    const f = await seriesFixture();
    await newSeries(f, f.padel.id, "Sunday Social");
    await f.db
      .update(groups)
      .set({ verifiedAt: null })
      .where(eq(groups.id, f.padel.id));
    expect(
      await listSeriesForGroup(f.db, {
        groupId: f.padel.id,
        userId: f.owner.id,
        now: DECEMBER_10,
      }),
    ).toEqual({ enabled: false, canManage: false, running: [], ended: [] });
  });
});
