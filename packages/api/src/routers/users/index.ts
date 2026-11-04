import { createTRPCRouter } from "#src/trpc";

import { completeOnboarding } from "./completeOnboarding";
import { footballProfile } from "./footballProfile";
import { home } from "./home";
import { onboardingState } from "./onboardingState";
import { playerProfile } from "./playerProfile";
import { profileDetails } from "./profileDetails";
import { profileStats } from "./profileStats";
import { renameUnclaimedPlayerProcedure as renameUnclaimedPlayer } from "./renameUnclaimedPlayer";
import { setMatchHistoryVisibility } from "./setMatchHistoryVisibility";
import { setName } from "./setName";
import { setPlayWindows } from "./setPlayWindows";
import { setPreferredPosition } from "./setPreferredPosition";
import { setProfileDetails } from "./setProfileDetails";
import { setSports } from "./setSports";
import { myProfile } from "./myProfile";

export const usersRouter = createTRPCRouter({
  home,
  onboardingState,
  profileStats,
  playerProfile,
  footballProfile,
  setPreferredPosition,
  setName,
  completeOnboarding,
  renameUnclaimedPlayer,
  myProfile,
  profileDetails,
  setProfileDetails,
  setPlayWindows,
  setMatchHistoryVisibility,
  setSports,
});
