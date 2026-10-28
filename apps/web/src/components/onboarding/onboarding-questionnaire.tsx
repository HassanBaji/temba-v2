"use client";

import { useClerk, useUser } from "@clerk/nextjs";
import {
  FOOTBALL_POSITION_CHOICES,
  KEEPER_CODE,
  type FootballPosition,
} from "@repo/domain/football-lineup";
import { FOOTBALL_SELF_PLACEMENT_CHOICES } from "@repo/domain/football-self-placement";
import {
  FOOTBALL_ROLE_CHOICES,
  PADEL_LEVEL_CHOICES,
  PADEL_NOT_SURE_LABEL,
  PADEL_NOT_SURE_LEVEL,
  PADEL_SIDE_CHOICES,
  SPORT_CHOICES,
  initialOnboardingAnswers,
  onboardingSubmission,
  onboardingSummary,
  type OnboardingAnswers,
} from "@repo/domain/onboarding-answers";
import {
  adjacentQuestion,
  findGamesLabel,
  onboardingProgress,
  sportsContinueLabel,
  type OnboardingQuestion,
} from "@repo/domain/onboarding-flow";
import { type Sport } from "@repo/domain/sport";
import { useRouter } from "next/navigation";
import * as React from "react";

import { AuthLoading } from "~/components/auth/auth-loading";
import { AuthScreen } from "~/components/auth/auth-screen";
import { ErrorState } from "~/components/common/error-state";
import { UserAvatar } from "~/components/common/user-avatar";
import {
  CardChoice,
  Group,
  RowChoices,
  SectionLabel,
  TileChoices,
} from "~/components/onboarding/onboarding-choices";
import { Button } from "~/components/ui/button";
import { FormErrorSummary } from "~/components/ui/form-error-summary";
import { Skeleton } from "~/components/ui/skeleton";
import { globalFormErrorMessage } from "~/lib/form-mutation-error";
import {
  onboardingPhaseFromState,
  shouldFocusStepHeading,
} from "~/lib/onboarding-step";
import { api, type RouterOutputs } from "~/trpc/react";

type OnboardingState = RouterOutputs["users"]["onboardingState"];

/** How often the wait state re-asks whether the `user` row has landed. */
const PROVISIONING_POLL_MS = 2000;
/** About ten polls; past this the wait offers a retry and a way out. */
const PROVISIONING_TIMEOUT_MS = 10 * PROVISIONING_POLL_MS;

function Actions(props: { children: React.ReactNode }) {
  return (
    <div className="mt-auto flex flex-col gap-2.5 pt-6">{props.children}</div>
  );
}

function LevelAlreadySet(props: { sport: string }) {
  return (
    <p className="text-meta text-muted-foreground">
      Your {props.sport} Level is already set, so this step only saves the rest.
    </p>
  );
}

function Questions({
  state,
  redirectTo,
}: {
  state: OnboardingState;
  redirectTo: string;
}) {
  const router = useRouter();
  const { user } = useUser();
  const [question, setQuestion] = React.useState<OnboardingQuestion>("sports");
  const [answers, setAnswers] = React.useState(() =>
    initialOnboardingAnswers(state),
  );
  const complete = api.users.completeOnboarding.useMutation({
    onSuccess: () => {
      router.replace(redirectTo);
    },
  });

  const previousQuestion = React.useRef(question);
  React.useEffect(() => {
    const previous = previousQuestion.current;
    previousQuestion.current = question;
    if (shouldFocusStepHeading(previous, question)) {
      document.getElementById("auth-screen-heading")?.focus();
    }
  }, [question]);

  const progress = onboardingProgress(answers.picked, question);
  const update = (patch: Partial<OnboardingAnswers>) =>
    setAnswers((current) => ({ ...current, ...patch }));
  const go = (direction: "next" | "back") => {
    const target = adjacentQuestion(answers.picked, question, direction);
    if (target) {
      setQuestion(target);
    }
  };
  const back = () => go("back");
  const togglePicked = (sport: Sport) =>
    update({ picked: { ...answers.picked, [sport]: !answers.picked[sport] } });

  if (question === "sports") {
    const nonePicked = !answers.picked.padel && !answers.picked.football;
    return (
      <AuthScreen
        brand
        progress={progress}
        title="What do you play?"
        description="Pick one or both. Each sport keeps its own Level and its own Games list."
      >
        <div className="flex flex-col gap-3">
          {SPORT_CHOICES.map((choice) => (
            <CardChoice
              key={choice.value}
              role="checkbox"
              selected={answers.picked[choice.value]}
              title={choice.title}
              description={choice.description}
              meta={choice.meta}
              onSelect={() => togglePicked(choice.value)}
            />
          ))}
        </div>
        <p className="text-eyebrow text-muted-foreground mt-4">
          Groups and bookings stay separate per sport.
        </p>
        <Actions>
          <Button
            type="button"
            size="lg"
            className="w-full font-semibold"
            disabled={nonePicked}
            onClick={() => go("next")}
          >
            {sportsContinueLabel(answers.picked)}
          </Button>
        </Actions>
      </AuthScreen>
    );
  }

  if (question === "padel") {
    const levelSet = state.hasRating;
    return (
      <AuthScreen
        onBack={back}
        progress={progress}
        eyebrow="Padel"
        title="Where would you place yourself?"
        description="A starting point only. Rated matches confirm it."
      >
        <div className="flex flex-col gap-5">
          {levelSet ? (
            <LevelAlreadySet sport="padel" />
          ) : (
            <RowChoices
              label="Padel Level"
              choices={PADEL_LEVEL_CHOICES.map((choice) => ({
                ...choice,
                mark: choice.value,
              }))}
              value={answers.padelLevel}
              onSelect={(padelLevel) => update({ padelLevel })}
            />
          )}
          <Group>
            <SectionLabel
              label="Preferred side"
              hint="a preference, not a promise"
            />
            <TileChoices
              label="Preferred side"
              choices={PADEL_SIDE_CHOICES}
              value={answers.padelSide}
              onSelect={(padelSide) => update({ padelSide })}
            />
          </Group>
        </div>
        <Actions>
          <Button
            type="button"
            size="lg"
            className="w-full font-semibold"
            disabled={!levelSet && answers.padelLevel === ""}
            onClick={() => go("next")}
          >
            {levelSet || answers.padelLevel ? "Continue" : "Pick a Level"}
          </Button>
          {levelSet ? null : (
            <Button
              type="button"
              variant="link"
              className="text-muted-foreground min-h-11 underline"
              onClick={() => {
                update({
                  padelLevel: PADEL_NOT_SURE_LEVEL,
                  padelSide: "either",
                });
                go("next");
              }}
            >
              {PADEL_NOT_SURE_LABEL}
            </Button>
          )}
        </Actions>
      </AuthScreen>
    );
  }

  if (question === "football") {
    const keeper = answers.footballRole === "keeper";
    return (
      <AuthScreen
        onBack={back}
        progress={progress}
        eyebrow="Football"
        title="How do you line up?"
        description="Organizers use this to balance teams. You can change it per Game."
      >
        <div className="flex flex-col gap-5">
          <Group>
            <SectionLabel label="Usually join as" />
            <TileChoices
              label="Football role"
              choices={FOOTBALL_ROLE_CHOICES}
              value={answers.footballRole}
              onSelect={(footballRole) => update({ footballRole })}
            />
          </Group>
          {keeper ? (
            <div className="border-rule flex items-center gap-3 rounded-[14px] border px-4 py-3.5">
              <span className="bg-ink text-paper text-eyebrow rounded-[5px] px-1.5 py-0.5 font-mono">
                {KEEPER_CODE}
              </span>
              <p className="text-meta text-muted-foreground">
                Keeper seats are limited to two a Game, one for each side.
              </p>
            </div>
          ) : (
            <Group>
              <SectionLabel
                label="Preferred position"
                hint="a preference, not a promise"
              />
              <TileChoices<FootballPosition>
                label="Preferred football position"
                choices={FOOTBALL_POSITION_CHOICES.map((choice) => ({
                  value: choice.value,
                  name: choice.code,
                  detail: choice.label.toLowerCase(),
                  mono: true,
                }))}
                value={answers.footballPosition}
                onSelect={(footballPosition) => update({ footballPosition })}
              />
            </Group>
          )}
          <Group>
            <SectionLabel label="Your level" />
            {state.hasFootballRating ? (
              <LevelAlreadySet sport="football" />
            ) : (
              <>
                <div
                  role="radiogroup"
                  aria-label="Football level"
                  className="flex flex-col gap-2"
                >
                  {FOOTBALL_SELF_PLACEMENT_CHOICES.map((choice) => (
                    <CardChoice
                      key={choice.value}
                      role="radio"
                      selected={answers.footballPlacement === choice.value}
                      title={choice.label}
                      description={choice.description}
                      onSelect={() =>
                        update({ footballPlacement: choice.value })
                      }
                    />
                  ))}
                </div>
                <p className="text-eyebrow text-muted-foreground">
                  Self-placed for now. It balances teams until football results
                  are rated.
                </p>
              </>
            )}
          </Group>
        </div>
        <Actions>
          <Button
            type="button"
            size="lg"
            className="w-full font-semibold"
            onClick={() => go("next")}
          >
            Continue
          </Button>
        </Actions>
      </AuthScreen>
    );
  }

  const finishError = globalFormErrorMessage(complete.error);
  const pending = complete.isPending || complete.isSuccess;
  const name = user?.fullName ?? user?.username ?? "You";
  const phone = user?.primaryPhoneNumber?.phoneNumber ?? null;
  return (
    <AuthScreen
      onBack={pending ? undefined : back}
      progress={progress}
      title="You’re set."
      description="Here’s how organizers will see you. Your side and football role can change later; your Levels move with results."
    >
      <div className="flex flex-col gap-2.5">
        <FormErrorSummary message={finishError} />
        <SectionLabel label="Your profile so far" />
        <div className="border-rule overflow-hidden rounded-[14px] border">
          <div className="flex items-center gap-3.5 px-5 py-4">
            <UserAvatar name={name} image={user?.imageUrl} size="lg" />
            <div className="min-w-0 flex-1">
              <p className="text-body truncate font-semibold">{name}</p>
              {phone ? (
                <p className="text-meta text-muted-foreground">{phone}</p>
              ) : null}
            </div>
          </div>
          {onboardingSummary(answers).map((row) => (
            <div
              key={row.sport}
              className="border-rule flex items-center justify-between gap-3 border-t px-5 py-3.5"
            >
              <span className="text-body font-semibold">{row.sport}</span>
              <span className="text-meta text-muted-foreground text-right">
                {row.line}
              </span>
            </div>
          ))}
        </div>
      </div>
      <Actions>
        <Button
          type="button"
          size="lg"
          className="w-full font-semibold"
          pending={pending}
          pendingLabel="Saving…"
          onClick={() => complete.mutate(onboardingSubmission(answers))}
        >
          {findGamesLabel(answers.picked)}
        </Button>
      </Actions>
    </AuthScreen>
  );
}

/**
 * The Onboarding questionnaire: which sports the User plays, then padel and
 * football questions for each one picked, then a summary. Answers are held
 * in the page and saved in one `users.completeOnboarding` call, so going
 * back never meets a half-written answer.
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

  React.useEffect(() => {
    if (phase === "complete") {
      router.replace(redirectTo);
    }
  }, [phase, redirectTo, router]);

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
          title="Setup could not be loaded"
          message={state.error.message}
          onRetry={() => {
            void state.refetch();
          }}
        />
      </AuthScreen>
    );
  }

  if (phase === "loading" || phase === "complete") {
    return (
      <AuthScreen brand>
        <AuthLoading />
      </AuthScreen>
    );
  }

  if (phase === "provisioning" && provisioningStalled) {
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

  if (phase === "provisioning" || !state.data) {
    return (
      <AuthScreen brand title="Setting up your account">
        <div className="space-y-4">
          <p
            role="status"
            aria-live="polite"
            className="text-body text-muted-foreground"
          >
            Your Temba account is still being created. This only takes a moment
            after sign-up, and the questions open on their own.
          </p>
          <Skeleton className="h-24 w-full rounded-lg" />
        </div>
      </AuthScreen>
    );
  }

  return <Questions state={state.data} redirectTo={redirectTo} />;
}
