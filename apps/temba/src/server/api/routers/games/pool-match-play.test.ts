import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import {
  MatchStatusEnum,
  courts,
  games,
  groupMembers,
  groups,
  matches,
  ratingEvents,
  user,
  venues,
} from "@repo/db/schema";

import { addSet } from "~/server/api/routers/games/addSet";
import { confirmMatchResult } from "~/server/api/routers/games/confirmMatchResult";
import { createTournament } from "~/server/api/routers/games/createTournament";
import { drawPools } from "~/server/api/routers/games/drawPools";
import { listMyMatchHistoryRows } from "~/server/api/routers/games/listMyMatchHistory";
import { postPoolDraw } from "~/server/api/routers/games/postPoolDraw";
import { registerSeat } from "~/server/api/routers/games/registerSeat";
import { scoreSet } from "~/server/api/routers/games/scoreSet";
import { updateMatch } from "~/server/api/routers/games/updateMatch";
import { createPgliteDb, type TestDatabase } from "~/server/test/pglite";

const NOW = new Date("2026-09-20T16:00:00.000Z");

async function insertUser(
  database: TestDatabase,
  email: string,
  name?: string,
) {
  const [row] = await database
    .insert(user)
    .values({ name: name ?? email.split("@")[0] ?? "User", email })
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

async function insertCourt(
  database: TestDatabase,
  venueId: string,
  name: string,
) {
  const [row] = await database
    .insert(courts)
    .values({ venueId, name })
    .returning({ id: courts.id, name: courts.name });
  if (!row) {
    throw new Error("Failed to insert court");
  }
  return row;
}

function identityShuffle<T>(items: readonly T[]): T[] {
  return [...items];
}

async function insertNamedUsers(
  database: TestDatabase,
  prefix: string,
  count: number,
) {
  const rows = [];
  for (let index = 0; index < count; index += 1) {
    rows.push(
      await insertUser(
        database,
        `${prefix}-${index}@example.com`,
        `${prefix}-${index + 1}`,
      ),
    );
  }
  return rows;
}

async function fillCompleteTeams(
  database: TestDatabase,
  gameId: string,
  players: { id: string }[],
  teamCount: number,
) {
  for (let index = 0; index < teamCount; index += 1) {
    const left = players[index * 2];
    const right = players[index * 2 + 1];
    if (!left || !right) {
      throw new Error("Not enough players to fill Game teams");
    }
    await registerSeat(database, {
      gameId,
      userId: left.id,
      sideIndex: index + 1,
      position: "left",
    });
    await registerSeat(database, {
      gameId,
      userId: right.id,
      sideIndex: index + 1,
      position: "right",
    });
  }
}

async function seedPostedTournament(database: TestDatabase, prefix: string) {
  const owner = await insertUser(database, `${prefix}-owner@example.com`);
  const venue = await insertVenue(database);
  const courtA = await insertCourt(database, venue.id, "Court 1");
  const courtB = await insertCourt(database, venue.id, "Court 2");
  const [group] = await database
    .insert(groups)
    .values({ name: `Group ${prefix}`, createdBy: owner.id })
    .returning({ id: groups.id });
  if (!group) {
    throw new Error("Failed to insert group");
  }
  await database.insert(groupMembers).values({
    groupId: group.id,
    userId: owner.id,
  });
  const windowStart = new Date("2026-09-20T18:00:00.000Z");
  const windowEnd = new Date("2026-10-04T18:45:00.000Z");
  const created = await createTournament(database, {
    createdBy: owner.id,
    name: "Autumn Friendly",
    groupId: group.id,
    isPublic: false,
    registrationMode: "individual",
    teamCount: 4,
    poolCount: 1,
    venueId: venue.id,
    courtIds: [courtA.id, courtB.id],
    matchMinutes: 45,
    windowStart,
    windowEnd: new Date(windowStart.getTime() + 24 * 60 * 60 * 1000),
  });
  // Legacy multi-week rows still schedule. Create refuses this window.
  await database
    .update(games)
    .set({ windowEnd })
    .where(eq(games.id, created.id));
  const players = await insertNamedUsers(database, prefix, 8);
  for (const player of players) {
    await database.insert(groupMembers).values({
      groupId: group.id,
      userId: player.id,
    });
  }
  await fillCompleteTeams(database, created.id, players, 4);
  await drawPools(database, {
    gameId: created.id,
    organizerUserId: owner.id,
    shuffle: identityShuffle,
  });
  await postPoolDraw(database, {
    gameId: created.id,
    organizerUserId: owner.id,
  });
  return {
    owner,
    courtA,
    courtB,
    gameId: created.id,
    players,
  };
}

async function viewerRound1Match(
  database: TestDatabase,
  gameId: string,
  viewerId: string,
) {
  const rows = await database.query.matches.findMany({
    where: eq(matches.gameId, gameId),
    with: {
      slot1GameTeam: {
        with: {
          players: {
            with: { gamePlayer: { columns: { userId: true } } },
          },
        },
      },
      slot2GameTeam: {
        with: {
          players: {
            with: { gamePlayer: { columns: { userId: true } } },
          },
        },
      },
    },
  });
  const match = rows.find(
    (row) =>
      row.roundNumber === 1 &&
      [
        ...(row.slot1GameTeam?.players ?? []),
        ...(row.slot2GameTeam?.players ?? []),
      ].some((link) => link.gamePlayer?.userId === viewerId),
  );
  if (!match) {
    throw new Error("Expected the viewer's Round 1 Pool Match");
  }
  return match;
}

function occupants(match: {
  slot1GameTeam: {
    players: { gamePlayer: { userId: string | null } | null }[];
  } | null;
  slot2GameTeam: {
    players: { gamePlayer: { userId: string | null } | null }[];
  } | null;
}) {
  return {
    slot1: (match.slot1GameTeam?.players ?? [])
      .map((link) => link.gamePlayer?.userId)
      .filter((id): id is string => Boolean(id)),
    slot2: (match.slot2GameTeam?.players ?? [])
      .map((link) => link.gamePlayer?.userId)
      .filter((id): id is string => Boolean(id)),
  };
}

describe("Pool Match play", () => {
  it("lets a User enter Sets and the other Game team confirm, rating the Match", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const seeded = await seedPostedTournament(db, "score");
      const viewer = seeded.players[0];
      if (!viewer) {
        throw new Error("Expected a seated viewer");
      }
      const match = await viewerRound1Match(db, seeded.gameId, viewer.id);
      const teams = occupants(match);
      const otherTeam = teams.slot1.includes(viewer.id)
        ? teams.slot2
        : teams.slot1;

      const firstSet = await addSet(db, {
        gameId: seeded.gameId,
        matchId: match.id,
        userId: viewer.id,
      });
      await scoreSet(db, {
        gameId: seeded.gameId,
        matchId: match.id,
        setId: firstSet.id,
        userId: viewer.id,
        slot1GamesWon: 6,
        slot2GamesWon: 2,
      });

      let row = await db.query.matches.findFirst({
        where: eq(matches.id, match.id),
      });
      expect(row?.status).not.toBe(MatchStatusEnum.COMPLETED);

      for (const userId of otherTeam) {
        await confirmMatchResult(db, {
          gameId: seeded.gameId,
          matchId: match.id,
          userId,
        });
      }
      const partner = teams.slot1.includes(viewer.id)
        ? teams.slot1.find((id) => id !== viewer.id)
        : teams.slot2.find((id) => id !== viewer.id);
      if (partner) {
        await confirmMatchResult(db, {
          gameId: seeded.gameId,
          matchId: match.id,
          userId: partner,
        });
      }

      row = await db.query.matches.findFirst({
        where: eq(matches.id, match.id),
      });
      expect(row?.status).toBe(MatchStatusEnum.COMPLETED);
      const events = await db.query.ratingEvents.findMany({
        where: eq(ratingEvents.matchId, match.id),
      });
      expect(events).toHaveLength(4);

      const history = await listMyMatchHistoryRows(db, viewer.id, NOW);
      expect(history.map((item) => item.matchId)).toContain(match.id);
    } finally {
      await close();
    }
  });

  it("records a drawn Pool Match as a draw rather than a win or a loss", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const seeded = await seedPostedTournament(db, "draw");
      const viewer = seeded.players[0];
      if (!viewer) {
        throw new Error("Expected a seated viewer");
      }
      const match = await viewerRound1Match(db, seeded.gameId, viewer.id);
      const teams = occupants(match);
      const everyone = [...teams.slot1, ...teams.slot2];

      const setOne = await addSet(db, {
        gameId: seeded.gameId,
        matchId: match.id,
        userId: viewer.id,
      });
      await scoreSet(db, {
        gameId: seeded.gameId,
        matchId: match.id,
        setId: setOne.id,
        userId: viewer.id,
        slot1GamesWon: 6,
        slot2GamesWon: 4,
      });
      const setTwo = await addSet(db, {
        gameId: seeded.gameId,
        matchId: match.id,
        userId: viewer.id,
      });
      await scoreSet(db, {
        gameId: seeded.gameId,
        matchId: match.id,
        setId: setTwo.id,
        userId: viewer.id,
        slot1GamesWon: 4,
        slot2GamesWon: 6,
      });

      for (const userId of everyone.filter((id) => id !== viewer.id)) {
        await confirmMatchResult(db, {
          gameId: seeded.gameId,
          matchId: match.id,
          userId,
        });
      }

      const row = await db.query.matches.findFirst({
        where: eq(matches.id, match.id),
      });
      expect(row?.status).toBe(MatchStatusEnum.COMPLETED);
      const history = await listMyMatchHistoryRows(db, viewer.id, NOW);
      expect(history.find((item) => item.matchId === match.id)?.outcome).toBe(
        "draw",
      );
    } finally {
      await close();
    }
  });

  it("lets an Organizer change one Pool Match time or Court without redrawing", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const seeded = await seedPostedTournament(db, "reschedule");
      const before = await db.query.matches.findMany({
        where: eq(matches.gameId, seeded.gameId),
      });
      const target = before.find((row) => row.roundNumber === 2);
      if (!target) {
        throw new Error("Expected a Round 2 Match");
      }
      const newStart = new Date("2026-09-28T19:30:00.000Z");
      const newEnd = new Date("2026-09-28T20:15:00.000Z");

      await updateMatch(db, {
        gameId: seeded.gameId,
        userId: seeded.owner.id,
        matchId: target.id,
        startTime: newStart,
        endTime: newEnd,
        durationInMinutes: 45,
        courtId: seeded.courtB.id,
        slot1GameTeamId: target.slot1GameTeamId,
        slot2GameTeamId: target.slot2GameTeamId,
      });

      const after = await db.query.matches.findMany({
        where: eq(matches.gameId, seeded.gameId),
      });
      expect(after).toHaveLength(before.length);
      const updated = after.find((row) => row.id === target.id);
      expect(updated).toMatchObject({
        startTime: newStart,
        endTime: newEnd,
        courtId: seeded.courtB.id,
        slot1GameTeamId: target.slot1GameTeamId,
        slot2GameTeamId: target.slot2GameTeamId,
        roundNumber: 2,
      });
      const untouched = after.filter((row) => row.id !== target.id);
      for (const row of untouched) {
        const original = before.find((item) => item.id === row.id);
        expect(row.startTime).toEqual(original?.startTime);
        expect(row.courtId).toEqual(original?.courtId);
        expect(row.roundNumber).toEqual(original?.roundNumber);
      }
      const game = await db.query.games.findFirst({
        where: eq(games.id, seeded.gameId),
      });
      expect(game?.drawPostedAt).toBeInstanceOf(Date);
    } finally {
      await close();
    }
  });
});
