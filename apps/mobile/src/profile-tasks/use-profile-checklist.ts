import { useUser } from "@clerk/expo";

import { api } from "../trpc/react";
import { checklistFrom } from "./profile-tasks-model";

const REFETCH_ON_FOREGROUND = { refetchOnWindowFocus: "always" as const };

/** The Profile checklist for the signed-in User, or null while it loads. */
export function useProfileChecklist() {
  const { user } = useUser();
  const state = api.users.onboardingState.useQuery(
    undefined,
    REFETCH_ON_FOREGROUND,
  );
  return {
    user,
    state: state.data,
    list: checklistFrom(user, state.data),
    error: state.error,
    refetch: state.refetch,
  };
}
