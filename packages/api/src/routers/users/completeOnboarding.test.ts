import { TRPCError } from "@trpc/server";
import { GroupSportEnum, ratings, user } from "@repo/db/schema";
import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import {
  markOnboardingComplete,
  onboardingAnswersSchema,
  submitOnboarding,
} from "#src/routers/users/completeOnboarding";
import { writePreferredPosition } from "#src/routers/users/setPreferredPosition";
import { createPgliteDb, type TestDatabase } from "@repo/db/testing";

async function insertUser(database: TestDatabase, clerkId: string) {
  const [row] = await database
    .insert(user)
    .values({
      name: clerkId,
      email: `${clerkId}@example.com`,
      clerkId,
    })
    .returning({ id: user.id });
  if (!row) {
    throw new Error("Failed to insert user");
  }
  return row;
}

async function declarePadelRating(database: TestDatabase, userId: string) {
  await database.insert(ratings).values({
    userId,
    sport: GroupSportEnum.PADEL,
    mu: 1500,
    phi: 350,
    sigma: 0.06,
    levelBand: "C2",
    selfDeclaredAt: new Date(),
  });
}

async function completedAt(database: TestDatabase, userId: string) {
  const row = await database.query.user.findFirst({
    where: eq(user.id, userId),
    columns: { onboardingCompletedAt: true },
  });
  return row?.onboardingCompletedAt ?? null;
}

describe("markOnboardingComplete", () => {
  it("refuses when no Preferred Position has been chosen", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const appUser = await insertUser(db, "complete_no_position");
      await declarePadelRating(db, appUser.id);

      await expect(
        markOnboardingComplete(db, { userId: appUser.id }),
      ).rejects.toMatchObject({ code: "PRECONDITION_FAILED" });
      expect(await completedAt(db, appUser.id)).toBeNull();
    } finally {
      await close();
    }
  });

  it("refuses when the User has no padel Rating", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const appUser = await insertUser(db, "complete_no_rating");
      await writePreferredPosition(db, {
        userId: appUser.id,
        preferredPosition: "right",
      });

      await expect(
        markOnboardingComplete(db, { userId: appUser.id }),
      ).rejects.toBeInstanceOf(TRPCError);
      await expect(
        markOnboardingComplete(db, { userId: appUser.id }),
      ).rejects.toMatchObject({ code: "PRECONDITION_FAILED" });
      expect(await completedAt(db, appUser.id)).toBeNull();
    } finally {
      await close();
    }
  });

  it("sets the completion timestamp once both questions are answered", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const appUser = await insertUser(db, "complete_both_answered");
      await writePreferredPosition(db, {
        userId: appUser.id,
        preferredPosition: "left",
      });
      await declarePadelRating(db, appUser.id);

      const result = await markOnboardingComplete(db, { userId: appUser.id });

      expect(result.onboardingCompletedAt).toBeInstanceOf(Date);
      expect((await completedAt(db, appUser.id))?.getTime()).toBe(
        result.onboardingCompletedAt.getTime(),
      );
    } finally {
      await close();
    }
  });

  it("is idempotent — a second call is a no-op, not an error", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const appUser = await insertUser(db, "complete_idempotent");
      await writePreferredPosition(db, {
        userId: appUser.id,
        preferredPosition: "either",
      });
      await declarePadelRating(db, appUser.id);

      const first = await markOnboardingComplete(db, { userId: appUser.id });
      const second = await markOnboardingComplete(db, { userId: appUser.id });

      expect(second.onboardingCompletedAt.getTime()).toBe(
        first.onboardingCompletedAt.getTime(),
      );
      expect((await completedAt(db, appUser.id))?.getTime()).toBe(
        first.onboardingCompletedAt.getTime(),
      );
    } finally {
      await close();
    }
  });

  it("does not refuse a backfilled User who is already complete without answers", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const appUser = await insertUser(db, "complete_backfilled");
      const backfilledAt = new Date("2025-01-02T03:04:05.000Z");
      await db
        .update(user)
        .set({ onboardingCompletedAt: backfilledAt })
        .where(eq(user.id, appUser.id));

      const result = await markOnboardingComplete(db, { userId: appUser.id });

      expect(result.onboardingCompletedAt.getTime()).toBe(
        backfilledAt.getTime(),
      );
      expect((await completedAt(db, appUser.id))?.getTime()).toBe(
        backfilledAt.getTime(),
      );
    } finally {
      await close();
    }
  });

  it("writes no Rating of its own", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const appUser = await insertUser(db, "complete_writes_no_rating");
      await writePreferredPosition(db, {
        userId: appUser.id,
        preferredPosition: "left",
      });
      await declarePadelRating(db, appUser.id);

      await markOnboardingComplete(db, { userId: appUser.id });

      const rows = await db.query.ratings.findMany({
        where: eq(ratings.userId, appUser.id),
      });
      expect(rows).toHaveLength(1);
      expect(rows[0]?.mu).toBe(1500);
    } finally {
      await close();
    }
  });
});

async function ratingBands(database: TestDatabase, userId: string) {
  const rows = await database.query.ratings.findMany({
    where: eq(ratings.userId, userId),
    columns: { sport: true, levelBand: true },
  });
  return Object.fromEntries(rows.map((row) => [row.sport, row.levelBand]));
}

describe("markOnboardingComplete with sports", () => {
  it("refuses a football player with no Football role", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const appUser = await insertUser(db, "complete_football_no_role");
      await db
        .update(user)
        .set({ sports: ["football"] })
        .where(eq(user.id, appUser.id));

      await expect(
        markOnboardingComplete(db, { userId: appUser.id }),
      ).rejects.toMatchObject({ code: "PRECONDITION_FAILED" });
      expect(await completedAt(db, appUser.id)).toBeNull();
    } finally {
      await close();
    }
  });

  it("does not ask a football-only player for padel answers", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const appUser = await insertUser(db, "complete_football_only");
      await db
        .update(user)
        .set({ sports: ["football"], preferredFootballRole: "keeper" })
        .where(eq(user.id, appUser.id));
      await db.insert(ratings).values({
        userId: appUser.id,
        sport: GroupSportEnum.FOOTBALL,
        mu: 1500,
        phi: 350,
        sigma: 0.06,
        levelBand: "C3",
        selfDeclaredAt: new Date(),
      });

      const result = await markOnboardingComplete(db, { userId: appUser.id });

      expect(result.onboardingCompletedAt).toBeInstanceOf(Date);
    } finally {
      await close();
    }
  });
});

describe("submitOnboarding", () => {
  it("saves both sports, both Levels and completes in one call", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const appUser = await insertUser(db, "submit_both");

      const result = await submitOnboarding(db, {
        userId: appUser.id,
        answers: {
          sports: ["padel", "football"],
          padel: { preferredPosition: "left", choice: "C3" },
          football: { role: "outfield", position: "mid", choice: "B3" },
        },
      });

      expect(result.onboardingCompletedAt).toBeInstanceOf(Date);
      const row = await db.query.user.findFirst({
        where: eq(user.id, appUser.id),
      });
      expect(row).toMatchObject({
        sports: ["padel", "football"],
        preferredPosition: "left",
        preferredFootballRole: "outfield",
        preferredFootballPosition: "mid",
      });
      expect(await ratingBands(db, appUser.id)).toEqual({
        padel: "C3",
        football: "B3",
      });
    } finally {
      await close();
    }
  });

  it("writes nothing for a sport the User did not pick", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const appUser = await insertUser(db, "submit_football_only");

      await submitOnboarding(db, {
        userId: appUser.id,
        answers: {
          sports: ["football"],
          padel: { preferredPosition: "right", choice: "A" },
          football: { role: "keeper", position: null, choice: "D3" },
        },
      });

      const row = await db.query.user.findFirst({
        where: eq(user.id, appUser.id),
      });
      expect(row?.preferredPosition).toBeNull();
      expect(row?.preferredFootballRole).toBe("keeper");
      expect(await ratingBands(db, appUser.id)).toEqual({ football: "D3" });
    } finally {
      await close();
    }
  });

  it("keeps a Level declared earlier instead of refusing", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const appUser = await insertUser(db, "submit_keeps_rating");
      await declarePadelRating(db, appUser.id);

      const result = await submitOnboarding(db, {
        userId: appUser.id,
        answers: {
          sports: ["padel"],
          padel: { preferredPosition: "either", choice: "A" },
        },
      });

      expect(result.onboardingCompletedAt).toBeInstanceOf(Date);
      expect(await ratingBands(db, appUser.id)).toEqual({ padel: "C2" });
    } finally {
      await close();
    }
  });
});

describe("onboardingAnswersSchema", () => {
  it("needs the answers for every sport picked", () => {
    expect(
      onboardingAnswersSchema.safeParse({
        sports: ["padel", "football"],
        padel: { preferredPosition: "left", choice: "C3" },
      }).success,
    ).toBe(false);
    expect(onboardingAnswersSchema.safeParse({ sports: [] }).success).toBe(
      false,
    );
  });
});
