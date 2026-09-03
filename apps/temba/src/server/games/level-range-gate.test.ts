import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import {
  GameFormatEnum,
  GameRegistrationModeEnum,
  gamePlayers,
  games,
  ratings,
  user,
  venues,
} from "@repo/db/schema";

import { gameById } from "~/server/api/routers/games/byId";
import { register } from "~/server/api/routers/games/register";
import { registerSeat } from "~/server/api/routers/games/registerSeat";
import { admit } from "~/server/games/admit";
import type { GameRow } from "~/server/games/access";
import {
  approveLevelRangeRequest,
  rejectLevelRangeRequest,
  requestLevelRange,
} from "~/server/games/level-range-requests";
import { createPgliteDb, type TestDatabase } from "~/server/test/pglite";
import {
  INITIAL_PHI,
  INITIAL_SIGMA,
  muFromLevel,
} from "~/server/ratings/level";
import { LEVEL_RANGE_OUTSIDE_MESSAGE } from "~/lib/level-range";

async function insertUser(database: TestDatabase, email: string) {
  const [row] = await database
    .insert(user)
    .values({ name: email.split("@")[0] ?? "User", email })
    .returning({ id: user.id });
  if (!row) {
    throw new Error("Failed to insert user");
  }
  return row;
}

async function insertVenue(database: TestDatabase) {
  const [row] = await database
    .insert(venues)
    .values({
      name: `Venue ${crypto.randomUUID()}`,
      city: "Lisbon",
      country: "PT",
    })
    .returning({ id: venues.id });
  if (!row) {
    throw new Error("Failed to insert venue");
  }
  return row;
}

async function insertGame(
  database: TestDatabase,
  args: {
    createdBy: string;
    venueId: string;
    format?: GameRow["format"];
    playersAllowed?: number;
    levelMinTenths?: number | null;
    levelMaxTenths?: number | null;
    cancelledAt?: Date | null;
    registrationClosedAt?: Date | null;
  },
): Promise<GameRow> {
  const [row] = await database
    .insert(games)
    .values({
      format: args.format ?? GameFormatEnum.FRIENDLY_GAME,
      registrationMode: GameRegistrationModeEnum.INDIVIDUAL,
      venueId: args.venueId,
      createdBy: args.createdBy,
      playersAllowed: args.playersAllowed ?? 4,
      teamsAllowed: 2,
      isPublic: true,
      levelMinTenths: args.levelMinTenths ?? null,
      levelMaxTenths: args.levelMaxTenths ?? null,
      cancelledAt: args.cancelledAt ?? null,
      registrationClosedAt: args.registrationClosedAt ?? null,
      windowEnd: new Date(Date.now() + 60 * 60 * 1000),
    })
    .returning();
  if (!row) {
    throw new Error("Failed to insert game");
  }
  return row;
}

async function insertRating(
  database: TestDatabase,
  userId: string,
  level: number,
  phi = 50,
) {
  await database.insert(ratings).values({
    userId,
    sport: "padel",
    mu: muFromLevel(level),
    phi,
    sigma: INITIAL_SIGMA,
    levelBand: "C2",
  });
}

describe("Game Level range gate and requests", () => {
  it("admits an in-range User and refuses no-Rating and out-of-range", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const owner = await insertUser(db, "gate-owner@example.com");
      const inRange = await insertUser(db, "in-range@example.com");
      const outRange = await insertUser(db, "out-range@example.com");
      const noRating = await insertUser(db, "no-rating@example.com");
      const venue = await insertVenue(db);
      await insertRating(db, inRange.id, 4.0);
      await insertRating(db, outRange.id, 5.2);
      const game = await insertGame(db, {
        createdBy: owner.id,
        venueId: venue.id,
        levelMinTenths: 30,
        levelMaxTenths: 45,
      });

      const admitted = await admit(db, {
        game,
        door: "register",
        party: {
          kind: "user",
          userId: inRange.id,
          seat: { sideIndex: 1, position: "left" },
        },
      });
      expect(admitted).toMatchObject({ ok: true });

      const refusedOut = await admit(db, {
        game,
        door: "register",
        party: {
          kind: "user",
          userId: outRange.id,
          seat: { sideIndex: 1, position: "right" },
        },
      });
      expect(refusedOut).toEqual({ ok: false, reason: "level_range" });

      const refusedNone = await admit(db, {
        game,
        door: "register",
        party: {
          kind: "user",
          userId: noRating.id,
          seat: { sideIndex: 2, position: "left" },
        },
      });
      expect(refusedNone).toEqual({ ok: false, reason: "level_range" });
    } finally {
      await close();
    }
  });

  it("uses displayed rounding so a D3 midpoint 0.35 gates as 0.4", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const owner = await insertUser(db, "round-owner@example.com");
      const player = await insertUser(db, "round-player@example.com");
      const venue = await insertVenue(db);
      await insertRating(db, player.id, 0.35);
      const game = await insertGame(db, {
        createdBy: owner.id,
        venueId: venue.id,
        levelMinTenths: 4,
        levelMaxTenths: 4,
      });

      const admitted = await admit(db, {
        game,
        door: "register",
        party: {
          kind: "user",
          userId: player.id,
          seat: { sideIndex: 1, position: "left" },
        },
      });
      expect(admitted).toMatchObject({ ok: true });
    } finally {
      await close();
    }
  });

  it("still requires a Rating when the range is 0.0–7.0 and admits with no range", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const owner = await insertUser(db, "full-owner@example.com");
      const noRating = await insertUser(db, "full-none@example.com");
      const venue = await insertVenue(db);
      const gated = await insertGame(db, {
        createdBy: owner.id,
        venueId: venue.id,
        levelMinTenths: 0,
        levelMaxTenths: 70,
      });
      const ungated = await insertGame(db, {
        createdBy: owner.id,
        venueId: venue.id,
      });

      expect(
        await admit(db, {
          game: gated,
          door: "register",
          party: {
            kind: "user",
            userId: noRating.id,
            seat: { sideIndex: 1, position: "left" },
          },
        }),
      ).toEqual({ ok: false, reason: "level_range" });

      expect(
        await admit(db, {
          game: ungated,
          door: "register",
          party: {
            kind: "user",
            userId: noRating.id,
            seat: { sideIndex: 1, position: "left" },
          },
        }),
      ).toMatchObject({ ok: true });
    } finally {
      await close();
    }
  });

  it("lets an Organizer bypass for themselves and uses Provisional displayed Level", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const owner = await insertUser(db, "org-owner@example.com");
      const provisional = await insertUser(db, "provisional@example.com");
      const venue = await insertVenue(db);
      await insertRating(db, provisional.id, 4.0, INITIAL_PHI);
      const game = await insertGame(db, {
        createdBy: owner.id,
        venueId: venue.id,
        levelMinTenths: 30,
        levelMaxTenths: 45,
      });

      expect(
        await admit(db, {
          game,
          door: "register",
          party: {
            kind: "user",
            userId: owner.id,
            seat: { sideIndex: 1, position: "left" },
          },
        }),
      ).toMatchObject({ ok: true });

      expect(
        await admit(db, {
          game,
          door: "register",
          party: {
            kind: "user",
            userId: provisional.id,
            seat: { sideIndex: 1, position: "right" },
          },
        }),
      ).toMatchObject({ ok: true });
    } finally {
      await close();
    }
  });

  it("does not re-check Level on promote", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const owner = await insertUser(db, "promote-owner@example.com");
      const player = await insertUser(db, "promote-player@example.com");
      const venue = await insertVenue(db);
      await insertRating(db, player.id, 5.2);
      const game = await insertGame(db, {
        createdBy: owner.id,
        venueId: venue.id,
        levelMinTenths: 30,
        levelMaxTenths: 45,
      });

      expect(
        await admit(db, {
          game,
          door: "promote",
          party: {
            kind: "user",
            userId: player.id,
            seat: { sideIndex: 1, position: "left" },
          },
        }),
      ).toMatchObject({ ok: true });
    } finally {
      await close();
    }
  });

  it("refuses Americano register and Friendly waitlist enqueue when out of range", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const owner = await insertUser(db, "doors-owner@example.com");
      const player = await insertUser(db, "doors-player@example.com");
      const venue = await insertVenue(db);
      await insertRating(db, player.id, 5.2);
      const americano = await insertGame(db, {
        createdBy: owner.id,
        venueId: venue.id,
        format: GameFormatEnum.AMERICANO,
        playersAllowed: 8,
        levelMinTenths: 30,
        levelMaxTenths: 45,
      });
      await expect(
        register(db, { gameId: americano.id, userId: player.id }),
      ).rejects.toMatchObject({
        code: "FORBIDDEN",
        message: LEVEL_RANGE_OUTSIDE_MESSAGE,
      } satisfies Partial<TRPCError>);

      const friendly = await insertGame(db, {
        createdBy: owner.id,
        venueId: venue.id,
        playersAllowed: 0,
        levelMinTenths: 30,
        levelMaxTenths: 45,
      });
      await expect(
        registerSeat(db, { gameId: friendly.id, userId: player.id }),
      ).rejects.toMatchObject({
        code: "FORBIDDEN",
        message: LEVEL_RANGE_OUTSIDE_MESSAGE,
      } satisfies Partial<TRPCError>);
    } finally {
      await close();
    }
  });

  it("does not gate leftover occupy-seat", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const owner = await insertUser(db, "leftover-owner@example.com");
      const player = await insertUser(db, "leftover-player@example.com");
      const venue = await insertVenue(db);
      await insertRating(db, player.id, 5.2);
      const game = await insertGame(db, {
        createdBy: owner.id,
        venueId: venue.id,
        levelMinTenths: 30,
        levelMaxTenths: 45,
      });
      await db.insert(gamePlayers).values({
        gameId: game.id,
        userId: player.id,
      });
      const result = await registerSeat(db, {
        gameId: game.id,
        userId: player.id,
        sideIndex: 1,
        position: "left",
      });
      expect(result).toEqual({ ok: true, waitlisted: false });
    } finally {
      await close();
    }
  });

  it("requests are pending-idempotent, reject then re-request, and approve does not seat", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const owner = await insertUser(db, "req-owner@example.com");
      const player = await insertUser(db, "req-player@example.com");
      const venue = await insertVenue(db);
      await insertRating(db, player.id, 5.2);
      const game = await insertGame(db, {
        createdBy: owner.id,
        venueId: venue.id,
        levelMinTenths: 30,
        levelMaxTenths: 45,
      });

      const first = await requestLevelRange(db, {
        gameId: game.id,
        userId: player.id,
      });
      expect(first.status).toBe("pending");
      const again = await requestLevelRange(db, {
        gameId: game.id,
        userId: player.id,
      });
      expect(again.id).toBe(first.id);

      await rejectLevelRangeRequest(db, {
        requestId: first.id,
        userId: owner.id,
      });
      const rerequest = await requestLevelRange(db, {
        gameId: game.id,
        userId: player.id,
      });
      expect(rerequest.status).toBe("pending");

      await approveLevelRangeRequest(db, {
        requestId: rerequest.id,
        userId: owner.id,
      });
      const players = await db.query.gamePlayers.findMany({
        where: eq(gamePlayers.gameId, game.id),
      });
      expect(players).toHaveLength(0);

      const seated = await admit(db, {
        game,
        door: "register",
        party: {
          kind: "user",
          userId: player.id,
          seat: { sideIndex: 1, position: "left" },
        },
      });
      expect(seated).toMatchObject({ ok: true });

      const detail = await gameById(db, {
        gameId: game.id,
        userId: player.id,
      });
      expect(detail.viewerPassesLevelRange).toBe(true);
      expect(detail.levelRangeRequest?.status).toBe("approved");
    } finally {
      await close();
    }
  });

  it("hides Join on by-id for an out-of-range viewer and allows requests when full", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const owner = await insertUser(db, "full-req-owner@example.com");
      const player = await insertUser(db, "full-req-player@example.com");
      const venue = await insertVenue(db);
      await insertRating(db, player.id, 5.2);
      const game = await insertGame(db, {
        createdBy: owner.id,
        venueId: venue.id,
        playersAllowed: 0,
        levelMinTenths: 30,
        levelMaxTenths: 45,
      });

      const detail = await gameById(db, {
        gameId: game.id,
        userId: player.id,
      });
      expect(detail.canRegister).toBe(false);
      expect(detail.canWaitlist).toBe(false);
      expect(detail.canRequestLevelRange).toBe(true);
      expect(detail.viewerLevelTenths).toBe(52);

      const requested = await requestLevelRange(db, {
        gameId: game.id,
        userId: player.id,
      });
      expect(requested.status).toBe("pending");

      const closed = await insertGame(db, {
        createdBy: owner.id,
        venueId: venue.id,
        levelMinTenths: 30,
        levelMaxTenths: 45,
        registrationClosedAt: new Date(),
      });
      await expect(
        requestLevelRange(db, { gameId: closed.id, userId: player.id }),
      ).rejects.toBeInstanceOf(TRPCError);

      await expect(
        approveLevelRangeRequest(db, {
          requestId: requested.id,
          userId: owner.id,
        }),
      ).resolves.toEqual({ ok: true });
    } finally {
      await close();
    }
  });
});
