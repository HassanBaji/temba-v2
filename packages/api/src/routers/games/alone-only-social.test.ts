import { and, eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import {
  gamePlayers,
  gameTeamPlayers,
  gameTeams,
  groups,
  notifications,
  ratings,
  user,
  venues,
} from "@repo/db/schema";
import { INITIAL_SIGMA, muFromLevel } from "@repo/domain/level";
import { createPgliteDb, type TestDatabase } from "@repo/db/testing";

import { createTournament } from "#src/routers/games/createTournament";
import { drawPools } from "#src/routers/games/drawPools";
import { gameById } from "#src/routers/games/byId";
import { leaveGame } from "#src/routers/games/leave";
import { postTeams } from "#src/routers/games/postTeams";
import { register } from "#src/routers/games/register";
import { registerSeat } from "#src/routers/games/registerSeat";
import { registerWithPartner } from "#src/routers/games/registerWithPartner";
import { teamsSheet } from "#src/routers/games/teamsSheet";

async function insertUser(database: TestDatabase, name: string) {
  const [row] = await database
    .insert(user)
    .values({
      name,
      email: `${name.toLowerCase()}-${crypto.randomUUID()}@example.com`,
    })
    .returning({ id: user.id, name: user.name });
  if (!row) {
    throw new Error("Failed to insert user");
  }
  return row;
}

async function insertRating(
  database: TestDatabase,
  userId: string,
  level: number,
) {
  await database.insert(ratings).values({
    userId,
    sport: "padel",
    mu: muFromLevel(level),
    phi: 50,
    sigma: INITIAL_SIGMA,
    levelBand: "C2",
  });
}

async function setUp(
  database: TestDatabase,
  args: { teamCount?: number; organizerMakesTeams?: boolean } = {},
) {
  const organizer = await insertUser(database, "Hassan");
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
      verifiedAt: new Date(),
      name: `Group ${crypto.randomUUID()}`,
      createdBy: organizer.id,
    })
    .returning({ id: groups.id });
  if (!venue || !group) {
    throw new Error("Failed to set up");
  }
  const windowStart = new Date();
  windowStart.setDate(windowStart.getDate() + 7);
  windowStart.setHours(9, 0, 0, 0);
  const created = await createTournament(database, {
    createdBy: organizer.id,
    name: "Sunday Social",
    groupId: group.id,
    isPublic: true,
    organizerMakesTeams: args.organizerMakesTeams ?? true,
    tournamentShape: "groups_only",
    teamCount: args.teamCount ?? 4,
    poolCount: 1,
    venueId: venue.id,
    matchMinutes: 30,
    windowStart,
    windowEnd: new Date(windowStart.getTime() + 4 * 60 * 60 * 1000),
  });
  return {
    organizer,
    gameId: created.id,
    groupId: group.id,
    venueId: venue.id,
  };
}

async function signUp(
  database: TestDatabase,
  gameId: string,
  count: number,
  preferredSide?: "left" | "right",
) {
  const players = [];
  for (let index = 0; index < count; index += 1) {
    const player = await insertUser(database, `Player${index}`);
    await insertRating(database, player.id, 2 + index * 0.25);
    await register(database, { gameId, userId: player.id, preferredSide });
    players.push(player);
  }
  return players;
}

function pairsOf(players: readonly { id: string }[]) {
  const pairs = [];
  for (let index = 0; index + 1 < players.length; index += 2) {
    const left = players[index];
    const right = players[index + 1];
    if (left && right) {
      pairs.push({ left: left.id, right: right.id });
    }
  }
  return pairs;
}

describe("Alone-only Social", () => {
  it("refuses Alone only on an Americano and with a partner only", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const { organizer, groupId, venueId } = await setUp(db);
      const windowStart = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      const base = {
        createdBy: organizer.id,
        name: "Social",
        groupId,
        isPublic: true,
        organizerMakesTeams: true,
        venueId,
        matchMinutes: 30,
        windowStart,
        windowEnd: new Date(windowStart.getTime() + 4 * 60 * 60 * 1000),
      };
      await expect(
        createTournament(db, {
          ...base,
          tournamentShape: "groups_only",
          teamCount: 4,
          poolCount: 1,
          allowSoloRegister: false,
        }),
      ).rejects.toThrow("Pick either Alone only or With a partner only");
    } finally {
      await close();
    }
  });

  it("takes a list of players with the side each asked for", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const { organizer, gameId } = await setUp(db);
      const [first] = await signUp(db, gameId, 1, "left");
      if (!first) {
        throw new Error("No player");
      }
      const row = await db.query.gamePlayers.findFirst({
        where: and(
          eq(gamePlayers.gameId, gameId),
          eq(gamePlayers.userId, first.id),
        ),
      });
      expect(row?.preferredSide).toBe("left");
      expect(
        await db.query.gameTeams.findMany({
          where: eq(gameTeams.gameId, gameId),
        }),
      ).toEqual([]);

      const view = await gameById(db, { gameId, userId: first.id });
      expect(view.organizerMakesTeams).toBe(true);
      expect(view.teamsPostedAt).toBeNull();
      expect(view.roster?.count).toBe(1);
      expect(view.viewerPreferredSide).toBe("left");
      expect(view.canMakeTeamsAlone).toBe(false);

      const organizerView = await gameById(db, {
        gameId,
        userId: organizer.id,
      });
      expect(organizerView.canMakeTeamsAlone).toBe(false);
    } finally {
      await close();
    }
  });

  it("refuses seats and Partner registration", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const { gameId } = await setUp(db);
      const caller = await insertUser(db, "Caller");
      const partner = await insertUser(db, "Partner");
      await expect(
        registerWithPartner(db, {
          gameId,
          userId: caller.id,
          partnerUserId: partner.id,
          sideIndex: 1,
          position: "left",
        }),
      ).rejects.toThrow("Everyone signs up alone on this Social");
      await expect(
        registerSeat(db, {
          gameId,
          userId: caller.id,
          sideIndex: 1,
          position: "left",
        }),
      ).rejects.toThrow();
    } finally {
      await close();
    }
  });

  it("refuses a side on a Social where players pick their seats", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const { gameId } = await setUp(db, { organizerMakesTeams: false });
      const player = await insertUser(db, "Player");
      await expect(
        register(db, { gameId, userId: player.id, preferredSide: "left" }),
      ).rejects.toThrow();
    } finally {
      await close();
    }
  });

  it("keeps the draw closed until the teams are posted", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const { organizer, gameId } = await setUp(db);
      await signUp(db, gameId, 8);
      await expect(
        drawPools(db, { gameId, organizerUserId: organizer.id }),
      ).rejects.toThrow("Post the teams before the draw");
    } finally {
      await close();
    }
  });

  it("posts the teams as Game teams and tells each player their partner", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const { organizer, gameId } = await setUp(db);
      const players = await signUp(db, gameId, 8);

      const sheet = await teamsSheet(db, { gameId, userId: organizer.id });
      expect(sheet.canPost).toBe(true);
      expect(sheet.players.map((one) => one.userId)).toEqual(
        players.map((one) => one.id),
      );
      expect(sheet.players[0]?.level).toBeCloseTo(2);

      const result = await postTeams(db, {
        gameId,
        organizerUserId: organizer.id,
        pairs: pairsOf(players),
      });
      expect(result).toEqual({ ok: true, firstPost: true, teamCount: 4 });

      const teams = await db.query.gameTeams.findMany({
        where: eq(gameTeams.gameId, gameId),
        with: { players: { with: { gamePlayer: true } } },
        orderBy: (table, { asc }) => [asc(table.sideIndex)],
      });
      expect(teams.map((team) => team.sideIndex)).toEqual([1, 2, 3, 4]);
      const first = teams[0]?.players.find((link) => link.position === "left");
      expect(first?.gamePlayer.userId).toBe(players[0]?.id);

      const told = await db.query.notifications.findMany({
        where: eq(notifications.type, "game_teams_posted"),
      });
      expect(told).toHaveLength(8);
      const toFirst = told.find(
        (row) => row.recipientUserId === players[0]?.id,
      );
      expect(toFirst?.partnerUserId).toBe(players[1]?.id);

      const view = await gameById(db, { gameId, userId: players[0]?.id ?? "" });
      expect(view.teamsPostedAt).not.toBeNull();
      expect(view.roster).toBeNull();
      expect(view.isSeated).toBe(true);

      const drawn = await drawPools(db, {
        gameId,
        organizerUserId: organizer.id,
      });
      expect(drawn.ok).toBe(true);
    } finally {
      await close();
    }
  });

  it("leaves one odd player out and refuses leaving out two", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const { organizer, gameId } = await setUp(db, { teamCount: 6 });
      const players = await signUp(db, gameId, 10);
      await expect(
        postTeams(db, {
          gameId,
          organizerUserId: organizer.id,
          pairs: pairsOf(players.slice(0, 8)),
        }),
      ).rejects.toThrow("Every player needs a team");

      await leaveGame(db, { gameId, userId: players[9]?.id ?? "" });
      const posted = await postTeams(db, {
        gameId,
        organizerUserId: organizer.id,
        pairs: pairsOf(players.slice(0, 8)),
      });
      expect(posted.teamCount).toBe(4);
      const view = await gameById(db, { gameId, userId: players[8]?.id ?? "" });
      expect(view.isRegistered).toBe(true);
      expect(view.isSeated).toBe(false);
    } finally {
      await close();
    }
  });

  it("posts again until the draw, replacing the teams", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const { organizer, gameId } = await setUp(db);
      const players = await signUp(db, gameId, 8);
      await postTeams(db, {
        gameId,
        organizerUserId: organizer.id,
        pairs: pairsOf(players),
      });
      const reversed = [...players].reverse();
      const again = await postTeams(db, {
        gameId,
        organizerUserId: organizer.id,
        pairs: pairsOf(reversed),
      });
      expect(again.firstPost).toBe(false);
      const links = await db
        .select({
          position: gameTeamPlayers.position,
          userId: gamePlayers.userId,
          sideIndex: gameTeams.sideIndex,
        })
        .from(gameTeamPlayers)
        .innerJoin(
          gamePlayers,
          eq(gamePlayers.id, gameTeamPlayers.gamePlayerId),
        )
        .innerJoin(gameTeams, eq(gameTeams.id, gameTeamPlayers.gameTeamId))
        .where(eq(gameTeams.gameId, gameId));
      expect(links).toHaveLength(8);
      expect(
        links.find((link) => link.sideIndex === 1 && link.position === "left")
          ?.userId,
      ).toBe(reversed[0]?.id);

      await drawPools(db, { gameId, organizerUserId: organizer.id });
    } finally {
      await close();
    }
  });

  it("frees one Position when a player leaves after posting", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const { organizer, gameId } = await setUp(db);
      const players = await signUp(db, gameId, 8);
      await postTeams(db, {
        gameId,
        organizerUserId: organizer.id,
        pairs: pairsOf(players),
      });
      await leaveGame(db, { gameId, userId: players[0]?.id ?? "" });
      const sideOne = await db.query.gameTeams.findFirst({
        where: and(eq(gameTeams.gameId, gameId), eq(gameTeams.sideIndex, 1)),
        with: { players: { with: { gamePlayer: true } } },
      });
      expect(sideOne?.players.map((link) => link.gamePlayer.userId)).toEqual([
        players[1]?.id,
      ]);
      const late = await insertUser(db, "Late");
      await registerSeat(db, {
        gameId,
        userId: late.id,
        sideIndex: 1,
        position: "left",
      });
      await expect(
        drawPools(db, { gameId, organizerUserId: organizer.id }),
      ).resolves.toMatchObject({ ok: true });
    } finally {
      await close();
    }
  });

  it("lets only an Organizer read the sheet and post", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const { gameId } = await setUp(db);
      const players = await signUp(db, gameId, 8);
      const stranger = players[0]?.id ?? "";
      await expect(
        teamsSheet(db, { gameId, userId: stranger }),
      ).rejects.toThrow();
      await expect(
        postTeams(db, {
          gameId,
          organizerUserId: stranger,
          pairs: pairsOf(players),
        }),
      ).rejects.toThrow();
    } finally {
      await close();
    }
  });
});
