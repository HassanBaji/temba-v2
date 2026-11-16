import { and, eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import {
  groups,
  levelCheckBallots,
  levelCheckResults,
  ratingEvents,
  ratings,
} from "@repo/db/schema";
import { createPgliteDb, type TestDatabase } from "@repo/db/testing";

import { muFromLevel, type LevelBand } from "@repo/domain/level";
import type { AssignableDisplayLevelBand } from "@repo/domain/level-bands";
import { notificationCopy } from "@repo/domain/notification-copy";

import { recordJobs } from "#src/jobs/job-sink.test-support";
import { applyLevelOverride } from "#src/ratings/apply-level-override";
import {
  closeRatingWindow,
  footballGame,
  playScore,
  addMember,
  setUpMatch,
} from "#src/ratings/group-rated-match.test-support";
import {
  settleLevelChecks,
  takeBackLevelChecks,
} from "#src/ratings/level-check";
import { padelConfirmations } from "#src/ratings/level-confirmed";
import { applyPadelReplay } from "#src/ratings/padel-replay";
import { settleRatingWindow } from "#src/ratings/settle-rating-window";
import { completeMatch } from "#src/routers/games/completeMatch";
import { performanceRatingResult } from "#src/routers/games/performanceRatingResult";
import { performanceRatingSheet } from "#src/routers/games/performanceRatingSheet";
import { reportWrongScore } from "#src/routers/games/reportWrongScore";
import { submitLevelChecks } from "#src/routers/games/submitLevelChecks";
import { listNotifications } from "#src/routers/notifications/list";
import { ratingHistory } from "#src/routers/ratings/history";

type ApiDb = Parameters<typeof completeMatch>[0];

async function withDb(run: (database: TestDatabase) => Promise<void>) {
  const { db, close } = await createPgliteDb();
  try {
    await run(db);
  } finally {
    await close();
  }
}

function api(database: TestDatabase) {
  return database as unknown as ApiDb;
}

type PadelMatch = Awaited<ReturnType<typeof setUpMatch>>;
type Player = PadelMatch["a"];

/** a and b beat c and d on a padel Friendly game on a Verified Group, completed by the Organizer. */
async function playedPadel(
  database: TestDatabase,
  options: { club?: boolean; existing?: Parameters<typeof setUpMatch>[2] } = {},
) {
  const match = await setUpMatch(
    database,
    { rated: true, groupRated: false },
    options.existing,
  );
  if (options.club) {
    await database
      .update(groups)
      .set({ venueId: match.venueId })
      .where(eq(groups.id, match.groupId));
  }
  await completeMatch(api(database), {
    gameId: match.gameId,
    matchId: match.matchId,
    userId: match.a.id,
  });
  return match;
}

function again(match: PadelMatch) {
  return {
    players: [match.a, match.b, match.c, match.d] as [
      Player,
      Player,
      Player,
      Player,
    ],
    groupId: match.groupId,
    venueId: match.venueId,
  };
}

async function answer(
  database: TestDatabase,
  match: PadelMatch,
  rater: Player,
  rows: [ratee: Player, band: AssignableDisplayLevelBand][],
) {
  return submitLevelChecks(api(database), {
    gameId: match.gameId,
    userId: rater.id,
    answers: rows.map(([ratee, band]) => ({ userId: ratee.id, band })),
  });
}

async function ratingOf(database: TestDatabase, userId: string) {
  const row = await database.query.ratings.findFirst({
    where: and(eq(ratings.userId, userId), eq(ratings.sport, "padel")),
  });
  if (!row) {
    throw new Error("Expected a padel Rating");
  }
  return row;
}

async function setRating(
  database: TestDatabase,
  userId: string,
  state: { level: number; phi: number; levelBand: LevelBand },
) {
  await database
    .update(ratings)
    .set({
      mu: muFromLevel(state.level),
      phi: state.phi,
      levelBand: state.levelBand,
    })
    .where(and(eq(ratings.userId, userId), eq(ratings.sport, "padel")));
}

async function resultsOf(database: TestDatabase, matchId: string) {
  return database.query.levelCheckResults.findMany({
    where: eq(levelCheckResults.matchId, matchId),
  });
}

const ONE_BAND = muFromLevel(3.85) - muFromLevel(3.15);

describe("answering the Level check", () => {
  recordJobs();

  it("lets a seated player answer about any of the other three, change and clear it, never about themselves", async () => {
    await withDb(async (db) => {
      const match = await playedPadel(db);
      await answer(db, match, match.a, [
        [match.b, "C"],
        [match.c, "C+"],
        [match.d, "D+"],
      ]);
      await answer(db, match, match.a, [
        [match.b, "B-"],
        [match.c, "C+"],
      ]);
      const stored = await db.query.levelCheckBallots.findMany({
        where: eq(levelCheckBallots.matchId, match.matchId),
      });
      expect(
        Object.fromEntries(stored.map((row) => [row.rateeUserId, row.band])),
      ).toEqual({ [match.b.id]: "B3", [match.c.id]: "C1" });

      await answer(db, match, match.a, []);
      expect(
        await db.$count(
          levelCheckBallots,
          eq(levelCheckBallots.matchId, match.matchId),
        ),
      ).toBe(0);

      await expect(
        answer(db, match, match.a, [[match.a, "C"]]),
      ).rejects.toThrow("You don’t answer about your own level.");
    });
  });

  it("refuses a player who did not sit on the Match, and once the window has closed", async () => {
    await withDb(async (db) => {
      const match = await playedPadel(db);
      const outsider = { ...match.a, id: crypto.randomUUID() };
      await expect(
        answer(db, match, match.a, [[outsider, "C"]]),
      ).rejects.toThrow(
        "You can only answer about the other players of this game.",
      );
      await closeRatingWindow(db, match.matchId);
      await expect(
        answer(db, match, match.a, [[match.c, "C"]]),
      ).rejects.toThrow("Ratings are closed for this game.");
    });
  });

  it("sends the viewer only their own answers, with the band each other player shows", async () => {
    await withDb(async (db) => {
      const match = await playedPadel(db);
      await setRating(db, match.c.id, {
        level: 3.2,
        phi: 200,
        levelBand: "C2",
      });
      await answer(db, match, match.a, [[match.c, "C+"]]);

      const own = await performanceRatingSheet(api(db), {
        gameId: match.gameId,
        userId: match.a.id,
      });
      expect(own.levelCheck?.answers).toEqual([
        { userId: match.c.id, band: "C+" },
      ]);
      expect(own.levelCheck?.players.map((row) => row.userId).sort()).toEqual(
        [match.b.id, match.c.id, match.d.id].sort(),
      );
      expect(
        own.levelCheck?.players.find((row) => row.userId === match.c.id)
          ?.shownBand,
      ).toBe("C");

      // b sees none of a's answers, nor does an Organizer.
      const other = await performanceRatingSheet(api(db), {
        gameId: match.gameId,
        userId: match.b.id,
      });
      expect(other.levelCheck?.answers).toEqual([]);
    });
  });

  it("asks nothing on a football window", async () => {
    await withDb(async (db) => {
      const f = await footballGame(db, { verified: true });
      const ids: string[] = [];
      for (const name of ["a", "b", "c", "d"]) {
        ids.push(await addMember(f, name));
      }
      const [a, b, c, d] = ids as [string, string, string, string];
      await playScore(f, [a, b], [c, d], { slot1: 1, slot2: 0 });
      const sheet = await performanceRatingSheet(api(db), {
        gameId: f.gameId,
        userId: a,
      });
      expect(sheet.levelCheck).toBeNull();
      await expect(
        submitLevelChecks(api(db), {
          gameId: f.gameId,
          userId: a,
          answers: [{ userId: c, band: "C" }],
        }),
      ).rejects.toThrow("This game asks no level check.");
    });
  });
});

describe("settling the Level check", () => {
  recordJobs();

  it("settles nobody on one answer or on two from the partner's side, and a player with two answers and one from an opponent", async () => {
    await withDb(async (db) => {
      const match = await playedPadel(db);
      // c and d each get one answer from b, an opponent, and one from their partner.
      await answer(db, match, match.b, [
        [match.c, "C"],
        [match.d, "C"],
      ]);
      await answer(db, match, match.c, [[match.d, "C"]]);
      await answer(db, match, match.d, [[match.c, "C"]]);
      // b gets one answer, from a, the partner; a gets none.
      await answer(db, match, match.a, [[match.b, "C"]]);
      await closeRatingWindow(db, match.matchId);

      const settled = await resultsOf(db, match.matchId);
      expect(settled.map((row) => row.userId).sort()).toEqual(
        [match.c.id, match.d.id].sort(),
      );
      expect(settled.every((row) => row.ballotsCounted === 2)).toBe(true);

      const nobody = await performanceRatingResult(api(db), {
        gameId: match.gameId,
        userId: match.b.id,
      });
      expect(nobody.levelCheck).toEqual({
        kind: "unsettled",
        reason: "too_few",
        ballotsReceived: 1,
        ballotsNeeded: 2,
      });
    });
  });

  it.each([
    [250, 0.5],
    [150, 0.2647],
    [100, 0.1379],
  ])(
    "moves a player at φ %d by their share of a one-band gap at weight 1, and half of it at weight 0.5",
    async (phi, share) => {
      for (const [club, weight] of [
        [true, 1],
        [false, 0.5],
      ] as const) {
        await withDb(async (db) => {
          const match = await playedPadel(db, { club });
          await setRating(db, match.c.id, {
            level: 3.15,
            phi,
            levelBand: "C2",
          });
          await answer(db, match, match.a, [[match.c, "C+"]]);
          await answer(db, match, match.b, [[match.c, "C+"]]);
          await closeRatingWindow(db, match.matchId);

          const after = await ratingOf(db, match.c.id);
          expect((after.mu - muFromLevel(3.15)) / ONE_BAND).toBeCloseTo(
            share * weight,
            3,
          );
          expect(after.phi).toBeLessThan(phi);
          const [result] = await resultsOf(db, match.matchId);
          expect(result).toMatchObject({
            userId: match.c.id,
            agreed: false,
            verdictLevelHundredths: 385,
            ballotsCounted: 2,
            weight,
            muBefore: muFromLevel(3.15),
            phiBefore: phi,
            muAfter: after.mu,
            phiAfter: after.phi,
            levelBandBefore: "C2",
          });
        });
      }
    },
  );

  it("never moves more than 0.35 Level, halved on a weight 0.5 Group", async () => {
    for (const [club, cap] of [
      [true, 175],
      [false, 87.5],
    ] as const) {
      await withDb(async (db) => {
        const match = await playedPadel(db, { club });
        await setRating(db, match.c.id, {
          level: 3.15,
          phi: 350,
          levelBand: "C2",
        });
        await answer(db, match, match.a, [[match.c, "A"]]);
        await answer(db, match, match.b, [[match.c, "A"]]);
        await closeRatingWindow(db, match.matchId);
        expect(
          (await ratingOf(db, match.c.id)).mu - muFromLevel(3.15),
        ).toBeCloseTo(cap, 8);
      });
    }
  });

  it("leaves μ where it is and lowers φ on a verdict at the shown band, for a confirmed player too", async () => {
    await withDb(async (db) => {
      const match = await setUpMatch(db, { rated: true, groupRated: false });
      await applyLevelOverride(api(db), {
        sport: "padel",
        setterUserId: match.a.id,
        setByRole: "operator",
        targetUserId: match.c.id,
        groupId: null,
        level: 3,
        reason: "new_to_group",
      });
      await completeMatch(api(db), {
        gameId: match.gameId,
        matchId: match.matchId,
        userId: match.a.id,
      });
      const before = await ratingOf(db, match.c.id);
      await answer(db, match, match.a, [[match.c, "C"]]);
      await answer(db, match, match.d, [[match.c, "C"]]);
      await closeRatingWindow(db, match.matchId);

      const after = await ratingOf(db, match.c.id);
      expect(after.mu).toBe(before.mu);
      expect(after.levelBand).toBe(before.levelBand);
      expect(after.phi).toBeLessThan(before.phi);
      const [result] = await resultsOf(db, match.matchId);
      expect(result).toMatchObject({ agreed: true, muAfter: before.mu });
    });
  });

  it("is not a Rated Match: the count, last rated time and Reliability stay, and settling twice writes once", async () => {
    await withDb(async (db) => {
      const match = await playedPadel(db);
      await setRating(db, match.c.id, {
        level: 3.15,
        phi: 250,
        levelBand: "C2",
      });
      const before = await ratingOf(db, match.c.id);
      const confirmationsBefore = (
        await padelConfirmations(api(db), { userIds: [match.c.id] })
      )(match.c.id);
      await answer(db, match, match.a, [[match.c, "B"]]);
      await answer(db, match, match.d, [[match.c, "B"]]);
      await closeRatingWindow(db, match.matchId);

      const after = await ratingOf(db, match.c.id);
      expect(after.mu).not.toBe(before.mu);
      expect(after.lastRatedAt).toEqual(before.lastRatedAt);
      expect(after.sigma).toBe(before.sigma);
      expect(after.reliability).toBe(before.reliability);
      expect(
        (await padelConfirmations(api(db), { userIds: [match.c.id] }))(
          match.c.id,
        ),
      ).toEqual(confirmationsBefore);
      expect(
        await db.$count(ratingEvents, eq(ratingEvents.userId, match.c.id)),
      ).toBe(1);

      const stored = await db.query.matches.findFirst({
        where: (table, { eq: equals }) => equals(table.id, match.matchId),
      });
      await settleLevelChecks(api(db), {
        match: stored!,
        game: { groupId: match.groupId, isPublic: false },
        now: new Date(),
      });
      expect(
        await settleRatingWindow(api(db), match.matchId, new Date(), {
          force: true,
        }),
      ).toBe(false);
      expect(await resultsOf(db, match.matchId)).toHaveLength(1);
      expect((await ratingOf(db, match.c.id)).mu).toBe(after.mu);
    });
  });

  it("shows the verdict on the Game, in Rating history and in the closed Notification", async () => {
    await withDb(async (db) => {
      const match = await playedPadel(db, { club: true });
      await setRating(db, match.c.id, {
        level: 2.45,
        phi: 150,
        levelBand: "C3",
      });
      await answer(db, match, match.a, [[match.c, "C"]]);
      await answer(db, match, match.b, [[match.c, "C"]]);
      await closeRatingWindow(db, match.matchId);
      const after = await ratingOf(db, match.c.id);

      const result = await performanceRatingResult(api(db), {
        gameId: match.gameId,
        userId: match.c.id,
      });
      expect(result.levelCheck).toEqual({
        kind: "checked",
        agreed: false,
        verdictLevelHundredths: 315,
        muBefore: muFromLevel(2.45),
        muAfter: after.mu,
        ballotsCounted: 2,
      });

      const history = await ratingHistory(api(db), {
        userId: match.c.id,
        sport: "padel",
        ladder: "level",
      });
      expect(history.entries[0]).toMatchObject({
        kind: "level_check",
        verdictBand: "C",
        agreed: false,
        muBefore: muFromLevel(2.45),
        muAfter: after.mu,
        venueName: "Club",
      });

      const told = (
        await listNotifications(api(db), { userId: match.c.id })
      ).items.find((item) => item.type === "performance_ratings_closed");
      expect(told?.levelCheckMove).toEqual({
        agreed: false,
        band: "C",
        levelBefore: "2.45",
        levelAfter: "2.64",
      });
      expect(notificationCopy(told!, "en").subline).toBe(
        "Players placed you at C: level 2.45 to 2.64.",
      );
      expect(notificationCopy(told!, "ar").subline).toMatch(/وضعك اللاعبون/);
    });
  });

  it("refuses the Level recalculation once a Level check has settled", async () => {
    await withDb(async (db) => {
      const match = await playedPadel(db);
      await answer(db, match, match.a, [[match.c, "B"]]);
      await answer(db, match, match.b, [[match.c, "B"]]);
      await closeRatingWindow(db, match.matchId);
      const applied = await applyPadelReplay(api(db), {
        host: "pglite",
        carryUnplaced: true,
      });
      expect(applied).toMatchObject({
        kind: "refused",
        reason:
          "a Level check has settled, and the recalculation does not replay one",
      });
    });
  });
});

describe("weighing the raters", () => {
  recordJobs();

  it("weighs a Provisional rater half: one confirmed rater against two Provisional ones settles at the mean of the two middles", async () => {
    await withDb(async (db) => {
      const match = await setUpMatch(db, { rated: true, groupRated: false });
      await applyLevelOverride(api(db), {
        sport: "padel",
        setterUserId: match.d.id,
        setByRole: "operator",
        targetUserId: match.a.id,
        groupId: null,
        level: 3,
        reason: "new_to_group",
      });
      await completeMatch(api(db), {
        gameId: match.gameId,
        matchId: match.matchId,
        userId: match.a.id,
      });
      await setRating(db, match.c.id, {
        level: 3.15,
        phi: 250,
        levelBand: "C2",
      });
      await answer(db, match, match.a, [[match.c, "B"]]);
      await answer(db, match, match.b, [[match.c, "C+"]]);
      await answer(db, match, match.d, [[match.c, "C+"]]);
      await closeRatingWindow(db, match.matchId);

      const [result] = await resultsOf(db, match.matchId);
      expect(result).toMatchObject({
        userId: match.c.id,
        verdictLevelHundredths: 455,
        ballotsCounted: 3,
      });

      const own = await performanceRatingResult(api(db), {
        gameId: match.gameId,
        userId: match.c.id,
      });
      expect(own.levelCheck).toEqual({
        kind: "checked",
        agreed: false,
        verdictLevelHundredths: 455,
        muBefore: result!.muBefore,
        muAfter: result!.muAfter,
        ballotsCounted: 3,
      });
    });
  });

  it("lets two confirmed raters on one band outweigh a Provisional one", async () => {
    await withDb(async (db) => {
      const match = await setUpMatch(db, { rated: true, groupRated: false });
      for (const rater of [match.a, match.b]) {
        await applyLevelOverride(api(db), {
          sport: "padel",
          setterUserId: match.d.id,
          setByRole: "operator",
          targetUserId: rater.id,
          groupId: null,
          level: 3,
          reason: "new_to_group",
        });
      }
      await completeMatch(api(db), {
        gameId: match.gameId,
        matchId: match.matchId,
        userId: match.a.id,
      });
      await answer(db, match, match.a, [[match.c, "B"]]);
      await answer(db, match, match.b, [[match.c, "B"]]);
      await answer(db, match, match.d, [[match.c, "D"]]);
      await closeRatingWindow(db, match.matchId);

      const [result] = await resultsOf(db, match.matchId);
      expect(result?.verdictLevelHundredths).toBe(525);
    });
  });

  it("weighs a rater half once they were far from the verdicts in this Match and their previous two, never before", async () => {
    await withDb(async (db) => {
      const verdictOnC = async (
        match: PadelMatch,
        answers: [Player, AssignableDisplayLevelBand][],
      ) => {
        await setRating(db, match.c.id, {
          level: 3.15,
          phi: 250,
          levelBand: "C2",
        });
        for (const [rater, band] of answers) {
          await answer(db, match, rater, [[match.c, band]]);
        }
        await closeRatingWindow(db, match.matchId);
        const [result] = await resultsOf(db, match.matchId);
        return result?.verdictLevelHundredths;
      };

      const first = await playedPadel(db);
      expect(
        await verdictOnC(first, [
          [first.a, "A"],
          [first.b, "C"],
          [first.d, "C"],
        ]),
      ).toBe(315);

      // One earlier Match: a and b still split the weight evenly.
      const second = await playedPadel(db, { existing: again(first) });
      expect(
        await verdictOnC(second, [
          [second.a, "A"],
          [second.b, "C"],
        ]),
      ).toBe(490);

      // Far in this Match and the previous two: a counts half of b.
      const third = await playedPadel(db, { existing: again(first) });
      expect(
        await verdictOnC(third, [
          [third.a, "A"],
          [third.b, "C"],
        ]),
      ).toBe(315);

      const [original] = await resultsOf(db, third.matchId);
      await takeBackLevelChecks(api(db), third.matchId, new Date());
      const stored = await db.query.matches.findFirst({
        where: (table, { eq: equals }) => equals(table.id, third.matchId),
      });
      const window = await db.query.matchRatingWindows.findFirst({
        where: (table, { eq: equals }) => equals(table.matchId, third.matchId),
      });
      await settleLevelChecks(api(db), {
        match: stored!,
        game: { groupId: third.groupId, isPublic: false },
        now: window!.closesAt,
      });
      const [resettled] = await resultsOf(db, third.matchId);
      expect(resettled?.verdictLevelHundredths).toBe(
        original?.verdictLevelHundredths,
      );

      const ballotColumns = Object.keys(
        (await db.query.levelCheckBallots.findFirst())!,
      ).sort();
      expect(ballotColumns).toEqual(
        [
          "id",
          "matchId",
          "raterUserId",
          "rateeUserId",
          "band",
          "createdAt",
          "updatedAt",
        ].sort(),
      );
    });
  });
});

describe("taking a Level check back", () => {
  recordJobs();

  it("comes off with a wrong-score report, which keeps the answers, and settles again at the next completion", async () => {
    await withDb(async (db) => {
      const match = await playedPadel(db);
      const event = await db.query.ratingEvents.findFirst({
        where: and(
          eq(ratingEvents.matchId, match.matchId),
          eq(ratingEvents.userId, match.c.id),
        ),
      });
      await answer(db, match, match.a, [[match.c, "B"]]);
      await answer(db, match, match.b, [[match.c, "B"]]);
      await closeRatingWindow(db, match.matchId);
      expect(await resultsOf(db, match.matchId)).toHaveLength(1);

      await reportWrongScore(api(db), {
        gameId: match.gameId,
        matchId: match.matchId,
        userId: match.a.id,
      });
      const restored = await ratingOf(db, match.c.id);
      expect(restored.mu).toBe(event!.muBefore);
      expect(restored.phi).toBe(event!.phiBefore);
      expect(await resultsOf(db, match.matchId)).toEqual([]);
      expect(
        await db.$count(
          levelCheckBallots,
          eq(levelCheckBallots.matchId, match.matchId),
        ),
      ).toBe(2);

      await completeMatch(api(db), {
        gameId: match.gameId,
        matchId: match.matchId,
        userId: match.a.id,
      });
      await closeRatingWindow(db, match.matchId);
      expect(await resultsOf(db, match.matchId)).toHaveLength(1);
    });
  });

  it("keeps a check from an earlier Match that settled after the reported one", async () => {
    await withDb(async (db) => {
      const first = await playedPadel(db);
      await answer(db, first, first.a, [[first.c, "B"]]);
      await answer(db, first, first.b, [[first.c, "B"]]);
      const second = await playedPadel(db, { existing: again(first) });
      const secondEvent = await db.query.ratingEvents.findFirst({
        where: and(
          eq(ratingEvents.matchId, second.matchId),
          eq(ratingEvents.userId, first.c.id),
        ),
      });
      await closeRatingWindow(db, first.matchId);
      const [check] = await resultsOf(db, first.matchId);
      expect(check?.muBefore).toBe(secondEvent!.muAfter);

      await reportWrongScore(api(db), {
        gameId: second.gameId,
        matchId: second.matchId,
        userId: first.a.id,
      });
      expect(await resultsOf(db, first.matchId)).toHaveLength(1);
      expect((await ratingOf(db, first.c.id)).mu).toBeCloseTo(
        secondEvent!.muBefore + (check!.muAfter - check!.muBefore),
        8,
      );
    });
  });

  it("leaves the Rating alone when a Level was set since", async () => {
    await withDb(async (db) => {
      const match = await playedPadel(db);
      await answer(db, match, match.a, [[match.c, "B"]]);
      await answer(db, match, match.b, [[match.c, "B"]]);
      // Settled now, not at the close a day ahead, so the override is later.
      await settleRatingWindow(api(db), match.matchId, new Date(), {
        force: true,
      });
      await applyLevelOverride(api(db), {
        sport: "padel",
        setterUserId: match.b.id,
        setByRole: "operator",
        targetUserId: match.c.id,
        groupId: null,
        level: 2,
        reason: "new_to_group",
      });
      const set = await ratingOf(db, match.c.id);

      await reportWrongScore(api(db), {
        gameId: match.gameId,
        matchId: match.matchId,
        userId: match.a.id,
      });
      const after = await ratingOf(db, match.c.id);
      expect(after.mu).toBe(set.mu);
      expect(after.phi).toBe(set.phi);
      expect(await resultsOf(db, match.matchId)).toEqual([]);
    });
  });
});
