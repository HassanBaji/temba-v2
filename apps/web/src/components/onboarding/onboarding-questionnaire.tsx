"use client";

import {
  footballPositionChoices,
  footballKeeperCode,
  type FootballPosition,
} from "@repo/domain/football-lineup";
import { footballSelfPlacementChoices } from "@repo/domain/football-self-placement";
import {
  footballRoleChoices,
  padelLevelChoices,
  padelNotSureLabel,
  PADEL_NOT_SURE_LEVEL,
  padelSideChoices,
  sportChoices,
  initialOnboardingAnswers,
  onboardingSubmission,
  type OnboardingAnswers,
} from "@repo/domain/onboarding-answers";
import {
  adjacentQuestion,
  onboardingProgress,
  sportsContinueLabel,
  type OnboardingQuestion,
} from "@repo/domain/onboarding-flow";
import { type Sport } from "@repo/domain/sport";
import { useLocale, useMessages } from "~/components/locale-provider";
import * as React from "react";

import { AuthScreen } from "~/components/auth/auth-screen";
import {
  CardChoice,
  Group,
  RowChoices,
  SectionLabel,
  TileChoices,
} from "~/components/onboarding/onboarding-choices";
import { type ReadyOnboardingState } from "~/components/onboarding/onboarding-state-gate";
import { Button } from "~/components/ui/button";
import { FormErrorSummary } from "~/components/ui/form-error-summary";
import { globalFormErrorMessage } from "~/lib/form-mutation-error";
import { shouldFocusStepHeading } from "~/lib/onboarding-step";
import { api } from "~/trpc/react";

/**
 * The "ready" summary is gone: the last sport step saves and returns to the
 * checklist, so the flow's progress counts one step fewer than
 * `onboardingProgress` does.
 */
function sportsProgress(
  picked: OnboardingAnswers["picked"],
  question: OnboardingQuestion,
) {
  const progress = onboardingProgress(picked, question);
  return { step: progress.step, total: progress.total - 1 };
}

function isLastQuestion(
  picked: OnboardingAnswers["picked"],
  question: OnboardingQuestion,
) {
  return adjacentQuestion(picked, question, "next") === "ready";
}

function Actions(props: { children: React.ReactNode }) {
  return (
    <div className="mt-auto flex flex-col gap-2.5 pt-6">{props.children}</div>
  );
}

function LevelAlreadySet(props: { sport: Sport }) {
  const m = useMessages();
  return (
    <p className="text-meta text-muted-foreground">
      {m.webAuth.onboarding.levelAlreadySet[props.sport]}
    </p>
  );
}

/**
 * The Onboarding questionnaire as the "Pick your sports and level" Profile
 * task: which sports the User plays, then padel and football questions for
 * each one picked. Answers are held in the page and saved in one
 * `users.completeOnboarding` call on the last step, so going back never
 * meets a half-written answer. `onDone` runs once that save lands.
 *
 * There is no Skip button by design: **Either** and **I don't know** are the
 * low-commitment answers; the task itself is optional (ADR-0049).
 */
export function OnboardingQuestionnaire({
  state,
  backHref,
  onDone,
}: {
  state: ReadyOnboardingState;
  backHref: string;
  onDone: () => void;
}) {
  const m = useMessages();
  const locale = useLocale();
  const copy = m.webAuth.onboarding;
  const utils = api.useUtils();
  const [question, setQuestion] = React.useState<OnboardingQuestion>("sports");
  const [answers, setAnswers] = React.useState(() =>
    initialOnboardingAnswers(state),
  );
  const complete = api.users.completeOnboarding.useMutation({
    onSuccess: async () => {
      await utils.users.onboardingState.invalidate();
      onDone();
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

  const progress = sportsProgress(answers.picked, question);
  const eyebrow = copy.eyebrow.sports(progress.step, progress.total);
  const saving = complete.isPending || complete.isSuccess;
  const finishError = globalFormErrorMessage(complete.error);
  const update = (patch: Partial<OnboardingAnswers>) =>
    setAnswers((current) => ({ ...current, ...patch }));
  // A patch passed with "next" is saved in the same move, so the last step's
  // shortcut answers never submit a stale copy.
  const go = (
    direction: "next" | "back",
    patch?: Partial<OnboardingAnswers>,
  ) => {
    const merged = patch ? { ...answers, ...patch } : answers;
    if (patch) {
      setAnswers(merged);
    }
    if (direction === "next" && isLastQuestion(merged.picked, question)) {
      complete.mutate(onboardingSubmission(merged));
      return;
    }
    const target = adjacentQuestion(merged.picked, question, direction);
    if (target) {
      setQuestion(target);
    }
  };
  const back = () => go("back");
  const nextLabel = (label: string) =>
    isLastQuestion(answers.picked, question) ? copy.saveSports : label;
  const togglePicked = (sport: Sport) =>
    update({ picked: { ...answers.picked, [sport]: !answers.picked[sport] } });

  if (question === "sports") {
    const nonePicked = !answers.picked.padel && !answers.picked.football;
    return (
      <AuthScreen
        backHref={backHref}
        backLabel={m.common.back}
        progress={{ ...progress, label: eyebrow }}
        title={copy.sports.title}
        description={copy.sports.description}
      >
        <div className="flex flex-col gap-3">
          <FormErrorSummary message={finishError} />
          {sportChoices(locale).map((choice) => (
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
          {copy.sports.separateNote}
        </p>
        <Actions>
          <Button
            type="button"
            size="lg"
            className="w-full font-semibold"
            disabled={nonePicked}
            onClick={() => go("next")}
          >
            {sportsContinueLabel(answers.picked, locale)}
          </Button>
        </Actions>
      </AuthScreen>
    );
  }

  if (question === "padel") {
    const levelSet = state.hasRating;
    return (
      <AuthScreen
        onBack={saving ? undefined : back}
        progress={{ ...progress, label: eyebrow }}
        eyebrow={m.common.padel}
        title={copy.padel.title}
        description={copy.padel.description}
      >
        <div className="flex flex-col gap-5">
          <FormErrorSummary message={finishError} />
          {levelSet ? (
            <LevelAlreadySet sport="padel" />
          ) : (
            <RowChoices
              label={copy.padel.levelLabel}
              choices={padelLevelChoices(locale).map((choice) => ({
                ...choice,
                mark: choice.value,
              }))}
              value={answers.padelLevel}
              onSelect={(padelLevel) => update({ padelLevel })}
            />
          )}
          <Group>
            <SectionLabel
              label={copy.padel.preferredSide}
              hint={copy.padel.preferenceHint}
            />
            <TileChoices
              label={copy.padel.preferredSide}
              choices={padelSideChoices(locale)}
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
            pending={saving}
            pendingLabel={m.common.saving}
            onClick={() => go("next")}
          >
            {levelSet || answers.padelLevel
              ? nextLabel(m.common.continue)
              : copy.padel.pickALevel}
          </Button>
          {levelSet ? null : (
            <Button
              type="button"
              variant="link"
              className="text-muted-foreground min-h-11 underline"
              disabled={saving}
              onClick={() =>
                go("next", {
                  padelLevel: PADEL_NOT_SURE_LEVEL,
                  padelSide: "either",
                })
              }
            >
              {padelNotSureLabel(locale)}
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
        onBack={saving ? undefined : back}
        progress={{ ...progress, label: eyebrow }}
        eyebrow={m.common.football}
        title={copy.football.title}
        description={copy.football.description}
      >
        <div className="flex flex-col gap-5">
          <FormErrorSummary message={finishError} />
          <Group>
            <SectionLabel label={copy.football.usuallyJoinAs} />
            <TileChoices
              label={copy.football.roleLabel}
              choices={footballRoleChoices(locale)}
              value={answers.footballRole}
              onSelect={(footballRole) => update({ footballRole })}
            />
          </Group>
          {keeper ? (
            <div className="border-rule flex items-center gap-3 rounded-[14px] border px-4 py-3.5">
              <span className="bg-control text-on-control text-eyebrow rounded-[5px] px-1.5 py-0.5 font-mono">
                {footballKeeperCode(locale)}
              </span>
              <p className="text-meta text-muted-foreground">
                {copy.football.keeperSeatsNote}
              </p>
            </div>
          ) : (
            <Group>
              <SectionLabel
                label={copy.football.preferredPosition}
                hint={copy.padel.preferenceHint}
              />
              <TileChoices<FootballPosition>
                label={copy.football.positionLabel}
                choices={footballPositionChoices(locale).map((choice) => ({
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
            <SectionLabel label={copy.football.yourLevel} />
            {state.hasFootballRating ? (
              <LevelAlreadySet sport="football" />
            ) : (
              <>
                <div
                  role="radiogroup"
                  aria-label={copy.football.levelLabel}
                  className="flex flex-col gap-2"
                >
                  {footballSelfPlacementChoices(locale).map((choice) => (
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
                  {copy.football.selfPlacedNote}
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
            pending={saving}
            pendingLabel={m.common.saving}
            onClick={() => go("next")}
          >
            {nextLabel(m.common.continue)}
          </Button>
        </Actions>
      </AuthScreen>
    );
  }

  return null;
}
