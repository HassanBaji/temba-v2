import "server-only";

import { auth } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";
import { cache } from "react";

import { user } from "@repo/db";

import { type DashboardOnboardingState } from "~/lib/dashboard-onboarding-gate";
import { db } from "~/server/db";

/**
 * The caller's onboarding completion, for the dashboard gate.
 *
 * One indexed read on `user.clerkId` per hard dashboard load, wrapped in React
 * `cache` so sibling RSCs on the same request share it. Deliberately does not
 * go through `resolveAppUser`: a missing `user` row is the Clerk `user.created`
 * webhook race, and the gate answers that with the questionnaire rather than
 * `UNAUTHORIZED`. A signed-out caller reads as provisioning without touching
 * the database — `middleware.ts` has already turned real signed-out traffic
 * away, so that only happens on the development design preview.
 */
export const loadCallerOnboardingState = cache(
  async (): Promise<DashboardOnboardingState> => {
    const { userId } = await auth();

    if (!userId) {
      return { provisioning: true, onboardingCompletedAt: null };
    }

    const appUser = await db.query.user.findFirst({
      where: eq(user.clerkId, userId),
      columns: { onboardingCompletedAt: true },
    });

    if (!appUser) {
      return { provisioning: true, onboardingCompletedAt: null };
    }

    return {
      provisioning: false,
      onboardingCompletedAt: appUser.onboardingCompletedAt,
    };
  },
);
