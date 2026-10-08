import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import {
  communities,
  communityMembers,
  CommunityRoleEnum,
  GameFormatEnum,
  gameInviteLinks,
  gamePlayers,
  GameRegistrationModeEnum,
  games,
  groups,
  GroupTypeEnum,
  matches,
  notifications,
  teamMembers,
  teams,
  user,
  venues,
} from "@repo/db/schema";

import { leave as leaveCommunity } from "#src/community-membership";
import type { GameRow } from "#src/games/access";
import { acceptInviteLink } from "#src/routers/games/acceptInviteLink";
import { acceptLookupInvite } from "#src/routers/games/acceptLookupInvite";
import { gameById } from "#src/routers/games/byId";
import { createInviteLink } from "#src/routers/games/createInviteLink";
import { kick } from "#src/routers/games/kick";
import { leaveGame } from "#src/routers/games/leave";
import { mergeHalfTeams } from "#src/routers/games/mergeHalfTeams";
import { register } from "#src/routers/games/register";
import { registerSeat } from "#src/routers/games/registerSeat";
import { registerTeam } from "#src/routers/games/registerTeam";
import { registerWithPartner } from "#src/routers/games/registerWithPartner";
import { sendLookupInvite } from "#src/routers/games/sendLookupInvite";
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
  const owner = await insertUser(database, "game-owner@example.com");
  const admin = await insertUser(database, "game-admin@example.com");
  const creator = await insertUser(database, "game-creator@example.com");
  const member = await insertUser(database, "game-member@example.com");
  const [community] = await database
    .insert(communities)
    .values({ name: "Game Club", type: "public", createdBy: owner })
    .returning({ id: communities.id });
  if (!community) {
    throw new Error("Failed to insert community");
  }
  await database.insert(communityMembers).values(
    [
      { userId: owner, role: CommunityRoleEnum.OWNER },
      { userId: admin, role: CommunityRoleEnum.ADMIN },
      { userId: creator, role: CommunityRoleEnum.MEMBER },
      { userId: member, role: CommunityRoleEnum.MEMBER },
    ].map((row) => ({ ...row, communityId: community.id })),
  );
  const [group] = await database
    .insert(groups)
    .values({
      name: "Club Squad",
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
    member,
    admins: [owner, admin, creator].sort(),
  };
}

async function insertGame(
  database: TestDatabase,
  args: {
    createdBy: string;
    venueId: string;
    groupId: string | null;
    format?: GameRow["format"];
    registrationMode?: GameRow["registrationMode"];
    playersAllowed?: number | null;
    teamsAllowed?: number | null;
    poolCount?: number | null;
  },
): Promise<GameRow> {
  const windowStart = new Date(Date.now() + 24 * HOUR);
  const [row] = await database
    .insert(games)
    .values({
      format: args.format ?? GameFormatEnum.FRIENDLY_GAME,
      registrationMode:
        args.registrationMode ?? GameRegistrationModeEnum.INDIVIDUAL,
      venueId: args.venueId,
      createdBy: args.createdBy,
      groupId: args.groupId,
      isPublic: true,
      playersAllowed: args.playersAllowed ?? 4,
      teamsAllowed: args.teamsAllowed ?? 2,
      poolCount: args.poolCount ?? null,
      windowStart,
      windowEnd: new Date(windowStart.getTime() + 2 * HOUR),
    })
    .returning();
  if (!row) {
    throw new Error("Failed to insert game");
  }
  if (row.format === GameFormatEnum.FRIENDLY_GAME) {
    await database.insert(matches).values({ gameId: row.id });
  }
  return row;
}

function insertAmericano(
  database: TestDatabase,
  club: Awaited<ReturnType<typeof insertClub>>,
) {
  return insertGame(database, {
    createdBy: club.admin,
    venueId: club.venueId,
    groupId: club.groupId,
    format: GameFormatEnum.AMERICANO,
    playersAllowed: 8,
    teamsAllowed: null,
  });
}

async function joinedRows(database: TestDatabase) {
  const rows = await database.query.notifications.findMany({
    where: eq(notifications.type, "game_player_joined"),
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

function recipients(rows: Awaited<ReturnType<typeof joinedRows>>) {
  return rows.map((row) => row.recipient).sort();
}

async function clearNotifications(database: TestDatabase) {
  await database.delete(notifications);
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

describe("Game joined Notifications", () => {
  it("tells each Game admin once about an Americano register, and not the joiner", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const club = await insertClub(db);
      const player = await insertUser(db, "americano-player@example.com");
      const game = await insertAmericano(db, club);

      const result = await register(db, { gameId: game.id, userId: player });

      expect(result).toEqual({ ok: true, waitlisted: false });
      const rows = await joinedRows(db);
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

  it("tells each Game admin about a seat pick, and the response is unchanged", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const club = await insertClub(db);
      const player = await insertUser(db, "seat-player@example.com");
      const game = await insertGame(db, {
        createdBy: club.admin,
        venueId: club.venueId,
        groupId: club.groupId,
      });

      const result = await registerSeat(db, {
        gameId: game.id,
        userId: player,
        sideIndex: 1,
        position: "left",
      });

      expect(result).toEqual({ ok: true, waitlisted: false });
      const rows = await joinedRows(db);
      expect(recipients(rows)).toEqual(club.admins);
      expect(rows.every((row) => row.actor === player)).toBe(true);
    } finally {
      await close();
    }
  });

  it("names the partner of a Partner registration and leaves both Users of the pair out", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const club = await insertClub(db);
      const game = await insertGame(db, {
        createdBy: club.owner,
        venueId: club.venueId,
        groupId: club.groupId,
      });

      await registerWithPartner(db, {
        gameId: game.id,
        userId: club.admin,
        partnerUserId: club.creator,
        sideIndex: 1,
        position: "left",
      });

      const rows = await joinedRows(db);
      expect(recipients(rows)).toEqual([club.owner]);
      expect(rows[0]).toMatchObject({
        actor: club.admin,
        partner: club.creator,
        team: null,
        viaWaitlist: false,
      });
    } finally {
      await close();
    }
  });

  it("names a complete Team and leaves both members out", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const club = await insertClub(db);
      const teammate = await insertUser(db, "teammate@example.com");
      const game = await insertGame(db, {
        createdBy: club.owner,
        venueId: club.venueId,
        groupId: club.groupId,
        registrationMode: GameRegistrationModeEnum.TEAM_ONLY,
      });
      const [team] = await db
        .insert(teams)
        .values({ createdBy: club.creator, name: "Smash" })
        .returning({ id: teams.id });
      if (!team) {
        throw new Error("Failed to insert team");
      }
      await db.insert(teamMembers).values([
        { teamId: team.id, userId: club.creator },
        { teamId: team.id, userId: teammate },
      ]);

      const result = await registerTeam(db, {
        gameId: game.id,
        userId: teammate,
        teamId: team.id,
      });

      expect(result).toEqual({ ok: true, waitlisted: false });
      const rows = await joinedRows(db);
      expect(recipients(rows)).toEqual([club.owner, club.admin].sort());
      for (const row of rows) {
        expect(row.team).toBe(team.id);
        expect([row.actor, row.partner].sort()).toEqual(
          [club.creator, teammate].sort(),
        );
      }
    } finally {
      await close();
    }
  });

  it("tells each Game admin about a Game Lookup invite accepted", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const club = await insertClub(db);
      const invitee = await insertUser(db, "lookup-invitee@example.com");
      const game = await insertAmericano(db, club);
      const sent = await sendLookupInvite(db, {
        gameId: game.id,
        userId: club.owner,
        userIds: [invitee],
      });
      const inviteId = sent.sent[0]?.id;
      if (!inviteId) {
        throw new Error("expected a Lookup invite");
      }

      const result = await acceptLookupInvite(db, {
        inviteId,
        userId: invitee,
      });

      expect(result).toEqual({ ok: true, gameId: game.id, waitlisted: false });
      const rows = await joinedRows(db);
      expect(recipients(rows)).toEqual(club.admins);
      expect(rows.every((row) => row.actor === invitee)).toBe(true);
    } finally {
      await close();
    }
  });

  it("tells each Game admin about a Game Invite link accepted", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const club = await insertClub(db);
      const guest = await insertUser(db, "link-guest@example.com");
      const game = await insertAmericano(db, club);
      await createInviteLink(db, {
        gameId: game.id,
        userId: club.owner,
        origin: "https://temba.test",
      });
      const link = await db.query.gameInviteLinks.findFirst({
        where: eq(gameInviteLinks.gameId, game.id),
      });
      if (!link) {
        throw new Error("expected an Invite link");
      }

      const result = await acceptInviteLink(db, {
        token: link.token,
        userId: guest,
      });

      expect(result).toEqual({
        gameId: game.id,
        outcome: "registered",
        waitlisted: false,
      });
      const rows = await joinedRows(db);
      expect(recipients(rows)).toEqual(club.admins);
      expect(rows.every((row) => row.actor === guest)).toBe(true);
    } finally {
      await close();
    }
  });

  it("writes nothing for joining the Waitlist, then tells admins about the promotion after a leave", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const club = await insertClub(db);
      const players = await Promise.all(
        [1, 2, 3, 4].map((n) => insertUser(db, `leave-p${n}@example.com`)),
      );
      const waiting = await insertUser(db, "leave-waiting@example.com");
      const game = await insertGame(db, {
        createdBy: club.admin,
        venueId: club.venueId,
        groupId: club.groupId,
      });
      await fillFriendlyGame(db, game, players);
      await clearNotifications(db);

      const queued = await registerSeat(db, {
        gameId: game.id,
        userId: waiting,
        sideIndex: 1,
        position: "left",
      });
      expect(queued).toEqual({ ok: true, waitlisted: true });
      expect(await joinedRows(db)).toEqual([]);

      await leaveGame(db, { gameId: game.id, userId: players[0]! });

      const rows = await joinedRows(db);
      expect(recipients(rows)).toEqual(club.admins);
      for (const row of rows) {
        expect(row).toMatchObject({
          actor: waiting,
          partner: null,
          viaWaitlist: true,
          game: game.id,
        });
      }
    } finally {
      await close();
    }
  });

  it("tells the kicking Organizer who took the seat on a promotion after a kick", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const club = await insertClub(db);
      const players = await Promise.all(
        [1, 2, 3, 4].map((n) => insertUser(db, `kick-p${n}@example.com`)),
      );
      const waiting = await insertUser(db, "kick-waiting@example.com");
      const game = await insertGame(db, {
        createdBy: club.admin,
        venueId: club.venueId,
        groupId: club.groupId,
      });
      await fillFriendlyGame(db, game, players);
      await registerSeat(db, {
        gameId: game.id,
        userId: waiting,
        sideIndex: 1,
        position: "left",
      });
      await clearNotifications(db);

      await kick(db, {
        gameId: game.id,
        organizerUserId: club.owner,
        userId: players[1]!,
      });

      const rows = await joinedRows(db);
      expect(recipients(rows)).toEqual(club.admins);
      expect(
        rows.every((row) => row.actor === waiting && row.viaWaitlist),
      ).toBe(true);
    } finally {
      await close();
    }
  });

  it("follows the audience at event time: a creator who left and a demoted Admin get nothing, a promoted Admin gets one", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const club = await insertClub(db);
      const player = await insertUser(db, "audience-player@example.com");
      const game = await insertAmericano(db, club);
      const left = await leaveCommunity(db, {
        communityId: club.communityId,
        userId: club.creator,
      });
      expect(left.ok).toBe(true);
      await db
        .update(communityMembers)
        .set({ role: CommunityRoleEnum.MEMBER })
        .where(eq(communityMembers.userId, club.admin));
      await db
        .update(communityMembers)
        .set({ role: CommunityRoleEnum.ADMIN })
        .where(eq(communityMembers.userId, club.member));

      await register(db, { gameId: game.id, userId: player });

      expect(recipients(await joinedRows(db))).toEqual(
        [club.owner, club.member].sort(),
      );
    } finally {
      await close();
    }
  });

  it("tells only the creator of a groupless Game", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const club = await insertClub(db);
      const player = await insertUser(db, "groupless-player@example.com");
      const game = await insertGame(db, {
        createdBy: club.member,
        venueId: club.venueId,
        groupId: null,
        format: GameFormatEnum.AMERICANO,
        playersAllowed: 8,
        teamsAllowed: null,
      });

      await register(db, { gameId: game.id, userId: player });

      const rows = await joinedRows(db);
      expect(recipients(rows)).toEqual([club.member]);
      expect(rows[0]?.group).toBeNull();
    } finally {
      await close();
    }
  });

  it("writes nothing for a Club Group Game in a Soft-archived Community, including a promotion", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const club = await insertClub(db);
      const players = await Promise.all(
        [1, 2, 3, 4].map((n) => insertUser(db, `archived-p${n}@example.com`)),
      );
      const waiting = await insertUser(db, "archived-waiting@example.com");
      const game = await insertGame(db, {
        createdBy: club.admin,
        venueId: club.venueId,
        groupId: club.groupId,
      });
      await fillFriendlyGame(db, game, players);
      await registerSeat(db, {
        gameId: game.id,
        userId: waiting,
        sideIndex: 1,
        position: "left",
      });
      await clearNotifications(db);
      await commit(db, { communityId: club.communityId }, "archived");

      await leaveGame(db, { gameId: game.id, userId: players[0]! });

      expect(await joinedRows(db)).toEqual([]);
    } finally {
      await close();
    }
  });

  it("writes nothing when an already-registered User is re-seated", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const club = await insertClub(db);
      const player = await insertUser(db, "reseat-player@example.com");
      const game = await insertGame(db, {
        createdBy: club.admin,
        venueId: club.venueId,
        groupId: club.groupId,
      });
      await db.insert(gamePlayers).values({ gameId: game.id, userId: player });

      const result = await registerSeat(db, {
        gameId: game.id,
        userId: player,
        sideIndex: 2,
        position: "right",
      });

      expect(result).toEqual({ ok: true, waitlisted: false });
      expect(await joinedRows(db)).toEqual([]);
    } finally {
      await close();
    }
  });

  it("writes nothing when an Organizer merges two Half teams", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const club = await insertClub(db);
      const ada = await insertUser(db, "merge-ada@example.com");
      const jonas = await insertUser(db, "merge-jonas@example.com");
      const game = await insertGame(db, {
        createdBy: club.admin,
        venueId: club.venueId,
        groupId: club.groupId,
        format: GameFormatEnum.FRIENDLY_TOURNAMENT,
        teamsAllowed: 4,
        playersAllowed: 8,
        poolCount: 1,
      });
      await registerSeat(db, {
        gameId: game.id,
        userId: ada,
        sideIndex: 1,
        position: "left",
      });
      await registerSeat(db, {
        gameId: game.id,
        userId: jonas,
        sideIndex: 2,
        position: "right",
      });
      await clearNotifications(db);
      const view = await gameById(db, { gameId: game.id, userId: club.admin });
      const first = view.sides.find((side) => side.sideIndex === 1);
      const second = view.sides.find((side) => side.sideIndex === 2);
      if (!first?.gameTeamId || !second?.gameTeamId) {
        throw new Error("expected two Half teams");
      }

      await mergeHalfTeams(db, {
        gameId: game.id,
        organizerUserId: club.admin,
        firstGameTeamId: first.gameTeamId,
        secondGameTeamId: second.gameTeamId,
        firstPosition: "left",
        secondPosition: "right",
      });

      expect(await joinedRows(db)).toEqual([]);
    } finally {
      await close();
    }
  });
});
