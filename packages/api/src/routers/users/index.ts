import { createTRPCRouter } from "#src/trpc";

import { completeOnboarding } from "./completeOnboarding";
import { home } from "./home";
import { onboardingState } from "./onboardingState";
import { playerProfile } from "./playerProfile";
import { profileStats } from "./profileStats";
import { renameUnclaimedPlayerProcedure as renameUnclaimedPlayer } from "./renameUnclaimedPlayer";
import { setPreferredPosition } from "./setPreferredPosition";

export const usersRouter = createTRPCRouter({
  home,
  onboardingState,
  profileStats,
  playerProfile,
  setPreferredPosition,
  completeOnboarding,
  renameUnclaimedPlayer,
});
