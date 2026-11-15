import { TRPCError } from "@trpc/server";
import { describe, expect, it } from "vitest";

import {
  GroupMemberRoleEnum,
  GroupSportEnum,
  groupMembers,
  groups,
  ratings,
  teamMembers,
  user,
} from "@repo/db/schema";
import { wholeOvrFromMu } from "@repo/domain/football-ovr";
import { createPgliteDb, type TestDatabase } from "@repo/db/testing";

import { createTeam } from "./create";
import { inviteInApp } from "./inviteInApp";
import { listGroupMembersToAdd } from "./listGroupMembersToAdd";

type Db = Parameters<typeof createTeam>[0];

async function makeUsers(database: TestDatabase, names: string[]) {
  const rows = await database
    .insert(user)
    .values(
      names.map((name) => ({
        name,
        email: `${name.toLowerCase()}@example.com`,
      })),
    )
    .returning({ id: user.id });
  return rows.map((row) => row.id);
}

async function withDb(run: (database: TestDatabase, db: Db) => Promise<void>) {
  const { db, close } = await createPgliteDb();
  try {
    await run(db, db as unknown as Db);
  } finally {
    await close();
  }
}

async function rejection(promise: Promise<unknown>) {
  const error = await promise.then(
    () => null,
    (caught: unknown) => caught,
  );
  expect(error).toBeInstanceOf(TRPCError);
  return error as TRPCError;
}

async function seed(database: TestDatabase) {
  const [captain, organizer, ali, badr, sara, plain] = (await makeUsers(
    database,
    ["Captain", "Organizer", "Ali", "Badr", "Sara", "Plain"],
  )) as [string, string, string, string, string, string];
  const [group] = await database
    .insert(groups)
    .values({
      name: "Gooz of Arad",
      createdBy: captain,
      sport: GroupSportEnum.FOOTBALL,
    })
    .returning({ id: groups.id });
  await database.insert(groupMembers).values([
    { groupId: group!.id, userId: captain },
    {
      groupId: group!.id,
      userId: organizer,
      role: GroupMemberRoleEnum.ORGANIZER,
    },
    { groupId: group!.id, userId: ali },
    { groupId: group!.id, userId: badr },
    { groupId: group!.id, userId: sara },
    { groupId: group!.id, userId: plain },
  ]);
  return { captain, organizer, ali, badr, sara, plain, groupId: group!.id };
}

describe("teams.listGroupMembersToAdd", () => {
  it("leaves out people already on the Roster and marks the invited", async () => {
    await withDb(async (database, db) => {
      const f = await seed(database);
      const team = await createTeam(db, {
        name: "Gooz FC",
        sport: "football",
        userId: f.captain,
        userName: "Captain",
      });
      await database
        .insert(teamMembers)
        .values({ teamId: team.id, userId: f.ali });
      await inviteInApp(db, {
        teamId: team.id,
        userId: f.captain,
        inviteeUserId: f.badr,
      });

      const listed = await listGroupMembersToAdd(db, {
        groupId: f.groupId,
        teamId: team.id,
        userId: f.captain,
      });
      expect(listed.groupName).toBe("Gooz of Arad");
      expect(
        listed.members.map((member) => [member.name, member.invited]),
      ).toEqual([
        ["Badr", true],
        ["Organizer", false],
        ["Plain", false],
        ["Sara", false],
      ]);
    });
  });

  it("lists everyone but the viewer before the Team exists", async () => {
    await withDb(async (_database, db) => {
      const f = await seed(_database);
      const listed = await listGroupMembersToAdd(db, {
        groupId: f.groupId,
        userId: f.organizer,
      });
      expect(listed.members.map((member) => member.name)).toEqual([
        "Ali",
        "Badr",
        "Captain",
        "Plain",
        "Sara",
      ]);
    });
  });

  it("sends each member's whole OVR on football beside the band", async () => {
    await withDb(async (database, db) => {
      const f = await seed(database);
      await database.insert(ratings).values([
        {
          userId: f.ali,
          sport: "football",
          mu: 1400,
          phi: 150,
          sigma: 0.06,
          levelBand: "C2",
        },
        {
          userId: f.badr,
          sport: "padel",
          mu: 1600,
          phi: 150,
          sigma: 0.06,
          levelBand: "B3",
        },
      ]);
      const listed = await listGroupMembersToAdd(db, {
        groupId: f.groupId,
        userId: f.captain,
      });
      const byName = new Map(
        listed.members.map((member) => [member.name, member]),
      );
      expect(byName.get("Ali")).toMatchObject({
        levelBand: "C2",
        ovr: wholeOvrFromMu(1400),
      });
      expect(byName.get("Badr")).toMatchObject({ levelBand: null, ovr: null });
    });
  });

  it("sends no OVR on a padel Group", async () => {
    await withDb(async (database, db) => {
      const f = await seed(database);
      const [padel] = await database
        .insert(groups)
        .values({
          name: "Thursday Padel",
          createdBy: f.captain,
          sport: GroupSportEnum.PADEL,
        })
        .returning({ id: groups.id });
      await database.insert(groupMembers).values([
        { groupId: padel!.id, userId: f.captain },
        { groupId: padel!.id, userId: f.ali },
      ]);
      await database.insert(ratings).values({
        userId: f.ali,
        sport: "padel",
        mu: 1400,
        phi: 150,
        sigma: 0.06,
        levelBand: "C2",
      });
      const listed = await listGroupMembersToAdd(db, {
        groupId: padel!.id,
        userId: f.captain,
      });
      expect(listed.members).toMatchObject([
        { name: "Ali", levelBand: "C2", ovr: null },
      ]);
    });
  });

  it("refuses a viewer who does not organize the Group", async () => {
    await withDb(async (database, db) => {
      const f = await seed(database);
      const error = await rejection(
        listGroupMembersToAdd(db, { groupId: f.groupId, userId: f.plain }),
      );
      expect(error.code).toBe("FORBIDDEN");
    });
  });

  it("refuses a Group of another sport", async () => {
    await withDb(async (database, db) => {
      const f = await seed(database);
      const team = await createTeam(db, {
        name: undefined,
        sport: "padel",
        userId: f.captain,
        userName: "Captain",
      });
      const error = await rejection(
        listGroupMembersToAdd(db, {
          groupId: f.groupId,
          teamId: team.id,
          userId: f.captain,
        }),
      );
      expect(error.code).toBe("BAD_REQUEST");
    });
  });
});
