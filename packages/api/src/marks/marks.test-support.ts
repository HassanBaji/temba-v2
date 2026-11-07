import { eq } from "drizzle-orm";

import {
  GamePositionEnum,
  courts,
  gamePlayers,
  gameTeamPlayers,
  gameTeams,
  groupMembers,
  groups,
  matchSets,
  matches,
  user,
  venues,
} from "@repo/db/schema";
import type { TestDatabase } from "@repo/db/testing";

import { type db } from "#src/db";
import { createFriendlyGame } from "#src/games/create-friendly";
import { confirmMatchResult } from "#src/routers/games/confirmMatchResult";
import { createGame } from "#src/routers/games/create";
import { publishFootballTeams } from "#src/routers/games/publishFootballTeams";
import { register } from "#src/routers/games/register";
import { saveFootballScore } from "#src/routers/games/saveFootballScore";
import { scoreSet } from "#src/routers/games/scoreSet";

const HOUR = 60 * 60 * 1000;

/** The doors type their client as Postgres; PGlite runs the same queries. */
function asDb(database: TestDatabase): typeof db {
  return database as unknown as typeof db;
}

type Person = { id: string };

export async function insertUser(database: TestDatabase, name: string) {
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

export async function insertUnclaimedUser(
  database: TestDatabase,
  name: string,
  addedByUserId: string,
) {
  const [row] = await database
    .insert(user)
    .values({
      name,
      phoneNumber: `+9733${Math.floor(Math.random() * 10_000_000)
        .toString()
        .padStart(7, "0")}`,
      addedByUserId,
      addedAt: new Date(),
    })
    .returning({ id: user.id });
  if (!row) {
    throw new Error("Failed to insert Unclaimed player");
  }
  return row;
}

async function insertVenue(database: TestDatabase) {
  const [row] = await database
    .insert(venues)
    .values({
      name: `Venue ${crypto.randomUUID()}`,
      city: "Manama",
      country: "BH",
    })
    .returning({ id: venues.id });
  if (!row) {
    throw new Error("Failed to insert venue");
  }
  return row;
}

export type PadelMarksGame = {
  gameId: string;
  matchId: string;
  groupId: string;
  organizer: Person;
  a: Person;
  b: Person;
  c: Person;
  d: Person;
  member: Person;
  outsider: Person;
};

/**
 * A padel Friendly game on a Group, organized by a User with no seat: `a`
 * and `b` on slot 1, `c` and `d` on slot 2, `member` in the Group but not
 * playing, `outsider` in neither. `d` may be an Unclaimed player.
 */
export async function seatPadelFriendlyGame(
  database: TestDatabase,
  options: { unclaimedD?: boolean } = {},
): Promise<PadelMarksGame> {
  const organizer = await insertUser(database, "Organizer");
  const [a, b, c, member, outsider] = await Promise.all([
    insertUser(database, "Ali"),
    insertUser(database, "Bo"),
    insertUser(database, "Khalid"),
    insertUser(database, "Member"),
    insertUser(database, "Outsider"),
  ]);
  const d = options.unclaimedD
    ? await insertUnclaimedUser(database, "Noor", organizer.id)
    : await insertUser(database, "Noor");
  const venue = await insertVenue(database);
  const [group] = await database
    .insert(groups)
    .values({ name: "Thursday padel", createdBy: organizer.id })
    .returning({ id: groups.id });
  if (!group) {
    throw new Error("Failed to insert group");
  }
  await database.insert(groupMembers).values([
    { groupId: group.id, userId: organizer.id },
    { groupId: group.id, userId: member.id },
  ]);
  const windowStart = new Date(Date.now() - 2 * HOUR);
  const created = await createFriendlyGame(asDb(database), {
    createdBy: organizer.id,
    groupId: group.id,
    venueId: venue.id,
    windowStart,
    windowEnd: new Date(windowStart.getTime() + HOUR),
  });

  const sides = [
    [a, b],
    [c, d],
  ] as const;
  const teamIds: string[] = [];
  for (const [index, side] of sides.entries()) {
    const [team] = await database
      .insert(gameTeams)
      .values({ gameId: created.game.id, sideIndex: index + 1 })
      .returning({ id: gameTeams.id });
    if (!team) {
      throw new Error("Failed to insert Game team");
    }
    teamIds.push(team.id);
    for (const [seat, occupant] of side.entries()) {
      const [player] = await database
        .insert(gamePlayers)
        .values({ gameId: created.game.id, userId: occupant.id })
        .returning({ id: gamePlayers.id });
      if (!player) {
        throw new Error("Failed to insert Game player");
      }
      await database.insert(gameTeamPlayers).values({
        gameTeamId: team.id,
        gamePlayerId: player.id,
        position: seat === 0 ? GamePositionEnum.LEFT : GamePositionEnum.RIGHT,
      });
    }
  }
  await database
    .update(matches)
    .set({ slot1GameTeamId: teamIds[0], slot2GameTeamId: teamIds[1] })
    .where(eq(matches.id, created.matchId));

  return {
    gameId: created.game.id,
    matchId: created.matchId,
    groupId: group.id,
    organizer,
    a,
    b,
    c,
    d,
    member,
    outsider,
  };
}

/** Enters 6–2 as `a` and completes the Match with the Organizer's final confirmation. */
export async function completePadelMatch(
  database: TestDatabase,
  game: PadelMarksGame,
) {
  const firstSet = await database.query.matchSets.findFirst({
    where: eq(matchSets.matchId, game.matchId),
    orderBy: (table, { asc }) => [asc(table.setNumber)],
  });
  if (!firstSet) {
    throw new Error("Expected a Set shell");
  }
  await scoreSet(asDb(database), {
    gameId: game.gameId,
    matchId: game.matchId,
    setId: firstSet.id,
    userId: game.a.id,
    slot1GamesWon: 6,
    slot2GamesWon: 2,
  });
  await confirmMatchResult(asDb(database), {
    gameId: game.gameId,
    matchId: game.matchId,
    userId: game.organizer.id,
  });
}

export type FootballMarksGame = {
  gameId: string;
  matchId: string;
  organizer: Person;
  black: Person[];
  white: Person[];
  keeper: Person;
};

/**
 * A football Friendly game with Black (three players, the last a keeper)
 * against White (two), completed 2–1 with the first Black player scoring
 * twice.
 */
export async function completedFootballFriendlyGame(
  database: TestDatabase,
): Promise<FootballMarksGame> {
  const organizer = await insertUser(database, "Organizer");
  const venue = await insertVenue(database);
  const [pitch] = await database
    .insert(courts)
    .values({ venueId: venue.id, name: "Pitch 1", sport: "football" })
    .returning({ id: courts.id });
  const [group] = await database
    .insert(groups)
    .values({
      name: "Friday Football",
      createdBy: organizer.id,
      sport: "football",
    })
    .returning({ id: groups.id });
  if (!pitch || !group) {
    throw new Error("Failed to insert pitch or group");
  }
  await database
    .insert(groupMembers)
    .values({ groupId: group.id, userId: organizer.id });
  const windowStart = new Date(Date.now() + HOUR);
  const created = await createGame(asDb(database), {
    createdBy: organizer.id,
    groupId: group.id,
    isPublic: false,
    format: "friendly_game",
    registrationMode: "individual",
    venueId: venue.id,
    courtId: pitch.id,
    windowStart,
    windowEnd: new Date(windowStart.getTime() + HOUR),
  });

  async function addPlayer(name: string, keeper = false) {
    const player = await insertUser(database, name);
    await database
      .insert(groupMembers)
      .values({ groupId: group!.id, userId: player.id });
    await register(asDb(database), {
      gameId: created.id,
      userId: player.id,
      football: keeper
        ? { role: "keeper", position: "def" }
        : { role: "outfield", position: "mid" },
    });
    return player;
  }

  const black = [
    await addPlayer("Yousif"),
    await addPlayer("Ali"),
    await addPlayer("Hamad", true),
  ];
  const white = [await addPlayer("Bo"), await addPlayer("Omar")];
  await publishFootballTeams(asDb(database), {
    gameId: created.id,
    userId: organizer.id,
    method: "manual",
    bibs: { slot1: "black", slot2: "white" },
    slot1: black.map((player) => player.id),
    slot2: white.map((player) => player.id),
  });
  const afterKickoff = new Date(windowStart.getTime() + 2 * HOUR);
  await saveFootballScore(
    asDb(database),
    {
      gameId: created.id,
      userId: organizer.id,
      slot1Goals: 2,
      slot2Goals: 1,
      scorers: [{ userId: black[0]!.id, goals: 2 }],
    },
    afterKickoff,
  );
  const match = await database.query.matches.findFirst({
    where: eq(matches.gameId, created.id),
  });
  if (!match) {
    throw new Error("Expected the football Match");
  }
  await confirmMatchResult(asDb(database), {
    gameId: created.id,
    matchId: match.id,
    userId: organizer.id,
  });

  return {
    gameId: created.id,
    matchId: match.id,
    organizer,
    black,
    white,
    keeper: black[2]!,
  };
}

export async function matchCompletedAt(
  database: TestDatabase,
  matchId: string,
) {
  const match = await database.query.matches.findFirst({
    where: eq(matches.id, matchId),
    columns: { completedAt: true },
  });
  return match?.completedAt ?? null;
}

export const MARKS_HOUR = HOUR;
