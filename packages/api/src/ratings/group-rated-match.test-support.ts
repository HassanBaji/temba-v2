import { eq } from "drizzle-orm";

import {
  GamePositionEnum,
  courts,
  gamePlayers,
  gameTeamPlayers,
  gameTeams,
  groupMembers,
  groupTierEvents,
  groups,
  matchRatingWindows,
  matches,
  user,
  venues,
} from "@repo/db/schema";
import type { TestDatabase } from "@repo/db/testing";

import { createFriendlyGame } from "#src/games/create-friendly";
import { confirmMatchResult } from "#src/routers/games/confirmMatchResult";
import { createGame } from "#src/routers/games/create";
import { publishFootballTeams } from "#src/routers/games/publishFootballTeams";
import { register } from "#src/routers/games/register";
import { saveFootballScore } from "#src/routers/games/saveFootballScore";
import { scoreSet } from "#src/routers/games/scoreSet";
import { settleRatingWindow } from "#src/ratings/settle-rating-window";

type Player = Awaited<ReturnType<typeof insertUser>>;

export async function insertUser(database: TestDatabase, label: string) {
  const [row] = await database
    .insert(user)
    .values({
      name: label,
      email: `${label}-${crypto.randomUUID()}@example.com`,
    })
    .returning();
  if (!row) {
    throw new Error("Failed to insert user");
  }
  return row;
}

/** Four members of a new Group seated on a scored Friendly game: a and b beat c and d 6–2. */
export async function setUpMatch(
  database: TestDatabase,
  flags: { rated: boolean; groupRated: boolean },
  existing?: {
    players: [Player, Player, Player, Player];
    groupId: string;
    venueId: string;
  },
) {
  const players =
    existing?.players ??
    (await Promise.all(
      ["a", "b", "c", "d"].map((label) => insertUser(database, label)),
    ));
  const [a, b, c, d] = players;
  if (!a || !b || !c || !d) {
    throw new Error("Failed to insert Users");
  }
  let venueId = existing?.venueId;
  let groupId = existing?.groupId;
  if (!venueId || !groupId) {
    const [venue] = await database
      .insert(venues)
      .values({ name: "Club", city: "Manama", country: "BH" })
      .returning();
    const [group] = await database
      .insert(groups)
      .values({ name: "Crew", createdBy: a.id })
      .returning();
    if (!venue || !group) {
      throw new Error("Failed to insert venue or group");
    }
    await database
      .insert(groupMembers)
      .values(
        players.map((member) => ({ groupId: group.id, userId: member.id })),
      );
    venueId = venue.id;
    groupId = group.id;
  }

  const created = await createFriendlyGame(database, {
    createdBy: a.id,
    groupId,
    venueId,
    windowStart: new Date(Date.now() - 2 * 60 * 60 * 1000),
    windowEnd: new Date(Date.now() - 60 * 60 * 1000),
    ...flags,
  });

  const teamIds: string[] = [];
  for (const [sideIndex, pair] of [
    [1, [a, b]],
    [2, [c, d]],
  ] as const) {
    const [team] = await database
      .insert(gameTeams)
      .values({ gameId: created.game.id, sideIndex })
      .returning({ id: gameTeams.id });
    if (!team) {
      throw new Error("Failed to insert game team");
    }
    teamIds.push(team.id);
    for (const [index, member] of pair.entries()) {
      const [player] = await database
        .insert(gamePlayers)
        .values({ gameId: created.game.id, userId: member.id })
        .returning({ id: gamePlayers.id });
      if (!player) {
        throw new Error("Failed to insert game player");
      }
      await database.insert(gameTeamPlayers).values({
        gameTeamId: team.id,
        gamePlayerId: player.id,
        position: index === 0 ? GamePositionEnum.LEFT : GamePositionEnum.RIGHT,
      });
    }
  }
  await database
    .update(matches)
    .set({ slot1GameTeamId: teamIds[0], slot2GameTeamId: teamIds[1] })
    .where(eq(matches.id, created.matchId));

  const set = await database.query.matchSets.findFirst({
    where: (table, { eq: equals }) => equals(table.matchId, created.matchId),
  });
  if (!set) {
    throw new Error("Expected a Set shell");
  }
  await scoreSet(database as unknown as Parameters<typeof scoreSet>[0], {
    gameId: created.game.id,
    matchId: created.matchId,
    setId: set.id,
    userId: a.id,
    slot1GamesWon: 6,
    slot2GamesWon: 2,
  });

  return {
    gameId: created.game.id,
    groupId,
    venueId,
    matchId: created.matchId,
    a,
    b,
    c,
    d,
  };
}

const HOUR = 60 * 60 * 1000;

type ApiDb = Parameters<typeof createGame>[0];

function apiDb(database: TestDatabase) {
  return database as unknown as ApiDb;
}

/** A football Game on a football Group, a tier Group unless Verified. */
export type FootballFixture = {
  db: TestDatabase;
  organizerId: string;
  groupId: string;
  venueId: string;
  pitchId: string;
  gameId: string;
  kickoff: Date;
};

async function footballGroup(
  database: TestDatabase,
  options: { verified?: boolean } = {},
) {
  const organizer = await insertUser(database, "organizer");
  const [venue] = await database
    .insert(venues)
    .values({
      name: `Venue ${crypto.randomUUID()}`,
      city: "Manama",
      country: "BH",
    })
    .returning({ id: venues.id });
  const [pitch] = await database
    .insert(courts)
    .values({ venueId: venue!.id, name: "Pitch 1", sport: "football" })
    .returning({ id: courts.id });
  const [group] = await database
    .insert(groups)
    .values({
      name: "Thursday Football",
      createdBy: organizer.id,
      sport: "football",
      verifiedAt: options.verified ? new Date() : null,
    })
    .returning({ id: groups.id });
  await database
    .insert(groupMembers)
    .values({ groupId: group!.id, userId: organizer.id });
  return {
    organizerId: organizer.id,
    groupId: group!.id,
    venueId: venue!.id,
    pitchId: pitch!.id,
  };
}

async function createFootballGame(
  database: TestDatabase,
  group: Awaited<ReturnType<typeof footballGroup>>,
  options: { rated?: boolean; startsInHours?: number },
): Promise<FootballFixture> {
  const kickoff = new Date(Date.now() + (options.startsInHours ?? 1) * HOUR);
  const created = await createGame(apiDb(database), {
    createdBy: group.organizerId,
    groupId: group.groupId,
    isPublic: false,
    format: "friendly_game",
    registrationMode: "individual",
    venueId: group.venueId,
    courtId: group.pitchId,
    windowStart: kickoff,
    windowEnd: new Date(kickoff.getTime() + HOUR),
    ...(options.rated === false ? { rated: false } : {}),
  });
  return { db: database, ...group, gameId: created.id, kickoff };
}

/** A new football Group and one upcoming Game on it. */
export async function footballGame(
  database: TestDatabase,
  options: { verified?: boolean; rated?: boolean } = {},
): Promise<FootballFixture> {
  const group = await footballGroup(database, options);
  return createFootballGame(database, group, options);
}

/** Another upcoming Game on the same Group, starting later. */
export async function nextFootballGame(
  f: FootballFixture,
  startsInHours: number,
): Promise<FootballFixture> {
  return createFootballGame(f.db, f, { startsInHours });
}

/** A new member of the Group, registered on the fixture's Game. */
export async function addMember(f: FootballFixture, name: string) {
  const member = await insertUser(f.db, name);
  await f.db
    .insert(groupMembers)
    .values({ groupId: f.groupId, userId: member.id });
  await register(apiDb(f.db), { gameId: f.gameId, userId: member.id });
  return member.id;
}

/**
 * Publishes the two sides, enters the Score after kick-off and confirms it as
 * the Organizer, which completes the Match. Every player must be registered.
 */
export async function playScore(
  f: FootballFixture,
  slot1: string[],
  slot2: string[],
  score: { slot1: number; slot2: number },
) {
  await publishFootballTeams(apiDb(f.db), {
    gameId: f.gameId,
    userId: f.organizerId,
    method: "manual",
    bibs: { slot1: "black", slot2: "white" },
    slot1,
    slot2,
  });
  await saveFootballScore(
    apiDb(f.db),
    {
      gameId: f.gameId,
      userId: f.organizerId,
      slot1Goals: score.slot1,
      slot2Goals: score.slot2,
      scorers: [],
    },
    new Date(f.kickoff.getTime() + 2 * HOUR),
  );
  const match = await f.db.query.matches.findFirst({
    where: eq(matches.gameId, f.gameId),
  });
  await confirmMatchResult(apiDb(f.db), {
    gameId: f.gameId,
    matchId: match!.id,
    userId: f.organizerId,
  });
  return match!.id;
}

export async function tierEvents(database: TestDatabase, matchId: string) {
  return database.query.groupTierEvents.findMany({
    where: eq(groupTierEvents.matchId, matchId),
  });
}

/** The Group's Rating settings, as an Organizer would set them (ADR-0068). */
export async function setRatingSettings(
  f: FootballFixture,
  settings: {
    mode: "off" | "organizer" | "everyone";
    weightPercent?: number;
    organizerCountsDouble?: boolean;
  },
) {
  await f.db
    .update(groups)
    .set({
      performanceRatingMode: settings.mode,
      performanceWeightPercent: settings.weightPercent ?? 30,
      organizerCountsDouble: settings.organizerCountsDouble ?? false,
    })
    .where(eq(groups.id, f.groupId));
}

/** Seats the Group's Organizer on the fixture's Game as a player. */
export async function registerOrganizer(f: FootballFixture) {
  await register(apiDb(f.db), { gameId: f.gameId, userId: f.organizerId });
  return f.organizerId;
}

/** Settles a Match's Rating window at its close, as the Job would. */
export async function closeRatingWindow(
  database: TestDatabase,
  matchId: string,
) {
  const window = await database.query.matchRatingWindows.findFirst({
    where: eq(matchRatingWindows.matchId, matchId),
  });
  if (!window) {
    throw new Error("The Match has no Rating window");
  }
  return settleRatingWindow(apiDb(database), matchId, window.closesAt);
}

/** Plays the Score, then settles the Rating window it opened. */
export async function playAndSettle(
  f: FootballFixture,
  slot1: string[],
  slot2: string[],
  score: { slot1: number; slot2: number },
) {
  const matchId = await playScore(f, slot1, slot2, score);
  await closeRatingWindow(f.db, matchId);
  return matchId;
}
