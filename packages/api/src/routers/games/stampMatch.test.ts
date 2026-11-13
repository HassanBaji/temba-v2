import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import {
  MatchStatusEnum,
  games,
  matches,
  matchVerifierStamps,
  ratingEvents,
  user,
  venueVerifiers,
  venues,
} from "@repo/db/schema";
import { createPgliteDb, type TestDatabase } from "@repo/db/testing";
import { messagesFor } from "@repo/i18n/messages";

import { recordJobs } from "#src/jobs/job-sink.test-support";
import { confirmWindowJobKey } from "#src/jobs/specs";
import { gameById } from "#src/routers/games/byId";
import { confirmMatchResult } from "#src/routers/games/confirmMatchResult";
import { seatedPublicGame } from "#src/routers/games/public-game.test-support";
import { reportWrongScore } from "#src/routers/games/reportWrongScore";
import { scoreSet } from "#src/routers/games/scoreSet";
import { stampMatch } from "#src/routers/games/stampMatch";

const stampErrors = messagesFor("en").rating.verifier.stamp.errors;

async function withDb(run: (db: TestDatabase) => Promise<void>) {
  const { db, close } = await createPgliteDb();
  try {
    await run(db);
  } finally {
    await close();
  }
}

async function insertUser(db: TestDatabase, name: string) {
  const [row] = await db
    .insert(user)
    .values({ name, email: `${name}-${crypto.randomUUID()}@example.com` })
    .returning({ id: user.id });
  return row!.id;
}

async function gameVenueId(db: TestDatabase, gameId: string) {
  const game = await db.query.games.findFirst({
    where: eq(games.id, gameId),
    columns: { venueId: true },
  });
  return game!.venueId!;
}

async function grantVerifier(
  db: TestDatabase,
  venueId: string,
  userId: string,
) {
  await db.insert(venueVerifiers).values({ venueId, userId, kind: "referee" });
}

async function verifierAt(db: TestDatabase, venueId: string, name = "Sara") {
  const userId = await insertUser(db, name);
  await grantVerifier(db, venueId, userId);
  return userId;
}

/** The creator enters 6-3, which confirms their side only. */
async function enteredPublicGame(db: TestDatabase) {
  const g = await seatedPublicGame(db);
  await scoreSet(db, {
    gameId: g.gameId,
    matchId: g.matchId,
    setId: g.setId,
    userId: g.creator,
    slot1GamesWon: 6,
    slot2GamesWon: 3,
  });
  return { ...g, venueId: await gameVenueId(db, g.gameId) };
}

async function matchRow(db: TestDatabase, matchId: string) {
  return db.query.matches.findFirst({ where: eq(matches.id, matchId) });
}

async function eventsOf(db: TestDatabase, matchId: string) {
  return db.query.ratingEvents.findMany({
    where: eq(ratingEvents.matchId, matchId),
  });
}

describe("games.stampMatch (ADR-0072)", () => {
  const jobs = recordJobs();

  it("completes a Public Game Match only one side confirmed, and it counts", async () => {
    await withDb(async (db) => {
      const g = await enteredPublicGame(db);
      const verifier = await verifierAt(db, g.venueId);
      expect((await matchRow(db, g.matchId))?.status).toBe(
        MatchStatusEnum.PENDING,
      );

      const before = await gameById(db, { gameId: g.gameId, userId: verifier });
      expect(before.matches[0]?.canStamp).toBe(true);
      expect(before.matches[0]?.stamp).toBeNull();

      await stampMatch(db, { matchId: g.matchId, userId: verifier });

      const match = await matchRow(db, g.matchId);
      expect(match?.status).toBe(MatchStatusEnum.COMPLETED);
      expect(match?.stoodUnconfirmedAt).toBeNull();
      const events = await eventsOf(db, g.matchId);
      expect(events.map((event) => event.userId).sort()).toEqual(
        [g.creator, g.b, g.c, g.d].sort(),
      );
      expect(jobs.removed).toContain(confirmWindowJobKey(g.matchId));

      const stamp = await db.query.matchVerifierStamps.findFirst({
        where: eq(matchVerifierStamps.matchId, g.matchId),
      });
      expect(stamp).toMatchObject({
        verifierUserId: verifier,
        venueId: g.venueId,
      });

      const forPlayer = await gameById(db, { gameId: g.gameId, userId: g.c });
      expect(forPlayer.matches[0]?.stamp).toMatchObject({
        verifierUserId: verifier,
        verifierName: "Sara",
      });
      expect(forPlayer.matches[0]?.stoodUnconfirmed).toBe(false);
      expect(forPlayer.matches[0]?.canStamp).toBe(false);
      expect(forPlayer.confirmWindow).toBeNull();
      const after = await gameById(db, { gameId: g.gameId, userId: verifier });
      expect(after.matches[0]?.canStamp).toBe(false);
    });
  });

  it("does not change the Match's weight", async () => {
    let confirmed: Awaited<ReturnType<typeof eventsOf>> = [];
    let stamped: Awaited<ReturnType<typeof eventsOf>> = [];
    const delta = (event: (typeof confirmed)[number]) =>
      event.muAfter - event.muBefore;
    const ordered = (
      events: typeof confirmed,
      g: Awaited<ReturnType<typeof enteredPublicGame>>,
    ) =>
      [g.creator, g.b, g.c, g.d].map(
        (userId) => events.find((event) => event.userId === userId)!,
      );

    await withDb(async (db) => {
      const g = await enteredPublicGame(db);
      await confirmMatchResult(db, {
        gameId: g.gameId,
        matchId: g.matchId,
        userId: g.c,
      });
      confirmed = ordered(await eventsOf(db, g.matchId), g);
    });
    await withDb(async (db) => {
      const g = await enteredPublicGame(db);
      const verifier = await verifierAt(db, g.venueId);
      await stampMatch(db, { matchId: g.matchId, userId: verifier });
      stamped = ordered(await eventsOf(db, g.matchId), g);
    });

    expect(stamped).toHaveLength(4);
    expect(stamped.map((event) => event.weight)).toEqual(
      confirmed.map((event) => event.weight),
    );
    expect(stamped.every((event) => event.weight === 1)).toBe(true);
    expect(stamped.map(delta)).toEqual(confirmed.map(delta));
  });

  it("refuses a Verifier seated in the Match", async () => {
    await withDb(async (db) => {
      const g = await enteredPublicGame(db);
      await grantVerifier(db, g.venueId, g.c);

      const details = await gameById(db, { gameId: g.gameId, userId: g.c });
      expect(details.matches[0]?.canStamp).toBe(false);
      await expect(
        stampMatch(db, { matchId: g.matchId, userId: g.c }),
      ).rejects.toMatchObject({
        code: "FORBIDDEN",
        message: stampErrors.seated,
      } satisfies Partial<TRPCError>);
      expect((await matchRow(db, g.matchId))?.status).toBe(
        MatchStatusEnum.PENDING,
      );
    });
  });

  it("refuses a Verifier of another Venue, and a User who is no Verifier", async () => {
    await withDb(async (db) => {
      const g = await enteredPublicGame(db);
      const [elsewhere] = await db
        .insert(venues)
        .values({ name: "Elsewhere", city: "Manama", country: "BH" })
        .returning({ id: venues.id });
      const otherVerifier = await verifierAt(db, elsewhere!.id);
      const outsider = await insertUser(db, "outsider");

      for (const userId of [otherVerifier, outsider]) {
        await expect(
          stampMatch(db, { matchId: g.matchId, userId }),
        ).rejects.toMatchObject({
          code: "FORBIDDEN",
          message: stampErrors.notVerifier,
        } satisfies Partial<TRPCError>);
      }
      expect((await matchRow(db, g.matchId))?.status).toBe(
        MatchStatusEnum.PENDING,
      );
      expect(await eventsOf(db, g.matchId)).toHaveLength(0);
    });
  });

  it("needs an entered score", async () => {
    await withDb(async (db) => {
      const g = await seatedPublicGame(db);
      const verifier = await verifierAt(db, await gameVenueId(db, g.gameId));

      const details = await gameById(db, {
        gameId: g.gameId,
        userId: verifier,
      });
      expect(details.matches[0]?.canStamp).toBe(false);
      await expect(
        stampMatch(db, { matchId: g.matchId, userId: verifier }),
      ).rejects.toMatchObject({
        code: "FORBIDDEN",
        message: messagesFor("en").game.errors.noResultToConfirm,
      } satisfies Partial<TRPCError>);
    });
  });

  it("changes nothing on a repeat, and refuses a second Verifier once completed", async () => {
    await withDb(async (db) => {
      const g = await enteredPublicGame(db);
      const verifier = await verifierAt(db, g.venueId);
      const second = await verifierAt(db, g.venueId, "Omar");
      await stampMatch(db, { matchId: g.matchId, userId: verifier });

      await expect(
        stampMatch(db, { matchId: g.matchId, userId: verifier }),
      ).resolves.toEqual({ ok: true });
      await expect(
        stampMatch(db, { matchId: g.matchId, userId: second }),
      ).rejects.toMatchObject({
        code: "BAD_REQUEST",
        message: messagesFor("en").game.errors.matchCompleted,
      } satisfies Partial<TRPCError>);
      expect(await eventsOf(db, g.matchId)).toHaveLength(4);
    });
  });

  it("lets a stamp after the 24 hours stand without counting", async () => {
    await withDb(async (db) => {
      const g = await enteredPublicGame(db);
      const verifier = await verifierAt(db, g.venueId);
      const late = new Date(Date.now() + 25 * 60 * 60 * 1000);

      await stampMatch(db, { matchId: g.matchId, userId: verifier, now: late });

      const match = await matchRow(db, g.matchId);
      expect(match?.status).toBe(MatchStatusEnum.COMPLETED);
      expect(match?.stoodUnconfirmedAt).not.toBeNull();
      expect(await eventsOf(db, g.matchId)).toHaveLength(0);
      expect(
        await db.query.matchVerifierStamps.findFirst({
          where: eq(matchVerifierStamps.matchId, g.matchId),
        }),
      ).toBeUndefined();
    });
  });

  it("goes when a wrong score is reported, so the corrected score needs agreeing again", async () => {
    await withDb(async (db) => {
      const g = await enteredPublicGame(db);
      const verifier = await verifierAt(db, g.venueId);
      await stampMatch(db, { matchId: g.matchId, userId: verifier });

      await reportWrongScore(db, {
        gameId: g.gameId,
        matchId: g.matchId,
        userId: g.creator,
      });

      expect((await matchRow(db, g.matchId))?.status).toBe(
        MatchStatusEnum.PENDING,
      );
      expect(
        await db.query.matchVerifierStamps.findFirst({
          where: eq(matchVerifierStamps.matchId, g.matchId),
        }),
      ).toBeUndefined();
      const details = await gameById(db, { gameId: g.gameId, userId: g.c });
      expect(details.matches[0]?.stamp).toBeNull();
    });
  });
});
