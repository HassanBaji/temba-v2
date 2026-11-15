import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import {
  GameFormatEnum,
  GamePositionEnum,
  GameRegistrationModeEnum,
  MatchStatusEnum,
  gamePlayers,
  gameTeamPlayers,
  gameTeams,
  games,
  groupMembers,
  groupSeasons,
  groups,
  matchSets,
  matches,
  user,
  venues,
} from "@repo/db/schema";

import { groupById } from "#src/routers/groups/byId";
import { closeSeason } from "#src/routers/groups/closeSeason";
import { createSeason } from "#src/routers/groups/createSeason";
import { listSeasons } from "#src/routers/groups/listSeasons";
import { mine } from "#src/routers/groups/mine";
import { seasonStanding } from "#src/routers/groups/seasonStanding";
import { createPgliteDb, type TestDatabase } from "@repo/db/testing";

const NOW = new Date("2026-11-04T10:00:00Z");

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

async function insertGroup(
  database: TestDatabase,
  createdBy: string,
  members: string[],
) {
  const [row] = await database
    .insert(groups)
    .values({ name: "Tuesday Night Padel", createdBy, sport: "padel" })
    .returning({ id: groups.id });
  if (!row) {
    throw new Error("Failed to insert group");
  }
  for (const userId of [createdBy, ...members]) {
    await database.insert(groupMembers).values({ groupId: row.id, userId });
  }
  return row;
}

async function playedMatch(
  database: TestDatabase,
  args: {
    groupId: string;
    createdBy: string;
    venueId: string;
    startTime: Date;
    winnerId: string;
    loserId: string;
    status?: MatchStatusEnum;
  },
) {
  const [game] = await database
    .insert(games)
    .values({
      name: "Session",
      format: GameFormatEnum.FRIENDLY_GAME,
      registrationMode: GameRegistrationModeEnum.INDIVIDUAL,
      venueId: args.venueId,
      createdBy: args.createdBy,
      groupId: args.groupId,
      playersAllowed: 4,
      teamsAllowed: 2,
      windowStart: args.startTime,
      windowEnd: new Date(args.startTime.getTime() + 90 * 60 * 1000),
    })
    .returning({ id: games.id });
  if (!game) {
    throw new Error("Failed to insert game");
  }
  const [slot1Team] = await database
    .insert(gameTeams)
    .values({ gameId: game.id, sideIndex: 1 })
    .returning({ id: gameTeams.id });
  const [slot2Team] = await database
    .insert(gameTeams)
    .values({ gameId: game.id, sideIndex: 2 })
    .returning({ id: gameTeams.id });
  if (!slot1Team || !slot2Team) {
    throw new Error("Failed to insert game teams");
  }
  for (const [teamId, userId] of [
    [slot1Team.id, args.winnerId],
    [slot2Team.id, args.loserId],
  ] as const) {
    const [player] = await database
      .insert(gamePlayers)
      .values({ gameId: game.id, userId })
      .returning({ id: gamePlayers.id });
    if (!player) {
      throw new Error("Failed to insert game player");
    }
    await database.insert(gameTeamPlayers).values({
      gameTeamId: teamId,
      gamePlayerId: player.id,
      position: GamePositionEnum.LEFT,
    });
  }
  const [match] = await database
    .insert(matches)
    .values({
      gameId: game.id,
      startTime: args.startTime,
      status: args.status ?? MatchStatusEnum.COMPLETED,
      slot1GameTeamId: slot1Team.id,
      slot2GameTeamId: slot2Team.id,
    })
    .returning({ id: matches.id });
  if (!match) {
    throw new Error("Failed to insert match");
  }
  await database.insert(matchSets).values({
    matchId: match.id,
    setNumber: 1,
    slot1GamesWon: 6,
    slot2GamesWon: 3,
  });
}

async function rejection(promise: Promise<unknown>) {
  const error = await promise.then(
    () => null,
    (caught: unknown) => caught,
  );
  expect(error).toBeInstanceOf(TRPCError);
  return error as TRPCError;
}

describe("Seasons", () => {
  it("lets the owner open a Season, refuses an overlap and a member", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const owner = await insertUser(db, "owner@example.com");
      const member = await insertUser(db, "member@example.com");
      const group = await insertGroup(db, owner.id, [member.id]);

      const created = await createSeason(db, {
        groupId: group.id,
        name: "Season 1",
        startsOn: "2026-11-01",
        endsOn: "2027-01-31",
        userId: owner.id,
        now: NOW,
      });
      expect(created).toMatchObject({ name: "Season 1", status: "active" });

      const overlap = await rejection(
        createSeason(db, {
          groupId: group.id,
          name: "Season 2",
          startsOn: "2027-01-31",
          endsOn: "2027-04-30",
          userId: owner.id,
          now: NOW,
        }),
      );
      expect(overlap.message).toBe("Seasons can't overlap.");

      const forbidden = await rejection(
        createSeason(db, {
          groupId: group.id,
          name: "Season 2",
          startsOn: "2027-02-01",
          endsOn: "2027-04-30",
          userId: member.id,
          now: NOW,
        }),
      );
      expect(forbidden.code).toBe("FORBIDDEN");

      const listed = await listSeasons(db, {
        groupId: group.id,
        userId: member.id,
        now: NOW,
      });
      expect(listed.canManage).toBe(false);
      expect(listed.seasons.map((season) => season.name)).toEqual(["Season 1"]);
    } finally {
      await close();
    }
  });

  it("scopes the Standing to the active Season and keeps all-time behind the chip", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const owner = await insertUser(db, "owner2@example.com");
      const rival = await insertUser(db, "rival2@example.com");
      const group = await insertGroup(db, owner.id, [rival.id]);
      const [venue] = await db
        .insert(venues)
        .values({ name: "Seef Padel", city: "Manama", country: "BH" })
        .returning({ id: venues.id });
      if (!venue) {
        throw new Error("Failed to insert venue");
      }
      const base = {
        groupId: group.id,
        createdBy: owner.id,
        venueId: venue.id,
      };
      // Last season: the rival won three times.
      for (const day of [1, 8, 15]) {
        await playedMatch(db, {
          ...base,
          startTime: new Date(Date.UTC(2026, 8, day, 17)),
          winnerId: rival.id,
          loserId: owner.id,
        });
      }
      // This season: the owner won three times, one more is still pending.
      for (const day of [1, 2, 3]) {
        await playedMatch(db, {
          ...base,
          startTime: new Date(Date.UTC(2026, 10, day, 17)),
          winnerId: owner.id,
          loserId: rival.id,
        });
      }
      await playedMatch(db, {
        ...base,
        startTime: new Date(Date.UTC(2026, 10, 3, 19)),
        winnerId: owner.id,
        loserId: rival.id,
        status: MatchStatusEnum.PENDING,
      });

      const last = await createSeason(db, {
        groupId: group.id,
        name: "Season 1",
        startsOn: "2026-08-01",
        endsOn: "2026-10-31",
        userId: owner.id,
        now: NOW,
      });
      const current = await createSeason(db, {
        groupId: group.id,
        name: "Season 2",
        startsOn: "2026-11-01",
        endsOn: "2027-01-31",
        userId: owner.id,
        now: NOW,
      });

      const detail = await groupById(db, {
        groupId: group.id,
        userId: rival.id,
        now: NOW,
      });
      expect(detail.standing.seasonId).toBe(current.id);
      expect(detail.standing.gamesCounted).toBe(3);
      expect(detail.seasons.map((season) => season.status)).toEqual([
        "closed",
        "active",
      ]);
      expect(
        detail.standing.leaderboard.map((row) => [
          row.name,
          row.position,
          row.played,
          row.wins,
          row.losses,
          row.points,
        ]),
      ).toEqual([
        ["owner2", 1, 3, 3, 0, 9],
        ["rival2", 2, 3, 0, 3, 0],
      ]);
      expect(detail.standing.leaderboard[0]?.form).toEqual([
        "won",
        "won",
        "won",
      ]);
      expect(detail.membership?.standingPosition).toBe(2);
      expect(detail.canManageSeasons).toBe(false);

      const [listRow] = await mine(db, { userId: rival.id, now: NOW });
      expect(listRow?.standingPosition).toBe(2);

      const previous = await seasonStanding(db, {
        groupId: group.id,
        seasonId: last.id,
        userId: rival.id,
        now: NOW,
      });
      expect(previous.gamesCounted).toBe(3);
      expect(
        previous.rows.map((row) => [row.name, row.position, row.points]),
      ).toEqual([
        ["rival2", 1, 9],
        ["owner2", 2, 0],
      ]);

      const allTime = await seasonStanding(db, {
        groupId: group.id,
        seasonId: null,
        userId: rival.id,
        now: NOW,
      });
      expect(allTime.gamesCounted).toBe(6);
      expect(
        allTime.rows.map((row) => [row.name, row.points, row.isViewer]),
      ).toEqual([
        ["owner2", 9, false],
        ["rival2", 9, true],
      ]);
    } finally {
      await close();
    }
  });

  it("closes the active Season today and refuses a closed one", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const owner = await insertUser(db, "owner3@example.com");
      const group = await insertGroup(db, owner.id, []);
      const season = await createSeason(db, {
        groupId: group.id,
        name: "Season 1",
        startsOn: "2026-11-01",
        endsOn: "2027-01-31",
        userId: owner.id,
        now: NOW,
      });

      const closed = await closeSeason(db, {
        seasonId: season.id,
        userId: owner.id,
        now: NOW,
      });
      expect(closed).toMatchObject({
        status: "closed",
        endsOn: "2026-11-04",
      });
      expect(closed.closedAt).toEqual(NOW);

      const again = await rejection(
        closeSeason(db, { seasonId: season.id, userId: owner.id, now: NOW }),
      );
      expect(again.message).toBe("Only an active season can be closed");

      const next = await createSeason(db, {
        groupId: group.id,
        name: "Season 2",
        startsOn: "2026-11-05",
        endsOn: "2027-01-31",
        userId: owner.id,
        now: NOW,
      });
      expect(next.status).toBe("upcoming");
      const detail = await groupById(db, {
        groupId: group.id,
        userId: owner.id,
        now: NOW,
      });
      expect(detail.standing.seasonId).toBe(next.id);
      expect(detail.canManageSeasons).toBe(true);
    } finally {
      await close();
    }
  });

  it("opens only one of two overlapping Seasons created at once", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const owner = await insertUser(db, "owner-overlap@example.com");
      const group = await insertGroup(db, owner.id, []);
      const create = (name: string) =>
        createSeason(db, {
          groupId: group.id,
          name,
          startsOn: "2026-11-01",
          endsOn: "2027-01-31",
          userId: owner.id,
          now: NOW,
        });

      const results = await Promise.allSettled([
        create("Season A"),
        create("Season B"),
      ]);
      expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
      expect(
        await db.query.groupSeasons.findMany({
          where: eq(groupSeasons.groupId, group.id),
        }),
      ).toHaveLength(1);
    } finally {
      await close();
    }
  });

  it("re-homes the Games later on the closing day, and keeps the ones already started", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const owner = await insertUser(db, "owner-close-day@example.com");
      const group = await insertGroup(db, owner.id, []);
      const [venue] = await db
        .insert(venues)
        .values({ name: "Club", city: "Manama", country: "BH" })
        .returning({ id: venues.id });
      const season = await createSeason(db, {
        groupId: group.id,
        name: "Season 1",
        startsOn: "2026-11-01",
        endsOn: "2027-01-31",
        userId: owner.id,
        now: NOW,
      });
      const gameAt = async (windowStart: Date) => {
        const [game] = await db
          .insert(games)
          .values({
            name: "Session",
            format: GameFormatEnum.FRIENDLY_GAME,
            registrationMode: GameRegistrationModeEnum.INDIVIDUAL,
            venueId: venue!.id,
            createdBy: owner.id,
            groupId: group.id,
            seasonId: season.id,
            playersAllowed: 4,
            teamsAllowed: 2,
            windowStart,
            windowEnd: new Date(windowStart.getTime() + 90 * 60 * 1000),
          })
          .returning({ id: games.id });
        return game!.id;
      };
      const earlier = await gameAt(
        new Date(NOW.getTime() - 2 * 60 * 60 * 1000),
      );
      const later = await gameAt(new Date(NOW.getTime() + 4 * 60 * 60 * 1000));

      await closeSeason(db, {
        seasonId: season.id,
        userId: owner.id,
        now: NOW,
      });

      const seasonOf = async (gameId: string) =>
        (
          await db.query.games.findFirst({
            where: eq(games.id, gameId),
            columns: { seasonId: true },
          })
        )?.seasonId;
      expect(await seasonOf(earlier)).toBe(season.id);
      expect(await seasonOf(later)).toBeNull();
    } finally {
      await close();
    }
  });
});
