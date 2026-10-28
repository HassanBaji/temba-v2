import { useAuth, useUser } from "@clerk/expo";
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
import { useEffect, useState } from "react";
import { Pressable, View } from "react-native";

import { splitTrpcFormError } from "../lib/form-error";
import { Avatar } from "../primitives/avatar";
import { Button } from "../primitives/button";
import { ChoiceCard } from "../primitives/choice-card";
import { hairline } from "../primitives/hairline-width";
import { Hairline } from "../primitives/hairline";
import { Skeleton } from "../primitives/skeleton";
import { SurfaceToneContext } from "../primitives/surface-context";
import { Text } from "../primitives/text";
import { api, type RouterOutputs } from "../trpc/react";
import { AuthLoading } from "./auth-loading";
import { AuthScreen } from "./auth-screen";
import { FormErrorSummary } from "./form-error-summary";
import { RowChoices, TileChoices } from "./onboarding-choices";
import {
  PROVISIONING_POLL_MS,
  PROVISIONING_TIMEOUT_MS,
  onboardingPhaseFromState,
} from "./onboarding-step";

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

function LevelAlreadySet(props: { sport: string }) {
  return (
    <Text size="meta" tone="muted">
      Your {props.sport} Level is already set, so this step only saves the rest.
    </Text>
  );
}

function Questions({ state }: { state: OnboardingState }) {
  const utils = api.useUtils();
  const { user } = useUser();
  const [question, setQuestion] = useState<OnboardingQuestion>("sports");
  const [answers, setAnswers] = useState(() => initialOnboardingAnswers(state));
  const complete = api.users.completeOnboarding.useMutation({
    onSuccess: () => utils.users.onboardingState.invalidate(),
  });

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
        progress={progress}
        title="What do you play?"
        description="Pick one or both. Each sport keeps its own Level and its own Games list."
        action={
          <Button
            label={sportsContinueLabel(answers.picked)}
            size="lg"
            disabled={nonePicked}
            onPress={() => go("next")}
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
        onBack={back}
        progress={progress}
        eyebrow="Padel"
        title="Where would you place yourself?"
        description="A starting point only. Rated matches confirm it."
        action={
          <>
            <Button
              label={
                levelSet || answers.padelLevel ? "Continue" : "Pick a Level"
              }
              size="lg"
              disabled={!levelSet && answers.padelLevel === ""}
              onPress={() => go("next")}
            />
            {levelSet ? null : (
              <Pressable
                accessibilityRole="button"
                hitSlop={8}
                onPress={() => {
                  update({ padelLevel: "unknown", padelSide: "either" });
                  go("next");
                }}
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
        {levelSet ? (
          <LevelAlreadySet sport="padel" />
        ) : (
          <RowChoices
            label="Padel Level"
            choices={PADEL_LEVEL_CHOICES.map((choice) => ({
              ...choice,
              mark: choice.value,
            }))}
            value={answers.padelLevel === "unknown" ? "" : answers.padelLevel}
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
        onBack={back}
        progress={progress}
        eyebrow="Football"
        title="How do you line up?"
        description="Organizers use this to balance teams. You can change it per Game."
        action={
          <Button label="Continue" size="lg" onPress={() => go("next")} />
        }
      >
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

  const split = complete.error ? splitTrpcFormError(complete.error) : null;
  const pending = complete.isPending || complete.isSuccess;
  const name = user?.fullName ?? user?.username ?? "You";
  const phone = user?.primaryPhoneNumber?.phoneNumber ?? null;
  const summary = onboardingSummary(answers);
  return (
    <AuthScreen
      onBack={pending ? undefined : back}
      progress={progress}
      title="You’re set."
      description="Here’s how organizers will see you. Your side and football role can change later; your Levels move with results."
      action={
        <Button
          label={findGamesLabel(answers.picked)}
          size="lg"
          pending={pending}
          onPress={() => complete.mutate(onboardingSubmission(answers))}
        />
      }
    >
      <FormErrorSummary message={split?.globalMessage} />
      <View style={{ gap: 10 }}>
        <SectionLabel label="Your profile so far" />
        <View
          style={{
            borderWidth: hairline,
            borderColor: colors.rule,
            borderRadius: radii.card,
            overflow: "hidden",
          }}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 14,
              paddingVertical: 14,
              paddingHorizontal: 18,
            }}
          >
            <Avatar name={name} uri={user?.imageUrl} size="lg" />
            <View style={{ flex: 1 }}>
              <Text weight="semibold" numberOfLines={1}>
                {name}
              </Text>
              {phone ? (
                <Text size="meta" tone="muted">
                  {phone}
                </Text>
              ) : null}
            </View>
          </View>
          {summary.map((row) => (
            <View key={row.sport}>
              <Hairline />
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: 12,
                  paddingVertical: 14,
                  paddingHorizontal: 18,
                }}
              >
                <Text weight="semibold">{row.sport}</Text>
                <Text
                  size="meta"
                  tone="muted"
                  style={{ flexShrink: 1, textAlign: "right" }}
                >
                  {row.line}
                </Text>
              </View>
            </View>
          ))}
        </View>
      </View>
    </AuthScreen>
  );
}

export function OnboardingQuestionnaire() {
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

  if (phase === "provisioning" && provisioningStalled) {
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

  if (phase === "provisioning" || !state.data) {
    return (
      <AuthScreen title="Setting up your account">
        <Text tone="muted" accessibilityLiveRegion="polite">
          Your Temba account is still being created. This only takes a moment
          after sign-up, and the questions open on their own.
        </Text>
        <Skeleton height={96} />
        {signOutButton}
      </AuthScreen>
    );
  }

  if (phase === "complete") {
    return <AuthLoading />;
  }

  return <Questions state={state.data} />;
}
