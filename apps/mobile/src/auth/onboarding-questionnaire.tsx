import { colors, radii } from "@repo/design-tokens";
import {
  footballPositionChoices,
  KEEPER_CODE,
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
import { useState } from "react";
import { Pressable, View } from "react-native";

import { useLocale, useMessages } from "../i18n/locale-provider";
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

function LevelAlreadySet(props: { sport: Sport }) {
  const m = useMessages();
  return (
    <Text size="meta" tone="muted">
      {m.mobileHome.questionnaire.levelAlreadySet[props.sport]}
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
  const m = useMessages();
  const locale = useLocale();
  const q = m.mobileHome.questionnaire;
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

  const progress = sportsTaskMeta(
    onboardingProgress(answers.picked, question),
    locale,
  );
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
        title={q.sports.title}
        description={q.sports.description}
        action={
          <Button
            label={sportsContinueLabel(answers.picked, locale)}
            size="lg"
            disabled={nonePicked}
            onPress={() => next()}
          />
        }
      >
        <View style={{ gap: 12 }}>
          {sportChoices(locale).map((choice) => (
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
          {q.sports.note}
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
        eyebrow={m.common.padel}
        title={q.padel.title}
        description={q.padel.description}
        action={
          <>
            <Button
              label={
                levelSet || answers.padelLevel
                  ? lastQuestion
                    ? q.saveSports
                    : m.common.continue
                  : q.padel.pickLevel
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
                  {padelNotSureLabel(locale)}
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
            label={q.padel.levelLabel}
            choices={padelLevelChoices(locale).map((choice) => ({
              ...choice,
              mark: choice.value,
            }))}
            value={answers.padelLevel}
            onSelect={(padelLevel) => update({ padelLevel })}
          />
        )}
        <View style={{ gap: 10 }}>
          <SectionLabel label={q.padel.preferredSide} hint={q.preferenceHint} />
          <TileChoices
            label={q.padel.preferredSide}
            choices={padelSideChoices(locale)}
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
        eyebrow={m.common.football}
        title={q.football.title}
        description={q.football.description}
        action={
          <Button
            label={lastQuestion ? q.saveSports : m.common.continue}
            size="lg"
            pending={saving}
            onPress={() => next()}
          />
        }
      >
        <FormErrorSummary message={split?.globalMessage} />
        <View style={{ gap: 10 }}>
          <SectionLabel label={q.football.usuallyJoinAs} />
          <TileChoices
            label={q.football.roleLabel}
            choices={footballRoleChoices(locale)}
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
              {q.football.keeperSeats}
            </Text>
          </View>
        ) : (
          <View style={{ gap: 10 }}>
            <SectionLabel
              label={q.football.preferredPosition}
              hint={q.preferenceHint}
            />
            <TileChoices<FootballPosition>
              label={q.football.positionLabel}
              choices={footballPositionChoices(locale).map((choice) => ({
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
          <SectionLabel label={q.football.yourLevel} />
          {state.hasFootballRating ? (
            <LevelAlreadySet sport="football" />
          ) : (
            <>
              <View accessibilityRole="radiogroup" style={{ gap: 8 }}>
                {footballSelfPlacementChoices(locale).map((choice) => (
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
                {q.football.selfPlaced}
              </Text>
            </>
          )}
        </View>
      </AuthScreen>
    );
  }

  return null;
}
