import { and, eq } from "drizzle-orm";
import { onTestFinished } from "vitest";

import {
  GamePositionEnum,
  GroupMemberRoleEnum,
  MatchStatusEnum,
  courts,
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

import { type FootballBib } from "@repo/domain/football-lineup";

import { asDb } from "#src/games/americano.test-support";
import { createGame } from "#src/routers/games/create";
import { createTournament } from "#src/routers/games/createTournament";
import { createSeries } from "#src/routers/series/create";

export const SERIES_TEST_NOW = new Date("2026-11-21T10:00:00Z");
const HOUR = 60 * 60 * 1000;

type Score = readonly [number, number];

export async function insertSeriesUser(
  database: TestDatabase,
  name: string,
  options: { guest?: boolean } = {},
) {
  const [row] = await database
    .insert(user)
    .values(
      options.guest
        ? { name, addedAt: SERIES_TEST_NOW, guestAt: SERIES_TEST_NOW }
        : { name, email: `${crypto.randomUUID()}@example.com` },
    )
    .returning({ id: user.id, name: user.name });
  if (!row) {
    throw new Error("Failed to insert user");
  }
  return row;
}

export function seriesTestWindow(day: string) {
  const windowStart = new Date(`${day}T18:00:00Z`);
  return { windowStart, windowEnd: new Date(windowStart.getTime() + HOUR) };
}

/**
 * A Verified padel Group and a Verified football Group, both Private, with an
 * owner, an Appointed Organizer, a plain member and six players.
 */
export async function seriesFixture() {
  const { db, client, close } = await createPgliteDb();
  onTestFinished(close);
  const owner = await insertSeriesUser(db, "Hassan Haji");
  const organizer = await insertSeriesUser(db, "Omar Saleh");
  const member = await insertSeriesUser(db, "Jassim Kamal");
  const outsider = await insertSeriesUser(db, "Ali Outsider");
  const qasim = await insertSeriesUser(db, "Qasim Albaqali");
  const ahmed = await insertSeriesUser(db, "Ahmed Buhazza");
  const layla = await insertSeriesUser(db, "Layla Haddad");
  const nora = await insertSeriesUser(db, "Nora Nasser");
  const reem = await insertSeriesUser(db, "Reem Faraj");
  const khalid = await insertSeriesUser(db, "Khalid Janahi");
  const guest = await insertSeriesUser(db, "Guest Gamer", { guest: true });
  const [venue] = await db
    .insert(venues)
    .values({ name: "Seef Padel", city: "Manama", country: "BH" })
    .returning({ id: venues.id });
  if (!venue) {
    throw new Error("Failed to insert venue");
  }
  const [pitch] = await db
    .insert(courts)
    .values({ venueId: venue.id, name: "Pitch 1", sport: "football" })
    .returning({ id: courts.id });
  const [padel, football] = await db
    .insert(groups)
    .values([
      {
        name: "Tuesday Night Padel",
        createdBy: owner.id,
        sport: "padel",
        verifiedAt: SERIES_TEST_NOW,
      },
      {
        name: "Karbabad Friday Football",
        createdBy: owner.id,
        sport: "football",
        verifiedAt: SERIES_TEST_NOW,
      },
    ])
    .returning();
  if (!pitch || !padel || !football) {
    throw new Error("Failed to insert fixture");
  }
  const players = [qasim, ahmed, layla, nora, reem, khalid];
  for (const group of [padel, football]) {
    await db.insert(groupMembers).values([
      { groupId: group.id, userId: owner.id },
      {
        groupId: group.id,
        userId: organizer.id,
        role: GroupMemberRoleEnum.ORGANIZER,
      },
      { groupId: group.id, userId: member.id },
      ...players.map((player) => ({ groupId: group.id, userId: player.id })),
    ]);
  }
  return {
    db,
    client,
    owner,
    organizer,
    member,
    outsider,
    qasim,
    ahmed,
    layla,
    nora,
    reem,
    khalid,
    guest,
    venue,
    pitch,
    padel,
    football,
  };
}

export type SeriesFixture = Awaited<ReturnType<typeof seriesFixture>>;

export async function newSeries(
  f: SeriesFixture,
  groupId: string,
  name: string,
) {
  const created = await createSeries(asDb(f.db), {
    groupId,
    userId: f.owner.id,
    name,
    emblem: "cup",
    colour: "gold",
    now: SERIES_TEST_NOW,
  });
  return created.id;
}

export async function padelGame(
  f: SeriesFixture,
  day: string,
  seriesId?: string,
) {
  const created = await createGame(
    asDb(f.db),
    {
      createdBy: f.owner.id,
      groupId: f.padel.id,
      isPublic: false,
      format: "friendly_game",
      registrationMode: "individual",
      venueId: f.venue.id,
      seriesId,
      ...seriesTestWindow(day),
    },
    { now: SERIES_TEST_NOW },
  );
  return created.id;
}

export async function footballGame(
  f: SeriesFixture,
  day: string,
  seriesId?: string,
) {
  const created = await createGame(
    asDb(f.db),
    {
      createdBy: f.owner.id,
      groupId: f.football.id,
      isPublic: false,
      format: "friendly_game",
      registrationMode: "individual",
      venueId: f.venue.id,
      courtId: f.pitch.id,
      seriesId,
      ...seriesTestWindow(day),
    },
    { now: SERIES_TEST_NOW },
  );
  return created.id;
}

export async function roundsSocial(
  f: SeriesFixture,
  day: string,
  seriesId?: string,
) {
  const created = await createTournament(asDb(f.db), {
    createdBy: f.owner.id,
    name: "Sunday Social",
    groupId: f.padel.id,
    isPublic: false,
    tournamentShape: "rounds",
    teamCount: 4,
    poolCount: 1,
    roundCount: 3,
    matchMinutes: 30,
    venueId: f.venue.id,
    seriesId,
    ...seriesTestWindow(day),
  });
  return created.id;
}

async function seat(
  database: TestDatabase,
  gameId: string,
  gameTeamId: string,
  userId: string,
  position: (typeof GamePositionEnum)[keyof typeof GamePositionEnum] | null,
) {
  const existing = await database.query.gamePlayers.findFirst({
    where: and(eq(gamePlayers.gameId, gameId), eq(gamePlayers.userId, userId)),
    columns: { id: true },
  });
  const player =
    existing ??
    (
      await database
        .insert(gamePlayers)
        .values({ gameId, userId })
        .returning({ id: gamePlayers.id })
    )[0];
  if (!player) {
    throw new Error("Failed to seat a player");
  }
  await database
    .insert(gameTeamPlayers)
    .values({ gameTeamId, gamePlayerId: player.id, position });
}

/** Game teams on the Game, each with its players; padel pairs sit left and right. */
export async function seatTeams(
  database: TestDatabase,
  gameId: string,
  teams: readonly {
    userIds: readonly string[];
    sideIndex: number;
    poolIndex?: number;
    bib?: FootballBib;
  }[],
) {
  const ids: string[] = [];
  for (const entry of teams) {
    const [team] = await database
      .insert(gameTeams)
      .values({
        gameId,
        sideIndex: entry.sideIndex,
        poolIndex: entry.poolIndex ?? null,
        bib: entry.bib ?? null,
      })
      .returning({ id: gameTeams.id });
    if (!team) {
      throw new Error("Failed to insert game team");
    }
    const positions =
      entry.userIds.length === 2
        ? [GamePositionEnum.LEFT, GamePositionEnum.RIGHT]
        : [];
    for (const [index, userId] of entry.userIds.entries()) {
      await seat(database, gameId, team.id, userId, positions[index] ?? null);
    }
    ids.push(team.id);
  }
  return ids;
}

export async function setMatchScore(
  database: TestDatabase,
  matchId: string,
  sets: readonly Score[],
) {
  await database.delete(matchSets).where(eq(matchSets.matchId, matchId));
  await database.insert(matchSets).values(
    sets.map(([slot1GamesWon, slot2GamesWon], index) => ({
      matchId,
      setNumber: index + 1,
      slot1GamesWon,
      slot2GamesWon,
    })),
  );
}

/**
 * Seats two sides on a Friendly game and completes its one Match with the
 * given Sets (goals in one Set on a football Game).
 */
export async function playFriendly(
  database: TestDatabase,
  gameId: string,
  sides: readonly [
    { userIds: readonly string[]; bib?: FootballBib },
    { userIds: readonly string[]; bib?: FootballBib },
  ],
  sets: readonly Score[],
  completedAt: Date,
) {
  const [slot1, slot2] = await seatTeams(
    database,
    gameId,
    sides.map((side, index) => ({ ...side, sideIndex: index + 1 })),
  );
  const existing = await database.query.matches.findFirst({
    where: eq(matches.gameId, gameId),
    columns: { id: true },
  });
  const matchId =
    existing?.id ??
    (
      await database
        .insert(matches)
        .values({ gameId })
        .returning({ id: matches.id })
    )[0]?.id;
  if (!matchId) {
    throw new Error("Failed to find the Match");
  }
  await database
    .update(matches)
    .set({
      status: MatchStatusEnum.COMPLETED,
      completedAt,
      slot1GameTeamId: slot1,
      slot2GameTeamId: slot2,
    })
    .where(eq(matches.id, matchId));
  await setMatchScore(database, matchId, sets);
  return matchId;
}

/** Draws four pairs into the Rounds Social's one Pool and posts the draw. */
export async function drawRoundsSocial(
  database: TestDatabase,
  gameId: string,
  pairs: readonly (readonly [string, string])[],
) {
  const ids = await seatTeams(
    database,
    gameId,
    pairs.map((userIds, index) => ({
      userIds,
      sideIndex: index + 1,
      poolIndex: 0,
    })),
  );
  await database
    .update(games)
    .set({ drawPostedAt: SERIES_TEST_NOW })
    .where(eq(games.id, gameId));
  return ids;
}

/** A completed Pool Round: each entry is the two Game teams and their one Set. */
export async function playRound(
  database: TestDatabase,
  gameId: string,
  roundNumber: number,
  pairings: readonly (readonly [string, string, Score])[],
  completedAt: Date,
) {
  const ids: string[] = [];
  for (const [slot1, slot2, score] of pairings) {
    const [row] = await database
      .insert(matches)
      .values({
        gameId,
        roundNumber,
        status: MatchStatusEnum.COMPLETED,
        completedAt,
        slot1GameTeamId: slot1,
        slot2GameTeamId: slot2,
      })
      .returning({ id: matches.id });
    if (!row) {
      throw new Error("Failed to insert match");
    }
    await setMatchScore(database, row.id, [score]);
    ids.push(row.id);
  }
  return ids;
}
