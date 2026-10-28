import { useAuth, useUser } from "@clerk/expo";
import { colors, radii } from "@repo/design-tokens";
import {
  DEFAULT_FOOTBALL_POSITION,
  FOOTBALL_POSITION_CHOICES,
  KEEPER_CODE,
  isFootballPosition,
  isFootballRole,
  type FootballPosition,
  type FootballRole,
} from "@repo/domain/football-lineup";
import {
  DEFAULT_FOOTBALL_SELF_PLACEMENT,
  FOOTBALL_SELF_PLACEMENT_CHOICES,
} from "@repo/domain/football-self-placement";
import {
  isPreferredPosition,
  type PreferredPosition,
} from "@repo/domain/preferred-position";
import { isSport, type Sport } from "@repo/domain/sport";
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
import {
  completeOnboardingInput,
  onboardingSummary,
  type OnboardingAnswers,
  type PadelLevelChoice,
} from "./onboarding-answers";
import { RowChoices, TileChoices } from "./onboarding-choices";
import {
  PROVISIONING_POLL_MS,
  PROVISIONING_TIMEOUT_MS,
  adjacentQuestion,
  findGamesLabel,
  onboardingPhaseFromState,
  onboardingQuestions,
  sportsContinueLabel,
  type OnboardingQuestion,
} from "./onboarding-step";

type OnboardingState = RouterOutputs["users"]["onboardingState"];

const PADEL_BANDS: {
  value: PadelLevelChoice;
  mark: string;
  name: string;
  detail: string;
}[] = [
  {
    value: "D",
    mark: "D",
    name: "New to padel",
    detail: "First months, learning the walls.",
  },
  {
    value: "D+",
    mark: "D+",
    name: "Finding rhythm",
    detail: "Serves in, short rallies hold.",
  },
  {
    value: "C",
    mark: "C",
    name: "Consistent",
    detail: "Lobs and volleys on purpose.",
  },
  {
    value: "C+",
    mark: "C+",
    name: "Club regular",
    detail: "Plays weekly, uses the glass.",
  },
  {
    value: "B",
    mark: "B",
    name: "Advanced",
    detail: "Bandeja and vibora in play.",
  },
  {
    value: "B+",
    mark: "B+",
    name: "High advanced",
    detail: "Wins the net, reads lobs early.",
  },
  {
    value: "A",
    mark: "A",
    name: "Competitive",
    detail: "Tournament level, few errors.",
  },
];

const PADEL_SIDES: {
  value: PreferredPosition;
  name: string;
  detail: string;
}[] = [
  { value: "left", name: "Left", detail: "backhand side" },
  { value: "right", name: "Right", detail: "forehand side" },
  { value: "either", name: "Either", detail: "wherever open" },
];

const FOOTBALL_ROLE_CHOICES: {
  value: FootballRole;
  name: string;
  detail: string;
}[] = [
  { value: "outfield", name: "Player", detail: "outfield" },
  { value: "keeper", name: "Keeper", detail: "two per game" },
];

const SPORT_CARDS: Record<
  Sport,
  { title: string; description: string; meta: string }
> = {
  padel: {
    title: "Padel",
    description:
      "Doubles, 90 minute slots. A letter Level that follows your results.",
    meta: "Level D to A, side",
  },
  football: {
    title: "Football",
    description: "Five or seven a side. Pool first, teams set before kick-off.",
    meta: "Level, role, position",
  },
};

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

function initialAnswers(state: OnboardingState): OnboardingAnswers {
  const sports = (state.sports ?? []).filter(isSport);
  return {
    picked: {
      padel: sports.includes("padel"),
      football: sports.includes("football"),
    },
    padelSide: isPreferredPosition(state.preferredPosition)
      ? state.preferredPosition
      : "either",
    padelLevel: "",
    footballRole: isFootballRole(state.preferredFootballRole)
      ? state.preferredFootballRole
      : "outfield",
    footballPosition: isFootballPosition(state.preferredFootballPosition)
      ? state.preferredFootballPosition
      : DEFAULT_FOOTBALL_POSITION,
    footballPlacement: DEFAULT_FOOTBALL_SELF_PLACEMENT,
  };
}

function Questions({ state }: { state: OnboardingState }) {
  const utils = api.useUtils();
  const { user } = useUser();
  const [question, setQuestion] = useState<OnboardingQuestion>("sports");
  const [answers, setAnswers] = useState(() => initialAnswers(state));
  const complete = api.users.completeOnboarding.useMutation({
    onSuccess: () => utils.users.onboardingState.invalidate(),
  });

  const questions = onboardingQuestions(answers.picked);
  const progress = {
    step: questions.indexOf(question) + 1,
    total: questions.length,
  };
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
          {(["padel", "football"] as const).map((sport) => (
            <ChoiceCard
              key={sport}
              role="checkbox"
              selected={answers.picked[sport]}
              title={SPORT_CARDS[sport].title}
              description={SPORT_CARDS[sport].description}
              onPress={() => togglePicked(sport)}
            >
              <Text size="eyebrow" tone="muted" mono uppercase>
                {SPORT_CARDS[sport].meta}
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
                  Not sure, start at C and leave side open
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
            choices={PADEL_BANDS}
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
            choices={PADEL_SIDES}
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
          onPress={() => complete.mutate(completeOnboardingInput(answers))}
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
