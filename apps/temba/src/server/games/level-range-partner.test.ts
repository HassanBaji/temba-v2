import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import {
  GameFormatEnum,
  GameLevelRangeRequestStatusEnum,
  GameRegistrationModeEnum,
  gameLevelRangeRequests,
  gamePlayers,
  gameWaitlist,
  games,
  ratings,
  teamMembers,
  teams,
  user,
  venues,
} from "@repo/db/schema";

import { gameById } from "~/server/api/routers/games/byId";
import { registerSeat } from "~/server/api/routers/games/registerSeat";
import { registerTeam } from "~/server/api/routers/games/registerTeam";
import { registerWithPartner } from "~/server/api/routers/games/registerWithPartner";
import type { GameRow } from "~/server/games/access";
import { createPgliteDb, type TestDatabase } from "~/server/test/pglite";
import { INITIAL_SIGMA, muFromLevel } from "~/server/ratings/level";
import {
  LEVEL_RANGE_OUTSIDE_MESSAGE,
  LEVEL_RANGE_PARTNER_MESSAGE,
  LEVEL_RANGE_TEAM_MESSAGE,
} from "~/lib/level-range";

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
    registrationMode?: GameRow["registrationMode"];
    playersAllowed?: number;
    teamsAllowed?: number;
    levelMinTenths?: number | null;
    levelMaxTenths?: number | null;
  },
): Promise<GameRow> {
  const [row] = await database
    .insert(games)
    .values({
      format: args.format ?? GameFormatEnum.FRIENDLY_GAME,
      registrationMode:
        args.registrationMode ?? GameRegistrationModeEnum.INDIVIDUAL,
      venueId: args.venueId,
      createdBy: args.createdBy,
      playersAllowed: args.playersAllowed ?? 4,
      teamsAllowed: args.teamsAllowed ?? 2,
      isPublic: true,
      levelMinTenths: args.levelMinTenths ?? null,
      levelMaxTenths: args.levelMaxTenths ?? null,
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

async function insertWaiver(
  database: TestDatabase,
  gameId: string,
  userId: string,
  decidedBy: string,
) {
  await database.insert(gameLevelRangeRequests).values({
    gameId,
    userId,
    status: GameLevelRangeRequestStatusEnum.APPROVED,
    decidedBy,
  });
}

async function insertCompleteTeam(
  database: TestDatabase,
  args: { createdBy: string; name: string; memberIds: [string, string] },
) {
  const [team] = await database
    .insert(teams)
    .values({ createdBy: args.createdBy, name: args.name })
    .returning({ id: teams.id });
  if (!team) {
    throw new Error("Failed to insert team");
  }
  await database.insert(teamMembers).values([
    { teamId: team.id, userId: args.memberIds[0] },
    { teamId: team.id, userId: args.memberIds[1] },
  ]);
  return team;
}

function expectForbidden(error: unknown, message: string) {
  expect(error).toBeInstanceOf(TRPCError);
  if (!(error instanceof TRPCError)) {
    return;
  }
  expect(error.code).toBe("FORBIDDEN");
  expect(error.message).toBe(message);
}

describe("Game Level range partner and team gate", () => {
  it("refuses mixed partner register and still lets the in-range caller seat-register alone", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const owner = await insertUser(db, "mix-owner@example.com");
      const caller = await insertUser(db, "mix-caller@example.com");
      const partner = await insertUser(db, "mix-partner@example.com");
      const venue = await insertVenue(db);
      await insertRating(db, caller.id, 4.0);
      await insertRating(db, partner.id, 5.2);
      const game = await insertGame(db, {
        createdBy: owner.id,
        venueId: venue.id,
        levelMinTenths: 30,
        levelMaxTenths: 45,
      });

      try {
        await registerWithPartner(db, {
          gameId: game.id,
          userId: caller.id,
          partnerUserId: partner.id,
          sideIndex: 1,
          position: "left",
        });
        throw new Error("expected partner register to refuse");
      } catch (error) {
        expectForbidden(error, LEVEL_RANGE_PARTNER_MESSAGE);
      }

      const seated = await registerSeat(db, {
        gameId: game.id,
        userId: caller.id,
        sideIndex: 1,
        position: "left",
      });
      expect(seated).toEqual({ ok: true, waitlisted: false });
      const players = await db.query.gamePlayers.findMany({
        where: eq(gamePlayers.gameId, game.id),
      });
      expect(players.map((row) => row.userId)).toEqual([caller.id]);
    } finally {
      await close();
    }
  });

  it("registers a pair when both Users hold approved waivers", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const owner = await insertUser(db, "waiver-owner@example.com");
      const caller = await insertUser(db, "waiver-caller@example.com");
      const partner = await insertUser(db, "waiver-partner@example.com");
      const venue = await insertVenue(db);
      await insertRating(db, caller.id, 5.5);
      await insertRating(db, partner.id, 5.8);
      const game = await insertGame(db, {
        createdBy: owner.id,
        venueId: venue.id,
        levelMinTenths: 30,
        levelMaxTenths: 45,
      });
      await insertWaiver(db, game.id, caller.id, owner.id);
      await insertWaiver(db, game.id, partner.id, owner.id);

      const result = await registerWithPartner(db, {
        gameId: game.id,
        userId: caller.id,
        partnerUserId: partner.id,
        sideIndex: 1,
        position: "left",
      });
      expect(result).toEqual({ ok: true, waitlisted: false });
    } finally {
      await close();
    }
  });

  it("does not enqueue waitlist rows when a full Game partner fails the Level helper", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const owner = await insertUser(db, "full-owner@example.com");
      const caller = await insertUser(db, "full-caller@example.com");
      const partner = await insertUser(db, "full-partner@example.com");
      const venue = await insertVenue(db);
      await insertRating(db, caller.id, 4.0);
      await insertRating(db, partner.id, 5.2);
      const game = await insertGame(db, {
        createdBy: owner.id,
        venueId: venue.id,
        playersAllowed: 2,
        levelMinTenths: 30,
        levelMaxTenths: 45,
      });
      const fillerA = await insertUser(db, "full-a@example.com");
      const fillerB = await insertUser(db, "full-b@example.com");
      await insertRating(db, fillerA.id, 3.5);
      await insertRating(db, fillerB.id, 4.2);
      await registerSeat(db, {
        gameId: game.id,
        userId: fillerA.id,
        sideIndex: 1,
        position: "left",
      });
      await registerSeat(db, {
        gameId: game.id,
        userId: fillerB.id,
        sideIndex: 1,
        position: "right",
      });

      try {
        await registerWithPartner(db, {
          gameId: game.id,
          userId: caller.id,
          partnerUserId: partner.id,
        });
        throw new Error("expected full partner register to refuse");
      } catch (error) {
        expectForbidden(error, LEVEL_RANGE_PARTNER_MESSAGE);
      }

      const waitlist = await db.query.gameWaitlist.findMany({
        where: eq(gameWaitlist.gameId, game.id),
      });
      expect(waitlist).toHaveLength(0);
    } finally {
      await close();
    }
  });

  it("refuses an out-of-range caller on partner register with the caller copy", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const owner = await insertUser(db, "caller-owner@example.com");
      const caller = await insertUser(db, "caller-out@example.com");
      const partner = await insertUser(db, "caller-in@example.com");
      const venue = await insertVenue(db);
      await insertRating(db, caller.id, 5.2);
      await insertRating(db, partner.id, 4.0);
      const game = await insertGame(db, {
        createdBy: owner.id,
        venueId: venue.id,
        levelMinTenths: 30,
        levelMaxTenths: 45,
      });

      try {
        await registerWithPartner(db, {
          gameId: game.id,
          userId: caller.id,
          partnerUserId: partner.id,
          sideIndex: 1,
          position: "left",
        });
        throw new Error("expected caller Level refuse");
      } catch (error) {
        expectForbidden(error, LEVEL_RANGE_OUTSIDE_MESSAGE);
      }
    } finally {
      await close();
    }
  });

  it("lets the Organizer pair-register only when the partner also passes", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const owner = await insertUser(db, "org-owner@example.com");
      const partner = await insertUser(db, "org-partner@example.com");
      const venue = await insertVenue(db);
      await insertRating(db, partner.id, 5.2);
      const game = await insertGame(db, {
        createdBy: owner.id,
        venueId: venue.id,
        levelMinTenths: 30,
        levelMaxTenths: 45,
      });

      try {
        await registerWithPartner(db, {
          gameId: game.id,
          userId: owner.id,
          partnerUserId: partner.id,
          sideIndex: 1,
          position: "left",
        });
        throw new Error("expected organizer partner refuse");
      } catch (error) {
        expectForbidden(error, LEVEL_RANGE_PARTNER_MESSAGE);
      }

      const seated = await registerSeat(db, {
        gameId: game.id,
        userId: owner.id,
        sideIndex: 1,
        position: "left",
      });
      expect(seated).toEqual({ ok: true, waitlisted: false });
    } finally {
      await close();
    }
  });

  it("refuses a Team when any member fails and still refuses incomplete Teams as today", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const owner = await insertUser(db, "team-owner@example.com");
      const inRange = await insertUser(db, "team-in@example.com");
      const outRange = await insertUser(db, "team-out@example.com");
      const venue = await insertVenue(db);
      await insertRating(db, inRange.id, 4.0);
      await insertRating(db, outRange.id, 5.2);
      const game = await insertGame(db, {
        createdBy: owner.id,
        venueId: venue.id,
        registrationMode: GameRegistrationModeEnum.TEAM_ONLY,
        levelMinTenths: 30,
        levelMaxTenths: 45,
      });
      const mixed = await insertCompleteTeam(db, {
        createdBy: inRange.id,
        name: "Mixed",
        memberIds: [inRange.id, outRange.id],
      });

      try {
        await registerTeam(db, {
          gameId: game.id,
          userId: inRange.id,
          teamId: mixed.id,
        });
        throw new Error("expected mixed Team refuse");
      } catch (error) {
        expectForbidden(error, LEVEL_RANGE_TEAM_MESSAGE);
      }

      const organizerTeam = await insertCompleteTeam(db, {
        createdBy: owner.id,
        name: "Organizer mixed",
        memberIds: [owner.id, outRange.id],
      });
      try {
        await registerTeam(db, {
          gameId: game.id,
          userId: owner.id,
          teamId: organizerTeam.id,
        });
        throw new Error("expected Organizer Team partner refuse");
      } catch (error) {
        expectForbidden(error, LEVEL_RANGE_TEAM_MESSAGE);
      }

      const [incomplete] = await db
        .insert(teams)
        .values({ createdBy: inRange.id, name: "Solo" })
        .returning({ id: teams.id });
      if (!incomplete) {
        throw new Error("Failed to insert incomplete team");
      }
      await db.insert(teamMembers).values({
        teamId: incomplete.id,
        userId: inRange.id,
      });
      try {
        await registerTeam(db, {
          gameId: game.id,
          userId: inRange.id,
          teamId: incomplete.id,
        });
        throw new Error("expected incomplete Team refuse");
      } catch (error) {
        expectForbidden(error, "Incomplete Teams cannot register");
      }
    } finally {
      await close();
    }
  });

  it("does not enqueue a Team waitlist row when a member fails the Level helper", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const owner = await insertUser(db, "tw-owner@example.com");
      const a = await insertUser(db, "tw-a@example.com");
      const b = await insertUser(db, "tw-b@example.com");
      const c = await insertUser(db, "tw-c@example.com");
      const d = await insertUser(db, "tw-d@example.com");
      const venue = await insertVenue(db);
      await insertRating(db, a.id, 4.0);
      await insertRating(db, b.id, 4.2);
      await insertRating(db, c.id, 4.1);
      await insertRating(db, d.id, 5.5);
      const game = await insertGame(db, {
        createdBy: owner.id,
        venueId: venue.id,
        registrationMode: GameRegistrationModeEnum.TEAM_ONLY,
        teamsAllowed: 1,
        levelMinTenths: 30,
        levelMaxTenths: 45,
      });
      const seated = await insertCompleteTeam(db, {
        createdBy: a.id,
        name: "Seated",
        memberIds: [a.id, b.id],
      });
      const mixed = await insertCompleteTeam(db, {
        createdBy: c.id,
        name: "Wait",
        memberIds: [c.id, d.id],
      });
      await registerTeam(db, {
        gameId: game.id,
        userId: a.id,
        teamId: seated.id,
      });

      try {
        await registerTeam(db, {
          gameId: game.id,
          userId: c.id,
          teamId: mixed.id,
        });
        throw new Error("expected Team waitlist refuse");
      } catch (error) {
        expectForbidden(error, LEVEL_RANGE_TEAM_MESSAGE);
      }

      const waitlist = await db.query.gameWaitlist.findMany({
        where: eq(gameWaitlist.gameId, game.id),
      });
      expect(waitlist).toHaveLength(0);
    } finally {
      await close();
    }
  });

  it("hides eligible Teams when a partner fails the Level helper", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const owner = await insertUser(db, "elig-owner@example.com");
      const caller = await insertUser(db, "elig-caller@example.com");
      const inPartner = await insertUser(db, "elig-in@example.com");
      const outPartner = await insertUser(db, "elig-out@example.com");
      const venue = await insertVenue(db);
      await insertRating(db, caller.id, 4.0);
      await insertRating(db, inPartner.id, 4.2);
      await insertRating(db, outPartner.id, 5.5);
      const game = await insertGame(db, {
        createdBy: owner.id,
        venueId: venue.id,
        registrationMode: GameRegistrationModeEnum.TEAM_ONLY,
        levelMinTenths: 30,
        levelMaxTenths: 45,
      });
      const good = await insertCompleteTeam(db, {
        createdBy: caller.id,
        name: "Good",
        memberIds: [caller.id, inPartner.id],
      });
      await insertCompleteTeam(db, {
        createdBy: caller.id,
        name: "Bad",
        memberIds: [caller.id, outPartner.id],
      });

      const view = await gameById(db, { gameId: game.id, userId: caller.id });
      expect(view.eligibleTeams.map((team) => team.id)).toEqual([good.id]);
    } finally {
      await close();
    }
  });
});
