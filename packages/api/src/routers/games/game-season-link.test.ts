import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import {
  GamePositionEnum,
  MatchStatusEnum,
  gamePlayers,
  gameTeamPlayers,
  gameTeams,
  games,
  groupMembers,
  groups,
  matchSets,
  matches,
  user,
  venues,
} from "@repo/db/schema";
import { createPgliteDb, type TestDatabase } from "@repo/db/testing";

import { gameById } from "#src/routers/games/byId";
import { createGame } from "#src/routers/games/create";
import { updateGameSeason } from "#src/routers/games/updateSeason";
import { updateGameWindow } from "#src/routers/games/updateWindow";
import { closeSeason } from "#src/routers/groups/closeSeason";
import { createSeason } from "#src/routers/groups/createSeason";
import { seasonStanding } from "#src/routers/groups/seasonStanding";

const NOW = new Date("2026-11-02T10:00:00Z");

async function insertUser(database: TestDatabase, name: string) {
  const [row] = await database
    .insert(user)
    .values({ name, email: `${name}-${crypto.randomUUID()}@example.com` })
    .returning({ id: user.id });
  if (!row) {
    throw new Error("Failed to insert user");
  }
  return row;
}

async function fixture() {
  const { db, close } = await createPgliteDb();
  const owner = await insertUser(db, "owner");
  const rival = await insertUser(db, "rival");
  const [group] = await db
    .insert(groups)
    .values({
      name: "Tuesday Night Padel",
      createdBy: owner.id,
      sport: "padel",
    })
    .returning({ id: groups.id });
  const [venue] = await db
    .insert(venues)
    .values({ name: "Seef Padel", city: "Manama", country: "BH" })
    .returning({ id: venues.id });
  if (!group || !venue) {
    throw new Error("Failed to insert fixture");
  }
  for (const userId of [owner.id, rival.id]) {
    await db.insert(groupMembers).values({ groupId: group.id, userId });
  }
  const s3 = await createSeason(db, {
    groupId: group.id,
    name: "Season 3",
    startsOn: "2026-11-01",
    endsOn: "2027-01-31",
    userId: owner.id,
    now: NOW,
  });
  const s4 = await createSeason(db, {
    groupId: group.id,
    name: "Season 4",
    startsOn: "2027-02-01",
    endsOn: "2027-04-30",
    userId: owner.id,
    now: NOW,
  });
  return { db, close, owner, rival, group, venue, s3, s4 };
}

type Fixture = Awaited<ReturnType<typeof fixture>>;

function dayAt(iso: string) {
  const windowStart = new Date(iso);
  return {
    windowStart,
    windowEnd: new Date(windowStart.getTime() + 90 * 60 * 1000),
  };
}

async function createOn(f: Fixture, iso: string) {
  const created = await createGame(f.db, {
    createdBy: f.owner.id,
    groupId: f.group.id,
    venueId: f.venue.id,
    isPublic: false,
    format: "friendly_game",
    registrationMode: "individual",
    ...dayAt(iso),
  });
  return created.id;
}

async function seasonOf(f: Fixture, gameId: string) {
  const row = await f.db.query.games.findFirst({
    where: eq(games.id, gameId),
    columns: { seasonId: true },
  });
  return row?.seasonId ?? null;
}

async function completeMatch(f: Fixture, gameId: string) {
  const [slot1Team] = await f.db
    .insert(gameTeams)
    .values({ gameId, sideIndex: 1 })
    .returning({ id: gameTeams.id });
  const [slot2Team] = await f.db
    .insert(gameTeams)
    .values({ gameId, sideIndex: 2 })
    .returning({ id: gameTeams.id });
  if (!slot1Team || !slot2Team) {
    throw new Error("Failed to insert game teams");
  }
  for (const [teamId, userId] of [
    [slot1Team.id, f.owner.id],
    [slot2Team.id, f.rival.id],
  ] as const) {
    const [player] = await f.db
      .insert(gamePlayers)
      .values({ gameId, userId })
      .returning({ id: gamePlayers.id });
    if (!player) {
      throw new Error("Failed to insert game player");
    }
    await f.db.insert(gameTeamPlayers).values({
      gameTeamId: teamId,
      gamePlayerId: player.id,
      position: GamePositionEnum.LEFT,
    });
  }
  const game = await f.db.query.games.findFirst({
    where: eq(games.id, gameId),
  });
  const existing = await f.db.query.matches.findFirst({
    where: eq(matches.gameId, gameId),
  });
  const matchId =
    existing?.id ??
    (
      await f.db
        .insert(matches)
        .values({ gameId, startTime: game?.windowStart })
        .returning({ id: matches.id })
    )[0]?.id;
  if (!matchId) {
    throw new Error("Failed to insert match");
  }
  await f.db
    .update(matches)
    .set({
      status: MatchStatusEnum.COMPLETED,
      slot1GameTeamId: slot1Team.id,
      slot2GameTeamId: slot2Team.id,
    })
    .where(eq(matches.id, matchId));
  await f.db
    .insert(matchSets)
    .values({ matchId, setNumber: 1, slot1GamesWon: 6, slot2GamesWon: 3 })
    .onConflictDoUpdate({
      target: [matchSets.matchId, matchSets.setNumber],
      set: { slot1GamesWon: 6, slot2GamesWon: 3 },
    });
}

describe("a Game's Season link", () => {
  it("starts in the Season that holds the game day and reads it on byId", async () => {
    const f = await fixture();
    try {
      const inS3 = await createOn(f, "2026-11-10T16:00:00Z");
      const inS4 = await createOn(f, "2027-02-10T16:00:00Z");
      const nowhere = await createOn(f, "2027-06-10T16:00:00Z");
      expect(await seasonOf(f, inS3)).toBe(f.s3.id);
      expect(await seasonOf(f, inS4)).toBe(f.s4.id);
      expect(await seasonOf(f, nowhere)).toBeNull();

      const view = await gameById(f.db, { gameId: inS3, userId: f.owner.id });
      expect(view.seasonId).toBe(f.s3.id);
      expect(view.season).toMatchObject({ name: "Season 3", status: "active" });
      expect(view.groupSeasons.map((season) => season.name).sort()).toEqual([
        "Season 3",
        "Season 4",
      ]);
      expect(view.canChangeSeason).toBe(true);
      const asRival = await gameById(f.db, {
        gameId: inS3,
        userId: f.rival.id,
      });
      expect(asRival.canChangeSeason).toBe(false);
    } finally {
      await f.close();
    }
  });

  it("links, unlinks and refuses a Season that does not hold the day", async () => {
    const f = await fixture();
    try {
      const gameId = await createOn(f, "2026-11-10T16:00:00Z");
      const unlinked = await updateGameSeason(f.db, {
        gameId,
        userId: f.owner.id,
        seasonId: null,
        now: NOW,
      });
      expect(unlinked.seasonId).toBeNull();
      expect(await seasonOf(f, gameId)).toBeNull();

      await expect(
        updateGameSeason(f.db, {
          gameId,
          userId: f.owner.id,
          seasonId: f.s4.id,
          now: NOW,
        }),
      ).rejects.toThrow("Tue 10 Nov is outside Season 4");

      await updateGameSeason(f.db, {
        gameId,
        userId: f.owner.id,
        seasonId: f.s3.id,
        now: NOW,
      });
      expect(await seasonOf(f, gameId)).toBe(f.s3.id);

      await expect(
        updateGameSeason(f.db, {
          gameId,
          userId: f.rival.id,
          seasonId: null,
          now: NOW,
        }),
      ).rejects.toThrow();

      const other = await insertUser(f.db, "other");
      const [otherGroup] = await f.db
        .insert(groups)
        .values({ name: "Other", createdBy: other.id, sport: "padel" })
        .returning({ id: groups.id });
      const foreign = await createSeason(f.db, {
        groupId: otherGroup!.id,
        name: "Elsewhere",
        startsOn: "2026-11-01",
        endsOn: "2027-01-31",
        userId: other.id,
        now: NOW,
      });
      await expect(
        updateGameSeason(f.db, {
          gameId,
          userId: f.owner.id,
          seasonId: foreign.id,
          now: NOW,
        }),
      ).rejects.toThrow("Pick a season of this Game's Group");
    } finally {
      await f.close();
    }
  });

  it("moves the link with the day, or refuses a day the Season does not hold", async () => {
    const f = await fixture();
    try {
      const gameId = await createOn(f, "2026-11-10T16:00:00Z");
      const base = {
        gameId,
        userId: f.owner.id,
        name: "Sun 7:00 PM - 8:30 PM",
      };

      await expect(
        updateGameWindow(f.db, { ...base, ...dayAt("2027-02-07T16:00:00Z") }),
      ).rejects.toThrow("Sun 7 Feb is outside Season 3");
      expect(await seasonOf(f, gameId)).toBe(f.s3.id);

      await updateGameWindow(f.db, {
        ...base,
        ...dayAt("2027-02-07T16:00:00Z"),
        seasonId: f.s4.id,
      });
      expect(await seasonOf(f, gameId)).toBe(f.s4.id);

      await updateGameWindow(f.db, {
        ...base,
        ...dayAt("2027-06-07T16:00:00Z"),
        seasonId: null,
      });
      expect(await seasonOf(f, gameId)).toBeNull();

      await updateGameWindow(f.db, {
        ...base,
        ...dayAt("2026-12-07T16:00:00Z"),
      });
      expect(await seasonOf(f, gameId)).toBeNull();
    } finally {
      await f.close();
    }
  });

  it("counts a result in the linked Season only, and locks the link once confirmed", async () => {
    const f = await fixture();
    try {
      const linked = await createOn(f, "2026-11-10T16:00:00Z");
      const friendly = await createOn(f, "2026-11-11T16:00:00Z");
      await updateGameSeason(f.db, {
        gameId: friendly,
        userId: f.owner.id,
        seasonId: null,
        now: NOW,
      });
      await completeMatch(f, linked);
      await completeMatch(f, friendly);

      const inSeason = await seasonStanding(f.db, {
        groupId: f.group.id,
        seasonId: f.s3.id,
        userId: f.owner.id,
        now: NOW,
      });
      expect(inSeason.gamesCounted).toBe(1);
      const allTime = await seasonStanding(f.db, {
        groupId: f.group.id,
        seasonId: null,
        userId: f.owner.id,
        now: NOW,
      });
      expect(allTime.gamesCounted).toBe(2);

      const view = await gameById(f.db, { gameId: linked, userId: f.owner.id });
      expect(view.canChangeSeason).toBe(false);
      await expect(
        updateGameSeason(f.db, {
          gameId: linked,
          userId: f.owner.id,
          seasonId: null,
          now: NOW,
        }),
      ).rejects.toThrow("score is confirmed");
    } finally {
      await f.close();
    }
  });

  it("re-homes later Games when a Season closes early, and a new Season takes them", async () => {
    const f = await fixture();
    try {
      const played = await createOn(f, "2026-11-01T16:00:00Z");
      const later = await createOn(f, "2026-12-10T16:00:00Z");
      await closeSeason(f.db, {
        seasonId: f.s3.id,
        userId: f.owner.id,
        now: NOW,
      });
      expect(await seasonOf(f, played)).toBe(f.s3.id);
      expect(await seasonOf(f, later)).toBeNull();

      const next = await createSeason(f.db, {
        groupId: f.group.id,
        name: "Season 3b",
        startsOn: "2026-11-03",
        endsOn: "2027-01-31",
        userId: f.owner.id,
        now: NOW,
      });
      expect(await seasonOf(f, later)).toBe(next.id);
      expect(await seasonOf(f, played)).toBe(f.s3.id);
    } finally {
      await f.close();
    }
  });
});
