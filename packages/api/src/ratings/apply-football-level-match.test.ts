import { and, eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import {
  gameMvpVotes,
  gamePlayers,
  games,
  groups,
  levelOverrides,
  matchRatingWindows,
  matches,
  performanceRatings,
  ratingEvents,
  ratings,
} from "@repo/db/schema";
import { createPgliteDb, type TestDatabase } from "@repo/db/testing";

import { muFromOvr, ovrFromMu } from "@repo/domain/football-ovr";
import {
  isProvisional,
  ratedMatchesRemainingToConfirm,
} from "@repo/domain/level";
import {
  addMember,
  closeRatingWindow,
  footballGame,
  nextFootballGame,
  playAndSettle,
  playScore,
  tierEvents,
  type FootballFixture,
} from "#src/ratings/group-rated-match.test-support";
import { castMvpVote } from "#src/routers/marks/castMvpVote";
import { gameById } from "#src/routers/games/byId";
import { confirmMatchResult } from "#src/routers/games/confirmMatchResult";
import { publishFootballTeams } from "#src/routers/games/publishFootballTeams";
import { register } from "#src/routers/games/register";
import { saveFootballScore } from "#src/routers/games/saveFootballScore";
import { reportWrongScore } from "#src/routers/games/reportWrongScore";

async function withDb(run: (database: TestDatabase) => Promise<void>) {
  const { db, close } = await createPgliteDb();
  try {
    await run(db);
  } finally {
    await close();
  }
}

/** A Verified football Group on a Venue, so its Games count at weight 1. */
async function clubFootballGame(db: TestDatabase) {
  const f = await footballGame(db, { verified: true });
  await db
    .update(groups)
    .set({ venueId: f.venueId })
    .where(eq(groups.id, f.groupId));
  return f;
}

async function footballRating(db: TestDatabase, userId: string) {
  return db.query.ratings.findFirst({
    where: and(eq(ratings.userId, userId), eq(ratings.sport, "football")),
  });
}

async function setOvr(
  db: TestDatabase,
  userId: string,
  ovr: number,
  phi = 150,
) {
  await db
    .insert(ratings)
    .values({
      userId,
      sport: "football",
      mu: muFromOvr(ovr),
      phi,
      sigma: 0.06,
      levelBand: "C1",
    })
    .onConflictDoUpdate({
      target: [ratings.userId, ratings.sport],
      set: { mu: muFromOvr(ovr), phi },
    });
}

async function ovrOf(db: TestDatabase, userId: string) {
  const row = await footballRating(db, userId);
  return row ? ovrFromMu(row.mu) : null;
}

const PARTS = [
  "resultPart",
  "performancePart",
  "goalsPart",
  "mvpPart",
] as const;

function partsOf(event: Record<(typeof PARTS)[number], number | null>) {
  return PARTS.reduce((sum, part) => sum + (event[part] ?? 0), 0);
}

async function seat(f: FootballFixture, userIds: string[]) {
  for (const userId of userIds) {
    await register(f.db, { gameId: f.gameId, userId });
  }
}

describe("A counting football Match moves OVR (ADR-0069)", () => {
  it("moves a confirmed player +0.6 for an even win at weight 1, zero-sum across the Match", async () => {
    await withDb(async (db) => {
      const f = await clubFootballGame(db);
      const winners = [await addMember(f, "a"), await addMember(f, "b")];
      const losers = [await addMember(f, "c"), await addMember(f, "d")];
      for (const userId of [...winners, ...losers]) {
        await setOvr(db, userId, 74);
      }
      const matchId = await playAndSettle(f, winners, losers, {
        slot1: 3,
        slot2: 1,
      });

      const game = await db.query.games.findFirst({
        where: eq(games.id, f.gameId),
      });
      expect(game).toMatchObject({ rated: true, groupRated: false });

      const events = await db.query.ratingEvents.findMany({
        where: eq(ratingEvents.matchId, matchId),
      });
      expect(events.map((event) => event.userId).sort()).toEqual(
        [...winners, ...losers].sort(),
      );
      for (const event of events) {
        const won = winners.includes(event.userId);
        expect(event.sport).toBe("football");
        expect(event.weight).toBe(1);
        expect(event.outcomeScore).toBe(won ? 1 : 0);
        expect(event.resultPart).toBeCloseTo(won ? 0.6 : -0.6);
        expect(event.performancePart).toBe(0);
        expect(event.mvpPart).toBe(0);
        expect(Math.sign(event.goalsPart ?? 0)).toBe(won ? 1 : -1);
        expect(
          ovrFromMu(event.muAfter) - ovrFromMu(event.muBefore),
        ).toBeCloseTo(partsOf(event));
      }
      for (const part of PARTS) {
        expect(
          events.reduce((sum, event) => sum + (event[part] ?? 0), 0),
        ).toBeCloseTo(0, 10);
      }
      const winner = events.find((event) => event.userId === winners[0]);
      expect(await ovrOf(db, winners[0]!)).toBeCloseTo(74 + partsOf(winner!));
    });
  });

  it("keeps the result part zero-sum when the sides differ and mix Provisional players", async () => {
    await withDb(async (db) => {
      const f = await clubFootballGame(db);
      const slot1 = [
        await addMember(f, "a"),
        await addMember(f, "b"),
        await addMember(f, "c"),
      ];
      const slot2 = [await addMember(f, "d"), await addMember(f, "e")];
      await setOvr(db, slot1[0]!, 60, 350);
      await setOvr(db, slot2[0]!, 80);
      const matchId = await playAndSettle(f, slot1, slot2, {
        slot1: 2,
        slot2: 2,
      });
      const events = await db.query.ratingEvents.findMany({
        where: eq(ratingEvents.matchId, matchId),
      });
      expect(events).toHaveLength(5);
      expect(
        events.reduce((sum, event) => sum + (event.resultPart ?? 0), 0),
      ).toBeCloseTo(0, 10);
    });
  });

  it("halves the move on a Verified Group with no Venue", async () => {
    await withDb(async (db) => {
      const f = await footballGame(db, { verified: true });
      const a = await addMember(f, "a");
      const b = await addMember(f, "b");
      await setOvr(db, a, 70);
      await setOvr(db, b, 70);
      const matchId = await playAndSettle(f, [a], [b], { slot1: 1, slot2: 0 });
      const event = await db.query.ratingEvents.findFirst({
        where: and(
          eq(ratingEvents.matchId, matchId),
          eq(ratingEvents.userId, a),
        ),
      });
      expect(event?.weight).toBe(0.5);
      expect(event?.resultPart).toBeCloseTo(0.3);
    });
  });

  it("is Provisional until the fifth counting Match and confirmed after it", async () => {
    await withDb(async (db) => {
      let f = await clubFootballGame(db);
      const a = await addMember(f, "a");
      const b = await addMember(f, "b");
      for (let played = 1; played <= 5; played++) {
        if (played > 1) {
          f = await nextFootballGame(f, played * 3);
          await seat(f, [a, b]);
        }
        await playAndSettle(f, [a], [b], { slot1: 1, slot2: 0 });
        const row = await footballRating(db, a);
        expect(isProvisional(row!.phi)).toBe(played < 5);
        expect(ratedMatchesRemainingToConfirm(row!.phi)).toBe(5 - played);
      }
    });
  });

  it("moves a new player twice as far while Provisional", async () => {
    await withDb(async (db) => {
      const f = await clubFootballGame(db);
      const a = await addMember(f, "a");
      const b = await addMember(f, "b");
      const matchId = await playAndSettle(f, [a], [b], { slot1: 0, slot2: 1 });
      const event = await db.query.ratingEvents.findFirst({
        where: and(
          eq(ratingEvents.matchId, matchId),
          eq(ratingEvents.userId, b),
        ),
      });
      expect(event?.phiBefore).toBe(350);
      expect(event?.resultPart).toBeCloseTo(1.2);
      expect(event?.phiAfter).toBe(320);
    });
  });

  it("keeps a Level an Operator set confirmed", async () => {
    await withDb(async (db) => {
      const f = await clubFootballGame(db);
      const a = await addMember(f, "a");
      const b = await addMember(f, "b");
      await setOvr(db, a, 72);
      await db.insert(levelOverrides).values({
        userId: a,
        sport: "football",
        setByUserId: f.organizerId,
        setByRole: "operator",
        hadRating: true,
        muBefore: muFromOvr(65),
        phiBefore: 350,
        sigmaBefore: 0.06,
        levelBandBefore: "C2",
        muAfter: muFromOvr(72),
        phiAfter: 150,
        sigmaAfter: 0.06,
        levelBandAfter: "C1",
      });
      await playAndSettle(f, [a], [b], { slot1: 1, slot2: 0 });
      expect(isProvisional((await footballRating(db, a))!.phi)).toBe(false);
      expect(isProvisional((await footballRating(db, b))!.phi)).toBe(true);
    });
  });

  it("writes no tier event and no Tier points for the Match", async () => {
    await withDb(async (db) => {
      const f = await clubFootballGame(db);
      const a = await addMember(f, "a");
      const b = await addMember(f, "b");
      const matchId = await playAndSettle(f, [a], [b], { slot1: 1, slot2: 0 });
      expect(await tierEvents(db, matchId)).toHaveLength(0);
      expect(await db.query.groupTierPoints.findMany()).toHaveLength(0);
    });
  });

  it("writes no rating event on a tier Group", async () => {
    await withDb(async (db) => {
      const f = await footballGame(db);
      const a = await addMember(f, "a");
      const b = await addMember(f, "b");
      const matchId = await playScore(f, [a], [b], { slot1: 1, slot2: 0 });
      expect(
        (await tierEvents(db, matchId)).filter(
          (event) => event.kind === "game",
        ),
      ).toHaveLength(2);
      expect(
        await db.query.ratingEvents.findMany({
          where: eq(ratingEvents.matchId, matchId),
        }),
      ).toHaveLength(0);
    });
  });

  it("moves nothing on a football Game its creator chose Unrated", async () => {
    await withDb(async (db) => {
      const f = await footballGame(db, { verified: true, rated: false });
      const a = await addMember(f, "a");
      const b = await addMember(f, "b");
      await setOvr(db, a, 70);
      const matchId = await playScore(f, [a], [b], { slot1: 1, slot2: 0 });
      const game = await db.query.games.findFirst({
        where: eq(games.id, f.gameId),
      });
      expect(game).toMatchObject({ rated: false, groupRated: false });
      expect(
        await db.query.ratingEvents.findMany({
          where: eq(ratingEvents.matchId, matchId),
        }),
      ).toHaveLength(0);
      expect(await tierEvents(db, matchId)).toHaveLength(0);
      expect(await ovrOf(db, a)).toBeCloseTo(70);
      expect(await footballRating(db, b)).toBeUndefined();
    });
  });
});

describe("Report a wrong score on a counting football Match", () => {
  it("returns each player's OVR to what it would be without the Match, with later Matches in place", async () => {
    await withDb(async (db) => {
      const first = await clubFootballGame(db);
      const a = await addMember(first, "a");
      const b = await addMember(first, "b");
      await setOvr(db, a, 70);
      await setOvr(db, b, 70);
      const firstMatch = await playAndSettle(first, [a], [b], {
        slot1: 1,
        slot2: 0,
      });

      const second = await nextFootballGame(first, 6);
      await seat(second, [a]);
      const c = await addMember(second, "c");
      await setOvr(db, c, 60);
      await playAndSettle(second, [c], [a], { slot1: 2, slot2: 0 });

      const secondEvents = await db.query.ratingEvents.findMany({
        where: eq(ratingEvents.sport, "football"),
      });
      const secondPart = (userId: string) => {
        const event = secondEvents.find(
          (row) => row.userId === userId && row.matchId !== firstMatch,
        );
        return event ? partsOf(event) : 0;
      };

      await reportWrongScore(db, {
        gameId: first.gameId,
        matchId: firstMatch,
        userId: first.organizerId,
      });

      expect(await ovrOf(db, a)).toBeCloseTo(70 + secondPart(a));
      expect(await ovrOf(db, b)).toBeCloseTo(70);
      expect(await ovrOf(db, c)).toBeCloseTo(60 + secondPart(c));
      expect(
        await db.query.ratingEvents.findMany({
          where: eq(ratingEvents.matchId, firstMatch),
        }),
      ).toHaveLength(0);

      const rowA = await footballRating(db, a);
      expect(rowA?.phi).toBe(320);
      const rowB = await footballRating(db, b);
      expect(rowB?.phi).toBe(350);
      expect(rowB?.lastRatedAt).toBeNull();
    });
  });

  it("sets φ again from the Matches that still count", async () => {
    await withDb(async (db) => {
      const f = await clubFootballGame(db);
      const a = await addMember(f, "a");
      const b = await addMember(f, "b");
      const matchId = await playAndSettle(f, [a], [b], { slot1: 1, slot2: 0 });
      expect((await footballRating(db, a))?.phi).toBe(320);
      await reportWrongScore(db, {
        gameId: f.gameId,
        matchId,
        userId: f.organizerId,
      });
      const row = await footballRating(db, a);
      expect(row?.phi).toBe(350);
      expect(ovrFromMu(row!.mu)).toBeCloseTo(ovrFromMu(1500));
    });
  });
});

describe("Game details on a counting football Match", () => {
  it("shows the viewer's OVR move and the other side's average", async () => {
    await withDb(async (db) => {
      const f = await clubFootballGame(db);
      const a = await addMember(f, "a");
      const b = await addMember(f, "b");
      const c = await addMember(f, "c");
      await setOvr(db, a, 74);
      await setOvr(db, b, 76);
      await setOvr(db, c, 76);
      await playAndSettle(f, [a], [b, c], { slot1: 3, slot2: 1 });

      const detail = await gameById(db, { gameId: f.gameId, userId: a });
      expect(detail.ratingScope).toBe("temba");
      const ovr = detail.ratingImpact?.ovr;
      expect(ovr?.outcome).toBe("won");
      expect(ovr?.before).toBeCloseTo(74);
      expect(ovr?.opponentAverage).toBeCloseTo(76);
      expect(ovr?.resultPart).toBeGreaterThan(0);
      expect(ovr?.parts.result).toBe(ovr?.resultPart);
      expect(ovr?.goals).toEqual({ scored: 0, conceded: 1 });
      expect(ovr?.rating).toBeNull();
      expect(ovr?.mvp).toBe("none");
      const parts = ovr!.parts;
      expect((ovr?.after ?? 0) - (ovr?.before ?? 0)).toBeCloseTo(
        parts.result +
          (parts.performance ?? 0) +
          (parts.goals ?? 0) +
          (parts.mvp ?? 0),
      );

      const loser = await gameById(db, { gameId: f.gameId, userId: b });
      expect(loser.ratingImpact?.ovr?.outcome).toBe("lost");
      expect(loser.ratingImpact?.ovr?.opponentAverage).toBeCloseTo(74);
    });
  });
});

const HOUR = 60 * 60 * 1000;

async function eventsOf(db: TestDatabase, matchId: string) {
  return db.query.ratingEvents.findMany({
    where: eq(ratingEvents.matchId, matchId),
  });
}

async function setMvpMode(
  f: FootballFixture,
  mvpMode: "vote" | "organizer" | "none",
) {
  await f.db.update(games).set({ mvpMode }).where(eq(games.id, f.gameId));
}

/** Everyone on one side rates everyone else on the Match. */
async function rateAll(
  db: TestDatabase,
  matchId: string,
  raters: string[],
  value: (ratee: string) => number,
  ratees: string[],
) {
  await db.insert(performanceRatings).values(
    raters.flatMap((raterUserId) =>
      ratees
        .filter((rateeUserId) => rateeUserId !== raterUserId)
        .map((rateeUserId) => ({
          matchId,
          raterUserId,
          rateeUserId,
          value: value(rateeUserId),
        })),
    ),
  );
}

describe("A counting football Match's Rating window (ADR-0069)", () => {
  it("opens in Everyone mode at completion and writes the OVR move only when it settles", async () => {
    await withDb(async (db) => {
      const f = await clubFootballGame(db);
      const a = await addMember(f, "a");
      const b = await addMember(f, "b");
      const matchId = await playScore(f, [a], [b], { slot1: 1, slot2: 0 });
      const window = await db.query.matchRatingWindows.findFirst({
        where: eq(matchRatingWindows.matchId, matchId),
      });
      expect(window).toMatchObject({
        mode: "everyone",
        weightPercent: 30,
        countsForLevel: true,
        settledAt: null,
      });
      expect(await eventsOf(db, matchId)).toHaveLength(0);
      const open = await gameById(db, { gameId: f.gameId, userId: a });
      expect(open.ratingWindow).toMatchObject({
        state: "open",
        mode: "everyone",
        countsForLevel: true,
        viewerMayRate: true,
      });
      expect(open.ratingImpact).toBeNull();

      expect(await closeRatingWindow(db, matchId)).toBe(true);
      expect(await eventsOf(db, matchId)).toHaveLength(2);
      expect(await tierEvents(db, matchId)).toHaveLength(0);
    });
  });

  it("writes four zero-sum parts from ratings, Scorers and a voted MVP, and byId shows them adding up to the move", async () => {
    await withDb(async (db) => {
      const f = await clubFootballGame(db);
      await setMvpMode(f, "vote");
      const black = [
        await addMember(f, "a"),
        await addMember(f, "b"),
        await addMember(f, "c"),
      ];
      const white = [
        await addMember(f, "d"),
        await addMember(f, "e"),
        await addMember(f, "f"),
      ];
      const everyone = [...black, ...white];
      for (const userId of everyone) {
        await setOvr(db, userId, 72);
      }
      await db
        .update(gamePlayers)
        .set({ footballRole: "keeper" })
        .where(
          and(
            eq(gamePlayers.gameId, f.gameId),
            eq(gamePlayers.userId, white[0]!),
          ),
        );
      await publishAndScore(f, black, white, { slot1: 3, slot2: 1 }, [
        { userId: black[0]!, goals: 2 },
        { userId: black[1]!, goals: 1 },
        { userId: white[1]!, goals: 1 },
      ]);
      const match = await db.query.matches.findFirst({
        where: eq(matches.gameId, f.gameId),
      });
      const matchId = match!.id;
      await rateAll(
        db,
        matchId,
        everyone,
        (ratee) => (ratee === black[0] ? 9 : 6),
        everyone,
      );
      await db.insert(gameMvpVotes).values(
        everyone
          .filter((userId) => userId !== black[0])
          .map((voterUserId) => ({
            gameId: f.gameId,
            voterUserId,
            candidateUserId: black[0]!,
          })),
      );
      await closeRatingWindow(db, matchId);

      const events = await eventsOf(db, matchId);
      expect(events).toHaveLength(6);
      for (const part of PARTS) {
        expect(
          events.reduce((sum, event) => sum + (event[part] ?? 0), 0),
        ).toBeCloseTo(0, 10);
      }
      const star = events.find((event) => event.userId === black[0])!;
      expect(star.performancePart).toBeGreaterThan(0);
      expect(star.goalsPart).toBeGreaterThan(0);
      expect(star.mvpPart).toBeGreaterThan(0);
      const keeper = events.find((event) => event.userId === white[0])!;
      const forward = events.find((event) => event.userId === white[2])!;
      expect(keeper.goalsPart).toBeLessThan(forward.goalsPart ?? 0);

      const detail = await gameById(db, {
        gameId: f.gameId,
        userId: black[0]!,
      });
      const ovr = detail.ratingImpact!.ovr!;
      expect(ovr.rating).toEqual({ hundredths: 900, ballots: 5 });
      expect(ovr.goals).toEqual({ scored: 2, conceded: 1 });
      expect(ovr.mvp).toBe("you");
      expect(ovr.after - ovr.before).toBeCloseTo(
        ovr.parts.result +
          (ovr.parts.performance ?? 0) +
          (ovr.parts.goals ?? 0) +
          (ovr.parts.mvp ?? 0),
      );
      expect(ovr.after - ovr.before).toBeCloseTo(
        ovrFromMu(star.muAfter) - ovrFromMu(star.muBefore),
      );
      const other = await gameById(db, { gameId: f.gameId, userId: white[1]! });
      expect(other.ratingImpact?.ovr?.mvp).toBe("other");
    });
  });

  it("gives everyone an MVP part of 0 with no MVP, or an MVP an Organizer picked", async () => {
    for (const mode of ["none", "organizer"] as const) {
      await withDb(async (db) => {
        const f = await clubFootballGame(db);
        await setMvpMode(f, mode);
        const a = await addMember(f, "a");
        const b = await addMember(f, "b");
        const c = await addMember(f, "c");
        const matchId = await playScore(f, [a, b], [c], { slot1: 2, slot2: 1 });
        if (mode === "organizer") {
          await db
            .update(games)
            .set({
              mvpUserId: a,
              mvpDecidedBy: "organizer",
              mvpDecidedAt: new Date(),
            })
            .where(eq(games.id, f.gameId));
        }
        await closeRatingWindow(db, matchId);
        const game = await db.query.games.findFirst({
          where: eq(games.id, f.gameId),
        });
        expect(game?.mvpUserId).toBe(mode === "organizer" ? a : null);
        expect(game?.mvpSettledAt != null).toBe(mode === "organizer");
        const events = await eventsOf(db, matchId);
        expect(events).toHaveLength(3);
        expect(events.every((event) => event.mvpPart === 0)).toBe(true);
      });
    }
  });

  it("closes the MVP vote with the Rating window", async () => {
    await withDb(async (db) => {
      const f = await clubFootballGame(db);
      await setMvpMode(f, "vote");
      const a = await addMember(f, "a");
      const b = await addMember(f, "b");
      const c = await addMember(f, "c");
      const matchId = await playScore(f, [a, b], [c], { slot1: 2, slot2: 1 });
      const match = await db.query.matches.findFirst({
        where: eq(matches.id, matchId),
      });
      const afterWindow = new Date(match!.completedAt!.getTime() + 25 * HOUR);
      await expect(
        castMvpVote(
          db,
          { gameId: f.gameId, userId: b, candidateUserId: a },
          afterWindow,
        ),
      ).rejects.toThrow();
      await castMvpVote(
        db,
        { gameId: f.gameId, userId: b, candidateUserId: a },
        new Date(match!.completedAt!.getTime() + HOUR),
      );
    });
  });

  it("is suspended by a wrong score before it settles, and reversed after", async () => {
    await withDb(async (db) => {
      const f = await clubFootballGame(db);
      const a = await addMember(f, "a");
      const b = await addMember(f, "b");
      await setOvr(db, a, 70);
      await setOvr(db, b, 70);
      const matchId = await playScore(f, [a], [b], { slot1: 2, slot2: 0 });
      await reportWrongScore(db, {
        gameId: f.gameId,
        matchId,
        userId: f.organizerId,
      });
      const window = await db.query.matchRatingWindows.findFirst({
        where: eq(matchRatingWindows.matchId, matchId),
      });
      expect(window?.suspendedAt).not.toBeNull();
      expect(await eventsOf(db, matchId)).toHaveLength(0);
      expect(await ovrOf(db, a)).toBeCloseTo(70);
    });
  });
});

/** Publishes the sides, then a side-one player enters the Score with its Scorers and an Organizer confirms. */
async function publishAndScore(
  f: FootballFixture,
  slot1: string[],
  slot2: string[],
  score: { slot1: number; slot2: number },
  scorers: { userId: string; goals: number }[],
) {
  await publishFootballTeams(f.db, {
    gameId: f.gameId,
    userId: f.organizerId,
    method: "manual",
    bibs: { slot1: "black", slot2: "white" },
    slot1,
    slot2,
  });
  await saveFootballScore(
    f.db,
    {
      gameId: f.gameId,
      userId: f.organizerId,
      slot1Goals: score.slot1,
      slot2Goals: score.slot2,
      scorers,
    },
    new Date(f.kickoff.getTime() + 2 * HOUR),
  );
  const match = await f.db.query.matches.findFirst({
    where: eq(matches.gameId, f.gameId),
  });
  await confirmMatchResult(f.db, {
    gameId: f.gameId,
    matchId: match!.id,
    userId: f.organizerId,
  });
}
