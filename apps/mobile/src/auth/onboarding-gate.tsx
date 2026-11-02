import { useAuth } from "@clerk/expo";
import { useEffect, useState } from "react";

import { Button } from "../primitives/button";
import { Skeleton } from "../primitives/skeleton";
import { Text } from "../primitives/text";
import { api } from "../trpc/react";
import { AuthLoading } from "./auth-loading";
import { AuthScreen } from "./auth-screen";
import {
  PROVISIONING_POLL_MS,
  PROVISIONING_TIMEOUT_MS,
  canReachTabs,
  onboardingPhaseFromState,
} from "./onboarding-step";

/**
 * Holds the tabs only while the `user.created` webhook has not landed yet.
 * The questionnaire is a Profile task now and never blocks (ADR-0049).
 */
export function OnboardingGate({ children }: { children: React.ReactNode }) {
  const { signOut } = useAuth();
  const state = api.users.onboardingState.useQuery(undefined, {
    refetchInterval: (query) =>
      query.state.data?.provisioning ? PROVISIONING_POLL_MS : false,
  });
  const [provisioningStalled, setProvisioningStalled] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  const phase = onboardingPhaseFromState(state.data);

  useEffect(() => {
    if (phase !== "provisioning" || provisioningStalled) {
      return undefined;
    }
    const id = setTimeout(
      () => setProvisioningStalled(true),
      PROVISIONING_TIMEOUT_MS,
    );
    return () => clearTimeout(id);
  }, [provisioningStalled, phase]);

  if (canReachTabs(phase)) {
    return children;
  }

  function onSignOut() {
    setSigningOut(true);
    signOut().catch(() => setSigningOut(false));
  }

  const signOutButton = (
    <Button
      label="Sign out"
      variant="outline"
      pending={signingOut}
      onPress={onSignOut}
    />
  );

  if (state.error && !state.data) {
    return (
      <AuthScreen
        title="Setup could not be loaded"
        description={state.error.message}
      >
        <Button
          label="Try again"
          size="lg"
          onPress={() => void state.refetch()}
        />
        {signOutButton}
      </AuthScreen>
    );
  }

  if (phase === "loading") {
    return <AuthLoading />;
  }

  if (provisioningStalled) {
    return (
      <AuthScreen
        title="Setup is taking longer than usual"
        description="Your Temba account is still being created. Try again, or sign out and come back later."
      >
        <Button
          label="Try again"
          size="lg"
          onPress={() => {
            setProvisioningStalled(false);
            void state.refetch();
          }}
        />
        {signOutButton}
      </AuthScreen>
    );
  }

  return (
    <AuthScreen title="Setting up your account">
      <Text tone="muted" accessibilityLiveRegion="polite">
        Your Temba account is still being created. This only takes a moment
        after sign-up.
      </Text>
      <Skeleton height={96} />
      {signOutButton}
    </AuthScreen>
  );
}
