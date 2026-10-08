import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import {
  communities,
  communityMembers,
  CommunityRoleEnum,
  GameFormatEnum,
  gamePlayers,
  GameRegistrationModeEnum,
  games,
  groups,
  GroupTypeEnum,
  matches,
  notifications,
  user,
  venues,
} from "@repo/db/schema";

import { leave as leaveCommunity } from "#src/community-membership";
import type { GameRow } from "#src/games/access";
import { kick } from "#src/routers/games/kick";
import { leaveGame } from "#src/routers/games/leave";
import { leaveWaitlist } from "#src/routers/games/leaveWaitlist";
import { registerSeat } from "#src/routers/games/registerSeat";
import { registerWithPartner } from "#src/routers/games/registerWithPartner";
import { commit } from "#src/soft-archive";
import { createPgliteDb, type TestDatabase } from "@repo/db/testing";

const HOUR = 60 * 60 * 1000;

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

async function insertClub(database: TestDatabase) {
  const owner = await insertUser(database, "left-owner@example.com");
  const admin = await insertUser(database, "left-admin@example.com");
  const creator = await insertUser(database, "left-creator@example.com");
  const [community] = await database
    .insert(communities)
    .values({ name: "Leave Club", type: "public", createdBy: owner })
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
      name: "Leave Squad",
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
  return {
    communityId: community.id,
    groupId: group.id,
    venueId: venue.id,
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
  groupId: string | null = club.groupId,
): Promise<GameRow> {
  const windowStart = new Date(Date.now() + 24 * HOUR);
  const [row] = await database
    .insert(games)
    .values({
      format: GameFormatEnum.FRIENDLY_GAME,
      registrationMode: GameRegistrationModeEnum.INDIVIDUAL,
      venueId: club.venueId,
      createdBy: club.admin,
      groupId,
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

async function insertPartnerRequiredTournament(
  database: TestDatabase,
  club: Club,
): Promise<GameRow> {
  const windowStart = new Date(Date.now() + 24 * HOUR);
  const [row] = await database
    .insert(games)
    .values({
      format: GameFormatEnum.FRIENDLY_TOURNAMENT,
      registrationMode: GameRegistrationModeEnum.INDIVIDUAL,
      allowSoloRegister: false,
      venueId: club.venueId,
      createdBy: club.admin,
      groupId: club.groupId,
      isPublic: true,
      playersAllowed: 8,
      teamsAllowed: 4,
      poolCount: 1,
      windowStart,
      windowEnd: new Date(windowStart.getTime() + 4 * HOUR),
    })
    .returning();
  if (!row) {
    throw new Error("Failed to insert tournament");
  }
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

async function rowsOfType(
  database: TestDatabase,
  type: "game_player_joined" | "game_player_left",
) {
  const rows = await database.query.notifications.findMany({
    where: eq(notifications.type, type),
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
  }));
}

function recipients(rows: Awaited<ReturnType<typeof rowsOfType>>) {
  return rows.map((row) => row.recipient).sort();
}

async function clearNotifications(database: TestDatabase) {
  await database.delete(notifications);
}

async function playersOn(database: TestDatabase, gameId: string) {
  const rows = await database.query.gamePlayers.findMany({
    where: eq(gamePlayers.gameId, gameId),
    columns: { userId: true },
  });
  return rows.map((row) => row.userId).sort();
}

describe("Game left Notifications", () => {
  it("tells each Game admin once that a player left", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const club = await insertClub(db);
      const player = await insertUser(db, "plain-leaver@example.com");
      const game = await insertFriendlyGame(db, club);
      await fillFriendlyGame(db, game, [player]);
      await clearNotifications(db);

      const result = await leaveGame(db, { gameId: game.id, userId: player });

      expect(result).toEqual({ ok: true });
      const rows = await rowsOfType(db, "game_player_left");
      expect(recipients(rows)).toEqual(club.admins);
      for (const row of rows) {
        expect(row).toEqual({
          recipient: row.recipient,
          audience: "admin",
          actor: player,
          partner: null,
          team: null,
          group: club.groupId,
          game: game.id,
          viaWaitlist: false,
        });
      }
    } finally {
      await close();
    }
  });

  it("leaves out a Game admin who is the one leaving", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const club = await insertClub(db);
      const game = await insertFriendlyGame(db, club);
      await fillFriendlyGame(db, game, [club.admin]);
      await clearNotifications(db);

      await leaveGame(db, { gameId: game.id, userId: club.admin });

      const rows = await rowsOfType(db, "game_player_left");
      expect(recipients(rows)).toEqual([club.owner, club.creator].sort());
      expect(rows.every((row) => row.actor === club.admin)).toBe(true);
    } finally {
      await close();
    }
  });

  it("names the partner removed with the leaver on a partner-required tournament before the draw", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const club = await insertClub(db);
      const leaver = await insertUser(db, "pair-leaver@example.com");
      const partner = await insertUser(db, "pair-partner@example.com");
      const game = await insertPartnerRequiredTournament(db, club);
      await registerWithPartner(db, {
        gameId: game.id,
        userId: leaver,
        partnerUserId: partner,
        sideIndex: 1,
        position: "left",
      });
      expect(await playersOn(db, game.id)).toEqual([leaver, partner].sort());
      await clearNotifications(db);

      await leaveGame(db, { gameId: game.id, userId: leaver });

      expect(await playersOn(db, game.id)).toEqual([]);
      const rows = await rowsOfType(db, "game_player_left");
      expect(recipients(rows)).toEqual(club.admins);
      for (const row of rows) {
        expect(row).toMatchObject({
          actor: leaver,
          partner,
          game: game.id,
          group: club.groupId,
        });
      }
    } finally {
      await close();
    }
  });

  it("tells only the creator of a groupless Game", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const club = await insertClub(db);
      const player = await insertUser(db, "groupless-leaver@example.com");
      const game = await insertFriendlyGame(db, club, null);
      await fillFriendlyGame(db, game, [player]);
      await clearNotifications(db);

      await leaveGame(db, { gameId: game.id, userId: player });

      const rows = await rowsOfType(db, "game_player_left");
      expect(recipients(rows)).toEqual([club.admin]);
      expect(rows[0]?.group).toBeNull();
    } finally {
      await close();
    }
  });

  it("gives nothing to a Club Group creator who left the Community", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const club = await insertClub(db);
      const player = await insertUser(db, "creator-gone-leaver@example.com");
      const game = await insertFriendlyGame(db, club);
      await fillFriendlyGame(db, game, [player]);
      const left = await leaveCommunity(db, {
        communityId: club.communityId,
        userId: club.creator,
      });
      expect(left.ok).toBe(true);
      await clearNotifications(db);

      await leaveGame(db, { gameId: game.id, userId: player });

      expect(recipients(await rowsOfType(db, "game_player_left"))).toEqual(
        [club.owner, club.admin].sort(),
      );
    } finally {
      await close();
    }
  });

  it("writes nothing for a leave in a Soft-archived Community", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const club = await insertClub(db);
      const player = await insertUser(db, "archived-leaver@example.com");
      const game = await insertFriendlyGame(db, club);
      await fillFriendlyGame(db, game, [player]);
      await clearNotifications(db);
      await commit(db, { communityId: club.communityId }, "archived");

      const result = await leaveGame(db, { gameId: game.id, userId: player });

      expect(result).toEqual({ ok: true });
      expect(await db.query.notifications.findMany()).toEqual([]);
    } finally {
      await close();
    }
  });

  it("writes the promotion's own join row beside the leave row", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const club = await insertClub(db);
      const players = await Promise.all(
        [1, 2, 3, 4].map((n) => insertUser(db, `promo-p${n}@example.com`)),
      );
      const waiting = await insertUser(db, "promo-waiting@example.com");
      const game = await insertFriendlyGame(db, club);
      await fillFriendlyGame(db, game, players);
      await registerSeat(db, {
        gameId: game.id,
        userId: waiting,
        sideIndex: 1,
        position: "left",
      });
      await clearNotifications(db);

      await leaveGame(db, { gameId: game.id, userId: players[0]! });

      const leftRows = await rowsOfType(db, "game_player_left");
      expect(recipients(leftRows)).toEqual(club.admins);
      expect(
        leftRows.every((row) => row.actor === players[0] && !row.viaWaitlist),
      ).toBe(true);
      const joinedRows = await rowsOfType(db, "game_player_joined");
      expect(recipients(joinedRows)).toEqual(club.admins);
      expect(
        joinedRows.every((row) => row.actor === waiting && row.viaWaitlist),
      ).toBe(true);
    } finally {
      await close();
    }
  });

  it("writes no leave row for a kick", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const club = await insertClub(db);
      const player = await insertUser(db, "kicked@example.com");
      const game = await insertFriendlyGame(db, club);
      await fillFriendlyGame(db, game, [player]);
      await clearNotifications(db);

      await kick(db, {
        gameId: game.id,
        organizerUserId: club.owner,
        userId: player,
      });

      expect(await playersOn(db, game.id)).toEqual([]);
      expect(await rowsOfType(db, "game_player_left")).toEqual([]);
    } finally {
      await close();
    }
  });

  it("writes nothing for leaving the Waitlist", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const club = await insertClub(db);
      const players = await Promise.all(
        [1, 2, 3, 4].map((n) => insertUser(db, `queue-p${n}@example.com`)),
      );
      const waiting = await insertUser(db, "queue-waiting@example.com");
      const game = await insertFriendlyGame(db, club);
      await fillFriendlyGame(db, game, players);
      await registerSeat(db, {
        gameId: game.id,
        userId: waiting,
        sideIndex: 1,
        position: "left",
      });
      await clearNotifications(db);

      await leaveWaitlist(db, { gameId: game.id, userId: waiting });

      expect(await db.query.notifications.findMany()).toEqual([]);
    } finally {
      await close();
    }
  });
});
