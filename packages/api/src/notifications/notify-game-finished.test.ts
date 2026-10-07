import { and, asc, eq, isNull } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import {
  communities,
  communityMembers,
  CommunityRoleEnum,
  courts,
  GameFormatEnum,
  gamePlayers,
  GameRegistrationModeEnum,
  games,
  gameTeams,
  groups,
  GroupTypeEnum,
  matches,
  MatchStatusEnum,
  notifications,
  teamMembers,
  teams,
  user,
  venues,
} from "@repo/db/schema";

import { leave as leaveCommunity } from "#src/community-membership";
import type { GameRow } from "#src/games/access";
import { isGameFinishedByResults } from "#src/notifications/notify-game-finished";
import { addMatch } from "#src/routers/games/addMatch";
import { addSet } from "#src/routers/games/addSet";
import { cancelMatch } from "#src/routers/games/cancelMatch";
import { completeMatch } from "#src/routers/games/completeMatch";
import { confirmMatchResult } from "#src/routers/games/confirmMatchResult";
import { createTournament } from "#src/routers/games/createTournament";
import { drawPools } from "#src/routers/games/drawPools";
import { kick } from "#src/routers/games/kick";
import { leaveGame } from "#src/routers/games/leave";
import { postPoolDraw } from "#src/routers/games/postPoolDraw";
import { registerSeat } from "#src/routers/games/registerSeat";
import { registerTeam } from "#src/routers/games/registerTeam";
import { registerWithPartner } from "#src/routers/games/registerWithPartner";
import { reportWrongScore } from "#src/routers/games/reportWrongScore";
import { scoreSet } from "#src/routers/games/scoreSet";
import { commit } from "#src/soft-archive";
import { createPgliteDb, type TestDatabase } from "@repo/db/testing";

const HOUR = 60 * 60 * 1000;

beforeAll(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-09-01T12:00:00"));
});

afterAll(() => {
  vi.useRealTimers();
});

function tick() {
  vi.setSystemTime(new Date(Date.now() + 1000));
}

function identityShuffle<T>(items: readonly T[]): T[] {
  return [...items];
}

async function insertUser(database: TestDatabase, email: string) {
  const [row] = await database
    .insert(user)
    .values({ name: email.split("@")[0] ?? "User", email })
    .returning({ id: user.id });
  if (!row) {
    throw new Error("Failed to insert user");
  }
  return row.id;
}

async function insertUsers(
  database: TestDatabase,
  prefix: string,
  count: number,
) {
  const ids = [];
  for (let index = 1; index <= count; index += 1) {
    ids.push(await insertUser(database, `${prefix}-${index}@example.com`));
  }
  return ids;
}

async function insertClub(database: TestDatabase) {
  const owner = await insertUser(database, "finish-owner@example.com");
  const admin = await insertUser(database, "finish-admin@example.com");
  const creator = await insertUser(database, "finish-creator@example.com");
  const [community] = await database
    .insert(communities)
    .values({ name: "Finish Club", type: "public", createdBy: owner })
    .returning({ id: communities.id });
  if (!community) {
    throw new Error("Failed to insert community");
  }
  await database.insert(communityMembers).values(
    [
      { userId: owner, role: CommunityRoleEnum.OWNER },
      { userId: admin, role: CommunityRoleEnum.ADMIN },
      { userId: creator, role: CommunityRoleEnum.MEMBER },
    ].map((row) => ({ ...row, communityId: community.id })),
  );
  const [group] = await database
    .insert(groups)
    .values({
      name: "Finish Squad",
      type: GroupTypeEnum.PUBLIC,
      createdBy: creator,
      communityId: community.id,
    })
    .returning({ id: groups.id });
  if (!group) {
    throw new Error("Failed to insert group");
  }
  const [venue] = await database
    .insert(venues)
    .values({
      name: `Venue ${crypto.randomUUID()}`,
      city: "Manama",
      country: "BH",
    })
    .returning({ id: venues.id });
  if (!venue) {
    throw new Error("Failed to insert venue");
  }
  const courtRows = await database
    .insert(courts)
    .values([
      { venueId: venue.id, name: "Court 1" },
      { venueId: venue.id, name: "Court 2" },
    ])
    .returning({ id: courts.id });
  return {
    communityId: community.id,
    groupId: group.id,
    venueId: venue.id,
    courtIds: courtRows.map((court) => court.id),
    owner,
    admin,
    creator,
    admins: [owner, admin, creator].sort(),
  };
}

type Club = Awaited<ReturnType<typeof insertClub>>;

async function insertFriendlyGame(
  database: TestDatabase,
  club: Club,
  registrationMode: GameRow["registrationMode"] = GameRegistrationModeEnum.INDIVIDUAL,
): Promise<GameRow> {
  const windowStart = new Date(Date.now() + 24 * HOUR);
  const [row] = await database
    .insert(games)
    .values({
      format: GameFormatEnum.FRIENDLY_GAME,
      registrationMode,
      venueId: club.venueId,
      createdBy: club.admin,
      groupId: club.groupId,
      isPublic: true,
      playersAllowed: 4,
      teamsAllowed: 2,
      windowStart,
      windowEnd: new Date(windowStart.getTime() + 2 * HOUR),
    })
    .returning();
  if (!row) {
    throw new Error("Failed to insert game");
  }
  await database.insert(matches).values({ gameId: row.id });
  return row;
}

async function fillFriendlyGame(
  database: TestDatabase,
  game: GameRow,
  players: string[],
) {
  const seats = [
    { sideIndex: 1, position: "left" },
    { sideIndex: 1, position: "right" },
    { sideIndex: 2, position: "left" },
    { sideIndex: 2, position: "right" },
  ] as const;
  for (const [index, userId] of players.entries()) {
    const seat = seats[index];
    if (!seat) {
      throw new Error("A Friendly game has four seats");
    }
    await registerSeat(database, { gameId: game.id, userId, ...seat });
  }
}

async function onlyMatch(database: TestDatabase, gameId: string) {
  const row = await database.query.matches.findFirst({
    where: eq(matches.gameId, gameId),
  });
  if (!row) {
    throw new Error("Expected a Match");
  }
  return row;
}

async function scoreMatch(
  database: TestDatabase,
  args: { gameId: string; matchId: string; userId: string },
) {
  const set = await addSet(database, args);
  await scoreSet(database, {
    ...args,
    setId: set.id,
    slot1GamesWon: 6,
    slot2GamesWon: 3,
  });
}

async function forceComplete(
  database: TestDatabase,
  args: { gameId: string; matchId: string; userId: string },
) {
  await scoreMatch(database, args);
  tick();
  await completeMatch(database, args);
}

async function finishedRows(database: TestDatabase) {
  const rows = await database.query.notifications.findMany({
    where: eq(notifications.type, "game_finished"),
  });
  return rows.map((row) => ({
    recipient: row.recipientUserId,
    audience: row.audience,
    actor: row.actorUserId,
    partner: row.partnerUserId,
    team: row.teamId,
    group: row.groupId,
    game: row.gameId,
    viaWaitlist: row.viaWaitlist,
    dedupeKey: row.dedupeKey,
  }));
}

async function audiences(database: TestDatabase) {
  const rows = await finishedRows(database);
  return Object.fromEntries(
    rows
      .map((row) => [row.recipient, row.audience] as const)
      .sort(([a], [b]) => a.localeCompare(b)),
  );
}

function expected(admins: string[], players: string[]) {
  return Object.fromEntries(
    [
      ...admins.map((id) => [id, "admin"] as const),
      ...players.map((id) => [id, "player"] as const),
    ].sort(([a], [b]) => a.localeCompare(b)),
  );
}

type TournamentShape =
  | { tournamentShape?: undefined; teamCount: 4; poolCount: 1 }
  | { tournamentShape: "knockout_only"; teamCount: 4 };

async function seedPostedTournament(
  database: TestDatabase,
  club: Club,
  prefix: string,
  shape: TournamentShape,
) {
  const created = await createTournament(database, {
    createdBy: club.owner,
    name: "Finish day",
    groupId: club.groupId,
    isPublic: true,
    registrationMode: "individual",
    venueId: club.venueId,
    courtIds: club.courtIds,
    matchMinutes: 45,
    windowStart: new Date("2026-09-20T09:00:00"),
    windowEnd: new Date("2026-09-20T23:00:00"),
    ...shape,
  });
  const players = await insertUsers(database, prefix, 8);
  for (let side = 1; side <= 4; side += 1) {
    const left = players[(side - 1) * 2];
    const right = players[(side - 1) * 2 + 1];
    if (!left || !right) {
      throw new Error("Not enough players");
    }
    await registerSeat(database, {
      gameId: created.id,
      userId: left,
      sideIndex: side,
      position: "left",
    });
    await registerSeat(database, {
      gameId: created.id,
      userId: right,
      sideIndex: side,
      position: "right",
    });
  }
  await drawPools(database, {
    gameId: created.id,
    organizerUserId: club.owner,
    shuffle: identityShuffle,
  });
  await postPoolDraw(database, {
    gameId: created.id,
    organizerUserId: club.owner,
  });
  const sideTeams = await database.query.gameTeams.findMany({
    where: eq(gameTeams.gameId, created.id),
  });
  const team = (side: number) => {
    const found = sideTeams.find((row) => row.sideIndex === side);
    if (!found) {
      throw new Error(`No Game team on side ${side}`);
    }
    return found.id;
  };
  return { gameId: created.id, players, team };
}

async function poolMatches(database: TestDatabase, gameId: string) {
  return database.query.matches.findMany({
    where: and(eq(matches.gameId, gameId), isNull(matches.knockoutRound)),
    orderBy: [asc(matches.roundNumber), asc(matches.startTime)],
  });
}

async function knockoutRound(
  database: TestDatabase,
  gameId: string,
  round: number,
) {
  return database.query.matches.findMany({
    where: and(eq(matches.gameId, gameId), eq(matches.knockoutRound, round)),
    orderBy: [asc(matches.knockoutPosition)],
  });
}

describe("isGameFinishedByResults", () => {
  const live = {
    format: GameFormatEnum.FRIENDLY_TOURNAMENT,
    cancelledAt: null,
  };
  const { COMPLETED, CANCELLED, PENDING, CONFIRMED } = MatchStatusEnum;

  it("is finished when every Match is completed or cancelled and one is completed", () => {
    expect(isGameFinishedByResults(live, [COMPLETED])).toBe(true);
    expect(isGameFinishedByResults(live, [COMPLETED, CANCELLED])).toBe(true);
  });

  it("is not finished while any Match is unsettled", () => {
    expect(isGameFinishedByResults(live, [COMPLETED, PENDING])).toBe(false);
    expect(isGameFinishedByResults(live, [COMPLETED, CONFIRMED])).toBe(false);
    expect(isGameFinishedByResults(live, [COMPLETED, null])).toBe(false);
  });

  it("treats a Game whose Matches are all cancelled, or that has none, as not finished", () => {
    expect(isGameFinishedByResults(live, [CANCELLED, CANCELLED])).toBe(false);
    expect(isGameFinishedByResults(live, [])).toBe(false);
  });

  it("never finishes a cancelled Game or an Americano", () => {
    expect(
      isGameFinishedByResults({ ...live, cancelledAt: new Date() }, [
        COMPLETED,
      ]),
    ).toBe(false);
    expect(
      isGameFinishedByResults({ ...live, format: GameFormatEnum.AMERICANO }, [
        COMPLETED,
      ]),
    ).toBe(false);
  });
});

describe("Finished Game Notifications on a Friendly game", () => {
  it("tells admins and registered players once full confirmation completes the Match, last confirmer included", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const club = await insertClub(db);
      const [p1, p2, p3, p4] = await insertUsers(db, "confirm", 4);
      const leaver = await insertUser(db, "confirm-leaver@example.com");
      const waiting = await insertUser(db, "confirm-waiting@example.com");
      if (!p1 || !p2 || !p3 || !p4) {
        throw new Error("Expected four players");
      }
      const game = await insertFriendlyGame(db, club);
      await fillFriendlyGame(db, game, [leaver]);
      await leaveGame(db, { gameId: game.id, userId: leaver });
      await fillFriendlyGame(db, game, [p1, p2, p3, p4]);
      await registerSeat(db, {
        gameId: game.id,
        userId: waiting,
        sideIndex: 1,
        position: "left",
      });
      const match = await onlyMatch(db, game.id);

      await scoreMatch(db, { gameId: game.id, matchId: match.id, userId: p1 });
      await confirmMatchResult(db, {
        gameId: game.id,
        matchId: match.id,
        userId: p2,
      });
      await confirmMatchResult(db, {
        gameId: game.id,
        matchId: match.id,
        userId: p3,
      });
      expect(await finishedRows(db)).toEqual([]);

      await confirmMatchResult(db, {
        gameId: game.id,
        matchId: match.id,
        userId: p4,
      });

      expect((await onlyMatch(db, game.id)).status).toBe(
        MatchStatusEnum.COMPLETED,
      );
      expect(await audiences(db)).toEqual(
        expected(club.admins, [p1, p2, p3, p4]),
      );
      for (const row of await finishedRows(db)) {
        expect(row).toEqual({
          recipient: row.recipient,
          audience: row.audience,
          actor: null,
          partner: null,
          team: null,
          group: club.groupId,
          game: game.id,
          viaWaitlist: false,
          dedupeKey: `game_finished:${game.id}`,
        });
      }
    } finally {
      await close();
    }
  });

  it("gives a Game admin who also played one admin row when they force-complete", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const club = await insertClub(db);
      const [p1, p2, p3] = await insertUsers(db, "force", 3);
      if (!p1 || !p2 || !p3) {
        throw new Error("Expected three players");
      }
      const game = await insertFriendlyGame(db, club);
      await fillFriendlyGame(db, game, [club.admin, p1, p2, p3]);
      const match = await onlyMatch(db, game.id);

      await forceComplete(db, {
        gameId: game.id,
        matchId: match.id,
        userId: club.admin,
      });

      const rows = await finishedRows(db);
      expect(rows.filter((row) => row.recipient === club.admin)).toHaveLength(
        1,
      );
      expect(await audiences(db)).toEqual(expected(club.admins, [p1, p2, p3]));
    } finally {
      await close();
    }
  });

  it("tells both Users of each Partner registration", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const club = await insertClub(db);
      const [p1, p2, p3, p4] = await insertUsers(db, "pair", 4);
      if (!p1 || !p2 || !p3 || !p4) {
        throw new Error("Expected four players");
      }
      const game = await insertFriendlyGame(db, club);
      await registerWithPartner(db, {
        gameId: game.id,
        userId: p1,
        partnerUserId: p2,
        sideIndex: 1,
        position: "left",
      });
      await registerWithPartner(db, {
        gameId: game.id,
        userId: p3,
        partnerUserId: p4,
        sideIndex: 2,
        position: "left",
      });
      const match = await onlyMatch(db, game.id);

      await forceComplete(db, {
        gameId: game.id,
        matchId: match.id,
        userId: club.owner,
      });

      expect(await audiences(db)).toEqual(
        expected(club.admins, [p1, p2, p3, p4]),
      );
    } finally {
      await close();
    }
  });

  it("tells both members of each registered Team", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const club = await insertClub(db);
      const members = await insertUsers(db, "team", 4);
      const game = await insertFriendlyGame(
        db,
        club,
        GameRegistrationModeEnum.TEAM_ONLY,
      );
      for (const [index, name] of ["Smash", "Lob"].entries()) {
        const pair = members.slice(index * 2, index * 2 + 2);
        const [team] = await db
          .insert(teams)
          .values({ createdBy: pair[0]!, name })
          .returning({ id: teams.id });
        if (!team) {
          throw new Error("Failed to insert team");
        }
        await db
          .insert(teamMembers)
          .values(pair.map((userId) => ({ teamId: team.id, userId })));
        await registerTeam(db, {
          gameId: game.id,
          userId: pair[0]!,
          teamId: team.id,
        });
      }
      const match = await onlyMatch(db, game.id);

      await forceComplete(db, {
        gameId: game.id,
        matchId: match.id,
        userId: club.owner,
      });

      expect(await audiences(db)).toEqual(expected(club.admins, members));
    } finally {
      await close();
    }
  });

  it("gives a Club Group creator who left the Community only the player row while still registered", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const club = await insertClub(db);
      const [p1, p2, p3] = await insertUsers(db, "creator-gone", 3);
      if (!p1 || !p2 || !p3) {
        throw new Error("Expected three players");
      }
      const game = await insertFriendlyGame(db, club);
      await fillFriendlyGame(db, game, [club.creator, p1, p2, p3]);
      const left = await leaveCommunity(db, {
        communityId: club.communityId,
        userId: club.creator,
      });
      expect(left.ok).toBe(true);
      const match = await onlyMatch(db, game.id);

      await forceComplete(db, {
        gameId: game.id,
        matchId: match.id,
        userId: club.owner,
      });

      expect(await audiences(db)).toEqual(
        expected([club.owner, club.admin], [club.creator, p1, p2, p3]),
      );
    } finally {
      await close();
    }
  });

  it("gives a Club Group creator who left the Community and is not registered nothing", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const club = await insertClub(db);
      const players = await insertUsers(db, "creator-out", 4);
      const game = await insertFriendlyGame(db, club);
      await fillFriendlyGame(db, game, players);
      await leaveCommunity(db, {
        communityId: club.communityId,
        userId: club.creator,
      });
      const match = await onlyMatch(db, game.id);

      await forceComplete(db, {
        gameId: game.id,
        matchId: match.id,
        userId: club.owner,
      });

      expect(await audiences(db)).toEqual(
        expected([club.owner, club.admin], players),
      );
    } finally {
      await close();
    }
  });

  it("writes nothing in a Soft-archived Community", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const club = await insertClub(db);
      const players = await insertUsers(db, "archived", 4);
      const game = await insertFriendlyGame(db, club);
      await fillFriendlyGame(db, game, players);
      await db.delete(notifications);
      await commit(db, { communityId: club.communityId }, "archived");
      const match = await onlyMatch(db, game.id);

      await forceComplete(db, {
        gameId: game.id,
        matchId: match.id,
        userId: club.owner,
      });

      expect((await onlyMatch(db, game.id)).status).toBe(
        MatchStatusEnum.COMPLETED,
      );
      expect(await db.query.notifications.findMany()).toEqual([]);
    } finally {
      await close();
    }
  });

  it("never notifies when cancelling the Match cancels the Game", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const club = await insertClub(db);
      const players = await insertUsers(db, "cancelled", 4);
      const game = await insertFriendlyGame(db, club);
      await fillFriendlyGame(db, game, players);
      const match = await onlyMatch(db, game.id);

      const result = await cancelMatch(db, {
        gameId: game.id,
        userId: club.owner,
        matchId: match.id,
      });

      expect(result).toEqual({ cancelledGame: true });
      expect(await finishedRows(db)).toEqual([]);
    } finally {
      await close();
    }
  });

  it("does not notify again after a wrong-score reversal and a new completion", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const club = await insertClub(db);
      const players = await insertUsers(db, "reversal", 4);
      const game = await insertFriendlyGame(db, club);
      await fillFriendlyGame(db, game, players);
      const match = await onlyMatch(db, game.id);
      const args = { gameId: game.id, matchId: match.id, userId: club.owner };
      await forceComplete(db, args);
      const first = await finishedRows(db);
      expect(first).toHaveLength(7);

      await reportWrongScore(db, args);
      expect((await onlyMatch(db, game.id)).status).toBe(
        MatchStatusEnum.PENDING,
      );
      tick();
      await completeMatch(db, args);

      expect((await onlyMatch(db, game.id)).status).toBe(
        MatchStatusEnum.COMPLETED,
      );
      expect(await finishedRows(db)).toEqual(first);
    } finally {
      await close();
    }
  });
});

describe("Finished Game Notifications on a Groups only tournament", () => {
  it("notifies when the last Pool Match is completed", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const club = await insertClub(db);
      const seeded = await seedPostedTournament(db, club, "pool-last", {
        teamCount: 4,
        poolCount: 1,
      });
      const pool = await poolMatches(db, seeded.gameId);
      expect(pool).toHaveLength(6);

      for (const match of pool.slice(0, -1)) {
        await forceComplete(db, {
          gameId: seeded.gameId,
          matchId: match.id,
          userId: club.owner,
        });
      }
      expect(await finishedRows(db)).toEqual([]);

      await forceComplete(db, {
        gameId: seeded.gameId,
        matchId: pool.at(-1)!.id,
        userId: club.owner,
      });

      expect(await audiences(db)).toEqual(
        expected(club.admins, seeded.players),
      );
    } finally {
      await close();
    }
  });

  it("notifies when the last Pool Match is voided after others completed", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const club = await insertClub(db);
      const seeded = await seedPostedTournament(db, club, "pool-void", {
        teamCount: 4,
        poolCount: 1,
      });
      const pool = await poolMatches(db, seeded.gameId);
      for (const match of pool.slice(0, -1)) {
        await forceComplete(db, {
          gameId: seeded.gameId,
          matchId: match.id,
          userId: club.owner,
        });
      }

      await cancelMatch(db, {
        gameId: seeded.gameId,
        userId: club.owner,
        matchId: pool.at(-1)!.id,
      });

      expect(await audiences(db)).toEqual(
        expected(club.admins, seeded.players),
      );
    } finally {
      await close();
    }
  });

  it("does not notify when every Pool Match is voided", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const club = await insertClub(db);
      const seeded = await seedPostedTournament(db, club, "pool-all-void", {
        teamCount: 4,
        poolCount: 1,
      });

      for (const match of await poolMatches(db, seeded.gameId)) {
        await cancelMatch(db, {
          gameId: seeded.gameId,
          userId: club.owner,
          matchId: match.id,
        });
      }

      expect(await finishedRows(db)).toEqual([]);
    } finally {
      await close();
    }
  });

  it("notifies when a kick cancels the last unplayed Pool Matches, leaving out the kicked User", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const club = await insertClub(db);
      const seeded = await seedPostedTournament(db, club, "pool-kick", {
        teamCount: 4,
        poolCount: 1,
      });
      const sideFour = seeded.team(4);
      const [kicked, teammate] = seeded.players.slice(6);
      if (!kicked || !teammate) {
        throw new Error("Expected side 4 players");
      }
      for (const match of await poolMatches(db, seeded.gameId)) {
        if (
          match.slot1GameTeamId === sideFour ||
          match.slot2GameTeamId === sideFour
        ) {
          continue;
        }
        await forceComplete(db, {
          gameId: seeded.gameId,
          matchId: match.id,
          userId: club.owner,
        });
      }
      expect(await finishedRows(db)).toEqual([]);

      await kick(db, {
        gameId: seeded.gameId,
        organizerUserId: club.owner,
        userId: kicked,
      });

      const stillRegistered = await db.query.gamePlayers.findMany({
        where: eq(gamePlayers.gameId, seeded.gameId),
        columns: { userId: true },
      });
      expect(stillRegistered.map((row) => row.userId)).not.toContain(kicked);
      expect(await audiences(db)).toEqual(
        expected(
          club.admins,
          stillRegistered.map((row) => row.userId),
        ),
      );
      expect(Object.keys(await audiences(db))).not.toContain(kicked);
    } finally {
      await close();
    }
  });

  it("does not notify again after a Match is added and completed", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const club = await insertClub(db);
      const seeded = await seedPostedTournament(db, club, "pool-added", {
        teamCount: 4,
        poolCount: 1,
      });
      for (const match of await poolMatches(db, seeded.gameId)) {
        await forceComplete(db, {
          gameId: seeded.gameId,
          matchId: match.id,
          userId: club.owner,
        });
      }
      const first = await finishedRows(db);
      expect(first).toHaveLength(11);

      const added = await addMatch(db, {
        gameId: seeded.gameId,
        userId: club.owner,
        startTime: null,
        endTime: null,
        durationInMinutes: null,
        courtId: null,
        slot1GameTeamId: seeded.team(1),
        slot2GameTeamId: seeded.team(2),
      });
      await forceComplete(db, {
        gameId: seeded.gameId,
        matchId: added.id,
        userId: club.owner,
      });

      expect(await finishedRows(db)).toEqual(first);
    } finally {
      await close();
    }
  });
});

describe("Finished Game Notifications on a Knockout", () => {
  async function seedToFinal(
    database: TestDatabase,
    club: Club,
    prefix: string,
  ) {
    const seeded = await seedPostedTournament(database, club, prefix, {
      tournamentShape: "knockout_only",
      teamCount: 4,
    });
    for (const semi of await knockoutRound(database, seeded.gameId, 1)) {
      await forceComplete(database, {
        gameId: seeded.gameId,
        matchId: semi.id,
        userId: club.owner,
      });
    }
    const [final] = await knockoutRound(database, seeded.gameId, 2);
    if (!final?.slot1GameTeamId || !final.slot2GameTeamId) {
      throw new Error("Expected a Final with both sides placed");
    }
    return { ...seeded, final };
  }

  it("notifies when the Final is completed", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const club = await insertClub(db);
      const seeded = await seedToFinal(db, club, "ko-final");
      expect(await finishedRows(db)).toEqual([]);

      await forceComplete(db, {
        gameId: seeded.gameId,
        matchId: seeded.final.id,
        userId: club.owner,
      });

      expect(await audiences(db)).toEqual(
        expected(club.admins, seeded.players),
      );
    } finally {
      await close();
    }
  });

  it("notifies when the Final is settled as a Walkover", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const club = await insertClub(db);
      const seeded = await seedToFinal(db, club, "ko-walkover");

      await cancelMatch(db, {
        gameId: seeded.gameId,
        userId: club.owner,
        matchId: seeded.final.id,
        advancingGameTeamId: seeded.final.slot1GameTeamId!,
      });

      expect(await audiences(db)).toEqual(
        expected(club.admins, seeded.players),
      );
    } finally {
      await close();
    }
  });
});
