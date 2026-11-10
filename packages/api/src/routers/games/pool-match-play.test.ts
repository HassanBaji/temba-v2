import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

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

import { gameById } from "#src/routers/games/byId";
import { confirmMatchResult } from "#src/routers/games/confirmMatchResult";
import { createTournament } from "#src/routers/games/createTournament";
import { drawPools } from "#src/routers/games/drawPools";
import { enterTournamentScore } from "#src/routers/games/enterTournamentScore";
import { listMyMatchHistoryRows } from "#src/routers/games/listMyMatchHistory";
import { postPoolDraw } from "#src/routers/games/postPoolDraw";
import { registerSeat } from "#src/routers/games/registerSeat";
import { tournamentRounds } from "#src/routers/games/tournamentRounds";
import { updateMatch } from "#src/routers/games/updateMatch";
import { createPgliteDb, type TestDatabase } from "@repo/db/testing";

const NOW = new Date("2026-09-20T16:00:00.000Z");

beforeAll(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(NOW);
});

afterAll(() => {
  vi.useRealTimers();
});

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
    .values({
      verifiedAt: new Date(),
      name: `Group ${prefix}`,
      createdBy: owner.id,
    })
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
  it("lets a User enter Sets and one player of the other Game team confirm, rating the Match", async () => {
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

      await enterTournamentScore(db, {
        gameId: seeded.gameId,
        matchId: match.id,
        userId: viewer.id,
        slot1GamesWon: 6,
        slot2GamesWon: 2,
      });

      let row = await db.query.matches.findFirst({
        where: eq(matches.id, match.id),
      });
      expect(row?.status).not.toBe(MatchStatusEnum.COMPLETED);

      const confirmer = otherTeam[0];
      if (!confirmer) {
        throw new Error("Expected an opponent");
      }
      await confirmMatchResult(db, {
        gameId: seeded.gameId,
        matchId: match.id,
        userId: confirmer,
      });

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

  it("offers the other team, and an Organizer off court, the pending score to confirm", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const seeded = await seedPostedTournament(db, "confirmable");
      const viewer = seeded.players[0];
      if (!viewer) {
        throw new Error("Expected a seated viewer");
      }
      const match = await viewerRound1Match(db, seeded.gameId, viewer.id);
      const teams = occupants(match);
      const [ownTeam, otherTeam] = teams.slot1.includes(viewer.id)
        ? [teams.slot1, teams.slot2]
        : [teams.slot2, teams.slot1];
      const teammate = ownTeam.find((id) => id !== viewer.id);
      const opponent = otherTeam[0];
      if (!teammate || !opponent) {
        throw new Error("Expected a teammate and an opponent");
      }
      async function canConfirm(userId: string) {
        const game = await gameById(db, { gameId: seeded.gameId, userId });
        const fromDetails = game.matches.find(
          (row) => row.id === match.id,
        )?.canConfirmScore;
        const rounds = await tournamentRounds(db, {
          gameId: seeded.gameId,
          userId,
        });
        const fromRounds = rounds.rounds
          .flatMap((round) => round.matches)
          .find((row) => row.matchId === match.id)?.canConfirm;
        expect(fromDetails).toBe(fromRounds);
        return fromDetails;
      }

      expect(await canConfirm(opponent)).toBe(false);

      await enterTournamentScore(db, {
        gameId: seeded.gameId,
        matchId: match.id,
        userId: viewer.id,
        slot1GamesWon: 6,
        slot2GamesWon: 3,
      });

      expect(await canConfirm(viewer.id)).toBe(false);
      expect(await canConfirm(teammate)).toBe(false);
      expect(await canConfirm(opponent)).toBe(true);
      expect(await canConfirm(seeded.owner.id)).toBe(true);

      await confirmMatchResult(db, {
        gameId: seeded.gameId,
        matchId: match.id,
        userId: opponent,
      });

      expect(await canConfirm(opponent)).toBe(false);
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

      await enterTournamentScore(db, {
        gameId: seeded.gameId,
        matchId: match.id,
        userId: viewer.id,
        slot1GamesWon: 5,
        slot2GamesWon: 5,
      });

      const opponent = everyone.find(
        (id) => teams.slot1.includes(viewer.id) !== teams.slot1.includes(id),
      );
      if (!opponent) {
        throw new Error("Expected an opponent");
      }
      await confirmMatchResult(db, {
        gameId: seeded.gameId,
        matchId: match.id,
        userId: opponent,
      });

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

  it("changes only the fields an Organizer sends", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const seeded = await seedPostedTournament(db, "patch");
      const target = (
        await db.query.matches.findMany({
          where: eq(matches.gameId, seeded.gameId),
        })
      ).find((row) => row.roundNumber === 2)!;

      await updateMatch(db, {
        gameId: seeded.gameId,
        userId: seeded.owner.id,
        matchId: target.id,
        courtId: seeded.courtB.id,
      });

      const updated = await db.query.matches.findFirst({
        where: eq(matches.id, target.id),
      });
      expect(updated).toMatchObject({
        courtId: seeded.courtB.id,
        startTime: target.startTime,
        endTime: target.endTime,
        durationInMinutes: target.durationInMinutes,
        slot1GameTeamId: target.slot1GameTeamId,
        slot2GameTeamId: target.slot2GameTeamId,
      });
    } finally {
      await close();
    }
  });

  it("keeps the teams of a scored Pool Match", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const seeded = await seedPostedTournament(db, "keep-sides");
      const [scored, other] = (
        await db.query.matches.findMany({
          where: eq(matches.gameId, seeded.gameId),
        })
      ).filter((row) => row.roundNumber === 1);
      await enterTournamentScore(db, {
        gameId: seeded.gameId,
        matchId: scored!.id,
        userId: seeded.owner.id,
        slot1GamesWon: 6,
        slot2GamesWon: 2,
      });

      await expect(
        updateMatch(db, {
          gameId: seeded.gameId,
          userId: seeded.owner.id,
          matchId: scored!.id,
          slot1GameTeamId: other!.slot1GameTeamId,
        }),
      ).rejects.toThrow("A Match with a score keeps its teams");
      const after = await db.query.matches.findFirst({
        where: eq(matches.id, scored!.id),
      });
      expect(after).toMatchObject({
        status: MatchStatusEnum.COMPLETED,
        slot1GameTeamId: scored!.slot1GameTeamId,
        slot2GameTeamId: scored!.slot2GameTeamId,
      });
    } finally {
      await close();
    }
  });
});
