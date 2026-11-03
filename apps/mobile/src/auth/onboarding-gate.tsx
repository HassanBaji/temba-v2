import { useAuth } from "@clerk/expo";
import { useEffect, useState } from "react";

import { useMessages } from "../i18n/locale-provider";
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
  const m = useMessages();
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
      label={m.common.signOut}
      variant="outline"
      pending={signingOut}
      onPress={onSignOut}
    />
  );

  if (state.error && !state.data) {
    return (
      <AuthScreen
        title={m.mobileHome.gate.setupCouldNotLoad}
        description={state.error.message}
      >
        <Button
          label={m.common.tryAgain}
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
        title={m.mobileHome.gate.takingLongerTitle}
        description={m.mobileHome.gate.takingLongerBody}
      >
        <Button
          label={m.common.tryAgain}
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
    <AuthScreen title={m.mobileHome.gate.settingUpTitle}>
      <Text tone="muted" accessibilityLiveRegion="polite">
        {m.mobileHome.gate.settingUpBody}
      </Text>
      <Skeleton height={96} />
      {signOutButton}
    </AuthScreen>
  );
}
