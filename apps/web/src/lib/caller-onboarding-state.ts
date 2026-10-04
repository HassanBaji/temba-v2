import "server-only";

import { auth } from "@clerk/nextjs/server";
import { cache } from "react";

import { type DashboardOnboardingState } from "~/lib/dashboard-onboarding-gate";
import { createApiClient } from "~/trpc/api-client";

/**
 * The caller's onboarding completion, for the dashboard gate.
 *
 * Read through `users.onboardingState` on the API, wrapped in React `cache` so
 * sibling RSCs on the same request share it. A missing `user` row is the Clerk
 * `user.created` webhook race: the API answers it as `provisioning`, and the
 * gate answers that with the questionnaire rather than `UNAUTHORIZED`. A
 * signed-out caller reads as provisioning without calling the API —
 * `middleware.ts` has already turned real signed-out traffic away, so that
 * only happens on the development design preview.
 */
export const loadCallerOnboardingState = cache(
  async (): Promise<DashboardOnboardingState> => {
    const { userId } = await auth();

    if (!userId) {
      return { provisioning: true, onboardingCompletedAt: null };
    }

    const api = await createApiClient({ signedIn: true });
    const state = await api.users.onboardingState.query();

    return state.provisioning
      ? { provisioning: true, onboardingCompletedAt: null }
      : {
          provisioning: false,
          onboardingCompletedAt: state.onboardingCompletedAt,
        };
  },
);
