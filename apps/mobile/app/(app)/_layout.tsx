import { useAuth } from "@clerk/expo";
import { Redirect } from "expo-router";

import { AuthLoading } from "../../src/auth/auth-loading";
import { OnboardingGate } from "../../src/auth/onboarding-gate";
import { AppTabs } from "../../src/navigation/app-tabs";

export default function SignedInLayout() {
  const { isLoaded, isSignedIn } = useAuth();

  if (!isLoaded) {
    return <AuthLoading />;
  }
  if (!isSignedIn) {
    return <Redirect href="/welcome" />;
  }
  return (
    <OnboardingGate>
      <AppTabs />
    </OnboardingGate>
  );
}
