"use client";

import { useClerk } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import * as React from "react";

import { AuthLoading } from "~/components/auth/auth-loading";
import { AuthScreen } from "~/components/auth/auth-screen";
import { ErrorState } from "~/components/common/error-state";
import {
  LevelChoiceGrid,
  type LevelChoiceValue,
} from "~/components/temba/level-choice-grid";
import { Button } from "~/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "~/components/ui/field";
import { FormErrorSummary } from "~/components/ui/form-error-summary";
import { RovingRadioGroup } from "~/components/ui/roving-radio-group";
import { Skeleton } from "~/components/ui/skeleton";
import {
  fieldErrorMessage,
  focusFormFailure,
  globalFormErrorMessage,
} from "~/lib/form-mutation-error";
import { selfDeclareChoiceFromDisplay } from "@repo/domain/level-bands";
import {
  onboardingStepFromState,
  shouldFocusStepHeading,
} from "~/lib/onboarding-step";
import { preferredPositionNote } from "@repo/domain/preferred-position";
import { api, type RouterInputs } from "~/trpc/react";

type PreferredPosition =
  RouterInputs["users"]["setPreferredPosition"]["preferredPosition"];

const POSITION_CHOICES: { value: PreferredPosition; label: string }[] = [
  { value: "left", label: "Left" },
  { value: "right", label: "Right" },
  { value: "either", label: "Either" },
];

const FIELD_IDS = {
  preferredPosition: "onboarding-preferred-position",
  choice: "onboarding-level-choice",
};

/** How often the wait state re-asks whether the `user` row has landed. */
const PROVISIONING_POLL_MS = 2000;
/** About ten polls; past this the wait offers a retry and a way out. */
const PROVISIONING_TIMEOUT_MS = 10 * PROVISIONING_POLL_MS;

/**
 * The Onboarding questionnaire: Preferred Position, then the one-time Level
 * declaration. Each step writes on submit, so a User who closes the tab
 * resumes exactly where they left off — the step is derived from
 * `users.onboardingState` rather than held in the page.
 *
 * There is no Skip button by design: **Either** and **I don't know** are the
 * low-commitment answers.
 */
export function OnboardingQuestionnaire({
  redirectTo,
}: {
  redirectTo: string;
}) {
  const router = useRouter();
  const { signOut } = useClerk();
  const utils = api.useUtils();
  const summaryRef = React.useRef<HTMLDivElement>(null);

  const state = api.users.onboardingState.useQuery(undefined, {
    refetchInterval: (query) =>
      query.state.data?.provisioning ? PROVISIONING_POLL_MS : false,
  });

  const [position, setPosition] = React.useState<PreferredPosition | "">("");
  const [levelChoice, setLevelChoice] = React.useState<LevelChoiceValue | "">(
    "",
  );
  const [changingPosition, setChangingPosition] = React.useState(false);
  const [provisioningStalled, setProvisioningStalled] = React.useState(false);
  const [signingOut, setSigningOut] = React.useState(false);

  const setPreferredPosition = api.users.setPreferredPosition.useMutation({
    onSuccess: async () => {
      setChangingPosition(false);
      await utils.users.onboardingState.invalidate();
    },
  });

  const selfDeclare = api.ratings.selfDeclare.useMutation({
    onSuccess: async () => {
      await utils.users.onboardingState.invalidate();
    },
  });

  const completeOnboarding = api.users.completeOnboarding.useMutation({
    onSuccess: () => {
      router.replace(redirectTo);
    },
  });

  const derivedStep = onboardingStepFromState(state.data);
  // Back on step two re-opens step one; the answer already written stays
  // written, and re-submitting it is allowed (Preferred Position is not
  // once-only).
  const step =
    changingPosition && derivedStep === "level" ? "position" : derivedStep;

  const positionPending = setPreferredPosition.isPending;
  const levelPending = selfDeclare.isPending || selfDeclare.isSuccess;
  const activeError =
    step === "position" ? setPreferredPosition.error : selfDeclare.error;

  const previousStep = React.useRef(step);
  React.useEffect(() => {
    const previous = previousStep.current;
    previousStep.current = step;
    if (shouldFocusStepHeading(previous, step)) {
      document.getElementById("auth-screen-heading")?.focus();
    }
  }, [step]);

  React.useEffect(() => {
    if (step !== "provisioning" || provisioningStalled) {
      return;
    }
    const id = window.setTimeout(() => {
      setProvisioningStalled(true);
    }, PROVISIONING_TIMEOUT_MS);
    return () => window.clearTimeout(id);
  }, [provisioningStalled, step]);

  React.useEffect(() => {
    if (!activeError) {
      return;
    }
    focusFormFailure(activeError, FIELD_IDS, summaryRef.current);
  }, [activeError]);

  React.useEffect(() => {
    if (step === "complete") {
      router.replace(redirectTo);
      return;
    }
    if (step !== "finishing") {
      return;
    }
    if (
      completeOnboarding.isPending ||
      completeOnboarding.isSuccess ||
      completeOnboarding.isError
    ) {
      return;
    }
    completeOnboarding.mutate();
  }, [completeOnboarding, redirectTo, router, step]);

  function onSubmitPosition(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (positionPending || position === "") {
      return;
    }
    setPreferredPosition.mutate({ preferredPosition: position });
  }

  function onSubmitLevel(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (levelPending || levelChoice === "") {
      return;
    }
    selfDeclare.mutate({
      sport: "padel",
      choice: selfDeclareChoiceFromDisplay(levelChoice),
    });
  }

  function onSignOut() {
    setSigningOut(true);
    signOut({ redirectUrl: "/login" }).catch(() => {
      setSigningOut(false);
    });
  }

  function onBack() {
    setPreferredPosition.reset();
    setPosition(state.data?.preferredPosition ?? "");
    setChangingPosition(true);
  }

  // Checked before the loading branch: a failed query has no data, so the
  // derived step would otherwise sit on the skeleton forever.
  if (state.error && !state.data) {
    return (
      <AuthScreen brand>
        <ErrorState
          headingLevel={1}
          title="Setup could not be loaded"
          message={state.error.message}
          onRetry={() => {
            void state.refetch();
          }}
        />
      </AuthScreen>
    );
  }

  if (step === "loading") {
    return (
      <AuthScreen brand>
        <AuthLoading />
      </AuthScreen>
    );
  }

  if (step === "provisioning" && provisioningStalled) {
    return (
      <AuthScreen brand>
        <ErrorState
          headingLevel={1}
          title="Setup is taking longer than usual"
          message="Your Temba account is still being created. Try again, or sign out and come back later."
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
              pendingLabel="Signing out…"
              onClick={onSignOut}
            >
              Sign out
            </Button>
          }
        />
      </AuthScreen>
    );
  }

  if (step === "provisioning") {
    return (
      <AuthScreen brand title="Setting up your account">
        <div className="space-y-4">
          <p
            role="status"
            aria-live="polite"
            className="text-body text-muted-foreground"
          >
            Your Temba account is still being created. This only takes a moment
            after sign-up — these two questions open on their own.
          </p>
          <Skeleton className="h-24 w-full rounded-lg" />
        </div>
      </AuthScreen>
    );
  }

  if (step === "finishing" || step === "complete") {
    const finishError = globalFormErrorMessage(completeOnboarding.error);
    return (
      <AuthScreen
        brand
        title={finishError ? "Could not finish setup" : "You are all set"}
      >
        <div className="space-y-4">
          <p
            role="status"
            aria-live="polite"
            className="text-body text-muted-foreground"
          >
            {finishError
              ? "Both answers are saved. Try finishing again."
              : "Taking you to Temba…"}
          </p>
          {finishError ? (
            <>
              <FormErrorSummary message={finishError} />
              <Button
                type="button"
                className="min-h-11 w-full"
                onClick={() => {
                  completeOnboarding.reset();
                }}
              >
                Try again
              </Button>
            </>
          ) : null}
        </div>
      </AuthScreen>
    );
  }

  if (step === "position") {
    const positionError = fieldErrorMessage(
      setPreferredPosition.error,
      "preferredPosition",
    );
    return (
      <AuthScreen
        brand
        eyebrow="Step 1 of 2"
        title="Which side do you play?"
        description="Your default side when you pick a Game seat. You can change it later in Settings."
      >
        <form onSubmit={onSubmitPosition} className="space-y-4">
          <FormErrorSummary
            ref={summaryRef}
            message={globalFormErrorMessage(setPreferredPosition.error)}
          />
          <Field>
            <FieldLabel id="onboarding-preferred-position-label">
              Preferred Position
            </FieldLabel>
            <RovingRadioGroup
              id={FIELD_IDS.preferredPosition}
              aria-labelledby="onboarding-preferred-position-label"
              aria-invalid={positionError ? true : undefined}
              aria-describedby={
                positionError
                  ? "onboarding-preferred-position-error"
                  : position
                    ? "onboarding-preferred-position-note"
                    : undefined
              }
              className="grid grid-cols-3 gap-2"
            >
              {POSITION_CHOICES.map((option) => {
                const selected = position === option.value;
                return (
                  <Button
                    key={option.value}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    variant={selected ? "default" : "outline"}
                    className="min-h-11"
                    disabled={positionPending}
                    onClick={() => {
                      setPosition(option.value);
                    }}
                  >
                    {option.label}
                  </Button>
                );
              })}
            </RovingRadioGroup>
            {position ? (
              <FieldDescription id="onboarding-preferred-position-note">
                {preferredPositionNote(position)}
              </FieldDescription>
            ) : null}
            <FieldError id="onboarding-preferred-position-error">
              {positionError}
            </FieldError>
          </Field>
          <Button
            type="submit"
            className="min-h-11 w-full"
            disabled={positionPending || position === ""}
            aria-busy={positionPending}
          >
            {positionPending ? "Saving…" : "Continue"}
          </Button>
        </form>
      </AuthScreen>
    );
  }

  const levelError = fieldErrorMessage(selfDeclare.error, "choice");
  return (
    <AuthScreen
      brand
      eyebrow="Step 2 of 2"
      title="Declare your Level"
      description="Place yourself on the padel ladder once. Pick a Level band, or I don’t know if you are unsure."
    >
      <form onSubmit={onSubmitLevel} className="space-y-4">
        <FormErrorSummary
          ref={summaryRef}
          message={globalFormErrorMessage(selfDeclare.error)}
        />
        <Field>
          <FieldLabel id="onboarding-level-choice-label">Level band</FieldLabel>
          <LevelChoiceGrid
            id={FIELD_IDS.choice}
            labelledBy="onboarding-level-choice-label"
            describedBy={
              levelError ? "onboarding-level-choice-error" : undefined
            }
            invalid={Boolean(levelError)}
            value={levelChoice}
            onSelect={setLevelChoice}
            disabled={levelPending}
          />
          <FieldError id="onboarding-level-choice-error">
            {levelError}
          </FieldError>
        </Field>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            className="min-h-11"
            disabled={levelPending}
            onClick={onBack}
          >
            Back
          </Button>
          <Button
            type="submit"
            className="min-h-11 flex-1"
            disabled={levelPending || levelChoice === ""}
            aria-busy={levelPending}
          >
            {levelPending ? "Saving…" : "Finish"}
          </Button>
        </div>
      </form>
    </AuthScreen>
  );
}
