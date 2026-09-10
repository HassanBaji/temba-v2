import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import {
  GameFormatEnum,
  GamePositionEnum,
  GameRegistrationModeEnum,
  gamePlayers,
  gameTeamPlayers,
  gameTeams,
  gameWaitlist,
  games,
  groupMembers,
  groups,
  ratings,
  user,
  venues,
} from "@repo/db/schema";

import { listPartnerSuggestions } from "~/server/api/routers/games/listPartnerSuggestions";
import { registerSeat } from "~/server/api/routers/games/registerSeat";
import { createFriendlyGame } from "~/server/games/create-friendly";
import { INITIAL_SIGMA, muFromLevel } from "~/server/ratings/level";
import { createPgliteDb, type TestDatabase } from "~/server/test/pglite";

async function insertUser(
  database: TestDatabase,
  email: string,
  extras?: { preferredPosition?: "left" | "right" | "either" },
) {
  const [row] = await database
    .insert(user)
    .values({
      name: email.split("@")[0] ?? "User",
      email,
      preferredPosition: extras?.preferredPosition,
    })
    .returning({ id: user.id, name: user.name });
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

async function insertRating(
  database: TestDatabase,
  userId: string,
  level: number,
  levelBand: "C2" | "A" = "C2",
) {
  await database.insert(ratings).values({
    userId,
    sport: "padel",
    mu: muFromLevel(level),
    phi: 50,
    sigma: INITIAL_SIGMA,
    levelBand,
  });
}

async function insertGroup(
  database: TestDatabase,
  createdBy: string,
  name = "Tuesday Crew",
) {
  const [row] = await database
    .insert(groups)
    .values({ name, createdBy })
    .returning({ id: groups.id, name: groups.name });
  if (!row) {
    throw new Error("Failed to insert group");
  }
  await database.insert(groupMembers).values({
    groupId: row.id,
    userId: createdBy,
  });
  return row;
}

async function insertFriendly(
  database: TestDatabase,
  args: {
    createdBy: string;
    venueId: string;
    groupId?: string;
    isPublic?: boolean;
    windowStart?: Date;
    levelMinTenths?: number;
    levelMaxTenths?: number;
  },
) {
  const windowStart = args.windowStart ?? new Date();
  const created = await createFriendlyGame(database, {
    createdBy: args.createdBy,
    venueId: args.venueId,
    groupId: args.groupId,
    windowStart,
    windowEnd: new Date(windowStart.getTime() + 60 * 60 * 1000),
    levelMinTenths: args.levelMinTenths,
    levelMaxTenths: args.levelMaxTenths,
  });
  if (args.isPublic) {
    const [row] = await database
      .update(games)
      .set({ isPublic: true })
      .where(eq(games.id, created.game.id))
      .returning();
    if (!row) {
      throw new Error("Failed to mark Game public");
    }
    return row;
  }
  return created.game;
}

async function insertSharedSide(
  database: TestDatabase,
  args: {
    callerId: string;
    partnerId: string;
    venueId: string;
    windowStart: Date;
  },
) {
  const [game] = await database
    .insert(games)
    .values({
      format: GameFormatEnum.FRIENDLY_GAME,
      registrationMode: GameRegistrationModeEnum.INDIVIDUAL,
      venueId: args.venueId,
      isPublic: true,
      windowStart: args.windowStart,
      windowEnd: new Date(args.windowStart.getTime() + 60 * 60 * 1000),
      createdBy: args.callerId,
      playersAllowed: 4,
      teamsAllowed: 2,
    })
    .returning({ id: games.id });
  if (!game) {
    throw new Error("Failed to insert shared Game");
  }
  const [team] = await database
    .insert(gameTeams)
    .values({ gameId: game.id, sideIndex: 1 })
    .returning({ id: gameTeams.id });
  if (!team) {
    throw new Error("Failed to insert Game team");
  }
  const [callerPlayer] = await database
    .insert(gamePlayers)
    .values({ gameId: game.id, userId: args.callerId })
    .returning({ id: gamePlayers.id });
  const [partnerPlayer] = await database
    .insert(gamePlayers)
    .values({ gameId: game.id, userId: args.partnerId })
    .returning({ id: gamePlayers.id });
  if (!callerPlayer || !partnerPlayer) {
    throw new Error("Failed to insert Game players");
  }
  await database.insert(gameTeamPlayers).values([
    {
      gameTeamId: team.id,
      gamePlayerId: callerPlayer.id,
      position: GamePositionEnum.LEFT,
    },
    {
      gameTeamId: team.id,
      gamePlayerId: partnerPlayer.id,
      position: GamePositionEnum.RIGHT,
    },
  ]);
}

function expectTrpc(error: unknown, code: TRPCError["code"], message?: string) {
  expect(error).toBeInstanceOf(TRPCError);
  if (!(error instanceof TRPCError)) {
    return;
  }
  expect(error.code).toBe(code);
  if (message) {
    expect(error.message).toBe(message);
  }
}

describe("listPartnerSuggestions", () => {
  it("returns both sections for a Group Game, ordered and capped at 20", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const caller = await insertUser(db, "caller@example.com");
      const venue = await insertVenue(db);
      const group = await insertGroup(db, caller.id);
      const recent = await insertUser(db, "recent-teammate@example.com");
      const older = await insertUser(db, "older-teammate@example.com");
      const groupOnly = await insertUser(db, "group-only@example.com");
      await db.insert(groupMembers).values([
        { groupId: group.id, userId: recent.id },
        { groupId: group.id, userId: older.id },
        { groupId: group.id, userId: groupOnly.id },
      ]);

      const extra: { id: string }[] = [];
      for (let i = 0; i < 21; i += 1) {
        extra.push(await insertUser(db, `zz-extra-${i}@example.com`));
      }
      await db
        .insert(groupMembers)
        .values(extra.map((row) => ({ groupId: group.id, userId: row.id })));

      await insertSharedSide(db, {
        callerId: caller.id,
        partnerId: older.id,
        venueId: venue.id,
        windowStart: new Date("2026-01-01T09:00:00Z"),
      });
      await insertSharedSide(db, {
        callerId: caller.id,
        partnerId: recent.id,
        venueId: venue.id,
        windowStart: new Date("2026-08-01T09:00:00Z"),
      });
      await insertSharedSide(db, {
        callerId: caller.id,
        partnerId: recent.id,
        venueId: venue.id,
        windowStart: new Date("2026-09-01T09:00:00Z"),
      });

      const game = await insertFriendly(db, {
        createdBy: caller.id,
        venueId: venue.id,
        groupId: group.id,
      });

      const result = await listPartnerSuggestions(db, {
        gameId: game.id,
        userId: caller.id,
      });

      expect(result.playedWithBefore.map((row) => row.id)).toEqual([
        recent.id,
        older.id,
      ]);
      expect(
        result.playedWithBefore.find((row) => row.id === recent.id)
          ?.gamesTogether,
      ).toBe(2);
      expect(
        result.playedWithBefore.find((row) => row.id === older.id)
          ?.gamesTogether,
      ).toBe(1);
      expect(result.fromYourGroups.some((row) => row.id === groupOnly.id)).toBe(
        true,
      );
      expect(result.fromYourGroups.some((row) => row.id === recent.id)).toBe(
        false,
      );
      expect(result.fromYourGroups).toHaveLength(20);
    } finally {
      await close();
    }
  });

  it("marks seated and waitlisted Users ineligible instead of dropping them", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const caller = await insertUser(db, "mark-caller@example.com");
      const seated = await insertUser(db, "already-seated@example.com");
      const waitlisted = await insertUser(db, "already-waitlisted@example.com");
      const venue = await insertVenue(db);
      const group = await insertGroup(db, caller.id);
      await db.insert(groupMembers).values([
        { groupId: group.id, userId: seated.id },
        { groupId: group.id, userId: waitlisted.id },
      ]);
      const game = await insertFriendly(db, {
        createdBy: caller.id,
        venueId: venue.id,
        groupId: group.id,
        isPublic: true,
      });
      await registerSeat(db, {
        gameId: game.id,
        userId: seated.id,
        sideIndex: 1,
        position: "left",
      });
      await db.insert(gameWaitlist).values({
        gameId: game.id,
        userId: waitlisted.id,
      });

      const result = await listPartnerSuggestions(db, {
        gameId: game.id,
        userId: caller.id,
      });

      expect(
        result.fromYourGroups.find((row) => row.id === seated.id)?.ineligible,
      ).toBe("already_on_game");
      expect(
        result.fromYourGroups.find((row) => row.id === waitlisted.id)
          ?.ineligible,
      ).toBe("waitlisted");
    } finally {
      await close();
    }
  });

  it("marks a User outside Level range as level_range", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const caller = await insertUser(db, "range-caller@example.com");
      const outsider = await insertUser(db, "range-outsider@example.com");
      const venue = await insertVenue(db);
      await insertRating(db, caller.id, 4.0);
      await insertRating(db, outsider.id, 7.0, "A");
      const group = await insertGroup(db, caller.id);
      await db.insert(groupMembers).values({
        groupId: group.id,
        userId: outsider.id,
      });
      const game = await insertFriendly(db, {
        createdBy: caller.id,
        venueId: venue.id,
        groupId: group.id,
        levelMinTenths: 35,
        levelMaxTenths: 50,
      });

      const result = await listPartnerSuggestions(db, {
        gameId: game.id,
        userId: caller.id,
      });

      expect(
        result.fromYourGroups.find((row) => row.id === outsider.id)?.ineligible,
      ).toBe("level_range");
    } finally {
      await close();
    }
  });

  it("returns two empty sections for a groupless non-public Game", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const caller = await insertUser(db, "private-caller@example.com");
      const teammate = await insertUser(db, "private-teammate@example.com");
      const venue = await insertVenue(db);
      await insertSharedSide(db, {
        callerId: caller.id,
        partnerId: teammate.id,
        venueId: venue.id,
        windowStart: new Date(),
      });
      const game = await insertFriendly(db, {
        createdBy: caller.id,
        venueId: venue.id,
      });

      const result = await listPartnerSuggestions(db, {
        gameId: game.id,
        userId: caller.id,
      });

      expect(result).toEqual({ playedWithBefore: [], fromYourGroups: [] });
    } finally {
      await close();
    }
  });

  it("returns an empty fromYourGroups for a groupless public Game", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const caller = await insertUser(db, "public-caller@example.com");
      const teammate = await insertUser(db, "public-teammate@example.com", {
        preferredPosition: "right",
      });
      const venue = await insertVenue(db);
      await insertRating(db, teammate.id, 4.0);
      await insertSharedSide(db, {
        callerId: caller.id,
        partnerId: teammate.id,
        venueId: venue.id,
        windowStart: new Date(),
      });
      const game = await insertFriendly(db, {
        createdBy: caller.id,
        venueId: venue.id,
        isPublic: true,
      });

      const result = await listPartnerSuggestions(db, {
        gameId: game.id,
        userId: caller.id,
      });

      expect(result.fromYourGroups).toEqual([]);
      expect(result.playedWithBefore).toHaveLength(1);
      expect(result.playedWithBefore[0]).toMatchObject({
        id: teammate.id,
        preferredPosition: "right",
        gamesTogether: 1,
        ineligible: null,
      });
    } finally {
      await close();
    }
  });

  it("refuses callers who cannot register with a partner", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const caller = await insertUser(db, "refuse-caller@example.com");
      const venue = await insertVenue(db);

      const americano = await db
        .insert(games)
        .values({
          format: GameFormatEnum.AMERICANO,
          registrationMode: GameRegistrationModeEnum.INDIVIDUAL,
          venueId: venue.id,
          isPublic: true,
          createdBy: caller.id,
          playersAllowed: 4,
          teamsAllowed: 2,
        })
        .returning({ id: games.id });
      await expect(
        listPartnerSuggestions(db, {
          gameId: americano[0]!.id,
          userId: caller.id,
        }),
      ).rejects.toSatisfy((error) => {
        expectTrpc(
          error,
          "BAD_REQUEST",
          "Register with a partner on a Friendly game or tournament",
        );
        return true;
      });

      const teamOnly = await insertFriendly(db, {
        createdBy: caller.id,
        venueId: venue.id,
        isPublic: true,
      });
      await db
        .update(games)
        .set({ registrationMode: GameRegistrationModeEnum.TEAM_ONLY })
        .where(eq(games.id, teamOnly.id));
      await expect(
        listPartnerSuggestions(db, {
          gameId: teamOnly.id,
          userId: caller.id,
        }),
      ).rejects.toSatisfy((error) => {
        expectTrpc(
          error,
          "BAD_REQUEST",
          "This Game is team-only; register a complete Team",
        );
        return true;
      });

      const closed = await insertFriendly(db, {
        createdBy: caller.id,
        venueId: venue.id,
        isPublic: true,
      });
      await db
        .update(games)
        .set({ registrationClosedAt: new Date() })
        .where(eq(games.id, closed.id));
      await expect(
        listPartnerSuggestions(db, {
          gameId: closed.id,
          userId: caller.id,
        }),
      ).rejects.toSatisfy((error) => {
        expectTrpc(
          error,
          "FORBIDDEN",
          "This Game is not open for registration",
        );
        return true;
      });

      const alreadyOn = await insertFriendly(db, {
        createdBy: caller.id,
        venueId: venue.id,
        isPublic: true,
      });
      await registerSeat(db, {
        gameId: alreadyOn.id,
        userId: caller.id,
        sideIndex: 1,
        position: "left",
      });
      await expect(
        listPartnerSuggestions(db, {
          gameId: alreadyOn.id,
          userId: caller.id,
        }),
      ).rejects.toSatisfy((error) => {
        expectTrpc(
          error,
          "CONFLICT",
          "You are already registered on this Game",
        );
        return true;
      });

      const waitlistedGame = await insertFriendly(db, {
        createdBy: caller.id,
        venueId: venue.id,
        isPublic: true,
      });
      await db.insert(gameWaitlist).values({
        gameId: waitlistedGame.id,
        userId: caller.id,
      });
      await expect(
        listPartnerSuggestions(db, {
          gameId: waitlistedGame.id,
          userId: caller.id,
        }),
      ).rejects.toSatisfy((error) => {
        expectTrpc(error, "CONFLICT", "You are already on the waitlist");
        return true;
      });
    } finally {
      await close();
    }
  });
});
