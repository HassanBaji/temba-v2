import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import {
  GameFormatEnum,
  games,
  groupMembers,
  GroupMemberRoleEnum,
  groups,
  GroupTypeEnum,
  teams,
  user,
  venues,
} from "@repo/db/schema";

import {
  footballMatchup,
  refusal,
} from "#src/challenges/challenges.test-support";
import {
  canViewGame,
  gameAdminUserIds,
  type GameRow,
  isGameOrganizer,
  requireGame,
} from "#src/games/access";
import { recordJobs } from "#src/jobs/job-sink.test-support";
import { confirmProposal } from "#src/routers/challenges/confirmProposal";
import { proposeOnChallenge } from "#src/routers/challenges/propose";
import { addGroupMembers } from "#src/routers/games/addGroupMembers";
import { addPlayerByPhone } from "#src/routers/games/addPlayerByPhone";
import { cancelGame } from "#src/routers/games/cancel";
import { createInviteLink } from "#src/routers/games/createInviteLink";
import { kick } from "#src/routers/games/kick";
import { leaveGame } from "#src/routers/games/leave";
import { leaveWaitlist } from "#src/routers/games/leaveWaitlist";
import { publishFootballTeams } from "#src/routers/games/publishFootballTeams";
import { register } from "#src/routers/games/register";
import { registerSeat } from "#src/routers/games/registerSeat";
import { registerTeam } from "#src/routers/games/registerTeam";
import { registerWithPartner } from "#src/routers/games/registerWithPartner";
import { sendLookupInvite } from "#src/routers/games/sendLookupInvite";
import { updateGameCaps } from "#src/routers/games/updateCaps";
import { updateGameLevelRange } from "#src/routers/games/updateLevelRange";
import { updateGameName } from "#src/routers/games/updateName";
import { updateGamePricePerPlayer } from "#src/routers/games/updatePricePerPlayer";
import { updateGameSeason } from "#src/routers/games/updateSeason";
import { updateGameWindow } from "#src/routers/games/updateWindow";
import { isGroupApprover } from "#src/groups/helpers/is-group-approver";
import { commit } from "#src/soft-archive";
import { createPgliteDb, type TestDatabase } from "@repo/db/testing";

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
  return row.id;
}

async function insertGroup(
  database: TestDatabase,
  args: { createdBy: string; venueId?: string },
) {
  const [row] = await database
    .insert(groups)
    .values({
      name: "Audience Group",
      type: GroupTypeEnum.PUBLIC,
      createdBy: args.createdBy,
      venueId: args.venueId ?? null,
    })
    .returning();
  if (!row) {
    throw new Error("Failed to insert group");
  }
  return row;
}

async function insertGame(
  database: TestDatabase,
  args: { createdBy: string; groupId: string | null; venueId?: string },
): Promise<GameRow> {
  const venueId = args.venueId ?? (await insertVenue(database));
  const [row] = await database
    .insert(games)
    .values({
      format: GameFormatEnum.FRIENDLY_GAME,
      venueId,
      createdBy: args.createdBy,
      groupId: args.groupId,
    })
    .returning();
  if (!row) {
    throw new Error("Failed to insert game");
  }
  return row;
}

async function appoint(
  database: TestDatabase,
  groupId: string,
  userId: string,
) {
  await database.insert(groupMembers).values({
    groupId,
    userId,
    role: GroupMemberRoleEnum.ORGANIZER,
  });
}

async function clubGame(database: TestDatabase) {
  const creator = await insertUser(database, "audience-creator@example.com");
  const organizer = await insertUser(
    database,
    "audience-organizer@example.com",
  );
  const member = await insertUser(database, "audience-member@example.com");
  const outsider = await insertUser(database, "audience-outsider@example.com");
  const venueId = await insertVenue(database);
  const group = await insertGroup(database, { createdBy: creator, venueId });
  await appoint(database, group.id, organizer);
  await database
    .insert(groupMembers)
    .values({ groupId: group.id, userId: member });
  const game = await insertGame(database, {
    createdBy: organizer,
    groupId: group.id,
    venueId,
  });
  return {
    venueId,
    group,
    game,
    creator,
    organizer,
    member,
    outsider,
    everyone: [creator, organizer, member, outsider],
  };
}

/** Organizers ∪ Group approvers: the Group creator and Appointed Organizers. */
async function expectedAdmin(
  database: TestDatabase,
  game: GameRow,
  userId: string,
) {
  const group = game.groupId
    ? await database.query.groups.findFirst({
        where: eq(groups.id, game.groupId),
      })
    : undefined;
  return (
    (await isGameOrganizer(database, game, userId)) ||
    (group != null && (await isGroupApprover(database, group, userId)))
  );
}

async function expectParity(
  database: TestDatabase,
  game: GameRow,
  userIds: string[],
) {
  const resolved = await gameAdminUserIds(database, game);
  expect(new Set(resolved).size).toBe(resolved.length);
  for (const userId of userIds) {
    expect(resolved.includes(userId)).toBe(
      await expectedAdmin(database, game, userId),
    );
  }
}

describe("gameAdminUserIds", () => {
  it("is the Game creator alone on a groupless Game", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const creator = await insertUser(db, "groupless-creator@example.com");
      const other = await insertUser(db, "groupless-other@example.com");
      const game = await insertGame(db, { createdBy: creator, groupId: null });

      expect(await gameAdminUserIds(db, game)).toEqual([creator]);
      await expectParity(db, game, [creator, other]);
    } finally {
      await close();
    }
  });

  it("is the Group creator alone on a Loose Group Game", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const creator = await insertUser(db, "loose-game-creator@example.com");
      const other = await insertUser(db, "loose-game-other@example.com");
      const group = await insertGroup(db, { createdBy: creator });
      const game = await insertGame(db, {
        createdBy: creator,
        groupId: group.id,
      });

      expect(await gameAdminUserIds(db, game)).toEqual([creator]);
      await expectParity(db, game, [creator, other]);
    } finally {
      await close();
    }
  });

  it("is the Group creator and the Appointed Organizers on a Club Group Game", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const fixture = await clubGame(db);

      expect((await gameAdminUserIds(db, fixture.game)).sort()).toEqual(
        [fixture.creator, fixture.organizer].sort(),
      );
      await expectParity(db, fixture.game, fixture.everyone);
    } finally {
      await close();
    }
  });

  it("lists a Group creator who is also an Appointed Organizer once", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const creator = await insertUser(
        db,
        "creator-organizer-game@example.com",
      );
      const venueId = await insertVenue(db);
      const group = await insertGroup(db, { createdBy: creator, venueId });
      await appoint(db, group.id, creator);
      const game = await insertGame(db, {
        createdBy: creator,
        groupId: group.id,
        venueId,
      });

      expect(await gameAdminUserIds(db, game)).toEqual([creator]);
      await expectParity(db, game, [creator]);
    } finally {
      await close();
    }
  });

  it("drops an Organizer whose appointment ended, even the one who created the Game", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const fixture = await clubGame(db);
      await db
        .update(groupMembers)
        .set({ role: GroupMemberRoleEnum.MEMBER })
        .where(eq(groupMembers.userId, fixture.organizer));
      await db
        .update(groupMembers)
        .set({ role: GroupMemberRoleEnum.ORGANIZER })
        .where(eq(groupMembers.userId, fixture.member));

      expect(await isGameOrganizer(db, fixture.game, fixture.organizer)).toBe(
        false,
      );
      const resolved = await gameAdminUserIds(db, fixture.game);
      expect(resolved).not.toContain(fixture.organizer);
      expect(resolved).toContain(fixture.member);
      await expectParity(db, fixture.game, fixture.everyone);
    } finally {
      await close();
    }
  });

  it("keeps the audience while the linked Venue is Soft-archived", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const fixture = await clubGame(db);
      await commit(db, { venueId: fixture.venueId }, "archived");

      expect(await isGameOrganizer(db, fixture.game, fixture.creator)).toBe(
        true,
      );
      expect((await gameAdminUserIds(db, fixture.game)).sort()).toEqual(
        [fixture.creator, fixture.organizer].sort(),
      );
      await expectParity(db, fixture.game, fixture.everyone);
    } finally {
      await close();
    }
  });
});

describe("a Challenge Game's Organizers, viewers and closed doors", () => {
  recordJobs();
  const HOUR = 60 * 60 * 1000;
  const sentAt = new Date(Date.now() - 4 * 24 * HOUR);
  const kickOff = new Date(sentAt.getTime() + 48 * HOUR);

  async function challengeGame(database: TestDatabase) {
    const db = database as unknown as Parameters<typeof confirmProposal>[0];
    const organizer = await insertUser(database, "tag-organizer@example.com");
    const stranger = await insertUser(database, "stranger@example.com");
    const match = await footballMatchup(database, sentAt, { sideSize: 5 });
    const group = await insertGroup(database, {
      createdBy: match.aradIds[0]!,
    });
    await database
      .update(groups)
      .set({ sport: "football" })
      .where(eq(groups.id, group.id));
    await appoint(database, group.id, organizer);
    await database
      .update(teams)
      .set({ groupId: group.id })
      .where(eq(teams.id, match.arad.id));
    const { id: proposalId } = await proposeOnChallenge(db, {
      challengeId: match.challenge.id,
      teamId: match.arad.id,
      venueId: match.venue.id,
      startsAt: kickOff,
      userId: match.aradIds[0]!,
      now: sentAt,
    });
    const { gameId } = await confirmProposal(db, {
      proposalId,
      userId: match.hiddIds[0]!,
      now: sentAt,
    });
    return {
      db,
      match,
      organizer,
      stranger,
      game: await requireGame(database, gameId),
    };
  }

  it("makes whoever acts for either Team an Organizer, and lets any Roster member view it", async () => {
    const { db: database, close } = await createPgliteDb();
    try {
      const { match, organizer, stranger, game } =
        await challengeGame(database);
      const hiddCaptain = match.hiddIds[0]!;
      const aradCaptain = match.aradIds[0]!;
      for (const userId of [hiddCaptain, aradCaptain, organizer]) {
        expect(await isGameOrganizer(database, game, userId)).toBe(true);
      }
      for (const userId of [match.hiddIds[1]!, stranger]) {
        expect(await isGameOrganizer(database, game, userId)).toBe(false);
      }
      expect((await gameAdminUserIds(database, game)).sort()).toEqual(
        [hiddCaptain, aradCaptain, organizer].sort(),
      );
      expect(await canViewGame(database, game, match.hiddIds[3]!)).toBe(true);
      expect(await canViewGame(database, game, match.aradIds[4]!)).toBe(true);
      expect(await canViewGame(database, game, stranger)).toBe(false);
    } finally {
      await close();
    }
  });

  it("refuses every admit, invite, kick, publish and shape door with the Challenge line", async () => {
    const { db: database, close } = await createPgliteDb();
    try {
      const { db, match, game } = await challengeGame(database);
      const captain = match.hiddIds[0]!;
      const member = match.hiddIds[1]!;
      const gameId = game.id;
      const doors: Promise<unknown>[] = [
        registerSeat(db, { gameId, userId: member }),
        register(db, { gameId, userId: member }),
        registerTeam(db, { gameId, userId: captain, teamId: match.hidd.id }),
        registerWithPartner(db, {
          gameId,
          userId: member,
          partnerUserId: match.hiddIds[2]!,
        }),
        createInviteLink(db, { gameId, userId: captain, origin: "https://x" }),
        sendLookupInvite(db, { gameId, userId: captain, userIds: [member] }),
        addPlayerByPhone(db, {
          gameId,
          organizerUserId: captain,
          countryIso: "BH",
          nationalNumber: "33334444",
        }),
        addGroupMembers(db, {
          gameId,
          organizerUserId: captain,
          players: [{ userId: member }],
        }),
        leaveGame(db, { gameId, userId: member }),
        leaveWaitlist(db, { gameId, userId: member }),
        kick(db, { gameId, organizerUserId: captain, userId: member }),
        publishFootballTeams(db, {
          gameId,
          userId: captain,
          method: "manual",
          bibs: { slot1: "black", slot2: "white" },
          slot1: [],
          slot2: [],
        }),
        updateGameCaps(db, { gameId, userId: captain, playersAllowed: 16 }),
        updateGameLevelRange(db, {
          gameId,
          userId: captain,
          levelMinTenths: 20,
          levelMaxTenths: 40,
        }),
        updateGameSeason(db, { gameId, userId: captain, seasonId: null }),
      ];
      for (const door of doors) {
        expect(await refusal(door)).toEqual({
          code: "BAD_REQUEST",
          message: "Teams are set by the challenge; captains name the squads",
        });
      }
    } finally {
      await close();
    }
  });

  it("keeps cancel, window, name and price open to either Team's acting Users only", async () => {
    const { db: database, close } = await createPgliteDb();
    try {
      const { db, match, stranger, game } = await challengeGame(database);
      const hiddCaptain = match.hiddIds[0]!;
      const aradCaptain = match.aradIds[0]!;
      const gameId = game.id;
      const windowEnd = new Date(kickOff.getTime() + 90 * 60 * 1000);

      for (const forbidden of [
        updateGameName(db, { gameId, userId: stranger, customName: "Derby" }),
        updateGamePricePerPlayer(db, {
          gameId,
          userId: stranger,
          pricePerPlayerFils: 2000,
        }),
        updateGameWindow(db, {
          gameId,
          userId: stranger,
          windowStart: kickOff,
          windowEnd,
          name: "",
        }),
        cancelGame(db, { gameId, userId: stranger }),
      ]) {
        expect(await refusal(forbidden)).toMatchObject({ code: "FORBIDDEN" });
      }

      await updateGameName(db, {
        gameId,
        userId: aradCaptain,
        customName: "Derby",
      });
      await updateGamePricePerPlayer(db, {
        gameId,
        userId: hiddCaptain,
        pricePerPlayerFils: 2000,
      });
      await updateGameWindow(db, {
        gameId,
        userId: aradCaptain,
        windowStart: kickOff,
        windowEnd,
        name: "",
        now: sentAt,
      });
      await cancelGame(db, { gameId, userId: hiddCaptain });
      expect(await requireGame(database, gameId)).toMatchObject({
        pricePerPlayerFils: 2000,
        windowEnd,
      });
      expect((await requireGame(database, gameId)).cancelledAt).not.toBeNull();
    } finally {
      await close();
    }
  });
});
