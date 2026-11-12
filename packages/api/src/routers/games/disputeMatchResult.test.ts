import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import {
  MatchStatusEnum,
  matchDisputes,
  matches,
  notifications,
} from "@repo/db/schema";
import { createPgliteDb, type TestDatabase } from "@repo/db/testing";
import { messagesFor } from "@repo/i18n/messages";

import {
  addMember,
  footballGame,
  insertUser,
  playScore,
  setUpMatch,
} from "#src/ratings/group-rated-match.test-support";
import { gameById } from "#src/routers/games/byId";
import { confirmMatchResult } from "#src/routers/games/confirmMatchResult";
import { disputeMatchResult } from "#src/routers/games/disputeMatchResult";

const errors = messagesFor("en").rating.dispute.errors;
const DAY = 24 * 60 * 60 * 1000;

async function withDb(run: (db: TestDatabase) => Promise<void>) {
  const { db, close } = await createPgliteDb();
  try {
    await run(db);
  } finally {
    await close();
  }
}

/** A padel Match on a Game that counts for Temba Level, confirmed by all four. */
async function countedPadelMatch(
  db: TestDatabase,
  flags = { rated: true, groupRated: false },
) {
  const m = await setUpMatch(db, flags);
  for (const player of [m.b, m.c, m.d]) {
    await confirmMatchResult(db, {
      gameId: m.gameId,
      matchId: m.matchId,
      userId: player.id,
    });
  }
  const match = await db.query.matches.findFirst({
    where: eq(matches.id, m.matchId),
  });
  expect(match?.status).toBe(MatchStatusEnum.COMPLETED);
  return { ...m, completedAt: match!.completedAt! };
}

async function refusal(promise: Promise<unknown>) {
  const error = await promise.catch((caught: unknown) => caught);
  expect(error).toBeInstanceOf(TRPCError);
  return error as TRPCError;
}

describe("games.disputeMatchResult", () => {
  it("opens a dispute for a seated player and tells every Operator", async () => {
    await withDb(async (db) => {
      const m = await countedPadelMatch(db);
      const operator = await insertUser(db, "operator");

      const before = await gameById(db, { gameId: m.gameId, userId: m.c.id });
      expect(before.matches[0]?.canDispute).toBe(true);
      expect(before.matches[0]?.openDispute).toBeNull();

      const { disputeId } = await disputeMatchResult(db, {
        matchId: m.matchId,
        userId: m.c.id,
        note: "  It was 6–4, not 6–2  ",
        operatorUserIds: [operator.id, m.c.id],
      });

      const dispute = await db.query.matchDisputes.findFirst({
        where: eq(matchDisputes.id, disputeId),
      });
      expect(dispute).toMatchObject({
        matchId: m.matchId,
        raisedByUserId: m.c.id,
        note: "It was 6–4, not 6–2",
        status: "open",
        decidedByUserId: null,
      });

      const rows = await db.query.notifications.findMany({
        where: eq(notifications.type, "match_dispute_raised"),
      });
      expect(rows).toHaveLength(1);
      expect(rows[0]).toMatchObject({
        recipientUserId: operator.id,
        audience: "admin",
        actorUserId: m.c.id,
        gameId: m.gameId,
        matchDisputeId: disputeId,
      });

      const forRaiser = await gameById(db, {
        gameId: m.gameId,
        userId: m.c.id,
      });
      expect(forRaiser.matches[0]?.canDispute).toBe(false);
      expect(forRaiser.matches[0]?.openDispute).toMatchObject({
        raisedByViewer: true,
      });
      const forPartner = await gameById(db, {
        gameId: m.gameId,
        userId: m.d.id,
      });
      expect(forPartner.matches[0]?.canDispute).toBe(false);
      expect(forPartner.matches[0]?.openDispute).toMatchObject({
        raisedByViewer: false,
      });
    });
  });

  it("refuses a player not seated in the Match", async () => {
    await withDb(async (db) => {
      const m = await countedPadelMatch(db);
      const outsider = await insertUser(db, "outsider");

      const error = await refusal(
        disputeMatchResult(db, {
          matchId: m.matchId,
          userId: outsider.id,
          note: "Wrong",
          operatorUserIds: [],
        }),
      );
      expect(error.code).toBe("FORBIDDEN");
      expect(error.message).toBe(errors.notSeated);
      expect(await db.query.matchDisputes.findMany()).toHaveLength(0);

      const view = await gameById(db, {
        gameId: m.gameId,
        userId: m.a.id,
      });
      expect(view.matches[0]?.canDispute).toBe(true);
    });
  });

  it("refuses a Match on an Unrated Game", async () => {
    await withDb(async (db) => {
      const m = await countedPadelMatch(db, {
        rated: false,
        groupRated: false,
      });

      const error = await refusal(
        disputeMatchResult(db, {
          matchId: m.matchId,
          userId: m.b.id,
          note: "Wrong",
          operatorUserIds: [],
        }),
      );
      expect(error.code).toBe("PRECONDITION_FAILED");
      expect(error.message).toBe(errors.notCounted);
      const view = await gameById(db, { gameId: m.gameId, userId: m.b.id });
      expect(view.matches[0]?.canDispute).toBe(false);
    });
  });

  it("refuses a Match on a tier Game", async () => {
    await withDb(async (db) => {
      const f = await footballGame(db);
      const a = await addMember(f, "a");
      const b = await addMember(f, "b");
      const matchId = await playScore(f, [a], [b], { slot1: 1, slot2: 0 });

      const error = await refusal(
        disputeMatchResult(db, {
          matchId,
          userId: a,
          note: "Wrong",
          operatorUserIds: [],
        }),
      );
      expect(error.code).toBe("PRECONDITION_FAILED");
      expect(error.message).toBe(errors.notCounted);
    });
  });

  it("refuses a score that stood without the other side, which never counted", async () => {
    await withDb(async (db) => {
      const m = await countedPadelMatch(db);
      await db
        .update(matches)
        .set({ stoodUnconfirmedAt: m.completedAt })
        .where(eq(matches.id, m.matchId));

      const error = await refusal(
        disputeMatchResult(db, {
          matchId: m.matchId,
          userId: m.c.id,
          note: "Wrong",
          operatorUserIds: [],
        }),
      );
      expect(error.code).toBe("PRECONDITION_FAILED");
      expect(error.message).toBe(errors.notCounted);
    });
  });

  it("refuses a second open dispute on the same Match", async () => {
    await withDb(async (db) => {
      const m = await countedPadelMatch(db);
      await disputeMatchResult(db, {
        matchId: m.matchId,
        userId: m.c.id,
        note: "Wrong",
        operatorUserIds: [],
      });

      for (const userId of [m.c.id, m.d.id]) {
        const error = await refusal(
          disputeMatchResult(db, {
            matchId: m.matchId,
            userId,
            note: "Also wrong",
            operatorUserIds: [],
          }),
        );
        expect(error.code).toBe("CONFLICT");
        expect(error.message).toBe(errors.alreadyOpen);
      }
      expect(await db.query.matchDisputes.findMany()).toHaveLength(1);
    });
  });

  it("refuses a dispute more than seven days after completion", async () => {
    await withDb(async (db) => {
      const m = await countedPadelMatch(db);

      const error = await refusal(
        disputeMatchResult(db, {
          matchId: m.matchId,
          userId: m.c.id,
          note: "Wrong",
          operatorUserIds: [],
          now: new Date(m.completedAt.getTime() + 7 * DAY + 1000),
        }),
      );
      expect(error.code).toBe("BAD_REQUEST");
      expect(error.message).toBe(errors.tooLate(7));

      await disputeMatchResult(db, {
        matchId: m.matchId,
        userId: m.c.id,
        note: "Wrong",
        operatorUserIds: [],
        now: new Date(m.completedAt.getTime() + 7 * DAY - 1000),
      });
    });
  });

  it("refuses a Match that has not completed, and an empty note", async () => {
    await withDb(async (db) => {
      const m = await setUpMatch(db, { rated: true, groupRated: false });

      const pending = await refusal(
        disputeMatchResult(db, {
          matchId: m.matchId,
          userId: m.b.id,
          note: "Wrong",
          operatorUserIds: [],
        }),
      );
      expect(pending.message).toBe(errors.notCompleted);

      const empty = await refusal(
        disputeMatchResult(db, {
          matchId: m.matchId,
          userId: m.b.id,
          note: "   ",
          operatorUserIds: [],
        }),
      );
      expect(empty.message).toBe(errors.note);
    });
  });
});
