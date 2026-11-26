import { useAuth } from "@clerk/expo";
import { Redirect } from "expo-router";

import { AuthLoading } from "../../src/auth/auth-loading";
import { OnboardingGate } from "../../src/auth/onboarding-gate";
import { StoredLocaleSync } from "../../src/i18n/stored-locale-sync";
import { settleAppLink } from "../../src/links/pending-app-link";
import { AppTabs } from "../../src/navigation/app-tabs";
import { RequestAnswersProvider } from "../../src/requests/request-answers-provider";

export default function SignedInLayout() {
  const { isLoaded, isSignedIn } = useAuth();

  if (!isLoaded) {
    return <AuthLoading />;
  }
  settleAppLink(isSignedIn);
  if (!isSignedIn) {
    return <Redirect href="/welcome" />;
  }
  return (
    <OnboardingGate>
      <StoredLocaleSync />
      <RequestAnswersProvider>
        <AppTabs />
      </RequestAnswersProvider>
    </OnboardingGate>
  );
}
