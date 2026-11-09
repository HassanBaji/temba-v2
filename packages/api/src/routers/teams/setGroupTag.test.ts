import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import {
  GameFormatEnum,
  GameRegistrationModeEnum,
  GameSportEnum,
  GroupMemberRoleEnum,
  GroupSportEnum,
  MatchStatusEnum,
  gameTeams,
  games,
  groupMembers,
  groups,
  matchSets,
  matches,
  teamMembers,
  teams,
  user,
  venues,
} from "@repo/db/schema";
import { createPgliteDb, type TestDatabase } from "@repo/db/testing";

import { groupById } from "#src/routers/groups/byId";
import { deleteGroup } from "#src/routers/groups/delete";

import { teamById } from "./byId";
import { createTeam } from "./create";
import { setGroupTag } from "./setGroupTag";

type Db = Parameters<typeof setGroupTag>[0];

async function makeUsers(database: TestDatabase, count: number) {
  const rows = await database
    .insert(user)
    .values(
      Array.from({ length: count }, (_, index) => ({
        name: `Player ${index}`,
        email: `player${index}@example.com`,
      })),
    )
    .returning({ id: user.id });
  return rows.map((row) => row.id);
}

async function makeGroup(
  database: TestDatabase,
  args: {
    name: string;
    createdBy: string;
    sport: GroupSportEnum;
    organizers?: string[];
    members?: string[];
  },
) {
  const [group] = await database
    .insert(groups)
    .values({ name: args.name, createdBy: args.createdBy, sport: args.sport })
    .returning({ id: groups.id });
  await database.insert(groupMembers).values([
    { groupId: group!.id, userId: args.createdBy },
    ...(args.organizers ?? []).map((userId) => ({
      groupId: group!.id,
      userId,
      role: GroupMemberRoleEnum.ORGANIZER,
    })),
    ...(args.members ?? []).map((userId) => ({ groupId: group!.id, userId })),
  ]);
  return group!.id;
}

async function makeTeam(
  db: Db,
  args: { captain: string; sport: "padel" | "football"; groupId?: string },
) {
  const team = await createTeam(db, {
    name: undefined,
    sport: args.sport,
    userId: args.captain,
    userName: "Captain",
    groupId: args.groupId,
  });
  return team.id;
}

async function playMatch(
  database: TestDatabase,
  args: { createdBy: string; teamIds: [string, string] },
) {
  const [venue] = await database
    .insert(venues)
    .values({ name: "Arad Pitch", city: "Muharraq", country: "BH" })
    .returning({ id: venues.id });
  const start = new Date("2026-09-01T18:00:00.000Z");
  const [game] = await database
    .insert(games)
    .values({
      name: "Team game",
      format: GameFormatEnum.FRIENDLY_GAME,
      registrationMode: GameRegistrationModeEnum.TEAM_ONLY,
      sport: GameSportEnum.Football,
      sideSize: 5,
      venueId: venue!.id,
      createdBy: args.createdBy,
      isPublic: false,
      playersAllowed: 10,
      teamsAllowed: 2,
      windowStart: start,
      windowEnd: new Date(start.getTime() + 60 * 60 * 1000),
    })
    .returning({ id: games.id });
  const sides = await database
    .insert(gameTeams)
    .values(
      args.teamIds.map((teamId, index) => ({
        gameId: game!.id,
        teamId,
        sideIndex: index + 1,
      })),
    )
    .returning({ id: gameTeams.id });
  const [match] = await database
    .insert(matches)
    .values({
      gameId: game!.id,
      startTime: start,
      status: MatchStatusEnum.COMPLETED,
      slot1GameTeamId: sides[0]!.id,
      slot2GameTeamId: sides[1]!.id,
    })
    .returning({ id: matches.id });
  await database.insert(matchSets).values({
    matchId: match!.id,
    setNumber: 1,
    slot1GamesWon: 3,
    slot2GamesWon: 1,
  });
}

async function withDb(run: (database: TestDatabase, db: Db) => Promise<void>) {
  const { db, close } = await createPgliteDb();
  try {
    await run(db, db as unknown as Db);
  } finally {
    await close();
  }
}

describe("teams.setGroupTag", () => {
  it("lets a Group Organizer who is not on the Team tag it, and then act for it", async () => {
    await withDb(async (database, db) => {
      const [captain, owner, appointed] = (await makeUsers(database, 3)) as [
        string,
        string,
        string,
      ];
      const groupId = await makeGroup(database, {
        name: "Gooz of Arad",
        createdBy: owner,
        sport: GroupSportEnum.FOOTBALL,
        organizers: [appointed],
        members: [captain],
      });
      const teamId = await makeTeam(db, { captain, sport: "football" });

      const before = await teamById(db, { teamId, userId: appointed });
      expect(before.viewerActsForTeam).toBe(false);
      expect(before.groupTagOptions).toEqual([
        { id: groupId, name: "Gooz of Arad" },
      ]);

      const result = await setGroupTag(db, {
        teamId,
        groupId,
        userId: appointed,
      });
      expect(result.groupTag).toEqual({ id: groupId, name: "Gooz of Arad" });

      const after = await teamById(db, { teamId, userId: appointed });
      expect(after.groupTag).toEqual({ id: groupId, name: "Gooz of Arad" });
      expect(after.viewerActsForTeam).toBe(true);
      expect(after.canClearGroupTag).toBe(true);
      expect(after.canInvite).toBe(false);
    });
  });

  it("refuses a member who is neither Captain nor Organizer", async () => {
    await withDb(async (database, db) => {
      const [captain, member, owner] = (await makeUsers(database, 3)) as [
        string,
        string,
        string,
      ];
      const groupId = await makeGroup(database, {
        name: "Gooz of Arad",
        createdBy: owner,
        sport: GroupSportEnum.FOOTBALL,
        members: [captain],
      });
      const teamId = await makeTeam(db, { captain, sport: "football" });
      await database.insert(teamMembers).values({ teamId, userId: member });

      await expect(
        setGroupTag(db, { teamId, groupId, userId: member }),
      ).rejects.toThrow("Only the Captain or an Organizer of that Group");

      await setGroupTag(db, { teamId, groupId, userId: captain });
      await expect(
        setGroupTag(db, { teamId, groupId: null, userId: member }),
      ).rejects.toThrow("Only the Captain or an Organizer of the tagged Group");
    });
  });

  it("refuses an Organizer whose Group the Captain is not in, until the Captain joins", async () => {
    await withDb(async (database, db) => {
      const [captain, stranger] = (await makeUsers(database, 2)) as [
        string,
        string,
      ];
      const groupId = await makeGroup(database, {
        name: "Stranger FC",
        createdBy: stranger,
        sport: GroupSportEnum.FOOTBALL,
      });
      const teamId = await makeTeam(db, { captain, sport: "football" });

      expect(
        (await teamById(db, { teamId, userId: stranger })).groupTagOptions,
      ).toEqual([]);
      await expect(
        setGroupTag(db, { teamId, groupId, userId: stranger }),
      ).rejects.toThrow(
        "A Team can only be tagged to a Group its Captain is in",
      );
      const untouched = await database.query.teams.findFirst({
        where: eq(teams.id, teamId),
      });
      expect(untouched?.groupId).toBe(null);

      await database.insert(groupMembers).values({ groupId, userId: captain });

      expect(
        (await teamById(db, { teamId, userId: stranger })).groupTagOptions,
      ).toEqual([{ id: groupId, name: "Stranger FC" }]);
      const result = await setGroupTag(db, {
        teamId,
        groupId,
        userId: stranger,
      });
      expect(result.groupTag).toEqual({ id: groupId, name: "Stranger FC" });
    });
  });

  it("refuses a Captain tagging their Team to a Group they are not in", async () => {
    await withDb(async (database, db) => {
      const [captain, owner] = (await makeUsers(database, 2)) as [
        string,
        string,
      ];
      const groupId = await makeGroup(database, {
        name: "Gooz of Arad",
        createdBy: owner,
        sport: GroupSportEnum.FOOTBALL,
      });
      const teamId = await makeTeam(db, { captain, sport: "football" });

      await expect(
        setGroupTag(db, { teamId, groupId, userId: captain }),
      ).rejects.toThrow(
        "A Team can only be tagged to a Group its Captain is in",
      );
      const row = await database.query.teams.findFirst({
        where: eq(teams.id, teamId),
      });
      expect(row?.groupId).toBe(null);
    });
  });

  it("refuses a Group of another sport", async () => {
    await withDb(async (database, db) => {
      const [captain, owner] = (await makeUsers(database, 2)) as [
        string,
        string,
      ];
      const groupId = await makeGroup(database, {
        name: "Gooz of Arad",
        createdBy: owner,
        sport: GroupSportEnum.FOOTBALL,
      });
      const teamId = await makeTeam(db, { captain, sport: "padel" });

      await expect(
        setGroupTag(db, { teamId, groupId, userId: owner }),
      ).rejects.toThrow("A Team can only be tagged to a Group of its sport");
      await expect(
        makeTeam(db, { captain, sport: "padel", groupId }),
      ).rejects.toThrow("A Team can only be tagged to a Group of its sport");
    });
  });

  it("lets an Organizer of the tagged Group clear the tag, not one of another Group move it", async () => {
    await withDb(async (database, db) => {
      const [captain, owner, otherOwner] = (await makeUsers(database, 3)) as [
        string,
        string,
        string,
      ];
      const groupId = await makeGroup(database, {
        name: "Gooz of Arad",
        createdBy: owner,
        sport: GroupSportEnum.FOOTBALL,
        members: [captain],
      });
      const otherGroupId = await makeGroup(database, {
        name: "Hidd United",
        createdBy: otherOwner,
        sport: GroupSportEnum.FOOTBALL,
        members: [captain],
      });
      const teamId = await makeTeam(db, {
        captain,
        sport: "football",
        groupId,
      });

      const other = await teamById(db, { teamId, userId: otherOwner });
      expect(other.canClearGroupTag).toBe(false);
      expect(other.groupTagOptions).toEqual([]);
      await expect(
        setGroupTag(db, { teamId, groupId: otherGroupId, userId: otherOwner }),
      ).rejects.toThrow("Only the Captain or an Organizer of that Group");

      await setGroupTag(db, { teamId, groupId: null, userId: owner });
      expect((await teamById(db, { teamId, userId: owner })).groupTag).toBe(
        null,
      );
    });
  });

  it("is cleared when the Group is deleted, and the Team keeps its record", async () => {
    await withDb(async (database, db) => {
      const [captain, rivalCaptain, owner] = (await makeUsers(database, 3)) as [
        string,
        string,
        string,
      ];
      const groupId = await makeGroup(database, {
        name: "Gooz of Arad",
        createdBy: owner,
        sport: GroupSportEnum.FOOTBALL,
        members: [captain],
      });
      const teamId = await makeTeam(db, {
        captain,
        sport: "football",
        groupId,
      });
      const rivalId = await makeTeam(db, {
        captain: rivalCaptain,
        sport: "football",
      });
      await playMatch(database, {
        createdBy: captain,
        teamIds: [teamId, rivalId],
      });

      await deleteGroup(db, { groupId, userId: owner });

      const after = await teamById(db, { teamId, userId: captain });
      expect(after.groupTag).toBe(null);
      expect(after.record).toEqual({
        gamesPlayed: 1,
        wins: 1,
        draws: 0,
        losses: 0,
      });
      const row = await database.query.teams.findFirst({
        where: eq(teams.id, teamId),
      });
      expect(row?.groupId).toBe(null);
    });
  });
});

describe("groups.byId teams", () => {
  it("lists only the Teams tagged to that Group, with their record", async () => {
    await withDb(async (database, db) => {
      const [captain, owner, otherOwner] = (await makeUsers(database, 3)) as [
        string,
        string,
        string,
      ];
      const groupId = await makeGroup(database, {
        name: "Gooz of Arad",
        createdBy: owner,
        sport: GroupSportEnum.FOOTBALL,
        members: [captain],
      });
      const otherGroupId = await makeGroup(database, {
        name: "Hidd United",
        createdBy: otherOwner,
        sport: GroupSportEnum.FOOTBALL,
        members: [captain],
      });
      const tagged = await makeTeam(db, {
        captain,
        sport: "football",
        groupId,
      });
      const otherTagged = await makeTeam(db, {
        captain,
        sport: "football",
        groupId: otherGroupId,
      });
      await makeTeam(db, { captain, sport: "football" });
      await playMatch(database, {
        createdBy: captain,
        teamIds: [tagged, otherTagged],
      });

      const group = await groupById(db, { groupId, userId: owner });
      expect(group.teams).toEqual([
        {
          id: tagged,
          displayName: "Player 0",
          sport: "football",
          rosterCount: 1,
          record: { gamesPlayed: 1, wins: 1, draws: 0, losses: 0 },
        },
      ]);
      expect(group.canCreateTeam).toBe(true);
      expect(
        (await groupById(db, { groupId, userId: captain })).canCreateTeam,
      ).toBe(false);
    });
  });
});
