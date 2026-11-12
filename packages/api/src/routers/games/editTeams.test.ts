import { and, eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import {
  gameTeams,
  games,
  groups,
  matchSets,
  matches,
  notifications,
  user,
  venues,
} from "@repo/db/schema";
import { createPgliteDb, type TestDatabase } from "@repo/db/testing";
import { canEditTeams } from "@repo/domain/edit-teams";
import { messagesFor } from "@repo/i18n/messages";

import { padelMatchup, withDb } from "#src/challenges/challenges.test-support";
import { confirmProposal } from "#src/routers/challenges/confirmProposal";
import { proposeOnChallenge } from "#src/routers/challenges/propose";

import { createFriendlyGame } from "#src/games/create-friendly";
import { gameById } from "#src/routers/games/byId";
import { createTournament } from "#src/routers/games/createTournament";
import { editTeams } from "#src/routers/games/editTeams";
import { registerSeat } from "#src/routers/games/registerSeat";

const m = messagesFor("en");

async function insertUser(database: TestDatabase, name: string) {
  const [row] = await database
    .insert(user)
    .values({
      name,
      email: `${name.toLowerCase()}-${crypto.randomUUID()}@example.com`,
    })
    .returning({ id: user.id });
  if (!row) {
    throw new Error("Failed to insert user");
  }
  return row;
}

async function insertVenueAndGroup(database: TestDatabase, createdBy: string) {
  const [venue] = await database
    .insert(venues)
    .values({
      name: `Venue ${crypto.randomUUID()}`,
      city: "Manama",
      country: "BH",
    })
    .returning({ id: venues.id });
  const [group] = await database
    .insert(groups)
    .values({
      name: `Group ${crypto.randomUUID()}`,
      createdBy,
      verifiedAt: new Date(),
    })
    .returning({ id: groups.id });
  if (!venue || !group) {
    throw new Error("Failed to insert Venue or Group");
  }
  return { venueId: venue.id, groupId: group.id };
}

async function insertFriendly(database: TestDatabase, createdBy: string) {
  const { venueId, groupId } = await insertVenueAndGroup(database, createdBy);
  const windowStart = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000);
  const created = await createFriendlyGame(database, {
    createdBy,
    groupId,
    venueId,
    windowStart,
    windowEnd: new Date(windowStart.getTime() + 90 * 60 * 1000),
  });
  await database
    .update(games)
    .set({ isPublic: true })
    .where(eq(games.id, created.game.id));
  return created.game;
}

async function seat(
  database: TestDatabase,
  gameId: string,
  userId: string,
  sideIndex: number,
  position: "left" | "right",
) {
  await registerSeat(database, { gameId, userId, sideIndex, position });
}

async function lineup(database: TestDatabase, gameId: string, viewer: string) {
  const game = await gameById(database, { gameId, userId: viewer });
  return game.sides.map((side) => ({
    sideIndex: side.sideIndex,
    gameTeamId: side.gameTeamId,
    left: side.left?.userId ?? null,
    right: side.right?.userId ?? null,
  }));
}

async function fourOnCourt(database: TestDatabase) {
  const hassan = await insertUser(database, "Hassan");
  const khalid = await insertUser(database, "Khalid");
  const dana = await insertUser(database, "Dana");
  const ahmed = await insertUser(database, "Ahmed");
  const game = await insertFriendly(database, hassan.id);
  await seat(database, game.id, khalid.id, 1, "left");
  await seat(database, game.id, hassan.id, 1, "right");
  await seat(database, game.id, dana.id, 2, "left");
  await seat(database, game.id, ahmed.id, 2, "right");
  return { game, hassan, khalid, dana, ahmed };
}

describe("editTeams on a padel Friendly game", () => {
  it("moves players between teams and sides, and tells the moved players", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const { game, hassan, khalid, dana, ahmed } = await fourOnCourt(db);

      const result = await editTeams(db, {
        gameId: game.id,
        organizerUserId: hassan.id,
        notifyPlayers: true,
        seats: [
          { userId: hassan.id, sideIndex: 1, position: "left" },
          { userId: dana.id, sideIndex: 1, position: "right" },
          { userId: khalid.id, sideIndex: 2, position: "left" },
          { userId: ahmed.id, sideIndex: 2, position: "right" },
        ],
      });
      expect(result).toEqual({ ok: true, moved: 3 });

      const after = await lineup(db, game.id, hassan.id);
      expect(after.map(({ left, right }) => [left, right])).toEqual([
        [hassan.id, dana.id],
        [khalid.id, ahmed.id],
      ]);

      const told = await db.query.notifications.findMany({
        where: and(
          eq(notifications.gameId, game.id),
          eq(notifications.type, "game_team_changed"),
        ),
        columns: { recipientUserId: true, actorUserId: true },
      });
      expect(told.map((row) => row.recipientUserId).sort()).toEqual(
        [khalid.id, dana.id].sort(),
      );
      expect(told.every((row) => row.actorUserId === hassan.id)).toBe(true);
    } finally {
      await close();
    }
  });

  it("tells nobody when the Organizer turns the notification off", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const { game, hassan, khalid, dana, ahmed } = await fourOnCourt(db);
      await editTeams(db, {
        gameId: game.id,
        organizerUserId: hassan.id,
        notifyPlayers: false,
        seats: [
          { userId: dana.id, sideIndex: 1, position: "left" },
          { userId: hassan.id, sideIndex: 1, position: "right" },
          { userId: khalid.id, sideIndex: 2, position: "left" },
          { userId: ahmed.id, sideIndex: 2, position: "right" },
        ],
      });
      const told = await db.query.notifications.findMany({
        where: eq(notifications.type, "game_team_changed"),
      });
      expect(told).toHaveLength(0);
    } finally {
      await close();
    }
  });

  it("moves a player onto an empty team and points the Match at it", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const hassan = await insertUser(db, "Hassan");
      const khalid = await insertUser(db, "Khalid");
      const game = await insertFriendly(db, hassan.id);
      await seat(db, game.id, khalid.id, 1, "left");
      await seat(db, game.id, hassan.id, 1, "right");

      await editTeams(db, {
        gameId: game.id,
        organizerUserId: hassan.id,
        notifyPlayers: true,
        seats: [
          { userId: hassan.id, sideIndex: 1, position: "right" },
          { userId: khalid.id, sideIndex: 2, position: "left" },
        ],
      });

      const after = await lineup(db, game.id, hassan.id);
      expect(after[0]).toMatchObject({ left: null, right: hassan.id });
      expect(after[1]).toMatchObject({ left: khalid.id, right: null });
      const match = await db.query.matches.findFirst({
        where: eq(matches.gameId, game.id),
        columns: { slot1GameTeamId: true, slot2GameTeamId: true },
      });
      expect(match?.slot1GameTeamId).toBe(after[0]?.gameTeamId);
      expect(match?.slot2GameTeamId).toBe(after[1]?.gameTeamId);
    } finally {
      await close();
    }
  });

  it("refuses a User who is not an Organizer", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const { game, hassan, khalid, dana, ahmed } = await fourOnCourt(db);
      await expect(
        editTeams(db, {
          gameId: game.id,
          organizerUserId: khalid.id,
          notifyPlayers: true,
          seats: [
            { userId: dana.id, sideIndex: 1, position: "left" },
            { userId: hassan.id, sideIndex: 1, position: "right" },
            { userId: khalid.id, sideIndex: 2, position: "left" },
            { userId: ahmed.id, sideIndex: 2, position: "right" },
          ],
        }),
      ).rejects.toThrow(m.game.errors.organizerOnly);
    } finally {
      await close();
    }
  });

  it("refuses a line-up that drops a player or doubles a spot", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const { game, hassan, khalid, dana, ahmed } = await fourOnCourt(db);
      await expect(
        editTeams(db, {
          gameId: game.id,
          organizerUserId: hassan.id,
          notifyPlayers: true,
          seats: [
            { userId: dana.id, sideIndex: 1, position: "left" },
            { userId: hassan.id, sideIndex: 1, position: "right" },
            { userId: khalid.id, sideIndex: 2, position: "left" },
          ],
        }),
      ).rejects.toThrow(m.editTeams.errors.lineupChanged);
      await expect(
        editTeams(db, {
          gameId: game.id,
          organizerUserId: hassan.id,
          notifyPlayers: true,
          seats: [
            { userId: dana.id, sideIndex: 1, position: "left" },
            { userId: hassan.id, sideIndex: 1, position: "left" },
            { userId: khalid.id, sideIndex: 2, position: "left" },
            { userId: ahmed.id, sideIndex: 2, position: "right" },
          ],
        }),
      ).rejects.toThrow(m.editTeams.errors.spotTwice);
    } finally {
      await close();
    }
  });

  it("refuses once a score is in", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const { game, hassan, khalid, dana, ahmed } = await fourOnCourt(db);
      const match = await db.query.matches.findFirst({
        where: eq(matches.gameId, game.id),
        columns: { id: true },
      });
      await db
        .insert(matchSets)
        .values({
          matchId: match!.id,
          setNumber: 1,
          slot1GamesWon: 6,
          slot2GamesWon: 4,
        })
        .onConflictDoUpdate({
          target: [matchSets.matchId, matchSets.setNumber],
          set: { slot1GamesWon: 6, slot2GamesWon: 4 },
        });
      await expect(
        editTeams(db, {
          gameId: game.id,
          organizerUserId: hassan.id,
          notifyPlayers: true,
          seats: [
            { userId: dana.id, sideIndex: 1, position: "left" },
            { userId: hassan.id, sideIndex: 1, position: "right" },
            { userId: khalid.id, sideIndex: 2, position: "left" },
            { userId: ahmed.id, sideIndex: 2, position: "right" },
          ],
        }),
      ).rejects.toThrow(m.editTeams.errors.scoreIn);
    } finally {
      await close();
    }
  });
});

describe("editTeams and Either side", () => {
  it("settles a moved player's side as set by the Organizer and leaves the others", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const hassan = await insertUser(db, "Hassan");
      const khalid = await insertUser(db, "Khalid");
      const dana = await insertUser(db, "Dana");
      const game = await insertFriendly(db, hassan.id);
      await registerSeat(db, {
        gameId: game.id,
        userId: khalid.id,
        sideIndex: 1,
        position: "either",
      });
      await registerSeat(db, {
        gameId: game.id,
        userId: dana.id,
        sideIndex: 1,
        position: "either",
      });
      const before = await lineup(db, game.id, hassan.id);
      const mover = before[0]!.right!;
      const stayer = before[0]!.left!;

      await editTeams(db, {
        gameId: game.id,
        organizerUserId: hassan.id,
        notifyPlayers: false,
        seats: [
          { userId: stayer, sideIndex: 1, position: "left" },
          { userId: mover, sideIndex: 2, position: "left" },
        ],
      });

      const links = await db.query.gameTeamPlayers.findMany({
        columns: { eitherSide: true, sideSetBy: true },
        with: { gamePlayer: { columns: { userId: true } } },
      });
      const flags = (userId: string) => {
        const link = links.find((row) => row.gamePlayer.userId === userId);
        return { eitherSide: link?.eitherSide, sideSetBy: link?.sideSetBy };
      };
      expect(flags(mover)).toEqual({
        eitherSide: false,
        sideSetBy: hassan.id,
      });
      expect(flags(stayer)).toEqual({ eitherSide: true, sideSetBy: null });
    } finally {
      await close();
    }
  });
});

describe("editTeams on a Challenge Game", () => {
  it("is not offered, and the door refuses", async () => {
    const hour = 60 * 60 * 1000;
    const sentAt = new Date(Date.now() - 2 * hour);
    await withDb(async ({ database, db }) => {
      const match = await padelMatchup(database, sentAt);
      const { id: proposalId } = await proposeOnChallenge(db, {
        challengeId: match.challenge.id,
        teamId: match.riffa.id,
        venueId: match.venue.id,
        courtId: match.court.id,
        startsAt: new Date(Date.now() + 48 * hour),
        userId: match.proposer.rafi,
        now: sentAt,
      });
      const { gameId } = await confirmProposal(db, {
        proposalId,
        userId: match.poster.ali,
        now: sentAt,
      });
      const details = await gameById(db, {
        gameId,
        userId: match.poster.ali,
      });
      expect(details.isOrganizer).toBe(true);
      expect(canEditTeams(details)).toBe(false);

      const seats = details.sides.flatMap((side) =>
        (["left", "right"] as const).flatMap((position) => {
          const occupant = side[position];
          return occupant
            ? [{ userId: occupant.userId, sideIndex: side.sideIndex, position }]
            : [];
        }),
      );
      await expect(
        editTeams(db, {
          gameId,
          organizerUserId: match.poster.ali,
          notifyPlayers: false,
          seats,
        }),
      ).rejects.toThrow(m.challenge.errors.setByChallenge);
    });
  });
});

describe("editTeams on a Friendly tournament", () => {
  beforeAll(() => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-09-01T12:00:00"));
  });

  afterAll(() => {
    vi.useRealTimers();
  });

  async function tournamentWithTwoPairs(database: TestDatabase) {
    const hassan = await insertUser(database, "Hassan");
    const khalid = await insertUser(database, "Khalid");
    const layla = await insertUser(database, "Layla");
    const mariam = await insertUser(database, "Mariam");
    const { venueId, groupId } = await insertVenueAndGroup(database, hassan.id);
    const windowStart = new Date("2026-09-15T18:00:00");
    const created = await createTournament(database, {
      createdBy: hassan.id,
      name: "Sunday Social",
      groupId,
      isPublic: true,
      registrationMode: "individual",
      teamCount: 4,
      poolCount: 1,
      venueId,
      matchMinutes: 45,
      windowStart,
      windowEnd: new Date(windowStart.getTime() + 4 * 60 * 60 * 1000),
    });
    await seat(database, created.id, hassan.id, 1, "left");
    await seat(database, created.id, khalid.id, 1, "right");
    await seat(database, created.id, layla.id, 2, "left");
    await seat(database, created.id, mariam.id, 2, "right");
    return { gameId: created.id, hassan, khalid, layla, mariam };
  }

  it("swaps players between pairs and keeps each team's row", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const t = await tournamentWithTwoPairs(db);
      const before = await lineup(db, t.gameId, t.hassan.id);
      await editTeams(db, {
        gameId: t.gameId,
        organizerUserId: t.hassan.id,
        notifyPlayers: true,
        seats: [
          { userId: t.hassan.id, sideIndex: 1, position: "left" },
          { userId: t.layla.id, sideIndex: 1, position: "right" },
          { userId: t.khalid.id, sideIndex: 2, position: "left" },
          { userId: t.mariam.id, sideIndex: 2, position: "right" },
        ],
      });
      const after = await lineup(db, t.gameId, t.hassan.id);
      expect(after[0]).toMatchObject({
        gameTeamId: before[0]?.gameTeamId,
        left: t.hassan.id,
        right: t.layla.id,
      });
      expect(after[1]).toMatchObject({
        gameTeamId: before[1]?.gameTeamId,
        left: t.khalid.id,
        right: t.mariam.id,
      });
    } finally {
      await close();
    }
  });

  it("keeps a pair that played together, but lets it swap sides", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const t = await tournamentWithTwoPairs(db);
      const before = await lineup(db, t.gameId, t.hassan.id);
      await db.insert(matches).values({
        gameId: t.gameId,
        slot1GameTeamId: before[0]!.gameTeamId,
        slot2GameTeamId: before[1]!.gameTeamId,
        status: "completed",
      });

      await expect(
        editTeams(db, {
          gameId: t.gameId,
          organizerUserId: t.hassan.id,
          notifyPlayers: true,
          seats: [
            { userId: t.hassan.id, sideIndex: 1, position: "left" },
            { userId: t.layla.id, sideIndex: 1, position: "right" },
            { userId: t.khalid.id, sideIndex: 2, position: "left" },
            { userId: t.mariam.id, sideIndex: 2, position: "right" },
          ],
        }),
      ).rejects.toThrow(m.editTeams.refused.locked);

      await editTeams(db, {
        gameId: t.gameId,
        organizerUserId: t.hassan.id,
        notifyPlayers: true,
        seats: [
          { userId: t.khalid.id, sideIndex: 1, position: "left" },
          { userId: t.hassan.id, sideIndex: 1, position: "right" },
          { userId: t.layla.id, sideIndex: 2, position: "left" },
          { userId: t.mariam.id, sideIndex: 2, position: "right" },
        ],
      });
      const after = await lineup(db, t.gameId, t.hassan.id);
      expect(after[0]).toMatchObject({ left: t.khalid.id, right: t.hassan.id });
    } finally {
      await close();
    }
  });

  it("splits a pair onto an empty team and removes a team a move emptied", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const t = await tournamentWithTwoPairs(db);
      const teamCount = async () =>
        (
          await db.query.gameTeams.findMany({
            where: eq(gameTeams.gameId, t.gameId),
            columns: { id: true },
          })
        ).length;
      expect(await teamCount()).toBe(2);

      await editTeams(db, {
        gameId: t.gameId,
        organizerUserId: t.hassan.id,
        notifyPlayers: false,
        seats: [
          { userId: t.hassan.id, sideIndex: 1, position: "left" },
          { userId: t.khalid.id, sideIndex: 1, position: "right" },
          { userId: t.layla.id, sideIndex: 2, position: "left" },
          { userId: t.mariam.id, sideIndex: 3, position: "left" },
        ],
      });
      expect(await teamCount()).toBe(3);

      await editTeams(db, {
        gameId: t.gameId,
        organizerUserId: t.hassan.id,
        notifyPlayers: false,
        seats: [
          { userId: t.hassan.id, sideIndex: 1, position: "left" },
          { userId: t.khalid.id, sideIndex: 1, position: "right" },
          { userId: t.mariam.id, sideIndex: 3, position: "left" },
          { userId: t.layla.id, sideIndex: 3, position: "right" },
        ],
      });
      expect(await teamCount()).toBe(2);
      const after = await lineup(db, t.gameId, t.hassan.id);
      expect(after[1]).toMatchObject({ gameTeamId: null, left: null });
      expect(after[2]).toMatchObject({
        left: t.mariam.id,
        right: t.layla.id,
      });
      const links = await db.query.gameTeamPlayers.findMany({
        columns: { id: true },
      });
      expect(links).toHaveLength(4);
    } finally {
      await close();
    }
  });

  it("refuses a move that leaves a Half team where pairs are required", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const t = await tournamentWithTwoPairs(db);
      await db
        .update(games)
        .set({ allowSoloRegister: false })
        .where(eq(games.id, t.gameId));

      await expect(
        editTeams(db, {
          gameId: t.gameId,
          organizerUserId: t.hassan.id,
          notifyPlayers: false,
          seats: [
            { userId: t.hassan.id, sideIndex: 1, position: "left" },
            { userId: t.khalid.id, sideIndex: 1, position: "right" },
            { userId: t.layla.id, sideIndex: 2, position: "left" },
            { userId: t.mariam.id, sideIndex: 3, position: "left" },
          ],
        }),
      ).rejects.toThrow(m.editTeams.refused.halfSide);
    } finally {
      await close();
    }
  });
});
