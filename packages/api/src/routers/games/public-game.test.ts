import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import {
  courts,
  gamePlayers,
  games,
  matches,
  ratings,
  user,
  venues,
} from "@repo/db/schema";

import { userPassesJoinGate } from "#src/games/access";
import { listMyGamesHubRows } from "#src/games/list-my-games";
import { gameById } from "#src/routers/games/byId";
import { createGame, createGameInputSchema } from "#src/routers/games/create";
import { listCreateVenuesForUser } from "#src/routers/games/listCreateVenues";
import { listPublicHubRows } from "#src/routers/games/listPublicPickup";
import { registerSeat } from "#src/routers/games/registerSeat";
import { registerWithPartner } from "#src/routers/games/registerWithPartner";
import { createPgliteDb, type TestDatabase } from "@repo/db/testing";
import { INITIAL_SIGMA, muFromLevel } from "@repo/domain/level";
import { messagesFor } from "@repo/i18n/messages";

const errors = messagesFor("en").game.errors;

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

async function insertVenue(
  database: TestDatabase,
  args: { partner: boolean; sport?: "padel" | "football" },
) {
  const [venue] = await database
    .insert(venues)
    .values({
      name: `Venue ${crypto.randomUUID()}`,
      city: "Manama",
      country: "BH",
      partnerAt: args.partner ? new Date("2026-11-01T10:00:00.000Z") : null,
    })
    .returning({ id: venues.id });
  if (!venue) {
    throw new Error("Failed to insert venue");
  }
  const [court] = await database
    .insert(courts)
    .values({ venueId: venue.id, name: "1", sport: args.sport ?? "padel" })
    .returning({ id: courts.id });
  if (!court) {
    throw new Error("Failed to insert court");
  }
  return { id: venue.id, courtId: court.id };
}

async function insertRating(
  database: TestDatabase,
  userId: string,
  level: number,
) {
  await database.insert(ratings).values({
    userId,
    sport: "padel",
    mu: muFromLevel(level),
    phi: 50,
    sigma: INITIAL_SIGMA,
    levelBand: "C2",
  });
}

function tomorrow() {
  const windowStart = new Date(Date.now() + 24 * 60 * 60 * 1000);
  return {
    windowStart,
    windowEnd: new Date(windowStart.getTime() + 90 * 60 * 1000),
  };
}

function publicGameInput(createdBy: string, venueId: string) {
  return {
    createdBy,
    isPublic: true,
    format: "friendly_game" as const,
    registrationMode: "individual" as const,
    venueId,
    ...tomorrow(),
  };
}

describe("Public Game create", () => {
  it("creates a groupless public padel Friendly game at a partner Venue", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const creator = await insertUser(db, "public-create@example.com");
      const venue = await insertVenue(db, { partner: true });
      const created = await createGame(db, {
        ...publicGameInput(creator.id, venue.id),
        courtId: venue.courtId,
        levelMinTenths: 30,
        levelMaxTenths: 45,
      });

      const row = await db.query.games.findFirst({
        where: eq(games.id, created.id),
      });
      expect(row).toMatchObject({
        groupId: null,
        isPublic: true,
        sport: "padel",
        format: "friendly_game",
        rated: true,
        groupRated: false,
        levelMinTenths: 30,
        levelMaxTenths: 45,
        createdBy: creator.id,
      });
      const matchRows = await db.query.matches.findMany({
        where: eq(matches.gameId, created.id),
      });
      expect(matchRows).toHaveLength(1);
      expect(matchRows[0]?.courtId).toBe(venue.courtId);
    } finally {
      await close();
    }
  });

  it("refuses a Public Game at a Venue that is not a partner", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const creator = await insertUser(db, "public-not-partner@example.com");
      const venue = await insertVenue(db, { partner: false });
      await expect(
        createGame(db, publicGameInput(creator.id, venue.id)),
      ).rejects.toMatchObject({
        code: "FORBIDDEN",
        message: errors.publicGamePartnerVenue,
      } satisfies Partial<TRPCError>);
      expect(await db.query.games.findMany()).toHaveLength(0);
    } finally {
      await close();
    }
  });

  it("refuses a partner Venue with no padel Court", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const creator = await insertUser(db, "public-football@example.com");
      const venue = await insertVenue(db, { partner: true, sport: "football" });
      await expect(
        createGame(db, publicGameInput(creator.id, venue.id)),
      ).rejects.toThrow(errors.publicGamePadelVenue);
    } finally {
      await close();
    }
  });

  it("refuses a groupless Game that is private or not a Friendly game", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const creator = await insertUser(db, "public-shape@example.com");
      const venue = await insertVenue(db, { partner: true });
      const parsed = createGameInputSchema.safeParse({
        ...publicGameInput(creator.id, venue.id),
        isPublic: false,
      });
      expect(parsed.success).toBe(false);
      expect(
        parsed.success ? undefined : parsed.error.flatten().fieldErrors.groupId,
      ).toEqual([messagesFor("en").createGame.validation.pickGroup]);

      await expect(
        createGame(db, {
          ...publicGameInput(creator.id, venue.id),
          isPublic: false,
        }),
      ).rejects.toThrow(errors.publicGameOnly);
      await expect(
        createGame(db, {
          ...publicGameInput(creator.id, venue.id),
          format: "americano",
          playersAllowed: 8,
        }),
      ).rejects.toThrow(errors.publicGameOnly);
    } finally {
      await close();
    }
  });
});

describe("Public Game join", () => {
  it("hides the join action from a User outside the Level range and refuses them", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const creator = await insertUser(db, "public-gate-owner@example.com");
      const outside = await insertUser(db, "public-gate-out@example.com");
      await insertRating(db, outside.id, 5.5);
      const venue = await insertVenue(db, { partner: true });
      const created = await createGame(db, {
        ...publicGameInput(creator.id, venue.id),
        levelMinTenths: 30,
        levelMaxTenths: 45,
      });

      const listed = (await listPublicHubRows(db, outside.id)).find(
        (row) => row.id === created.id,
      );
      expect(listed).toMatchObject({ canRegister: false, canWaitlist: false });
      const detail = await gameById(db, {
        gameId: created.id,
        userId: outside.id,
      });
      expect(detail.canRegister).toBe(false);

      await expect(
        registerSeat(db, {
          gameId: created.id,
          userId: outside.id,
          sideIndex: 1,
          position: "left",
        }),
      ).rejects.toMatchObject({
        code: "FORBIDDEN",
        message: messagesFor("en").level.rangeOutside,
      } satisfies Partial<TRPCError>);
    } finally {
      await close();
    }
  });

  it("lets a User inside the Level range join with no Group, then moves it to My Games", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const creator = await insertUser(db, "public-join-owner@example.com");
      const player = await insertUser(db, "public-join-player@example.com");
      await insertRating(db, player.id, 4.0);
      const venue = await insertVenue(db, { partner: true });
      const created = await createGame(db, {
        ...publicGameInput(creator.id, venue.id),
        levelMinTenths: 30,
        levelMaxTenths: 45,
      });

      const before = await listPublicHubRows(db, player.id);
      expect(before.find((row) => row.id === created.id)).toMatchObject({
        canRegister: true,
        groupId: null,
      });
      const mineBefore = await listMyGamesHubRows(db, player.id);
      expect(mineBefore.map((row) => row.id)).not.toContain(created.id);

      await expect(
        registerSeat(db, {
          gameId: created.id,
          userId: player.id,
          sideIndex: 1,
          position: "left",
        }),
      ).resolves.toEqual({ ok: true, waitlisted: false });
      expect(await db.query.groupMembers.findMany()).toHaveLength(0);

      const after = await listPublicHubRows(db, player.id);
      expect(after.map((row) => row.id)).not.toContain(created.id);
      const mineAfter = await listMyGamesHubRows(db, player.id);
      expect(mineAfter.map((row) => row.id)).toContain(created.id);
    } finally {
      await close();
    }
  });

  it("lets a User join with a partner when both are inside the Level range", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const creator = await insertUser(db, "public-pair-owner@example.com");
      const player = await insertUser(db, "public-pair-player@example.com");
      const partner = await insertUser(db, "public-pair-partner@example.com");
      const strayPartner = await insertUser(
        db,
        "public-pair-stray@example.com",
      );
      await insertRating(db, player.id, 4.0);
      await insertRating(db, partner.id, 3.5);
      await insertRating(db, strayPartner.id, 6.0);
      const venue = await insertVenue(db, { partner: true });
      const created = await createGame(db, {
        ...publicGameInput(creator.id, venue.id),
        levelMinTenths: 30,
        levelMaxTenths: 45,
      });

      await expect(
        registerWithPartner(db, {
          gameId: created.id,
          userId: player.id,
          partnerUserId: strayPartner.id,
          sideIndex: 1,
          position: "left",
        }),
      ).rejects.toMatchObject({ code: "FORBIDDEN" });

      await registerWithPartner(db, {
        gameId: created.id,
        userId: player.id,
        partnerUserId: partner.id,
        sideIndex: 1,
        position: "left",
      });
      const seated = await db.query.gamePlayers.findMany({
        where: eq(gamePlayers.gameId, created.id),
        columns: { userId: true },
      });
      expect(seated.map((row) => row.userId).sort()).toEqual(
        [player.id, partner.id].sort(),
      );
    } finally {
      await close();
    }
  });

  it("does not list a Public Game under Public for its creator", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const creator = await insertUser(db, "public-own@example.com");
      const venue = await insertVenue(db, { partner: true });
      const created = await createGame(
        db,
        publicGameInput(creator.id, venue.id),
      );
      const listed = await listPublicHubRows(db, creator.id);
      expect(listed.map((row) => row.id)).not.toContain(created.id);
      const mine = await listMyGamesHubRows(db, creator.id);
      expect(mine.map((row) => row.id)).toContain(created.id);
    } finally {
      await close();
    }
  });

  it("keeps a private groupless Game creator-only", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const creator = await insertUser(
        db,
        "private-groupless-owner@example.com",
      );
      const stranger = await insertUser(
        db,
        "private-groupless-other@example.com",
      );
      const venue = await insertVenue(db, { partner: true });
      const [game] = await db
        .insert(games)
        .values({
          venueId: venue.id,
          createdBy: creator.id,
          isPublic: false,
          playersAllowed: 4,
          teamsAllowed: 2,
          ...tomorrow(),
        })
        .returning();
      if (!game) {
        throw new Error("Failed to insert game");
      }

      expect(await userPassesJoinGate(db, game, creator.id)).toBe(true);
      expect(await userPassesJoinGate(db, game, stranger.id)).toBe(false);
      await expect(
        registerSeat(db, {
          gameId: game.id,
          userId: stranger.id,
          sideIndex: 1,
          position: "left",
        }),
      ).rejects.toThrow(errors.organizerRegisters);
      await expect(
        gameById(db, { gameId: game.id, userId: stranger.id }),
      ).rejects.toMatchObject({ code: "NOT_FOUND" });
      const listed = await listPublicHubRows(db, stranger.id);
      expect(listed.map((row) => row.id)).not.toContain(game.id);
    } finally {
      await close();
    }
  });
});

describe("Public Game Venue picker", () => {
  it("lists only partner Venues that offer padel, each with its partner mark", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const creator = await insertUser(db, "public-picker@example.com");
      const partner = await insertVenue(db, { partner: true });
      const plain = await insertVenue(db, { partner: false });
      const footballPartner = await insertVenue(db, {
        partner: true,
        sport: "football",
      });

      const picker = await listCreateVenuesForUser(db, {
        userId: creator.id,
        publicGame: true,
      });
      expect(picker.locked).toBe(false);
      expect(picker.venues.map((venue) => venue.id)).toEqual([partner.id]);
      expect(picker.venues[0]?.isPartner).toBe(true);

      const catalog = await listCreateVenuesForUser(db, {
        userId: creator.id,
      });
      expect(new Set(catalog.venues.map((venue) => venue.id))).toEqual(
        new Set([partner.id, plain.id, footballPartner.id]),
      );
      expect(
        catalog.venues.find((venue) => venue.id === plain.id)?.isPartner,
      ).toBe(false);
    } finally {
      await close();
    }
  });
});
