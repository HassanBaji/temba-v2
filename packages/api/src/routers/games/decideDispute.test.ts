import { TRPCError } from "@trpc/server";
import { and, eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import {
  MatchStatusEnum,
  groups,
  matchDisputes,
  matches,
  notifications,
  ratingEvents,
  ratings,
} from "@repo/db/schema";
import { createPgliteDb, type TestDatabase } from "@repo/db/testing";
import { muFromOvr, ovrFromMu } from "@repo/domain/football-ovr";
import { notificationCopy } from "@repo/domain/notification-copy";
import { messagesFor } from "@repo/i18n/messages";

import { createCaller } from "#src/root";
import { createTRPCContext } from "#src/trpc";
import { listNotifications } from "#src/routers/notifications/list";

import {
  addMember,
  footballGame,
  insertOperator,
  insertUser,
  playAndSettle,
  setUpMatch,
  type FootballFixture,
} from "#src/ratings/group-rated-match.test-support";
import { confirmMatchResult } from "#src/routers/games/confirmMatchResult";
import { decideDispute } from "#src/routers/games/decideDispute";
import { disputeMatchResult } from "#src/routers/games/disputeMatchResult";
import { listDisputesForOperator } from "#src/routers/games/listDisputesForOperator";

const en = messagesFor("en");

async function withDb(run: (db: TestDatabase) => Promise<void>) {
  const { db, close } = await createPgliteDb();
  try {
    await run(db);
  } finally {
    await close();
  }
}

async function confirmAll(
  db: TestDatabase,
  m: Awaited<ReturnType<typeof setUpMatch>>,
) {
  for (const player of [m.b, m.c, m.d]) {
    await confirmMatchResult(db, {
      gameId: m.gameId,
      matchId: m.matchId,
      userId: player.id,
    });
  }
}

async function countedPadelMatch(db: TestDatabase) {
  const m = await setUpMatch(db, { rated: true, groupRated: false });
  await confirmAll(db, m);
  return m;
}

async function matchStatus(db: TestDatabase, matchId: string) {
  const match = await db.query.matches.findFirst({
    where: eq(matches.id, matchId),
  });
  return match?.status;
}

async function disputeOf(db: TestDatabase, disputeId: string) {
  return db.query.matchDisputes.findFirst({
    where: eq(matchDisputes.id, disputeId),
  });
}

/** A Verified football Group on a Venue, so its Games count at weight 1. */
async function clubFootballGame(db: TestDatabase): Promise<FootballFixture> {
  const f = await footballGame(db, { verified: true });
  await db
    .update(groups)
    .set({ venueId: f.venueId })
    .where(eq(groups.id, f.groupId));
  return f;
}

async function setOvr(db: TestDatabase, userId: string, ovr: number) {
  await db
    .insert(ratings)
    .values({
      userId,
      sport: "football",
      mu: muFromOvr(ovr),
      phi: 150,
      sigma: 0.06,
      levelBand: "C1",
    })
    .onConflictDoUpdate({
      target: [ratings.userId, ratings.sport],
      set: { mu: muFromOvr(ovr), phi: 150 },
    });
}

async function ovrOf(db: TestDatabase, userId: string) {
  const row = await db.query.ratings.findFirst({
    where: and(eq(ratings.userId, userId), eq(ratings.sport, "football")),
  });
  return row ? ovrFromMu(row.mu) : null;
}

function callerFor(metadata: Record<string, unknown> | undefined) {
  return createCaller(() =>
    createTRPCContext({
      db: {} as Parameters<typeof createTRPCContext>[0]["db"],
      userId: "user_clerk",
      getPublicMetadata: async () => metadata,
      headers: new Headers(),
      webOrigin: "https://temba.example",
      locale: "en",
    }),
  );
}

function titleOf(copy: ReturnType<typeof notificationCopy>) {
  return copy?.title.map((part) => part.text).join("");
}

describe("Operator dispute doors", () => {
  it.each([undefined, {}, { operator: false }, { levelSetter: true }])(
    "refuse callers who are not Operators (%j)",
    async (metadata) => {
      const caller = callerFor(metadata);
      await expect(
        caller.games.decideDispute({
          disputeId: crypto.randomUUID(),
          upheld: true,
        }),
      ).rejects.toMatchObject({ code: "FORBIDDEN" });
      await expect(
        caller.games.listDisputesForOperator(),
      ).rejects.toMatchObject({ code: "FORBIDDEN" });
    },
  );
});

describe("games.decideDispute", () => {
  it("upholding a football dispute subtracts every OVR event of the Match and reopens it", async () => {
    await withDb(async (db) => {
      const f = await clubFootballGame(db);
      const a = await addMember(f, "a");
      const b = await addMember(f, "b");
      await setOvr(db, a, 70);
      await setOvr(db, b, 70);
      const matchId = await playAndSettle(f, [a], [b], { slot1: 1, slot2: 0 });
      const events = await db.query.ratingEvents.findMany({
        where: eq(ratingEvents.matchId, matchId),
      });
      expect(events.map((event) => event.userId).sort()).toEqual([a, b].sort());
      expect(await ovrOf(db, a)).toBeGreaterThan(70);

      const operator = await insertOperator(db, "operator");
      const { disputeId } = await disputeMatchResult(db, {
        matchId,
        userId: b,
        note: "It was 0–1",
      });

      const result = await decideDispute(db, {
        disputeId,
        upheld: true,
        operatorUserId: operator.id,
      });
      expect(result).toEqual({ disputeId, status: "upheld" });

      expect(
        await db.query.ratingEvents.findMany({
          where: eq(ratingEvents.matchId, matchId),
        }),
      ).toHaveLength(0);
      expect(await ovrOf(db, a)).toBeCloseTo(70);
      expect(await ovrOf(db, b)).toBeCloseTo(70);
      expect(await matchStatus(db, matchId)).toBe(MatchStatusEnum.PENDING);
      expect(await disputeOf(db, disputeId)).toMatchObject({
        status: "upheld",
        decidedByUserId: operator.id,
      });

      const decided = await db.query.notifications.findMany({
        where: eq(notifications.type, "match_dispute_decided"),
      });
      expect(
        decided.map((row) => [row.recipientUserId, row.audience]).sort(),
      ).toEqual(
        [
          [b, "player"],
          [f.organizerId, "admin"],
        ].sort(),
      );
      expect(decided[0]).toMatchObject({
        actorUserId: b,
        gameId: f.gameId,
        matchDisputeId: disputeId,
      });
    });
  });

  it("upholding a padel dispute restores the Ratings and returns the Match to pending", async () => {
    await withDb(async (db) => {
      const m = await countedPadelMatch(db);
      const before = await db.query.ratingEvents.findMany({
        where: eq(ratingEvents.matchId, m.matchId),
      });
      expect(before).toHaveLength(4);
      const operator = await insertOperator(db, "operator");
      const { disputeId } = await disputeMatchResult(db, {
        matchId: m.matchId,
        userId: m.c.id,
        note: "Wrong",
      });

      await decideDispute(db, {
        disputeId,
        upheld: true,
        operatorUserId: operator.id,
      });

      expect(
        await db.query.ratingEvents.findMany({
          where: eq(ratingEvents.matchId, m.matchId),
        }),
      ).toHaveLength(0);
      for (const event of before) {
        const row = await db.query.ratings.findFirst({
          where: and(
            eq(ratings.userId, event.userId),
            eq(ratings.sport, event.sport),
          ),
        });
        expect(row?.mu).toBeCloseTo(event.muBefore);
      }
      expect(await matchStatus(db, m.matchId)).toBe(MatchStatusEnum.PENDING);
      expect((await disputeOf(db, disputeId))?.status).toBe("upheld");
    });
  });

  it("refuses to uphold a padel dispute after a later Rated Match, says why, and keeps it open", async () => {
    await withDb(async (db) => {
      const first = await countedPadelMatch(db);
      const operator = await insertOperator(db, "operator");
      const { disputeId } = await disputeMatchResult(db, {
        matchId: first.matchId,
        userId: first.c.id,
        note: "Wrong",
      });
      const later = await setUpMatch(
        db,
        { rated: true, groupRated: false },
        {
          players: [first.a, first.b, first.c, first.d],
          groupId: first.groupId,
          venueId: first.venueId,
        },
      );
      await confirmAll(db, later);

      const listed = await listDisputesForOperator(db);
      expect(listed.items).toHaveLength(1);
      expect(listed.items[0]?.cannotReverseReason).toBe(
        en.game.errors.laterRatedMatch,
      );

      const error = await decideDispute(db, {
        disputeId,
        upheld: true,
        operatorUserId: operator.id,
      }).catch((caught: unknown) => caught);
      expect(error).toBeInstanceOf(TRPCError);
      expect((error as TRPCError).code).toBe("CONFLICT");
      expect((error as TRPCError).message).toBe(en.game.errors.laterRatedMatch);

      expect(await matchStatus(db, first.matchId)).toBe(
        MatchStatusEnum.COMPLETED,
      );
      expect((await disputeOf(db, disputeId))?.status).toBe("open");
      expect(
        await db.query.ratingEvents.findMany({
          where: eq(ratingEvents.matchId, first.matchId),
        }),
      ).toHaveLength(4);
      expect(
        await db.query.notifications.findMany({
          where: eq(notifications.type, "match_dispute_decided"),
        }),
      ).toHaveLength(0);
    });
  });

  it("dismissing leaves the result, closes the dispute and tells the player and Organizers", async () => {
    await withDb(async (db) => {
      const m = await countedPadelMatch(db);
      const operator = await insertOperator(db, "operator");
      const { disputeId } = await disputeMatchResult(db, {
        matchId: m.matchId,
        userId: m.c.id,
        note: "Wrong",
      });

      await decideDispute(db, {
        disputeId,
        upheld: false,
        operatorUserId: operator.id,
      });

      expect(await matchStatus(db, m.matchId)).toBe(MatchStatusEnum.COMPLETED);
      expect(
        await db.query.ratingEvents.findMany({
          where: eq(ratingEvents.matchId, m.matchId),
        }),
      ).toHaveLength(4);
      expect(await disputeOf(db, disputeId)).toMatchObject({
        status: "dismissed",
        decidedByUserId: operator.id,
      });
      const decided = await db.query.notifications.findMany({
        where: eq(notifications.type, "match_dispute_decided"),
      });
      expect(
        decided.map((row) => [row.recipientUserId, row.audience]).sort(),
      ).toEqual(
        [
          [m.c.id, "player"],
          [m.a.id, "admin"],
        ].sort(),
      );
      expect((await listDisputesForOperator(db)).items).toHaveLength(0);

      const [raised] = (await listNotifications(db, { userId: operator.id }))
        .items;
      expect(titleOf(notificationCopy(raised!, "en"))).toMatch(
        /^c disputed the result of /,
      );
      expect(notificationCopy(raised!, "en")?.subline).toBe("Wrong");
      const [toPlayer] = (await listNotifications(db, { userId: m.c.id }))
        .items;
      expect(titleOf(notificationCopy(toPlayer!, "en"))).toMatch(
        /^Temba dismissed your dispute on /,
      );
      expect(notificationCopy(toPlayer!, "en")?.subline).toBe(
        en.notification.subline.disputeDismissed,
      );
      const [toOrganizer] = (await listNotifications(db, { userId: m.a.id }))
        .items;
      expect(titleOf(notificationCopy(toOrganizer!, "en"))).toMatch(
        /^Temba dismissed c’s dispute on /,
      );

      const again = await decideDispute(db, {
        disputeId,
        upheld: true,
        operatorUserId: operator.id,
      }).catch((caught: unknown) => caught);
      expect((again as TRPCError).message).toBe(
        en.rating.dispute.errors.decided,
      );

      await disputeMatchResult(db, {
        matchId: m.matchId,
        userId: m.d.id,
        note: "Still wrong",
      });
      expect((await listDisputesForOperator(db)).items).toHaveLength(1);
    });
  });
});

describe("games.listDisputesForOperator", () => {
  it("lists open disputes oldest first, with who raised them and on which Game", async () => {
    await withDb(async (db) => {
      const first = await countedPadelMatch(db);
      const others = await Promise.all(
        ["e", "f", "g", "h"].map((label) => insertUser(db, label)),
      );
      const second = await setUpMatch(
        db,
        { rated: true, groupRated: false },
        {
          players: others as [
            (typeof others)[number],
            (typeof others)[number],
            (typeof others)[number],
            (typeof others)[number],
          ],
          groupId: first.groupId,
          venueId: first.venueId,
        },
      );
      await confirmAll(db, second);
      await disputeMatchResult(db, {
        matchId: first.matchId,
        userId: first.c.id,
        note: "First",
        now: new Date(Date.now() - 60 * 1000),
      });
      await disputeMatchResult(db, {
        matchId: second.matchId,
        userId: second.b.id,
        note: "Second",
      });

      const { items } = await listDisputesForOperator(db);
      expect(items.map((item) => item.note)).toEqual(["First", "Second"]);
      expect(items[0]).toMatchObject({
        raisedBy: { id: first.c.id, name: "c" },
        game: { id: first.gameId, format: "friendly_game" },
        match: { id: first.matchId, completed: true },
        cannotReverseReason: null,
      });
    });
  });
});
