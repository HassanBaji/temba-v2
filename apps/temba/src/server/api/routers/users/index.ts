import { createTRPCRouter } from "~/server/api/trpc";

import { completeOnboarding } from "./completeOnboarding";
import { home } from "./home";
import { onboardingState } from "./onboardingState";
import { setPreferredPosition } from "./setPreferredPosition";

export const usersRouter = createTRPCRouter({
  home,
  onboardingState,
  setPreferredPosition,
  completeOnboarding,
});
