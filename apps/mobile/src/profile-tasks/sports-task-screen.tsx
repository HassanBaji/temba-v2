import { AuthLoading } from "../auth/auth-loading";
import { AuthScreen } from "../auth/auth-screen";
import { SportsQuestionnaire } from "../auth/onboarding-questionnaire";
import { Button } from "../primitives/button";
import { api } from "../trpc/react";
import { backToChecklist } from "./task-navigation";

export function SportsTaskScreen() {
  const state = api.users.onboardingState.useQuery();

  if (state.error && !state.data) {
    return (
      <AuthScreen
        onBack={backToChecklist}
        title="Sports could not be loaded"
        description={state.error.message}
      >
        <Button
          label="Try again"
          size="lg"
          onPress={() => void state.refetch()}
        />
      </AuthScreen>
    );
  }
  if (!state.data) {
    return <AuthLoading />;
  }
  return (
    <SportsQuestionnaire
      state={state.data}
      onDone={backToChecklist}
      onBack={backToChecklist}
    />
  );
}
