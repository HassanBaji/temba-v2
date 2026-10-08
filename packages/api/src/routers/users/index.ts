import { createTRPCRouter } from "#src/trpc";

import { completeOnboarding } from "./completeOnboarding";
import { home } from "./home";
import { onboardingState } from "./onboardingState";
import { playerProfile } from "./playerProfile";
import { profileStats } from "./profileStats";
import { setPreferredPosition } from "./setPreferredPosition";

export const usersRouter = createTRPCRouter({
  home,
  onboardingState,
  profileStats,
  playerProfile,
  setPreferredPosition,
  completeOnboarding,
});
