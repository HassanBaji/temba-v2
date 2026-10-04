import { useAuth } from "@clerk/expo";
import { Redirect, Stack } from "expo-router";

import { AuthLoading } from "../../src/auth/auth-loading";
import { OnboardingGate } from "../../src/auth/onboarding-gate";

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
      <Stack screenOptions={{ headerShown: false }} />
    </OnboardingGate>
  );
}
