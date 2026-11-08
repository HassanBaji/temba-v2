import { TRPCError } from "@trpc/server";
import { and, eq, isNull } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import {
  notifications,
  teamMemberInvites,
  teamMembers,
  teams,
  user,
} from "@repo/db/schema";
import { createPgliteDb, type TestDatabase } from "@repo/db/testing";

import { createTeam } from "./create";

type Db = Parameters<typeof createTeam>[0];

async function makeUsers(
  database: TestDatabase,
  count: number,
  phone?: (index: number) => string,
) {
  const rows = await database
    .insert(user)
    .values(
      Array.from({ length: count }, (_, index) => ({
        name: `Player ${index}`,
        email: `player${index}@example.com`,
        clerkId: `user_${crypto.randomUUID()}`,
        phoneNumber: phone?.(index),
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

function bahrain(nationalNumber: string) {
  return { countryIso: "BH", nationalNumber };
}

async function pendingInvites(database: TestDatabase, teamId: string) {
  return database.query.teamMemberInvites.findMany({
    where: and(
      eq(teamMemberInvites.teamId, teamId),
      isNull(teamMemberInvites.acceptedAt),
      isNull(teamMemberInvites.revokedAt),
    ),
  });
}

async function inviteNotices(database: TestDatabase) {
  return database.query.notifications.findMany({
    where: eq(notifications.type, "team_invite_received"),
  });
}

describe("teams.create with a Roster", () => {
  it("creates Gooz FC with two invites and two phone players in one call", async () => {
    await withDb(async (database, db) => {
      const [captain, ali, sara] = (await makeUsers(database, 3)) as [
        string,
        string,
        string,
      ];

      const created = await createTeam(db, {
        name: "Gooz FC",
        sport: "football",
        userId: captain,
        userName: "Captain",
        inviteUserIds: [ali, sara],
        phonePlayers: [
          { ...bahrain("3612 4401"), name: "Hamad" },
          { ...bahrain("3612 4402"), name: "Yusuf" },
        ],
      });

      expect(created).toMatchObject({ addedCount: 2, invitedCount: 2 });
      const members = await database.query.teamMembers.findMany({
        where: eq(teamMembers.teamId, created.id),
        with: { user: { columns: { name: true, clerkId: true } } },
      });
      expect(members).toHaveLength(3);
      expect(
        members.filter((member) => member.user.clerkId === null),
      ).toHaveLength(2);
      expect(
        (await pendingInvites(database, created.id)).map((row) => row.userId),
      ).toEqual(expect.arrayContaining([ali, sara]));

      const notices = await inviteNotices(database);
      expect(notices).toHaveLength(2);
      expect(notices).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            recipientUserId: ali,
            teamId: created.id,
            actorUserId: captain,
            audience: "player",
          }),
          expect.objectContaining({ recipientUserId: sara }),
        ]),
      );
    });
  });

  it("refuses invites beyond the Roster maximum and writes nothing", async () => {
    await withDb(async (database, db) => {
      const [captain, ...others] = await makeUsers(database, 19);
      const error = await rejection(
        createTeam(db, {
          name: "Gooz FC",
          sport: "football",
          userId: captain!,
          userName: "Captain",
          inviteUserIds: others,
          phonePlayers: [
            { ...bahrain("3612 4401"), name: "Hamad" },
            { ...bahrain("3612 4402"), name: "Yusuf" },
          ],
        }),
      );
      expect(error.code).toBe("BAD_REQUEST");
      expect(await database.select().from(teams)).toHaveLength(0);
      expect(await database.select().from(teamMemberInvites)).toHaveLength(0);
      expect(await inviteNotices(database)).toHaveLength(0);
      expect(
        await database.query.user.findMany({
          where: eq(user.phoneNumber, "+97336124401"),
        }),
      ).toHaveLength(0);
    });
  });

  it("turns a phone that belongs to an account holder into an invite, never a member row", async () => {
    await withDb(async (database, db) => {
      const [captain, holder] = (await makeUsers(database, 2, (index) =>
        index === 1 ? "+97336110001" : `+9733600000${index}`,
      )) as [string, string];

      const created = await createTeam(db, {
        name: undefined,
        sport: "football",
        userId: captain,
        userName: "Captain",
        phonePlayers: [{ ...bahrain("3611 0001") }],
      });

      expect(created).toMatchObject({ addedCount: 0, invitedCount: 1 });
      const members = await database.query.teamMembers.findMany({
        where: eq(teamMembers.teamId, created.id),
      });
      expect(members.map((row) => row.userId)).toEqual([captain]);
      expect(
        (await pendingInvites(database, created.id)).map((row) => row.userId),
      ).toEqual([holder]);
      expect(await inviteNotices(database)).toMatchObject([
        { recipientUserId: holder, teamId: created.id },
      ]);
    });
  });

  it("refuses an account holder listed twice, by invite and by phone, and writes nothing", async () => {
    await withDb(async (database, db) => {
      const [captain, holder] = (await makeUsers(database, 2, (index) =>
        index === 1 ? "+97336110001" : `+9733600000${index}`,
      )) as [string, string];

      const error = await rejection(
        createTeam(db, {
          name: undefined,
          sport: "football",
          userId: captain,
          userName: "Captain",
          inviteUserIds: [holder],
          phonePlayers: [{ ...bahrain("3611 0001") }],
        }),
      );
      expect(error.code).toBe("BAD_REQUEST");
      expect(await database.select().from(teams)).toHaveLength(0);
    });
  });

  it("holds a padel Team to one partner and refuses a pair that already has a Team", async () => {
    await withDb(async (database, db) => {
      const [captain, partner, other] = (await makeUsers(database, 3)) as [
        string,
        string,
        string,
      ];

      const tooMany = await rejection(
        createTeam(db, {
          name: undefined,
          sport: "padel",
          userId: captain,
          userName: "Captain",
          inviteUserIds: [partner],
          phonePlayers: [{ ...bahrain("3612 4401"), name: "Hamad" }],
        }),
      );
      expect(tooMany.code).toBe("BAD_REQUEST");

      await createTeam(db, {
        name: undefined,
        sport: "padel",
        userId: captain,
        userName: "Captain",
        inviteUserIds: [partner],
      });
      const reserved = await rejection(
        createTeam(db, {
          name: undefined,
          sport: "padel",
          userId: partner,
          userName: "Partner",
          inviteUserIds: [captain],
        }),
      );
      expect(reserved.code).toBe("CONFLICT");

      const withUnclaimed = await createTeam(db, {
        name: undefined,
        sport: "padel",
        userId: other,
        userName: "Other",
        phonePlayers: [{ ...bahrain("3612 4402"), name: "Yusuf" }],
      });
      expect(
        await database.query.teamMembers.findMany({
          where: eq(teamMembers.teamId, withUnclaimed.id),
        }),
      ).toHaveLength(2);
    });
  });
});
