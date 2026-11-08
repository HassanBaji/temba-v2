import { describe, expect, it } from "vitest";

import {
  GroupMemberRoleEnum,
  GroupSportEnum,
  groupMembers,
  groups,
  teamMembers,
  teams,
  user,
} from "@repo/db/schema";
import { createPgliteDb, type TestDatabase } from "@repo/db/testing";

import { actingUserIds, userActsForTeam } from "./acts-for-team";

type Db = Parameters<typeof userActsForTeam>[0];

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

async function makeTeam(
  database: TestDatabase,
  args: {
    sport: "padel" | "football";
    captain: string;
    members: string[];
    groupId?: string;
  },
) {
  const [team] = await database
    .insert(teams)
    .values({
      sport: args.sport,
      createdBy: args.captain,
      groupId: args.groupId ?? null,
    })
    .returning();
  await database.insert(teamMembers).values(
    [args.captain, ...args.members].map((userId) => ({
      teamId: team!.id,
      userId,
    })),
  );
  return team!;
}

async function withDb(run: (database: TestDatabase, db: Db) => Promise<void>) {
  const { db, close } = await createPgliteDb();
  try {
    await run(db, db as unknown as Db);
  } finally {
    await close();
  }
}

describe("userActsForTeam and actingUserIds", () => {
  it("lets both padel members act", async () => {
    await withDb(async (database, db) => {
      const [captain, partner, outsider] = (await makeUsers(database, 3)) as [
        string,
        string,
        string,
      ];
      const team = await makeTeam(database, {
        sport: "padel",
        captain,
        members: [partner],
      });
      expect(await userActsForTeam(db, team, captain)).toBe(true);
      expect(await userActsForTeam(db, team, partner)).toBe(true);
      expect(await userActsForTeam(db, team, outsider)).toBe(false);
      expect(await actingUserIds(db, team)).toEqual([captain, partner]);
    });
  });

  it("lets only the Captain act for an untagged football Team", async () => {
    await withDb(async (database, db) => {
      const [captain, member] = (await makeUsers(database, 2)) as [
        string,
        string,
      ];
      const team = await makeTeam(database, {
        sport: "football",
        captain,
        members: [member],
      });
      expect(await userActsForTeam(db, team, captain)).toBe(true);
      expect(await userActsForTeam(db, team, member)).toBe(false);
      expect(await actingUserIds(db, team)).toEqual([captain]);
    });
  });

  it("adds the tagged Group's creator and Appointed Organizers on football", async () => {
    await withDb(async (database, db) => {
      const [captain, member, groupOwner, appointed, groupMember] =
        (await makeUsers(database, 5)) as [
          string,
          string,
          string,
          string,
          string,
        ];
      const [group] = await database
        .insert(groups)
        .values({
          name: "Gooz of Arad",
          createdBy: groupOwner,
          sport: GroupSportEnum.FOOTBALL,
        })
        .returning({ id: groups.id });
      await database.insert(groupMembers).values([
        { groupId: group!.id, userId: groupOwner },
        {
          groupId: group!.id,
          userId: appointed,
          role: GroupMemberRoleEnum.ORGANIZER,
        },
        { groupId: group!.id, userId: groupMember },
      ]);
      const team = await makeTeam(database, {
        sport: "football",
        captain,
        members: [member],
        groupId: group!.id,
      });

      expect(await userActsForTeam(db, team, groupOwner)).toBe(true);
      expect(await userActsForTeam(db, team, appointed)).toBe(true);
      expect(await userActsForTeam(db, team, groupMember)).toBe(false);
      expect(await userActsForTeam(db, team, member)).toBe(false);
      expect((await actingUserIds(db, team)).sort()).toEqual(
        [captain, groupOwner, appointed].sort(),
      );
    });
  });
});
