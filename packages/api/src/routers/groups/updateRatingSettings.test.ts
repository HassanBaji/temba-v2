import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import {
  GroupMemberRoleEnum,
  groupMembers,
  groupTierPoints,
  groups,
} from "@repo/db/schema";
import { createPgliteDb, type TestDatabase } from "@repo/db/testing";

import {
  addMember,
  footballGame,
  insertUser,
  playScore,
  tierEvents,
} from "#src/ratings/group-rated-match.test-support";
import { groupById } from "#src/routers/groups/byId";
import { updateRatingSettings } from "#src/routers/groups/updateRatingSettings";

type ApiDb = Parameters<typeof updateRatingSettings>[0];

function apiDb(database: TestDatabase) {
  return database as unknown as ApiDb;
}

async function withDb(run: (database: TestDatabase) => Promise<void>) {
  const { db, close } = await createPgliteDb();
  try {
    await run(db);
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

async function settingsOf(database: TestDatabase, groupId: string) {
  return database.query.groups.findFirst({
    where: eq(groups.id, groupId),
    columns: {
      performanceRatingMode: true,
      performanceWeightPercent: true,
      organizerCountsDouble: true,
    },
  });
}

const EVERYONE_HEAVY = {
  mode: "everyone",
  weightPercent: 50,
  organizerCountsDouble: true,
} as const;

describe("groups.updateRatingSettings", () => {
  it("lets the owner and an Appointed Organizer of a tier Group change them", async () => {
    await withDb(async (db) => {
      const f = await footballGame(db);
      expect(await settingsOf(db, f.groupId)).toEqual({
        performanceRatingMode: "off",
        performanceWeightPercent: 30,
        organizerCountsDouble: false,
      });

      const saved = await updateRatingSettings(apiDb(db), {
        groupId: f.groupId,
        organizerUserId: f.organizerId,
        ...EVERYONE_HEAVY,
      });
      expect(saved).toEqual({
        settings: EVERYONE_HEAVY,
        summary: "Everyone rates after a game, heavy weight",
        line: "After each game everyone rates, and the average is 50% of the move, with the organizer counted twice.",
      });
      expect(await settingsOf(db, f.groupId)).toEqual({
        performanceRatingMode: "everyone",
        performanceWeightPercent: 50,
        organizerCountsDouble: true,
      });

      const appointed = await insertUser(db, "appointed");
      await db.insert(groupMembers).values({
        groupId: f.groupId,
        userId: appointed.id,
        role: GroupMemberRoleEnum.ORGANIZER,
      });
      await updateRatingSettings(apiDb(db), {
        groupId: f.groupId,
        organizerUserId: appointed.id,
        mode: "organizer",
        weightPercent: 20,
        organizerCountsDouble: false,
      });
      expect(await settingsOf(db, f.groupId)).toEqual({
        performanceRatingMode: "organizer",
        performanceWeightPercent: 20,
        organizerCountsDouble: false,
      });
    });
  });

  it("refuses a member who is not an Organizer", async () => {
    await withDb(async (db) => {
      const f = await footballGame(db);
      const member = await addMember(f, "member");
      const refused = await rejection(
        updateRatingSettings(apiDb(db), {
          groupId: f.groupId,
          organizerUserId: member,
          ...EVERYONE_HEAVY,
        }),
      );
      expect(refused.code).toBe("FORBIDDEN");
      expect(refused.message).toBe(
        "Only this group’s organizers change rating settings.",
      );
      expect((await settingsOf(db, f.groupId))?.performanceRatingMode).toBe(
        "off",
      );
    });
  });

  it("refuses a Verified Group and a padel Group", async () => {
    await withDb(async (db) => {
      const verified = await footballGame(db, { verified: true });
      const onVerified = await rejection(
        updateRatingSettings(apiDb(db), {
          groupId: verified.groupId,
          organizerUserId: verified.organizerId,
          ...EVERYONE_HEAVY,
        }),
      );
      expect(onVerified.code).toBe("PRECONDITION_FAILED");

      const owner = await insertUser(db, "padel-owner");
      const [padel] = await db
        .insert(groups)
        .values({ name: "Padel", createdBy: owner.id, sport: "padel" })
        .returning({ id: groups.id });
      await db
        .insert(groupMembers)
        .values({ groupId: padel!.id, userId: owner.id });
      const onPadel = await rejection(
        updateRatingSettings(apiDb(db), {
          groupId: padel!.id,
          organizerUserId: owner.id,
          ...EVERYONE_HEAVY,
        }),
      );
      expect(onPadel.code).toBe("PRECONDITION_FAILED");
      expect(onPadel.message).toBe(
        "This group has no tiers, so it has no rating settings. Tiers are for football groups that are not verified.",
      );
      expect((await settingsOf(db, padel!.id))?.performanceRatingMode).toBe(
        "off",
      );
    });
  });

  it("refuses a weight other than 20, 30 or 50", async () => {
    await withDb(async (db) => {
      const f = await footballGame(db);
      for (const weightPercent of [0, 10, 25, 40, 100]) {
        const refused = await rejection(
          updateRatingSettings(apiDb(db), {
            groupId: f.groupId,
            organizerUserId: f.organizerId,
            mode: "everyone",
            weightPercent,
            organizerCountsDouble: false,
          }),
        );
        expect(refused.code).toBe("BAD_REQUEST");
        expect(refused.message).toBe("Pick a weight of 20, 30 or 50%.");
      }
      expect((await settingsOf(db, f.groupId))?.performanceWeightPercent).toBe(
        30,
      );
    });
  });

  it("refuses the weight in Arabic", async () => {
    await withDb(async (db) => {
      const f = await footballGame(db);
      const refused = await rejection(
        updateRatingSettings(apiDb(db), {
          groupId: f.groupId,
          organizerUserId: f.organizerId,
          mode: "organizer",
          weightPercent: 40,
          organizerCountsDouble: false,
          locale: "ar",
        }),
      );
      expect(refused.message).toBe("اختر وزنًا من 20 أو 30 أو 50%.");
    });
  });

  it("does not change a Match already completed", async () => {
    await withDb(async (db) => {
      const f = await footballGame(db);
      const a = await addMember(f, "a");
      const b = await addMember(f, "b");
      const matchId = await playScore(f, [a], [b], { slot1: 3, slot2: 1 });
      const eventsBefore = await tierEvents(db, matchId);
      const pointsBefore = await db.query.groupTierPoints.findMany({
        where: eq(groupTierPoints.groupId, f.groupId),
      });
      expect(eventsBefore.length).toBeGreaterThan(0);

      await updateRatingSettings(apiDb(db), {
        groupId: f.groupId,
        organizerUserId: f.organizerId,
        ...EVERYONE_HEAVY,
      });

      expect(await tierEvents(db, matchId)).toEqual(eventsBefore);
      expect(
        await db.query.groupTierPoints.findMany({
          where: eq(groupTierPoints.groupId, f.groupId),
        }),
      ).toEqual(pointsBefore);
    });
  });

  it("feeds groups.byId: the Standing line for members, the settings for Organizers", async () => {
    await withDb(async (db) => {
      const f = await footballGame(db);
      const member = await addMember(f, "member");
      await updateRatingSettings(apiDb(db), {
        groupId: f.groupId,
        organizerUserId: f.organizerId,
        mode: "organizer",
        weightPercent: 20,
        organizerCountsDouble: false,
      });

      const asMember = await groupById(db, {
        groupId: f.groupId,
        userId: member,
      });
      expect(asMember.ratingSettingsLine).toBe(
        "After each game the organizer rates every player, and that is 20% of the move.",
      );
      expect(asMember.ratingSettings).toBeNull();

      const asOrganizer = await groupById(db, {
        groupId: f.groupId,
        userId: f.organizerId,
      });
      expect(asOrganizer.ratingSettings).toEqual({
        mode: "organizer",
        weightPercent: 20,
        organizerCountsDouble: false,
      });
    });
  });
});
