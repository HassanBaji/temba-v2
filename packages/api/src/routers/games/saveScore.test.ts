import { TRPCError } from "@trpc/server";
import { asc, eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import {
  MatchStatusEnum,
  matchResultConfirmations,
  matchScoreChanges,
  matchSets,
  matches,
  notifications,
} from "@repo/db/schema";
import { createPgliteDb, type TestDatabase } from "@repo/db/testing";

import {
  insertUser,
  setUpMatch,
} from "#src/ratings/group-rated-match.test-support";
import { gameById } from "#src/routers/games/byId";
import { confirmMatchResult } from "#src/routers/games/confirmMatchResult";
import { saveScore } from "#src/routers/games/saveScore";
import { scoreSet } from "#src/routers/games/scoreSet";

async function withDb(run: (db: TestDatabase) => Promise<void>) {
  const { db, close } = await createPgliteDb();
  try {
    await run(db);
  } finally {
    await close();
  }
}

/** a and b beat c and d 6–2 in the first Set, entered by a. */
async function scoredMatch(db: TestDatabase) {
  const m = await setUpMatch(db, { rated: true, groupRated: false });
  const sets = await db.query.matchSets.findMany({
    where: eq(matchSets.matchId, m.matchId),
    orderBy: asc(matchSets.setNumber),
  });
  return { ...m, sets, base: { gameId: m.gameId, matchId: m.matchId } };
}

async function confirmedUserIds(db: TestDatabase, matchId: string) {
  const rows = await db.query.matchResultConfirmations.findMany({
    where: eq(matchResultConfirmations.matchId, matchId),
  });
  return rows.map((row) => row.userId).sort();
}

async function statusOf(db: TestDatabase, matchId: string) {
  const match = await db.query.matches.findFirst({
    where: eq(matches.id, matchId),
  });
  return match?.status;
}

async function askedToConfirm(db: TestDatabase, gameId: string) {
  const rows = await db.query.notifications.findMany({
    where: eq(notifications.gameId, gameId),
  });
  return rows
    .filter((row) => row.type === "match_score_to_confirm")
    .map((row) => row.recipientUserId)
    .sort();
}

describe("games.saveScore", () => {
  it("changes an entered score as a whole: the changer's side is confirmed, the note says what it replaced and why, and the other side is asked", async () => {
    await withDb(async (db) => {
      const m = await scoredMatch(db);
      const [first, second] = m.sets;

      const saved = await saveScore(db, {
        ...m.base,
        userId: m.c.id,
        sets: [
          { setId: first!.id, slot1GamesWon: 2, slot2GamesWon: 6 },
          { setId: second!.id, slot1GamesWon: 3, slot2GamesWon: 6 },
        ],
        reason: "sets_swapped",
      });

      expect(saved).toEqual({ ok: true, changed: true });
      expect(await confirmedUserIds(db, m.matchId)).toEqual([m.c.id]);
      expect(await statusOf(db, m.matchId)).toBe(MatchStatusEnum.PENDING);
      expect(await askedToConfirm(db, m.gameId)).toEqual(
        [m.a.id, m.b.id].sort(),
      );

      const view = await gameById(db, { gameId: m.gameId, userId: m.b.id });
      expect(view.matchResultConfirmation?.scoreEntry).toMatchObject({
        enteredByUserId: m.c.id,
        change: {
          reason: "sets_swapped",
          previousSets: [
            { slot1GamesWon: 6, slot2GamesWon: 2 },
            { slot1GamesWon: null, slot2GamesWon: null },
            { slot1GamesWon: null, slot2GamesWon: null },
          ],
        },
      });
      expect(view.matchResultConfirmation?.sideConfirmedUserIds.sort()).toEqual(
        [m.c.id, m.d.id].sort(),
      );

      await confirmMatchResult(db, { ...m.base, userId: m.b.id });
      expect(await statusOf(db, m.matchId)).toBe(MatchStatusEnum.COMPLETED);
    });
  });

  it("confirms nothing and notes nothing when the same score is saved again", async () => {
    await withDb(async (db) => {
      const m = await scoredMatch(db);

      const saved = await saveScore(db, {
        ...m.base,
        userId: m.c.id,
        sets: [{ setId: m.sets[0]!.id, slot1GamesWon: 6, slot2GamesWon: 2 }],
        reason: "other",
      });

      expect(saved).toEqual({ ok: true, changed: false });
      expect(await confirmedUserIds(db, m.matchId)).toEqual([m.a.id]);
      expect(await statusOf(db, m.matchId)).toBe(MatchStatusEnum.PENDING);
      expect(await db.query.matchScoreChanges.findMany()).toEqual([]);
      expect(await askedToConfirm(db, m.gameId)).toEqual([]);
    });
  });

  it("enters a first score without a note: there was nothing to change", async () => {
    await withDb(async (db) => {
      const m = await scoredMatch(db);
      await db
        .update(matchSets)
        .set({ slot1GamesWon: null, slot2GamesWon: null })
        .where(eq(matchSets.matchId, m.matchId));
      await db.delete(matchResultConfirmations);

      await saveScore(db, {
        ...m.base,
        userId: m.d.id,
        sets: [
          { setId: m.sets[0]!.id, slot1GamesWon: 4, slot2GamesWon: 6 },
          { setId: m.sets[1]!.id, slot1GamesWon: 5, slot2GamesWon: 7 },
        ],
      });

      expect(await confirmedUserIds(db, m.matchId)).toEqual([m.d.id]);
      expect(await db.query.matchScoreChanges.findMany()).toEqual([]);
      const view = await gameById(db, { gameId: m.gameId, userId: m.a.id });
      expect(view.matchResultConfirmation?.scoreEntry).toMatchObject({
        enteredByUserId: m.d.id,
        change: null,
      });
    });
  });

  it("keeps one note per Match, for the score as it stands", async () => {
    await withDb(async (db) => {
      const m = await scoredMatch(db);
      const setId = m.sets[0]!.id;
      await saveScore(db, {
        ...m.base,
        userId: m.c.id,
        sets: [{ setId, slot1GamesWon: 6, slot2GamesWon: 4 }],
        reason: "set_score_wrong",
      });
      await saveScore(db, {
        ...m.base,
        userId: m.b.id,
        sets: [{ setId, slot1GamesWon: 6, slot2GamesWon: 2 }],
      });

      const notes = await db.query.matchScoreChanges.findMany({
        where: eq(matchScoreChanges.matchId, m.matchId),
      });
      expect(notes).toHaveLength(1);
      expect(notes[0]).toMatchObject({
        changedByUserId: m.b.id,
        reason: null,
        previousSets: [
          { setNumber: 1, slot1GamesWon: 6, slot2GamesWon: 4 },
          {},
          {},
        ],
      });

      // A Set saved through the older door enters the score afresh.
      await scoreSet(db, {
        ...m.base,
        setId,
        userId: m.d.id,
        slot1GamesWon: 7,
        slot2GamesWon: 5,
      });
      expect(await db.query.matchScoreChanges.findMany()).toEqual([]);
      const view = await gameById(db, { gameId: m.gameId, userId: m.a.id });
      expect(view.matchResultConfirmation?.scoreEntry).toMatchObject({
        enteredByUserId: m.d.id,
        change: null,
      });
    });
  });

  it("refuses a Set of another Match, games out of range, and a User who did not play", async () => {
    await withDb(async (db) => {
      const m = await scoredMatch(db);
      const outsider = await insertUser(db, "outsider");
      const setId = m.sets[0]!.id;

      await expect(
        saveScore(db, {
          ...m.base,
          userId: m.c.id,
          sets: [
            { setId: crypto.randomUUID(), slot1GamesWon: 6, slot2GamesWon: 1 },
          ],
        }),
      ).rejects.toMatchObject({ code: "NOT_FOUND" });
      await expect(
        saveScore(db, {
          ...m.base,
          userId: m.c.id,
          sets: [{ setId, slot1GamesWon: 8, slot2GamesWon: 1 }],
        }),
      ).rejects.toMatchObject({ code: "BAD_REQUEST" });
      await expect(
        saveScore(db, {
          ...m.base,
          userId: outsider.id,
          sets: [{ setId, slot1GamesWon: 6, slot2GamesWon: 1 }],
        }),
      ).rejects.toBeInstanceOf(TRPCError);
      expect(await confirmedUserIds(db, m.matchId)).toEqual([m.a.id]);
    });
  });
});
