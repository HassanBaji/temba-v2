import { describe, expect, it } from "vitest";

import {
  GameFormatEnum,
  GameRegistrationModeEnum,
  GameSportEnum,
  GroupSportEnum,
  MatchStatusEnum,
  gameTeams,
  games,
  groupMembers,
  groups,
  matchSets,
  matches,
  teamMembers,
  user,
  venues,
} from "@repo/db/schema";
import { createPgliteDb, type TestDatabase } from "@repo/db/testing";

import { deleteGroup } from "#src/routers/groups/delete";

import { createTeam } from "./create";
import { mine } from "./mine";

type Db = Parameters<typeof mine>[0];

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

async function playDraw(
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
    slot1GamesWon: 2,
    slot2GamesWon: 2,
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

describe("teams.mine", () => {
  it("carries the Roster count, the record with draws and the Group tag", async () => {
    await withDb(async (database, db) => {
      const [captain, owner, rivalCaptain, ...squad] = (await makeUsers(
        database,
        6,
      )) as [string, string, string, ...string[]];
      const [group] = await database
        .insert(groups)
        .values({
          name: "Gooz of Arad",
          createdBy: owner,
          sport: GroupSportEnum.FOOTBALL,
        })
        .returning({ id: groups.id });
      await database.insert(groupMembers).values([
        { groupId: group!.id, userId: owner },
        { groupId: group!.id, userId: captain },
      ]);
      const tagged = await createTeam(db, {
        name: "Hidd United",
        sport: "football",
        userId: captain,
        userName: "Captain",
        groupId: group!.id,
      });
      await database
        .insert(teamMembers)
        .values(squad.map((userId) => ({ teamId: tagged.id, userId })));
      const rival = await createTeam(db, {
        name: "Riffa Rovers",
        sport: "football",
        userId: rivalCaptain,
        userName: "Rival",
      });
      await playDraw(database, {
        createdBy: captain,
        teamIds: [tagged.id, rival.id],
      });

      const [row] = await mine(db, { userId: captain });
      expect(row).toMatchObject({
        id: tagged.id,
        displayName: "Hidd United",
        sport: "football",
        rosterCount: 4,
        record: { gamesPlayed: 1, wins: 0, draws: 1, losses: 0 },
        groupTag: { id: group!.id, name: "Gooz of Arad" },
      });

      const [untagged] = await mine(db, { userId: rivalCaptain });
      expect(untagged!.groupTag).toBeNull();
    });
  });

  it("drops the Group tag once the Group is deleted", async () => {
    await withDb(async (database, db) => {
      const [owner] = (await makeUsers(database, 1)) as [string];
      const [group] = await database
        .insert(groups)
        .values({
          name: "Gooz of Arad",
          createdBy: owner,
          sport: GroupSportEnum.FOOTBALL,
        })
        .returning({ id: groups.id });
      await database
        .insert(groupMembers)
        .values({ groupId: group!.id, userId: owner });
      await createTeam(db, {
        name: "Hidd United",
        sport: "football",
        userId: owner,
        userName: "Owner",
        groupId: group!.id,
      });

      await deleteGroup(db, { groupId: group!.id, userId: owner });

      const [row] = await mine(db, { userId: owner });
      expect(row!.groupTag).toBeNull();
    });
  });
});
