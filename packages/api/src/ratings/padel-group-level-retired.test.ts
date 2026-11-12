import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import {
  groupLevelOverrides,
  groupRatingEvents,
  groupRatings,
  matches,
  ratingEvents,
  ratings,
} from "@repo/db/schema";
import { createPgliteDb } from "@repo/db/testing";

import { setUpMatch } from "#src/ratings/group-rated-match.test-support";
import { writeLegacyGroupLevelsFor } from "#src/ratings/legacy-group-level.test-support";
import { completeMatch } from "#src/routers/games/completeMatch";
import { reportWrongScore } from "#src/routers/games/reportWrongScore";
import { seasonStanding } from "#src/routers/groups/seasonStanding";
import { ratingFlagsAtCreate } from "@repo/domain/game-rating-scope";
import { muFromLevel } from "@repo/domain/level";

const padelOnGroup = { hasGroup: true, sport: "padel" as const, rated: true };

describe("A padel Group keeps only a Standing (ADR-0066)", () => {
  it("writes no Group Level and no Temba Level on a Group that is not Verified, and still counts in the Standing", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const { gameId, groupId, matchId, a, c } = await setUpMatch(
        db,
        ratingFlagsAtCreate({ ...padelOnGroup, groupVerified: false }),
      );

      await completeMatch(db, { gameId, matchId, userId: a.id });

      expect(await db.query.ratingEvents.findMany()).toHaveLength(0);
      expect(await db.query.groupRatingEvents.findMany()).toHaveLength(0);
      expect(await db.query.groupRatings.findMany()).toHaveLength(0);

      const standing = await seasonStanding(db as never, {
        groupId,
        seasonId: null,
        userId: a.id,
      });
      expect(standing.gamesCounted).toBe(1);
      const aRow = standing.rows.find((row) => row.userId === a.id);
      const cRow = standing.rows.find((row) => row.userId === c.id);
      expect(aRow).toMatchObject({ played: 1, wins: 1, losses: 0 });
      expect(cRow).toMatchObject({ played: 1, wins: 0, losses: 1 });
    } finally {
      await close();
    }
  });

  it("writes no Group Level on a Game still flagged group rated", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const { gameId, matchId, a } = await setUpMatch(db, {
        rated: false,
        groupRated: true,
      });

      await completeMatch(db, { gameId, matchId, userId: a.id });

      expect(await db.query.ratingEvents.findMany()).toHaveLength(0);
      expect(await db.query.groupRatingEvents.findMany()).toHaveLength(0);
    } finally {
      await close();
    }
  });

  it("moves the Temba Level as before on a Verified Group, and no Group Level", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const flags = ratingFlagsAtCreate({
        ...padelOnGroup,
        groupVerified: true,
      });
      expect(flags).toEqual({ rated: true, groupRated: false });
      const { gameId, matchId, a, c } = await setUpMatch(db, flags);
      await db.insert(ratings).values({
        userId: a.id,
        sport: "padel",
        mu: muFromLevel(4),
        phi: 90,
        sigma: 0.06,
        levelBand: "C1",
      });

      await completeMatch(db, { gameId, matchId, userId: a.id });

      const events = await db.query.ratingEvents.findMany({
        where: eq(ratingEvents.matchId, matchId),
      });
      expect(events).toHaveLength(4);
      const aRow = await db.query.ratings.findFirst({
        where: eq(ratings.userId, a.id),
      });
      const cRow = await db.query.ratings.findFirst({
        where: eq(ratings.userId, c.id),
      });
      expect(aRow?.mu).toBeGreaterThan(muFromLevel(4));
      expect(cRow?.mu).toBeLessThan(
        events.find((e) => e.userId === c.id)!.muBefore,
      );
      expect(await db.query.groupRatingEvents.findMany()).toHaveLength(0);
    } finally {
      await close();
    }
  });

  it("restores the Group Level rows of a Match completed before the retirement on a wrong-score report", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const played = await setUpMatch(db, { rated: false, groupRated: true });
      const { gameId, matchId, a } = played;
      await completeMatch(db, { gameId, matchId, userId: a.id });
      await writeLegacyGroupLevelsFor(db as never, played);
      const event = await db.query.groupRatingEvents.findFirst({
        where: eq(groupRatingEvents.userId, a.id),
      });
      expect(event).toBeDefined();

      await reportWrongScore(db, { gameId, matchId, userId: a.id });

      expect(await db.query.groupRatingEvents.findMany()).toHaveLength(0);
      const row = await db.query.groupRatings.findFirst({
        where: eq(groupRatings.userId, a.id),
      });
      expect(row?.mu).toBe(event?.muBefore);
      expect(row?.phi).toBe(event?.phiBefore);
      const match = await db.query.matches.findFirst({
        where: eq(matches.id, matchId),
      });
      expect(match?.status).toBe("pending");
    } finally {
      await close();
    }
  });

  it("keeps a Group Level an Organizer set after that Match", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const played = await setUpMatch(db, { rated: false, groupRated: true });
      const { gameId, groupId, matchId, a, b } = played;
      await completeMatch(db, { gameId, matchId, userId: a.id });
      await writeLegacyGroupLevelsFor(db as never, played);
      const set = { mu: muFromLevel(5), phi: 150, sigma: 0.06 };
      await db
        .update(groupRatings)
        .set(set)
        .where(eq(groupRatings.userId, b.id));
      await db.insert(groupLevelOverrides).values({
        userId: b.id,
        groupId,
        setByUserId: a.id,
        muBefore: 0,
        phiBefore: 0,
        sigmaBefore: 0,
        levelBandBefore: "C2",
        muAfter: set.mu,
        phiAfter: set.phi,
        sigmaAfter: set.sigma,
        levelBandAfter: "B3",
        createdAt: new Date(Date.now() + 1000),
      });

      await reportWrongScore(db, { gameId, matchId, userId: a.id });

      const row = await db.query.groupRatings.findFirst({
        where: eq(groupRatings.userId, b.id),
      });
      expect(row?.mu).toBe(set.mu);
    } finally {
      await close();
    }
  });
});
