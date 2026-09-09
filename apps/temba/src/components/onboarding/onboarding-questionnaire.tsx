"use client";

import { useRouter } from "next/navigation";
import * as React from "react";

import { ErrorState } from "~/components/common/error-state";
import {
  LevelChoiceGrid,
  type LevelChoiceValue,
} from "~/components/temba/level-choice-grid";
import { Button } from "~/components/ui/button";
import { Field, FieldError, FieldLabel } from "~/components/ui/field";
import { FormErrorSummary } from "~/components/ui/form-error-summary";
import { Skeleton } from "~/components/ui/skeleton";
import {
  fieldErrorMessage,
  focusFormFailure,
  globalFormErrorMessage,
} from "~/lib/form-mutation-error";
import { selfDeclareChoiceFromDisplay } from "~/lib/level-bands";
import { onboardingStepFromState } from "~/lib/onboarding-step";
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

  function onBack() {
    setPreferredPosition.reset();
    setPosition(state.data?.preferredPosition ?? "");
    setChangingPosition(true);
  }

  // Checked before the loading branch: a failed query has no data, so the
  // derived step would otherwise sit on the skeleton forever.
  if (state.error && !state.data) {
    return (
      <ErrorState
        title="Setup could not be loaded"
        message={state.error.message}
        onRetry={() => {
          void state.refetch();
        }}
      />
    );
  }

  if (step === "loading") {
    return (
      <div aria-busy="true" className="space-y-4">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-7 w-52 max-w-full" />
        <Skeleton className="h-24 w-full rounded-lg" />
        <Skeleton className="h-11 w-full rounded-lg" />
      </div>
    );
  }

  if (step === "provisioning") {
    return (
      <div className="space-y-4">
        <div className="space-y-2">
          <h1 className="text-title font-semibold">Setting up your account</h1>
          <p
            role="status"
            aria-live="polite"
            className="text-body text-muted-foreground"
          >
            Your Temba account is still being created. This only takes a moment
            after sign-up — these two questions open on their own.
          </p>
        </div>
        <Skeleton className="h-24 w-full rounded-lg" />
      </div>
    );
  }

  if (step === "finishing" || step === "complete") {
    const finishError = globalFormErrorMessage(completeOnboarding.error);
    return (
      <div className="space-y-4">
        <div className="space-y-2">
          <h1 className="text-title font-semibold">
            {finishError ? "Could not finish setup" : "You are all set"}
          </h1>
          <p
            role="status"
            aria-live="polite"
            className="text-body text-muted-foreground"
          >
            {finishError
              ? "Both answers are saved. Try finishing again."
              : "Taking you to Temba…"}
          </p>
        </div>
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
    );
  }

  if (step === "position") {
    const positionError = fieldErrorMessage(
      setPreferredPosition.error,
      "preferredPosition",
    );
    return (
      <form onSubmit={onSubmitPosition} className="space-y-4">
        <div className="space-y-2">
          <p className="text-meta text-muted-foreground">Step 1 of 2</p>
          <h1 className="text-title font-semibold">Which side do you play?</h1>
          <p className="text-body text-muted-foreground">
            Your Preferred Position is the side you like on a Game team. It only
            sets a default when you pick a seat, and you can change it any time
            on You.
          </p>
        </div>
        <FormErrorSummary
          ref={summaryRef}
          message={globalFormErrorMessage(setPreferredPosition.error)}
        />
        <Field>
          <FieldLabel id="onboarding-preferred-position-label">
            Preferred Position
          </FieldLabel>
          <div
            id={FIELD_IDS.preferredPosition}
            role="radiogroup"
            aria-labelledby="onboarding-preferred-position-label"
            aria-invalid={positionError ? true : undefined}
            aria-describedby={
              positionError ? "onboarding-preferred-position-error" : undefined
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
          </div>
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
    );
  }

  const levelError = fieldErrorMessage(selfDeclare.error, "choice");
  return (
    <form onSubmit={onSubmitLevel} className="space-y-4">
      <div className="space-y-2">
        <p className="text-meta text-muted-foreground">Step 2 of 2</p>
        <h1 className="text-title font-semibold">Declare your Level</h1>
        <p className="text-body text-muted-foreground">
          Place yourself on the padel ladder once. Pick a Level band, or I don’t
          know if you are unsure.
        </p>
      </div>
      <FormErrorSummary
        ref={summaryRef}
        message={globalFormErrorMessage(selfDeclare.error)}
      />
      <Field>
        <FieldLabel id="onboarding-level-choice-label">Level band</FieldLabel>
        <LevelChoiceGrid
          id={FIELD_IDS.choice}
          labelledBy="onboarding-level-choice-label"
          describedBy={levelError ? "onboarding-level-choice-error" : undefined}
          invalid={Boolean(levelError)}
          value={levelChoice}
          onSelect={setLevelChoice}
          disabled={levelPending}
        />
        <FieldError id="onboarding-level-choice-error">{levelError}</FieldError>
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
  );
}
