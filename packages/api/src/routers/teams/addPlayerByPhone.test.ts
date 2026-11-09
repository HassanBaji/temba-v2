import { TRPCError } from "@trpc/server";
import { and, eq, isNull } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import {
  GameFormatEnum,
  GameRegistrationModeEnum,
  gamePlayers,
  games,
  notifications,
  ratings,
  teamMemberInvites,
  teamMembers,
  user,
  venues,
} from "@repo/db/schema";
import { createPgliteDb, type TestDatabase } from "@repo/db/testing";

import { addPlayerByPhone } from "./addPlayerByPhone";
import { teamById } from "./byId";
import { createTeam } from "./create";
import { inviteInApp } from "./inviteInApp";
import { previewPlayerByPhone } from "./previewPlayerByPhone";
import { removeUnclaimedPlayer } from "./removeUnclaimedPlayer";

type Db = Parameters<typeof createTeam>[0];

async function insertUser(
  database: TestDatabase,
  values: { name: string; phoneNumber?: string },
) {
  const [row] = await database
    .insert(user)
    .values({
      ...values,
      email: `${values.name.toLowerCase().replace(/\s+/g, ".")}@example.com`,
      clerkId: `user_${crypto.randomUUID()}`,
    })
    .returning({ id: user.id });
  return row!.id;
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

async function makeTeam(
  db: Db,
  captain: string,
  sport: "padel" | "football" = "football",
) {
  return (
    await createTeam(db, {
      name: "Gooz FC",
      sport,
      userId: captain,
      userName: "Captain",
    })
  ).id;
}

async function rosterIds(database: TestDatabase, teamId: string) {
  const rows = await database.query.teamMembers.findMany({
    where: eq(teamMembers.teamId, teamId),
  });
  return rows.map((row) => row.userId);
}

describe("teams phone door", () => {
  it("invites an account holder with a Lookup invite and a Notification, never a member row", async () => {
    await withDb(async (database, db) => {
      const captain = await insertUser(database, { name: "Captain" });
      const holder = await insertUser(database, {
        name: "Ahmed Ali",
        phoneNumber: "+97336110001",
      });
      const teamId = await makeTeam(db, captain);

      await expect(
        previewPlayerByPhone(db, {
          teamId,
          userId: captain,
          ...bahrain("3611 0001"),
        }),
      ).resolves.toEqual({
        kind: "account",
        name: "Ahmed Ali",
        alreadyOnTeam: false,
        alreadyInvited: false,
        levelBand: null,
        footballRole: null,
        footballPosition: null,
        gamesWithYou: 0,
      });

      await expect(
        addPlayerByPhone(db, {
          teamId,
          userId: captain,
          ...bahrain("3611 0001"),
        }),
      ).resolves.toMatchObject({ outcome: "invited", userId: holder });

      expect(await rosterIds(database, teamId)).toEqual([captain]);
      const invites = await database.query.teamMemberInvites.findMany({
        where: and(
          eq(teamMemberInvites.teamId, teamId),
          isNull(teamMemberInvites.acceptedAt),
        ),
      });
      expect(invites.map((row) => row.userId)).toEqual([holder]);
      expect(
        await database.query.notifications.findMany({
          where: eq(notifications.type, "team_invite_received"),
        }),
      ).toMatchObject([
        { recipientUserId: holder, teamId, actorUserId: captain },
      ]);
      await expect(
        previewPlayerByPhone(db, {
          teamId,
          userId: captain,
          ...bahrain("3611 0001"),
        }),
      ).resolves.toMatchObject({ alreadyInvited: true });
    });
  });

  it("reuses the one Unclaimed row per phone, and shows its masked phone to the Captain only", async () => {
    await withDb(async (database, db) => {
      const captain = await insertUser(database, { name: "Captain" });
      const outsider = await insertUser(database, { name: "Outsider" });
      const teamId = await makeTeam(db, captain);
      const otherTeamId = await makeTeam(db, captain);

      const first = await addPlayerByPhone(db, {
        teamId,
        userId: captain,
        ...bahrain("3612 4408"),
        name: "Hamad",
      });
      expect(first).toMatchObject({ outcome: "added", name: "Hamad" });

      const again = await rejection(
        addPlayerByPhone(db, {
          teamId,
          userId: captain,
          ...bahrain("3612 4408"),
        }),
      );
      expect(again.code).toBe("CONFLICT");

      const elsewhere = await addPlayerByPhone(db, {
        teamId: otherTeamId,
        userId: captain,
        ...bahrain("3612 4408"),
        name: "Ignored",
      });
      expect(elsewhere.userId).toBe(first.userId);
      expect(
        await database.query.user.findMany({
          where: eq(user.phoneNumber, "+97336124408"),
        }),
      ).toHaveLength(1);

      await expect(
        previewPlayerByPhone(db, {
          teamId,
          userId: captain,
          ...bahrain("3612 4408"),
        }),
      ).resolves.toEqual({
        kind: "unclaimed",
        name: "Hamad",
        alreadyOnTeam: true,
        alreadyInvited: false,
        phoneMasked: "+973 •••• 4408",
        levelBand: "D3",
        footballRole: null,
        footballPosition: null,
        gamesWithYou: 0,
      });
      const forbidden = await rejection(
        previewPlayerByPhone(db, {
          teamId,
          userId: outsider,
          ...bahrain("3612 4408"),
        }),
      );
      expect(forbidden.code).toBe("FORBIDDEN");

      const asCaptain = await teamById(db, { teamId, userId: captain });
      const asOutsider = await teamById(db, { teamId, userId: outsider });
      expect(
        asCaptain.members.find((member) => member.userId === first.userId),
      ).toMatchObject({
        unclaimed: true,
        phoneMasked: "+973 •••• 4408",
        removable: true,
      });
      expect(
        asOutsider.members.find((member) => member.userId === first.userId),
      ).toMatchObject({ unclaimed: true, phoneMasked: null, removable: false });
    });
  });

  it("describes a number on Temba for New team: Level, position and games played together", async () => {
    await withDb(async (database, db) => {
      const captain = await insertUser(database, { name: "Captain" });
      const holder = await insertUser(database, {
        name: "Ali Mansoor",
        phoneNumber: "+97333456610",
      });
      await database
        .update(user)
        .set({
          preferredFootballRole: "outfield",
          preferredFootballPosition: "fwd",
        })
        .where(eq(user.id, holder));
      await database.insert(ratings).values({
        userId: holder,
        sport: "football",
        mu: 1400,
        phi: 150,
        sigma: 0.06,
        levelBand: "C2",
      });
      const [venue] = await database
        .insert(venues)
        .values({ name: "Venue", city: "Manama", country: "BH" })
        .returning({ id: venues.id });
      const past = new Date(Date.now() - 86_400_000);
      for (const cancelledAt of [null, null, new Date()]) {
        const [game] = await database
          .insert(games)
          .values({
            name: "Five",
            format: GameFormatEnum.FRIENDLY_GAME,
            registrationMode: GameRegistrationModeEnum.TEAM_ONLY,
            venueId: venue!.id,
            createdBy: captain,
            windowStart: past,
            windowEnd: past,
            cancelledAt,
          })
          .returning({ id: games.id });
        await database.insert(gamePlayers).values([
          { gameId: game!.id, userId: captain },
          { gameId: game!.id, userId: holder },
        ]);
      }

      await expect(
        previewPlayerByPhone(db, {
          userId: captain,
          ...bahrain("3345 6610"),
          sport: "football",
        }),
      ).resolves.toEqual({
        kind: "account",
        name: "Ali Mansoor",
        alreadyOnTeam: false,
        alreadyInvited: false,
        levelBand: "C2",
        footballRole: "outfield",
        footballPosition: "fwd",
        gamesWithYou: 2,
      });
      await expect(
        previewPlayerByPhone(db, {
          userId: captain,
          ...bahrain("3345 6610"),
          sport: "padel",
        }),
      ).resolves.toMatchObject({
        levelBand: null,
        footballRole: null,
        footballPosition: null,
      });
    });
  });

  it("answers a stranger's number on New team with whether it is on Temba and its mask only", async () => {
    await withDb(async (database, db) => {
      const captain = await insertUser(database, { name: "Captain" });
      const stranger = await insertUser(database, {
        name: "Ali Mansoor",
        phoneNumber: "+97333456610",
      });
      await database.insert(ratings).values({
        userId: stranger,
        sport: "football",
        mu: 1400,
        phi: 150,
        sigma: 0.06,
        levelBand: "C2",
      });

      await expect(
        previewPlayerByPhone(db, {
          userId: captain,
          ...bahrain("3345 6610"),
          sport: "football",
        }),
      ).resolves.toEqual({
        kind: "account",
        name: null,
        alreadyOnTeam: false,
        alreadyInvited: false,
        phoneMasked: "+973 •••• 6610",
      });

      const teamId = await makeTeam(db, captain);
      await expect(
        previewPlayerByPhone(db, {
          teamId,
          userId: captain,
          ...bahrain("3345 6610"),
        }),
      ).resolves.toMatchObject({ kind: "account", name: "Ali Mansoor" });
    });
  });

  it("writes a new football player's picked role to the User", async () => {
    await withDb(async (database, db) => {
      const captain = await insertUser(database, { name: "Captain" });
      const teamId = await makeTeam(db, captain);

      const added = await addPlayerByPhone(db, {
        teamId,
        userId: captain,
        ...bahrain("3612 4408"),
        name: "Keeper Kamal",
        level: "casual",
        football: { role: "keeper", position: "def" },
      });

      const row = await database.query.user.findFirst({
        where: eq(user.id, added.userId),
      });
      expect(row).toMatchObject({
        preferredFootballRole: "keeper",
        preferredFootballPosition: null,
      });
    });
  });

  it("refuses a second add once a padel Team holds two, and a role on padel", async () => {
    await withDb(async (database, db) => {
      const captain = await insertUser(database, { name: "Captain" });
      const teamId = await makeTeam(db, captain, "padel");

      const role = await rejection(
        addPlayerByPhone(db, {
          teamId,
          userId: captain,
          ...bahrain("3612 4401"),
          name: "Hamad",
          football: { role: "keeper", position: null },
        }),
      );
      expect(role.code).toBe("BAD_REQUEST");

      await addPlayerByPhone(db, {
        teamId,
        userId: captain,
        ...bahrain("3612 4401"),
        name: "Hamad",
      });
      const full = await rejection(
        addPlayerByPhone(db, {
          teamId,
          userId: captain,
          ...bahrain("3612 4402"),
          name: "Yusuf",
        }),
      );
      expect(full.message).toBe("This Team is full");
      const preview = await rejection(
        previewPlayerByPhone(db, {
          teamId,
          userId: captain,
          ...bahrain("3612 4402"),
        }),
      );
      expect(preview.message).toBe("This Team is full");
      expect(await rosterIds(database, teamId)).toHaveLength(2);
    });
  });

  it("refuses the phone door to anyone but the Captain", async () => {
    await withDb(async (database, db) => {
      const captain = await insertUser(database, { name: "Captain" });
      const member = await insertUser(database, { name: "Member" });
      const teamId = await makeTeam(db, captain);
      await database.insert(teamMembers).values({ teamId, userId: member });

      const error = await rejection(
        addPlayerByPhone(db, {
          teamId,
          userId: member,
          ...bahrain("3612 4401"),
          name: "Hamad",
        }),
      );
      expect(error.code).toBe("FORBIDDEN");
    });
  });

  it("removes an Unclaimed player and refuses to remove an account holder", async () => {
    await withDb(async (database, db) => {
      const captain = await insertUser(database, { name: "Captain" });
      const holder = await insertUser(database, { name: "Holder" });
      const teamId = await makeTeam(db, captain);
      await database.insert(teamMembers).values({ teamId, userId: holder });
      const added = await addPlayerByPhone(db, {
        teamId,
        userId: captain,
        ...bahrain("3612 4401"),
        name: "Hamad",
      });

      const notCaptain = await rejection(
        removeUnclaimedPlayer(db, {
          teamId,
          captainUserId: holder,
          userId: added.userId,
        }),
      );
      expect(notCaptain.code).toBe("FORBIDDEN");
      const account = await rejection(
        removeUnclaimedPlayer(db, {
          teamId,
          captainUserId: captain,
          userId: holder,
        }),
      );
      expect(account.message).toBe(
        "Only players not on Temba yet can be removed",
      );

      await removeUnclaimedPlayer(db, {
        teamId,
        captainUserId: captain,
        userId: added.userId,
      });
      expect(await rosterIds(database, teamId)).toEqual(
        expect.not.arrayContaining([added.userId]),
      );
    });
  });

  it("tells the invitee when the Captain invites them on Temba", async () => {
    await withDb(async (database, db) => {
      const captain = await insertUser(database, { name: "Captain" });
      const invitee = await insertUser(database, { name: "Invitee" });
      const teamId = await makeTeam(db, captain);

      await inviteInApp(db, {
        teamId,
        userId: captain,
        inviteeUserId: invitee,
      });

      expect(
        await database.query.notifications.findMany({
          where: eq(notifications.type, "team_invite_received"),
        }),
      ).toMatchObject([
        {
          recipientUserId: invitee,
          teamId,
          actorUserId: captain,
          audience: "player",
        },
      ]);
    });
  });
});
