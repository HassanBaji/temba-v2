import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import {
  games,
  groupLevelOverrides,
  groupRatingEvents,
  groupRatings,
  matches,
  ratingEvents,
  ratings,
} from "@repo/db/schema";
import { createPgliteDb } from "@repo/db/testing";

import { setUpMatch } from "#src/ratings/group-rated-match.test-support";
import { completeMatch } from "#src/routers/games/completeMatch";
import { reportWrongScore } from "#src/routers/games/reportWrongScore";
import { GROUP_RATING_START_PHI } from "@repo/domain/group-level";
import { muFromLevel } from "@repo/domain/level";

describe("Group Levels (ADR-0053)", () => {
  it("rates the Group only on a group rated Game", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const { gameId, groupId, matchId, a, c } = await setUpMatch(db, {
        rated: false,
        groupRated: true,
      });
      await db.insert(ratings).values({
        userId: a.id,
        sport: "padel",
        mu: muFromLevel(4),
        phi: 90,
        sigma: 0.06,
        levelBand: "C1",
      });

      await completeMatch(db, { gameId, matchId, userId: a.id });

      expect(
        await db.query.ratingEvents.findMany({
          where: eq(ratingEvents.matchId, matchId),
        }),
      ).toHaveLength(0);
      const events = await db.query.groupRatingEvents.findMany({
        where: eq(groupRatingEvents.matchId, matchId),
      });
      expect(events).toHaveLength(4);
      const aEvent = events.find((event) => event.userId === a.id);
      expect(aEvent?.muBefore).toBe(muFromLevel(4));
      expect(aEvent?.phiBefore).toBe(GROUP_RATING_START_PHI);
      expect(aEvent?.groupId).toBe(groupId);

      const rows = await db.query.groupRatings.findMany();
      expect(rows).toHaveLength(4);
      const aRow = rows.find((row) => row.userId === a.id);
      const cRow = rows.find((row) => row.userId === c.id);
      expect(aRow?.mu).toBeGreaterThan(muFromLevel(4));
      expect(cRow?.mu).toBeLessThan(muFromLevel(3));

      const temba = await db.query.ratings.findFirst({
        where: eq(ratings.userId, a.id),
      });
      expect(temba?.mu).toBe(muFromLevel(4));
    } finally {
      await close();
    }
  });

  it("rates both on a Temba rated Game", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const { gameId, matchId, a } = await setUpMatch(db, {
        rated: true,
        groupRated: true,
      });

      await completeMatch(db, { gameId, matchId, userId: a.id });

      expect(
        await db.query.ratingEvents.findMany({
          where: eq(ratingEvents.matchId, matchId),
        }),
      ).toHaveLength(4);
      expect(
        await db.query.groupRatingEvents.findMany({
          where: eq(groupRatingEvents.matchId, matchId),
        }),
      ).toHaveLength(4);
    } finally {
      await close();
    }
  });

  it("rates nothing on an Unrated Game", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const { gameId, matchId, a } = await setUpMatch(db, {
        rated: false,
        groupRated: false,
      });

      await completeMatch(db, { gameId, matchId, userId: a.id });

      expect(await db.query.ratingEvents.findMany()).toHaveLength(0);
      expect(await db.query.groupRatingEvents.findMany()).toHaveLength(0);
      expect(await db.query.groupRatings.findMany()).toHaveLength(0);
    } finally {
      await close();
    }
  });

  it("reverses Group rating events on a wrong-score report", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const { gameId, matchId, a } = await setUpMatch(db, {
        rated: false,
        groupRated: true,
      });
      await completeMatch(db, { gameId, matchId, userId: a.id });
      const event = await db.query.groupRatingEvents.findFirst({
        where: eq(groupRatingEvents.userId, a.id),
      });

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

  it("keeps a Group Level an Organizer set after the Match", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const { gameId, groupId, matchId, a, b } = await setUpMatch(db, {
        rated: false,
        groupRated: true,
      });
      await completeMatch(db, { gameId, matchId, userId: a.id });
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

  it("does not touch Games created before Group Levels", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const { gameId, matchId, a } = await setUpMatch(db, {
        rated: true,
        groupRated: true,
      });
      await db
        .update(games)
        .set({ groupRated: false })
        .where(eq(games.id, gameId));

      await completeMatch(db, { gameId, matchId, userId: a.id });

      expect(await db.query.ratingEvents.findMany()).toHaveLength(4);
      expect(await db.query.groupRatingEvents.findMany()).toHaveLength(0);
    } finally {
      await close();
    }
  });
});
