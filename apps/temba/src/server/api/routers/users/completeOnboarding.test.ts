import { TRPCError } from "@trpc/server";
import { GroupSportEnum, ratings, user } from "@repo/db/schema";
import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import { markOnboardingComplete } from "~/server/api/routers/users/completeOnboarding";
import { writePreferredPosition } from "~/server/api/routers/users/setPreferredPosition";
import { createPgliteDb, type TestDatabase } from "~/server/test/pglite";

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
