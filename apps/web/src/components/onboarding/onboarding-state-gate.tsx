"use client";

import { useClerk } from "@clerk/nextjs";
import * as React from "react";

import { AuthLoading } from "~/components/auth/auth-loading";
import { AuthScreen } from "~/components/auth/auth-screen";
import { ErrorState } from "~/components/common/error-state";
import { useMessages } from "~/components/locale-provider";
import { Button } from "~/components/ui/button";
import { Skeleton } from "~/components/ui/skeleton";
import { onboardingPhaseFromState } from "~/lib/onboarding-step";
import { api, type RouterOutputs } from "~/trpc/react";

export type OnboardingState = RouterOutputs["users"]["onboardingState"];

export type ReadyOnboardingState = Extract<
  OnboardingState,
  { provisioning: false }
>;

/** How often the wait state re-asks whether the `user` row has landed. */
const PROVISIONING_POLL_MS = 2000;
/** About ten polls; past this the wait offers a retry and a way out. */
const PROVISIONING_TIMEOUT_MS = 10 * PROVISIONING_POLL_MS;

/**
 * Waits for the caller's `user` row before rendering the Profile checklist
 * or one of its tasks. A missing row is the Clerk `user.created` webhook
 * race: the wait polls `users.onboardingState` until it lands, and past ten
 * polls offers a retry and a sign-out.
 */
export function OnboardingStateGate({
  children,
}: {
  children: (state: ReadyOnboardingState) => React.ReactNode;
}) {
  const m = useMessages();
  const copy = m.webAuth.onboarding.gate;
  const { signOut } = useClerk();
  const state = api.users.onboardingState.useQuery(undefined, {
    refetchInterval: (query) =>
      query.state.data?.provisioning ? PROVISIONING_POLL_MS : false,
  });
  const [provisioningStalled, setProvisioningStalled] = React.useState(false);
  const [signingOut, setSigningOut] = React.useState(false);

  const phase = onboardingPhaseFromState(state.data);

  React.useEffect(() => {
    if (phase !== "provisioning" || provisioningStalled) {
      return;
    }
    const id = window.setTimeout(() => {
      setProvisioningStalled(true);
    }, PROVISIONING_TIMEOUT_MS);
    return () => window.clearTimeout(id);
  }, [provisioningStalled, phase]);

  function onSignOut() {
    setSigningOut(true);
    signOut({ redirectUrl: "/login" }).catch(() => {
      setSigningOut(false);
    });
  }

  // Checked before the loading branch: a failed query has no data, so the
  // phase would otherwise sit on the skeleton forever.
  if (state.error && !state.data) {
    return (
      <AuthScreen brand>
        <ErrorState
          headingLevel={1}
          title={copy.loadFailed}
          message={state.error.message}
          onRetry={() => {
            void state.refetch();
          }}
        />
      </AuthScreen>
    );
  }

  if (phase === "loading" || !state.data) {
    return (
      <AuthScreen brand>
        <AuthLoading />
      </AuthScreen>
    );
  }

  if (state.data.provisioning) {
    if (provisioningStalled) {
      return (
        <AuthScreen brand>
          <ErrorState
            headingLevel={1}
            title={copy.stalledTitle}
            message={copy.stalledMessage}
            onRetry={() => {
              setProvisioningStalled(false);
              void state.refetch();
            }}
            secondaryAction={
              <Button
                type="button"
                variant="outline"
                className="min-h-11"
                pending={signingOut}
                pendingLabel={copy.signingOut}
                onClick={onSignOut}
              >
                {m.common.signOut}
              </Button>
            }
          />
        </AuthScreen>
      );
    }
    return (
      <AuthScreen brand title={copy.settingUp}>
        <div className="space-y-4">
          <p
            role="status"
            aria-live="polite"
            className="text-body text-muted-foreground"
          >
            {copy.creatingNote}
          </p>
          <Skeleton className="h-24 w-full rounded-lg" />
        </div>
      </AuthScreen>
    );
  }

  return <>{children(state.data)}</>;
}
