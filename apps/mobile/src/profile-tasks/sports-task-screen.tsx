import { AuthLoading } from "../auth/auth-loading";
import { AuthScreen } from "../auth/auth-screen";
import { SportsQuestionnaire } from "../auth/onboarding-questionnaire";
import { useMessages } from "../i18n/locale-provider";
import { Button } from "../primitives/button";
import { api } from "../trpc/react";
import { backToChecklist } from "./task-navigation";

export function SportsTaskScreen() {
  const m = useMessages();
  const state = api.users.onboardingState.useQuery();

  if (state.error && !state.data) {
    return (
      <AuthScreen
        onBack={backToChecklist}
        title={m.mobileHome.block.couldNotLoad(m.mobileHome.tasks.short.sports)}
        description={state.error.message}
      >
        <Button
          label={m.common.tryAgain}
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
