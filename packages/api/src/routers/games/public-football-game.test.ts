import { TRPCError } from "@trpc/server";
import { and, eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import type { Db } from "@repo/db";
import {
  MatchStatusEnum,
  courts,
  games,
  groupTierEvents,
  matchRatingWindows,
  matchResultConfirmations,
  matches,
  notifications,
  ratingEvents,
  ratings,
  venues,
} from "@repo/db/schema";
import { createPgliteDb, type TestDatabase } from "@repo/db/testing";
import { muFromOvr } from "@repo/domain/football-ovr";
import { INITIAL_SIGMA, muFromLevel } from "@repo/domain/level";
import { messagesFor } from "@repo/i18n/messages";

import {
  PUBLIC_GAME_CONFIRM_WINDOW_MS,
  publicGameConfirmWindowClosesAt,
} from "#src/games/match-result-confirmations";
import { handle as standUnconfirmed } from "#src/jobs/handlers/match.confirm-window";
import { recordJobs } from "#src/jobs/job-sink.test-support";
import { confirmWindowJobKey } from "#src/jobs/specs";
import {
  closeRatingWindow,
  insertUser,
} from "#src/ratings/group-rated-match.test-support";
import { gameById } from "#src/routers/games/byId";
import { confirmMatchResult } from "#src/routers/games/confirmMatchResult";
import { createGame, createGameInputSchema } from "#src/routers/games/create";
import { listCreateVenuesForUser } from "#src/routers/games/listCreateVenues";
import { listPublicHubRows } from "#src/routers/games/listPublicPickup";
import { publishFootballTeams } from "#src/routers/games/publishFootballTeams";
import { register } from "#src/routers/games/register";
import { reportWrongScore } from "#src/routers/games/reportWrongScore";
import { saveFootballScore } from "#src/routers/games/saveFootballScore";

const HOUR = 60 * 60 * 1000;
const errors = messagesFor("en").game.errors;

type ApiDb = Parameters<typeof createGame>[0];

function apiDb(database: TestDatabase) {
  return database as unknown as ApiDb;
}

async function withDb(run: (db: TestDatabase) => Promise<void>) {
  const { db, close } = await createPgliteDb();
  try {
    await run(db);
  } finally {
    await close();
  }
}

async function insertVenue(
  db: TestDatabase,
  args: { partner: boolean; sport: "padel" | "football" },
) {
  const [venue] = await db
    .insert(venues)
    .values({
      name: `Venue ${crypto.randomUUID()}`,
      city: "Manama",
      country: "BH",
      partnerAt: args.partner ? new Date("2026-11-01T10:00:00.000Z") : null,
    })
    .returning({ id: venues.id });
  const [court] = await db
    .insert(courts)
    .values({ venueId: venue!.id, name: "Pitch 1", sport: args.sport })
    .returning({ id: courts.id });
  return { id: venue!.id, pitchId: court!.id };
}

async function setRating(
  db: TestDatabase,
  userId: string,
  sport: "padel" | "football",
  mu: number,
) {
  await db.insert(ratings).values({
    userId,
    sport,
    mu,
    phi: 150,
    sigma: INITIAL_SIGMA,
    levelBand: "C1",
  });
}

function publicFootballInput(createdBy: string, venueId: string) {
  const kickoff = new Date(Date.now() + HOUR);
  return {
    createdBy,
    isPublic: true,
    sport: "football" as const,
    format: "friendly_game" as const,
    registrationMode: "individual" as const,
    venueId,
    windowStart: kickoff,
    windowEnd: new Date(kickoff.getTime() + HOUR),
  };
}

/** A football Public Game with two sides of two published, kicked off an hour ago. */
async function playedPublicFootballGame(db: TestDatabase) {
  const creator = await insertUser(db, "creator");
  const venue = await insertVenue(db, { partner: true, sport: "football" });
  const input = publicFootballInput(creator.id, venue.id);
  const created = await createGame(apiDb(db), {
    ...input,
    courtId: venue.pitchId,
  });
  const [b, c, d] = await Promise.all(
    ["b", "c", "d"].map((label) => insertUser(db, label)),
  );
  const slot1 = [creator.id, b!.id];
  const slot2 = [c!.id, d!.id];
  for (const userId of [...slot1, ...slot2]) {
    await setRating(db, userId, "football", muFromOvr(70));
    await register(apiDb(db), { gameId: created.id, userId });
  }
  await publishFootballTeams(apiDb(db), {
    gameId: created.id,
    userId: creator.id,
    method: "manual",
    bibs: { slot1: "black", slot2: "white" },
    slot1,
    slot2,
  });
  const match = await db.query.matches.findFirst({
    where: eq(matches.gameId, created.id),
  });
  return {
    gameId: created.id,
    matchId: match!.id,
    afterKickoff: new Date(input.windowStart.getTime() + 2 * HOUR),
    creator: creator.id,
    b: b!.id,
    c: c!.id,
    d: d!.id,
  };
}

describe("Football Public Game create (ADR-0071)", () => {
  it("creates a groupless football Public Game that counts for Temba Level, with its side size and OVR range", async () => {
    await withDb(async (db) => {
      const creator = await insertUser(db, "creator");
      const venue = await insertVenue(db, { partner: true, sport: "football" });
      const created = await createGame(apiDb(db), {
        ...publicFootballInput(creator.id, venue.id),
        courtId: venue.pitchId,
        sideSize: 7,
        playersAllowed: 16,
        levelMinTenths: 35,
        levelMaxTenths: 56,
      });

      const row = await db.query.games.findFirst({
        where: eq(games.id, created.id),
      });
      expect(row).toMatchObject({
        groupId: null,
        isPublic: true,
        sport: "football",
        format: "friendly_game",
        sideSize: 7,
        playersAllowed: 16,
        rated: true,
        groupRated: false,
        levelMinTenths: 35,
        levelMaxTenths: 56,
      });
    });
  });

  it("keeps the usual side size when none is given", async () => {
    await withDb(async (db) => {
      const creator = await insertUser(db, "creator");
      const venue = await insertVenue(db, { partner: true, sport: "football" });
      const created = await createGame(
        apiDb(db),
        publicFootballInput(creator.id, venue.id),
      );
      const row = await db.query.games.findFirst({
        where: eq(games.id, created.id),
      });
      expect(row).toMatchObject({ sideSize: 5, playersAllowed: 10 });
    });
  });

  it("refuses a partner Venue with no football pitch, and a Venue that is not a partner", async () => {
    await withDb(async (db) => {
      const creator = await insertUser(db, "creator");
      const padel = await insertVenue(db, { partner: true, sport: "padel" });
      const plain = await insertVenue(db, {
        partner: false,
        sport: "football",
      });
      await expect(
        createGame(apiDb(db), publicFootballInput(creator.id, padel.id)),
      ).rejects.toMatchObject({
        code: "BAD_REQUEST",
        message: errors.publicGameFootballVenue,
      } satisfies Partial<TRPCError>);
      await expect(
        createGame(apiDb(db), publicFootballInput(creator.id, plain.id)),
      ).rejects.toMatchObject({
        code: "FORBIDDEN",
        message: errors.publicGamePartnerVenue,
      } satisfies Partial<TRPCError>);
      expect(await db.query.games.findMany()).toHaveLength(0);
    });
  });

  it("takes a sport only for a Public Game", () => {
    const parsed = createGameInputSchema.safeParse({
      ...publicFootballInput(crypto.randomUUID(), crypto.randomUUID()),
      groupId: crypto.randomUUID(),
      isPublic: false,
    });
    expect(parsed.success).toBe(false);
    expect(
      parsed.success ? undefined : parsed.error.flatten().fieldErrors.sport,
    ).toEqual([errors.publicGameSportOnly]);
  });

  it("lists only partner Venues with a football pitch for a football Public Game", async () => {
    await withDb(async (db) => {
      const creator = await insertUser(db, "creator");
      const football = await insertVenue(db, {
        partner: true,
        sport: "football",
      });
      await insertVenue(db, { partner: true, sport: "padel" });
      await insertVenue(db, { partner: false, sport: "football" });
      const picker = await listCreateVenuesForUser(db, {
        userId: creator.id,
        publicGame: true,
        sport: "football",
      });
      expect(picker.venues.map((venue) => venue.id)).toEqual([football.id]);
      expect(picker.venues[0]?.courts.map((court) => court.id)).toEqual([
        football.pitchId,
      ]);
    });
  });
});

describe("Football Public Game join", () => {
  it("lists the Game under Public, lets a player inside the OVR range join with no Group, and keeps out a player with no football Rating", async () => {
    await withDb(async (db) => {
      const creator = await insertUser(db, "creator");
      const inside = await insertUser(db, "inside");
      const padelOnly = await insertUser(db, "padel-only");
      await setRating(db, inside.id, "football", muFromOvr(75));
      await setRating(db, padelOnly.id, "padel", muFromLevel(4.5));
      const venue = await insertVenue(db, { partner: true, sport: "football" });
      const created = await createGame(apiDb(db), {
        ...publicFootballInput(creator.id, venue.id),
        levelMinTenths: 35,
        levelMaxTenths: 56,
      });

      const listed = (await listPublicHubRows(db, padelOnly.id)).find(
        (row) => row.id === created.id,
      );
      expect(listed).toMatchObject({
        sport: "football",
        groupId: null,
        canRegister: false,
        canWaitlist: false,
      });
      expect(listed?.football).not.toBeNull();
      const detail = await gameById(db, {
        gameId: created.id,
        userId: padelOnly.id,
      });
      expect(detail).toMatchObject({
        canRegister: false,
        viewerLevelTenths: null,
        viewerPassesLevelRange: false,
        canRequestLevelRange: true,
      });
      await expect(
        register(apiDb(db), { gameId: created.id, userId: padelOnly.id }),
      ).rejects.toMatchObject({
        code: "FORBIDDEN",
        message: messagesFor("en").level.rangeOutside,
      } satisfies Partial<TRPCError>);

      expect(
        (await listPublicHubRows(db, inside.id)).find(
          (row) => row.id === created.id,
        ),
      ).toMatchObject({ canRegister: true });
      await register(apiDb(db), { gameId: created.id, userId: inside.id });
      expect(await db.query.groupMembers.findMany()).toHaveLength(0);
    });
  });
});

describe("Football Public Game score (ADR-0071)", () => {
  const jobs = recordJobs();

  it("counts for Temba Level once a player from each side confirms, opening the Rating window and writing no tier event", async () => {
    await withDb(async (db) => {
      const g = await playedPublicFootballGame(db);
      await saveFootballScore(
        apiDb(db),
        {
          gameId: g.gameId,
          userId: g.creator,
          slot1Goals: 3,
          slot2Goals: 1,
          scorers: [],
        },
        g.afterKickoff,
      );
      await confirmMatchResult(apiDb(db), {
        gameId: g.gameId,
        matchId: g.matchId,
        userId: g.b,
      });
      let match = await db.query.matches.findFirst({
        where: eq(matches.id, g.matchId),
      });
      expect(match?.status).toBe(MatchStatusEnum.PENDING);
      expect(
        jobs.added.find((job) => job.key === confirmWindowJobKey(g.matchId)),
      ).toMatchObject({ name: "match.confirm-window" });
      const asked = await db.query.notifications.findMany({
        where: and(
          eq(notifications.gameId, g.gameId),
          eq(notifications.type, "match_score_to_confirm"),
        ),
      });
      expect(asked.map((row) => row.recipientUserId).sort()).toEqual(
        [g.c, g.d].sort(),
      );
      const waiting = await gameById(db, { gameId: g.gameId, userId: g.c });
      expect(waiting.confirmWindow).toMatchObject({
        matchId: g.matchId,
        viewerMayConfirm: true,
      });
      expect(
        (await gameById(db, { gameId: g.gameId, userId: g.b })).confirmWindow,
      ).toMatchObject({ viewerMayConfirm: false });

      await confirmMatchResult(apiDb(db), {
        gameId: g.gameId,
        matchId: g.matchId,
        userId: g.c,
      });
      match = await db.query.matches.findFirst({
        where: eq(matches.id, g.matchId),
      });
      expect(match).toMatchObject({
        status: MatchStatusEnum.COMPLETED,
        stoodUnconfirmedAt: null,
      });
      expect(
        await db.query.matchRatingWindows.findFirst({
          where: eq(matchRatingWindows.matchId, g.matchId),
        }),
      ).toMatchObject({ countsForLevel: true, mode: "everyone" });

      await closeRatingWindow(db, g.matchId);
      const events = await db.query.ratingEvents.findMany({
        where: eq(ratingEvents.matchId, g.matchId),
      });
      expect(events).toHaveLength(4);
      for (const event of events) {
        expect(event.sport).toBe("football");
        expect(event.weight).toBe(1);
      }
      expect(
        await db.query.groupTierEvents.findMany({
          where: eq(groupTierEvents.matchId, g.matchId),
        }),
      ).toHaveLength(0);
    });
  });

  it("keeps the 24 hours when the same Score is saved again, and restarts them when it changes", async () => {
    await withDb(async (db) => {
      const g = await playedPublicFootballGame(db);
      const save = (slot1Goals: number) =>
        saveFootballScore(
          apiDb(db),
          {
            gameId: g.gameId,
            userId: g.creator,
            slot1Goals,
            slot2Goals: 1,
            scorers: [],
          },
          g.afterKickoff,
        );
      await save(3);
      const first = await publicGameConfirmWindowClosesAt(db, g.matchId);
      await new Promise((resolve) => setTimeout(resolve, 5));
      await save(3);
      expect(await publicGameConfirmWindowClosesAt(db, g.matchId)).toEqual(
        first,
      );
      await save(4);
      const restarted = await publicGameConfirmWindowClosesAt(db, g.matchId);
      expect(restarted!.getTime()).toBeGreaterThan(first!.getTime());
    });
  });

  it("stands unconfirmed when the other side does not confirm in time, and opens no Rating window", async () => {
    await withDb(async (db) => {
      const g = await playedPublicFootballGame(db);
      await saveFootballScore(
        apiDb(db),
        {
          gameId: g.gameId,
          userId: g.creator,
          slot1Goals: 2,
          slot2Goals: 0,
          scorers: [],
        },
        g.afterKickoff,
      );
      const closesAt = await publicGameConfirmWindowClosesAt(db, g.matchId);
      await standUnconfirmed(
        db as unknown as Db,
        { matchId: g.matchId },
        undefined,
        new Date(closesAt!.getTime() + 1000),
      );

      const match = await db.query.matches.findFirst({
        where: eq(matches.id, g.matchId),
      });
      expect(match?.status).toBe(MatchStatusEnum.COMPLETED);
      expect(match?.stoodUnconfirmedAt).not.toBeNull();
      expect(
        await db.query.matchRatingWindows.findFirst({
          where: eq(matchRatingWindows.matchId, g.matchId),
        }),
      ).toBeUndefined();
      expect(
        await db.query.ratingEvents.findMany({
          where: eq(ratingEvents.matchId, g.matchId),
        }),
      ).toHaveLength(0);
      expect(
        await db.query.groupTierEvents.findMany({
          where: eq(groupTierEvents.matchId, g.matchId),
        }),
      ).toHaveLength(0);
    });
  });

  it("lets the same Score saved by the other side after the 24 hours stand without counting", async () => {
    await withDb(async (db) => {
      const g = await playedPublicFootballGame(db);
      const save = (userId: string) =>
        saveFootballScore(
          apiDb(db),
          {
            gameId: g.gameId,
            userId,
            slot1Goals: 2,
            slot2Goals: 0,
            scorers: [],
          },
          g.afterKickoff,
        );
      await save(g.creator);
      await db
        .update(matchResultConfirmations)
        .set({
          confirmedAt: new Date(
            Date.now() - PUBLIC_GAME_CONFIRM_WINDOW_MS - 60_000,
          ),
        })
        .where(eq(matchResultConfirmations.matchId, g.matchId));
      await save(g.c);

      const match = await db.query.matches.findFirst({
        where: eq(matches.id, g.matchId),
      });
      expect(match?.status).toBe(MatchStatusEnum.COMPLETED);
      expect(match?.stoodUnconfirmedAt).not.toBeNull();
      expect(
        await db.query.matchRatingWindows.findFirst({
          where: eq(matchRatingWindows.matchId, g.matchId),
        }),
      ).toBeUndefined();
      expect(
        (
          await db.query.matchResultConfirmations.findMany({
            where: eq(matchResultConfirmations.matchId, g.matchId),
          })
        ).map((row) => row.userId),
      ).toEqual([g.creator]);
    });
  });

  it("starts the 24 hours and asks the other side when a reopened Match's Score is saved again unchanged", async () => {
    await withDb(async (db) => {
      const g = await playedPublicFootballGame(db);
      const save = (userId: string) =>
        saveFootballScore(
          apiDb(db),
          {
            gameId: g.gameId,
            userId,
            slot1Goals: 3,
            slot2Goals: 1,
            scorers: [],
          },
          g.afterKickoff,
        );
      await save(g.creator);
      await confirmMatchResult(apiDb(db), {
        gameId: g.gameId,
        matchId: g.matchId,
        userId: g.c,
      });
      await reportWrongScore(apiDb(db), {
        gameId: g.gameId,
        matchId: g.matchId,
        userId: g.creator,
      });
      expect(await publicGameConfirmWindowClosesAt(db, g.matchId)).toBeNull();
      await db.delete(notifications);
      jobs.clear();

      const savedAt = Date.now();
      await save(g.c);

      const window = jobs.added.find(
        (job) => job.key === confirmWindowJobKey(g.matchId),
      );
      expect(window).toMatchObject({ name: "match.confirm-window" });
      expect(window!.runAt!.getTime()).toBeGreaterThanOrEqual(
        savedAt + PUBLIC_GAME_CONFIRM_WINDOW_MS,
      );
      const asked = await db.query.notifications.findMany({
        where: and(
          eq(notifications.gameId, g.gameId),
          eq(notifications.type, "match_score_to_confirm"),
        ),
      });
      expect(asked.map((row) => row.recipientUserId).sort()).toEqual(
        [g.creator, g.b].sort(),
      );
      expect(
        (await gameById(db, { gameId: g.gameId, userId: g.creator }))
          .confirmWindow,
      ).toMatchObject({ viewerMayConfirm: true });
    });
  });
});
