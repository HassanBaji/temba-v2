import {
  communities,
  gamePlayers,
  gameTeams,
  gameWaitlist,
  games,
  groups,
  matches,
  teamMembers,
  teams,
  user,
  venues,
  GameFormatEnum,
  GameRegistrationModeEnum,
} from "@repo/db/schema";
import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import { admit } from "~/server/games/admit";
import type { GameRow } from "~/server/games/access";
import { commit } from "~/server/soft-archive";
import { createPgliteDb, type TestDatabase } from "~/server/test/pglite";

async function insertUser(database: TestDatabase, email: string) {
  const [row] = await database
    .insert(user)
    .values({ name: "Test User", email })
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
    playersAllowed?: number | null;
    teamsAllowed?: number | null;
    groupId?: string | null;
    cancelledAt?: Date | null;
    registrationClosedAt?: Date | null;
    windowEnd?: Date | null;
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
      groupId: args.groupId ?? null,
      playersAllowed: args.playersAllowed ?? 4,
      teamsAllowed: args.teamsAllowed ?? 2,
      cancelledAt: args.cancelledAt ?? null,
      registrationClosedAt: args.registrationClosedAt ?? null,
      windowEnd: args.windowEnd ?? new Date(Date.now() + 60 * 60 * 1000),
    })
    .returning();
  if (!row) {
    throw new Error("Failed to insert game");
  }
  if (row.format === "friendly_game") {
    await database.insert(matches).values({ gameId: row.id });
  }
  return row;
}

async function waitlistCount(database: TestDatabase, gameId: string) {
  const rows = await database.query.gameWaitlist.findMany({
    where: eq(gameWaitlist.gameId, gameId),
    columns: { id: true },
  });
  return rows.length;
}

describe("Game admit self-register", () => {
  it("places an Americano pool user without a Position", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const owner = await insertUser(db, "owner-americano@example.com");
      const player = await insertUser(db, "pool@example.com");
      const venue = await insertVenue(db);
      const game = await insertGame(db, {
        createdBy: owner.id,
        venueId: venue.id,
        format: GameFormatEnum.AMERICANO,
        playersAllowed: 8,
        teamsAllowed: null,
      });

      const result = await admit(db, {
        game,
        door: "register",
        party: { kind: "user", userId: player.id },
      });

      expect(result).toEqual({
        ok: true,
        placement: { kind: "user", userId: player.id },
      });
      const seated = await db.query.gamePlayers.findFirst({
        where: eq(gamePlayers.userId, player.id),
      });
      expect(seated?.gameId).toBe(game.id);
      await expect(waitlistCount(db, game.id)).resolves.toBe(0);
    } finally {
      await close();
    }
  });

  it("refuses full on Americano without enqueueing Waitlist", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const owner = await insertUser(db, "owner-full@example.com");
      const first = await insertUser(db, "first-full@example.com");
      const second = await insertUser(db, "second-full@example.com");
      const venue = await insertVenue(db);
      const game = await insertGame(db, {
        createdBy: owner.id,
        venueId: venue.id,
        format: GameFormatEnum.AMERICANO,
        playersAllowed: 1,
        teamsAllowed: null,
      });

      await admit(db, {
        game,
        door: "register",
        party: { kind: "user", userId: first.id },
      });
      const result = await admit(db, {
        game,
        door: "register",
        party: { kind: "user", userId: second.id },
      });

      expect(result).toEqual({ ok: false, reason: "full" });
      await expect(waitlistCount(db, game.id)).resolves.toBe(0);
    } finally {
      await close();
    }
  });

  it("places a Friendly seat and binds Match slot from sideIndex", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const owner = await insertUser(db, "owner-seat@example.com");
      const player = await insertUser(db, "seat@example.com");
      const venue = await insertVenue(db);
      const game = await insertGame(db, {
        createdBy: owner.id,
        venueId: venue.id,
      });

      const result = await admit(db, {
        game,
        door: "register",
        party: {
          kind: "user",
          userId: player.id,
          seat: { sideIndex: 2, position: "right" },
        },
      });

      expect(result).toEqual({
        ok: true,
        placement: {
          kind: "user",
          userId: player.id,
          sideIndex: 2,
          position: "right",
        },
      });

      const side = await db.query.gameTeams.findFirst({
        where: eq(gameTeams.gameId, game.id),
      });
      expect(side?.sideIndex).toBe(2);
      const match = await db.query.matches.findFirst({
        where: eq(matches.gameId, game.id),
      });
      expect(match?.slot2GameTeamId).toBe(side?.id);
      expect(match?.slot1GameTeamId).toBeNull();
    } finally {
      await close();
    }
  });

  it("places a pair on a vacant side", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const owner = await insertUser(db, "owner-pair@example.com");
      const caller = await insertUser(db, "caller@example.com");
      const partner = await insertUser(db, "partner@example.com");
      const venue = await insertVenue(db);
      const game = await insertGame(db, {
        createdBy: owner.id,
        venueId: venue.id,
      });

      const result = await admit(db, {
        game,
        door: "register",
        party: {
          kind: "pair",
          userIds: [caller.id, partner.id],
          sideIndex: 1,
          callerPosition: "left",
        },
      });

      expect(result.ok).toBe(true);
      if (!result.ok) {
        return;
      }
      expect(result.placement).toMatchObject({
        kind: "pair",
        sideIndex: 1,
      });
      const players = await db.query.gamePlayers.findMany({
        where: eq(gamePlayers.gameId, game.id),
      });
      expect(players).toHaveLength(2);
    } finally {
      await close();
    }
  });

  it("assigns the next free sideIndex for a complete Team and binds slots", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const owner = await insertUser(db, "owner-team@example.com");
      const a = await insertUser(db, "team-a@example.com");
      const b = await insertUser(db, "team-b@example.com");
      const c = await insertUser(db, "team-c@example.com");
      const d = await insertUser(db, "team-d@example.com");
      const venue = await insertVenue(db);
      const game = await insertGame(db, {
        createdBy: owner.id,
        venueId: venue.id,
        registrationMode: GameRegistrationModeEnum.TEAM_ONLY,
      });

      const [team1] = await db
        .insert(teams)
        .values({ createdBy: a.id, name: "Alpha" })
        .returning({ id: teams.id });
      const [team2] = await db
        .insert(teams)
        .values({ createdBy: c.id, name: "Beta" })
        .returning({ id: teams.id });
      if (!team1 || !team2) {
        throw new Error("Failed to insert teams");
      }
      await db.insert(teamMembers).values([
        { teamId: team1.id, userId: a.id },
        { teamId: team1.id, userId: b.id },
        { teamId: team2.id, userId: c.id },
        { teamId: team2.id, userId: d.id },
      ]);

      const first = await admit(db, {
        game,
        door: "register",
        party: { kind: "team", teamId: team1.id },
      });
      const second = await admit(db, {
        game,
        door: "register",
        party: { kind: "team", teamId: team2.id },
      });

      expect(first).toMatchObject({
        ok: true,
        placement: { kind: "team", teamId: team1.id, sideIndex: 1 },
      });
      expect(second).toMatchObject({
        ok: true,
        placement: { kind: "team", teamId: team2.id, sideIndex: 2 },
      });

      const sides = await db.query.gameTeams.findMany({
        where: eq(gameTeams.gameId, game.id),
      });
      const side1 = sides.find((row) => row.sideIndex === 1);
      const side2 = sides.find((row) => row.sideIndex === 2);
      expect(side1?.teamId).toBe(team1.id);
      expect(side2?.teamId).toBe(team2.id);

      const match = await db.query.matches.findFirst({
        where: eq(matches.gameId, game.id),
      });
      expect(match?.slot1GameTeamId).toBe(side1?.id);
      expect(match?.slot2GameTeamId).toBe(side2?.id);
    } finally {
      await close();
    }
  });

  it("refuses register-door cancel, window, and organizer-close", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const owner = await insertUser(db, "owner-closed@example.com");
      const player = await insertUser(db, "closed@example.com");
      const venue = await insertVenue(db);
      const now = new Date();

      const cancelled = await insertGame(db, {
        createdBy: owner.id,
        venueId: venue.id,
        format: GameFormatEnum.AMERICANO,
        cancelledAt: now,
      });
      expect(
        await admit(db, {
          game: cancelled,
          door: "register",
          party: { kind: "user", userId: player.id },
          now,
        }),
      ).toEqual({ ok: false, reason: "registration_closed" });

      const windowed = await insertGame(db, {
        createdBy: owner.id,
        venueId: venue.id,
        format: GameFormatEnum.AMERICANO,
        windowEnd: new Date(now.getTime() - 1000),
      });
      expect(
        await admit(db, {
          game: windowed,
          door: "register",
          party: { kind: "user", userId: player.id },
          now,
        }),
      ).toEqual({ ok: false, reason: "registration_closed" });

      const organizerClosed = await insertGame(db, {
        createdBy: owner.id,
        venueId: venue.id,
        format: GameFormatEnum.AMERICANO,
        registrationClosedAt: now,
      });
      expect(
        await admit(db, {
          game: organizerClosed,
          door: "register",
          party: { kind: "user", userId: player.id },
          now,
        }),
      ).toEqual({ ok: false, reason: "registration_closed" });

      const promoted = await admit(db, {
        game: organizerClosed,
        door: "promote",
        party: { kind: "user", userId: player.id },
        now,
      });
      expect(promoted.ok).toBe(true);
    } finally {
      await close();
    }
  });

  it("refuses join-frozen Club Group Games via Soft-archive consult", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const owner = await insertUser(db, "owner-frozen@example.com");
      const player = await insertUser(db, "frozen@example.com");
      const venue = await insertVenue(db);
      const [community] = await db
        .insert(communities)
        .values({
          name: "Archived Club",
          type: "private",
          createdBy: owner.id,
        })
        .returning({ id: communities.id });
      if (!community) {
        throw new Error("Failed to insert community");
      }
      const [clubGroup] = await db
        .insert(groups)
        .values({
          name: "Club Group",
          createdBy: owner.id,
          communityId: community.id,
        })
        .returning({ id: groups.id });
      if (!clubGroup) {
        throw new Error("Failed to insert club group");
      }
      const game = await insertGame(db, {
        createdBy: owner.id,
        venueId: venue.id,
        format: GameFormatEnum.AMERICANO,
        groupId: clubGroup.id,
      });
      await commit(db, { communityId: community.id }, "archived");

      const result = await admit(db, {
        game,
        door: "register",
        party: { kind: "user", userId: player.id },
      });
      expect(result).toEqual({ ok: false, reason: "join_frozen" });
      await expect(waitlistCount(db, game.id)).resolves.toBe(0);
    } finally {
      await close();
    }
  });

  it("refuses already-on-game, seat_required, and incomplete Team", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const owner = await insertUser(db, "owner-refuse@example.com");
      const player = await insertUser(db, "refuse@example.com");
      const venue = await insertVenue(db);
      const friendly = await insertGame(db, {
        createdBy: owner.id,
        venueId: venue.id,
      });

      expect(
        await admit(db, {
          game: friendly,
          door: "register",
          party: { kind: "user", userId: player.id },
        }),
      ).toEqual({ ok: false, reason: "seat_required" });

      await admit(db, {
        game: friendly,
        door: "register",
        party: {
          kind: "user",
          userId: player.id,
          seat: { sideIndex: 1, position: "left" },
        },
      });
      expect(
        await admit(db, {
          game: friendly,
          door: "register",
          party: {
            kind: "user",
            userId: player.id,
            seat: { sideIndex: 1, position: "right" },
          },
        }),
      ).toEqual({ ok: false, reason: "already_on_game" });

      const [incomplete] = await db
        .insert(teams)
        .values({ createdBy: owner.id, name: "Solo" })
        .returning({ id: teams.id });
      if (!incomplete) {
        throw new Error("Failed to insert team");
      }
      await db.insert(teamMembers).values({
        teamId: incomplete.id,
        userId: owner.id,
      });
      const teamGame = await insertGame(db, {
        createdBy: owner.id,
        venueId: venue.id,
        registrationMode: GameRegistrationModeEnum.TEAM_ONLY,
      });
      expect(
        await admit(db, {
          game: teamGame,
          door: "register",
          party: { kind: "team", teamId: incomplete.id },
        }),
      ).toEqual({ ok: false, reason: "team_incomplete" });
    } finally {
      await close();
    }
  });
});
