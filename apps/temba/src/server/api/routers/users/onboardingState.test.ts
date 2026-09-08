import { GroupSportEnum, ratings, user } from "@repo/db/schema";
import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import { markOnboardingComplete } from "~/server/api/routers/users/completeOnboarding";
import { loadOnboardingState } from "~/server/api/routers/users/onboardingState";
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

describe("loadOnboardingState", () => {
  it("reports provisioning when the Clerk webhook has not created the User row", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const state = await loadOnboardingState(db, {
        clerkId: "user_webhook_not_landed",
      });

      expect(state.provisioning).toBe(true);
      expect(state.preferredPosition).toBeNull();
      expect(state.onboardingCompletedAt).toBeNull();
      expect(state.hasRating).toBe(false);
      expect(state.canSelfDeclare).toBe(false);
    } finally {
      await close();
    }
  });

  it("returns the step-one shape for a User who has answered nothing", async () => {
    const { db, close } = await createPgliteDb();
    try {
      await insertUser(db, "onboarding_state_unanswered");

      const state = await loadOnboardingState(db, {
        clerkId: "onboarding_state_unanswered",
      });

      expect(state.provisioning).toBe(false);
      expect(state.preferredPosition).toBeNull();
      expect(state.onboardingCompletedAt).toBeNull();
      expect(state.hasRating).toBe(false);
      expect(state.canSelfDeclare).toBe(true);
    } finally {
      await close();
    }
  });

  it("returns the step-two shape once a Preferred Position is set but no Rating exists", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const appUser = await insertUser(db, "onboarding_state_step_two");
      await writePreferredPosition(db, {
        userId: appUser.id,
        preferredPosition: "left",
      });

      const state = await loadOnboardingState(db, {
        clerkId: "onboarding_state_step_two",
      });

      expect(state.provisioning).toBe(false);
      expect(state.preferredPosition).toBe("left");
      expect(state.onboardingCompletedAt).toBeNull();
      expect(state.hasRating).toBe(false);
      expect(state.canSelfDeclare).toBe(true);
    } finally {
      await close();
    }
  });

  it("returns the complete shape once both questions are answered", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const appUser = await insertUser(db, "onboarding_state_complete");
      await writePreferredPosition(db, {
        userId: appUser.id,
        preferredPosition: "either",
      });
      await declarePadelRating(db, appUser.id);
      await markOnboardingComplete(db, { userId: appUser.id });

      const state = await loadOnboardingState(db, {
        clerkId: "onboarding_state_complete",
      });

      expect(state.provisioning).toBe(false);
      expect(state.preferredPosition).toBe("either");
      expect(state.onboardingCompletedAt).toBeInstanceOf(Date);
      expect(state.hasRating).toBe(true);
      // A padel Rating closes the one-time declare door, as `ratings.me` says.
      expect(state.canSelfDeclare).toBe(false);
    } finally {
      await close();
    }
  });

  it("reports a backfilled User as complete with no Preferred Position", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const appUser = await insertUser(db, "onboarding_state_backfilled");
      const backfilledAt = new Date("2025-01-02T03:04:05.000Z");
      await db
        .update(user)
        .set({ onboardingCompletedAt: backfilledAt })
        .where(eq(user.id, appUser.id));

      const state = await loadOnboardingState(db, {
        clerkId: "onboarding_state_backfilled",
      });

      expect(state.provisioning).toBe(false);
      expect(state.preferredPosition).toBeNull();
      expect(state.onboardingCompletedAt?.getTime()).toBe(
        backfilledAt.getTime(),
      );
      expect(state.hasRating).toBe(false);
      expect(state.canSelfDeclare).toBe(true);
    } finally {
      await close();
    }
  });
});
