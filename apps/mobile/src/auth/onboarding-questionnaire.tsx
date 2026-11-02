import { colors, radii } from "@repo/design-tokens";
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
  type OnboardingAnswers,
} from "@repo/domain/onboarding-answers";
import {
  adjacentQuestion,
  onboardingProgress,
  sportsContinueLabel,
  type OnboardingQuestion,
} from "@repo/domain/onboarding-flow";
import { type Sport } from "@repo/domain/sport";
import { useState } from "react";
import { Pressable, View } from "react-native";

import { splitTrpcFormError } from "../lib/form-error";
import { Button } from "../primitives/button";
import { ChoiceCard } from "../primitives/choice-card";
import { hairline } from "../primitives/hairline-width";
import { sportsTaskMeta } from "../profile-tasks/profile-tasks-model";
import { SurfaceToneContext } from "../primitives/surface-context";
import { Text } from "../primitives/text";
import { api, type RouterOutputs } from "../trpc/react";
import { AuthScreen } from "./auth-screen";
import { FormErrorSummary } from "./form-error-summary";
import { RowChoices, TileChoices } from "./onboarding-choices";

type OnboardingState = RouterOutputs["users"]["onboardingState"];

const SAVE_LABEL = "Save sports";

function SectionLabel(props: { label: string; hint?: string }) {
  return (
    <View
      style={{
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "baseline",
        gap: 12,
      }}
    >
      <Text size="meta" tone="muted">
        {props.label}
      </Text>
      {props.hint ? (
        <Text size="eyebrow" tone="muted">
          {props.hint}
        </Text>
      ) : null}
    </View>
  );
}

function LevelAlreadySet(props: { sport: string }) {
  return (
    <Text size="meta" tone="muted">
      Your {props.sport} Level is already set, so this step only saves the rest.
    </Text>
  );
}

/**
 * The sports and level questions, as the "Pick your sports and level"
 * Profile task. The last sport screen saves and calls `onDone`; there is no
 * summary step any more.
 */
export function SportsQuestionnaire({
  state,
  onDone,
  onBack,
}: {
  state: OnboardingState;
  onDone: () => void;
  onBack: () => void;
}) {
  const utils = api.useUtils();
  const [question, setQuestion] = useState<OnboardingQuestion>("sports");
  const [answers, setAnswers] = useState(() => initialOnboardingAnswers(state));
  const complete = api.users.completeOnboarding.useMutation({
    onSuccess: async () => {
      await Promise.all([
        utils.users.onboardingState.invalidate(),
        utils.users.home.invalidate(),
      ]);
      onDone();
    },
  });

  const progress = sportsTaskMeta(onboardingProgress(answers.picked, question));
  const saving = complete.isPending || complete.isSuccess;
  const split = complete.error ? splitTrpcFormError(complete.error) : null;
  const update = (patch: Partial<OnboardingAnswers>) =>
    setAnswers((current) => ({ ...current, ...patch }));
  const lastQuestion =
    adjacentQuestion(answers.picked, question, "next") === "ready";
  const next = (patch?: Partial<OnboardingAnswers>) => {
    const merged = { ...answers, ...patch };
    if (patch) {
      setAnswers(merged);
    }
    const target = adjacentQuestion(merged.picked, question, "next");
    if (target === "ready") {
      complete.mutate(onboardingSubmission(merged));
    } else if (target) {
      setQuestion(target);
    }
  };
  const back = () => {
    const target = adjacentQuestion(answers.picked, question, "back");
    if (target) {
      setQuestion(target);
    } else {
      onBack();
    }
  };
  const togglePicked = (sport: Sport) =>
    update({ picked: { ...answers.picked, [sport]: !answers.picked[sport] } });

  if (question === "sports") {
    const nonePicked = !answers.picked.padel && !answers.picked.football;
    return (
      <AuthScreen
        onBack={onBack}
        progress={progress}
        title="What do you play?"
        description="Pick one or both. Each sport keeps its own Level and its own Games list."
        action={
          <Button
            label={sportsContinueLabel(answers.picked)}
            size="lg"
            disabled={nonePicked}
            onPress={() => next()}
          />
        }
      >
        <View style={{ gap: 12 }}>
          {SPORT_CHOICES.map((choice) => (
            <ChoiceCard
              key={choice.value}
              role="checkbox"
              selected={answers.picked[choice.value]}
              title={choice.title}
              description={choice.description}
              onPress={() => togglePicked(choice.value)}
            >
              <Text size="eyebrow" tone="muted" mono uppercase>
                {choice.meta}
              </Text>
            </ChoiceCard>
          ))}
        </View>
        <Text size="eyebrow" tone="muted">
          Groups and bookings stay separate per sport.
        </Text>
      </AuthScreen>
    );
  }

  if (question === "padel") {
    const levelSet = state.hasRating;
    return (
      <AuthScreen
        onBack={saving ? undefined : back}
        progress={progress}
        eyebrow="Padel"
        title="Where would you place yourself?"
        description="A starting point only. Rated matches confirm it."
        action={
          <>
            <Button
              label={
                levelSet || answers.padelLevel
                  ? lastQuestion
                    ? SAVE_LABEL
                    : "Continue"
                  : "Pick a Level"
              }
              size="lg"
              pending={saving}
              disabled={!levelSet && answers.padelLevel === ""}
              onPress={() => next()}
            />
            {levelSet ? null : (
              <Pressable
                accessibilityRole="button"
                hitSlop={8}
                disabled={saving}
                onPress={() =>
                  next({
                    padelLevel: PADEL_NOT_SURE_LEVEL,
                    padelSide: "either",
                  })
                }
                style={{ minHeight: 44, justifyContent: "center" }}
              >
                <Text
                  tone="muted"
                  style={{
                    textAlign: "center",
                    textDecorationLine: "underline",
                  }}
                >
                  {PADEL_NOT_SURE_LABEL}
                </Text>
              </Pressable>
            )}
          </>
        }
      >
        <FormErrorSummary message={split?.globalMessage} />
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
        <View style={{ gap: 10 }}>
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
        </View>
      </AuthScreen>
    );
  }

  if (question === "football") {
    const keeper = answers.footballRole === "keeper";
    return (
      <AuthScreen
        onBack={saving ? undefined : back}
        progress={progress}
        eyebrow="Football"
        title="How do you line up?"
        description="Organizers use this to balance teams. You can change it per Game."
        action={
          <Button
            label={lastQuestion ? SAVE_LABEL : "Continue"}
            size="lg"
            pending={saving}
            onPress={() => next()}
          />
        }
      >
        <FormErrorSummary message={split?.globalMessage} />
        <View style={{ gap: 10 }}>
          <SectionLabel label="Usually join as" />
          <TileChoices
            label="Football role"
            choices={FOOTBALL_ROLE_CHOICES}
            value={answers.footballRole}
            onSelect={(footballRole) => update({ footballRole })}
          />
        </View>
        {keeper ? (
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 12,
              borderWidth: hairline,
              borderColor: colors.rule,
              borderRadius: radii.card,
              paddingVertical: 14,
              paddingHorizontal: 16,
            }}
          >
            <SurfaceToneContext.Provider value="ink">
              <View
                style={{
                  backgroundColor: colors.ink,
                  borderRadius: radii.slot,
                  paddingHorizontal: 6,
                  paddingVertical: 2,
                }}
              >
                <Text size="eyebrow" mono>
                  {KEEPER_CODE}
                </Text>
              </View>
            </SurfaceToneContext.Provider>
            <Text size="meta" tone="muted" style={{ flex: 1 }}>
              Keeper seats are limited to two a Game, one for each side.
            </Text>
          </View>
        ) : (
          <View style={{ gap: 10 }}>
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
          </View>
        )}
        <View style={{ gap: 10 }}>
          <SectionLabel label="Your level" />
          {state.hasFootballRating ? (
            <LevelAlreadySet sport="football" />
          ) : (
            <>
              <View accessibilityRole="radiogroup" style={{ gap: 8 }}>
                {FOOTBALL_SELF_PLACEMENT_CHOICES.map((choice) => (
                  <ChoiceCard
                    key={choice.value}
                    role="radio"
                    variant="card"
                    selected={answers.footballPlacement === choice.value}
                    title={choice.label}
                    description={choice.description}
                    onPress={() => update({ footballPlacement: choice.value })}
                  />
                ))}
              </View>
              <Text size="eyebrow" tone="muted">
                Self-placed for now. It balances teams until football results
                are rated.
              </Text>
            </>
          )}
        </View>
      </AuthScreen>
    );
  }

  return null;
}
