import { sizes, spacing } from "@repo/design-tokens";
import {
  DEFAULT_FOOTBALL_POSITION,
  FOOTBALL_ROLES,
  footballPositionChoices,
  isFootballPosition,
  isFootballRole,
  type FootballPosition,
  type FootballRole,
} from "@repo/domain/football-lineup";
import {
  DEFAULT_FOOTBALL_SELF_PLACEMENT,
  footballSelfPlacementChoices,
  selfDeclareChoiceFromFootballPlacement,
  type FootballSelfPlacement,
} from "@repo/domain/football-self-placement";
import { isPreferredPosition } from "@repo/domain/preferred-position";
import { SPORTS, type Sport } from "@repo/domain/sport";
import { useState } from "react";
import { Pressable, View } from "react-native";

import { TileChoices } from "../auth/onboarding-choices";
import { FormErrorSummary } from "../auth/form-error-summary";
import { Block } from "../home/slot-block";
import { useLocale, useMessages } from "../i18n/locale-provider";
import { splitTrpcFormError } from "../lib/form-error";
import { slotOf } from "../lib/slot-of";
import { Button } from "../primitives/button";
import { ChoiceCard } from "../primitives/choice-card";
import { Hairline } from "../primitives/hairline";
import { Screen } from "../primitives/screen";
import { ScreenHeader, useLeaveScreen } from "../primitives/screen-header";
import { Surface } from "../primitives/surface";
import { Text } from "../primitives/text";
import { useToast } from "../primitives/toast";
import { footballLevelWord } from "../profile/profile-model";
import { useColors } from "../theme/theme-provider";
import { api, type RouterOutputs } from "../trpc/react";
import { footballSavePlan } from "./settings-model";

type Details = RouterOutputs["users"]["profileDetails"];
type OnboardingState = RouterOutputs["users"]["onboardingState"];

const ROLE_COPY_KEY = { outfield: "outfield", keeper: "goalkeeper" } as const;

function Label({ title, hint }: { title: string; hint?: string }) {
  return (
    <View
      style={{
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "baseline",
        gap: 12,
      }}
    >
      <Text size="meta" tone="muted" accessibilityRole="header">
        {title}
      </Text>
      {hint ? (
        <Text size="eyebrow" tone="muted">
          {hint}
        </Text>
      ) : null}
    </View>
  );
}

function FootballProfileForm({
  details,
  state,
}: {
  details: Details;
  state: OnboardingState;
}) {
  const m = useMessages();
  const colors = useColors();
  const f = m.you.footballProfile;
  const locale = useLocale();
  const toast = useToast();
  const utils = api.useUtils();
  const leave = useLeaveScreen("/profile/settings");
  const setUp = details.sports.includes("football");
  const plan = footballSavePlan({
    setUp,
    onboardingComplete: state.onboardingCompletedAt != null,
    sports: details.sports,
    hasPadelRating: state.hasRating,
    hasFootballRating: state.hasFootballRating,
  });

  const football = api.users.footballProfile.useQuery(
    { userId: details.id },
    { enabled: state.hasFootballRating },
  );
  const [role, setRole] = useState<FootballRole>(
    isFootballRole(details.preferredFootballRole)
      ? details.preferredFootballRole
      : "outfield",
  );
  const [position, setPosition] = useState<FootballPosition>(
    isFootballPosition(details.preferredFootballPosition)
      ? details.preferredFootballPosition
      : DEFAULT_FOOTBALL_POSITION,
  );
  const [placement, setPlacement] = useState<FootballSelfPlacement>(
    DEFAULT_FOOTBALL_SELF_PLACEMENT,
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const completeOnboarding = api.users.completeOnboarding.useMutation();
  const setPreferences = api.users.setFootballPreferences.useMutation();
  const selfDeclare = api.ratings.selfDeclare.useMutation();
  const setSports = api.users.setSports.useMutation();

  const refresh = () =>
    Promise.all([
      utils.users.profileDetails.invalidate(),
      utils.users.onboardingState.invalidate(),
      utils.users.footballProfile.invalidate(),
      utils.users.home.invalidate(),
    ]);

  async function run(work: () => Promise<unknown>, done: string) {
    if (saving) {
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await work();
      await refresh();
      toast.show(done);
      leave();
    } catch (err) {
      setError(
        splitTrpcFormError(
          err instanceof Error ? err : new Error(m.common.somethingWentWrong),
        ).globalMessage ?? m.common.somethingWentWrong,
      );
      setSaving(false);
    }
  }

  function save() {
    const sports: Sport[] = SPORTS.filter(
      (sport) => details.sports.includes(sport) || sport === "football",
    );
    const footballChoice = selfDeclareChoiceFromFootballPlacement(placement);
    return run(
      async () => {
        if (plan.kind === "onboarding") {
          await completeOnboarding.mutateAsync({
            sports,
            padel: sports.includes("padel")
              ? {
                  preferredPosition: isPreferredPosition(
                    details.preferredPosition,
                  )
                    ? details.preferredPosition
                    : "either",
                  choice: "unknown",
                }
              : undefined,
            football: {
              role,
              position: role === "keeper" ? null : position,
              choice: footballChoice,
            },
          });
          return;
        }
        await setPreferences.mutateAsync({
          role,
          position: role === "keeper" ? null : position,
        });
        if (plan.declare) {
          await selfDeclare.mutateAsync({
            sport: "football",
            choice: footballChoice,
          });
        }
        if (plan.addSport) {
          await setSports.mutateAsync({ sports });
        }
      },
      setUp ? f.save : m.mobileYou.sportAdded(m.common.football),
    );
  }

  function remove() {
    return run(
      () =>
        setSports.mutateAsync({
          sports: details.sports.filter((sport) => sport !== "football"),
        }),
      m.mobileYou.sportRemoved(m.common.football),
    );
  }

  const rating = football.data?.rating ?? null;

  return (
    <>
      <FormErrorSummary message={error} />
      <View style={{ gap: 10 }}>
        <Label title={f.joinAs} />
        <TileChoices<FootballRole>
          label={f.joinAs}
          choices={FOOTBALL_ROLES.map((value) => ({
            value,
            name: f.roles[ROLE_COPY_KEY[value]],
            detail: f.roleSub[ROLE_COPY_KEY[value]],
          }))}
          value={role}
          disabled={saving}
          onSelect={setRole}
        />
      </View>
      {role !== "keeper" ? (
        <View style={{ gap: 10 }}>
          <Label title={f.position} />
          <TileChoices<FootballPosition>
            label={f.position}
            choices={footballPositionChoices(locale).map((choice) => ({
              value: choice.value,
              name: choice.code,
              detail: choice.label.toLowerCase(),
              mono: true,
            }))}
            value={position}
            disabled={saving}
            onSelect={setPosition}
          />
        </View>
      ) : null}
      <View style={{ gap: 10 }}>
        <Label
          title={f.level}
          hint={state.hasFootballRating ? undefined : f.selfPlaced}
        />
        {state.hasFootballRating ? (
          <Surface radius="card" style={{ gap: 6 }}>
            <Text size="h2" weight="bold">
              {rating
                ? footballLevelWord(rating.levelBand, locale)
                : m.you.hero.noLevel}
            </Text>
            <Text size="eyebrow" tone="muted">
              {f.levelLocked}
            </Text>
          </Surface>
        ) : (
          <View accessibilityRole="radiogroup" style={{ gap: 8 }}>
            {footballSelfPlacementChoices(locale).map((choice) => (
              <ChoiceCard
                key={choice.value}
                role="radio"
                variant="card"
                selected={placement === choice.value}
                title={choice.label}
                description={choice.description}
                disabled={saving}
                onPress={() => setPlacement(choice.value)}
              />
            ))}
          </View>
        )}
      </View>
      <View style={{ gap: spacing.compact / 2 }}>
        <Button
          label={setUp ? f.save : f.add}
          size="lg"
          pending={saving}
          onPress={() => void save()}
        />
        {setUp ? null : (
          <Text size="eyebrow" tone="muted" style={{ textAlign: "center" }}>
            {f.addNote}
          </Text>
        )}
      </View>
      {setUp ? (
        <>
          <Hairline />
          <View style={{ gap: 6 }}>
            <Pressable
              accessibilityRole="button"
              disabled={saving}
              onPress={() => void remove()}
              style={{ minHeight: sizes.touchTarget, justifyContent: "center" }}
            >
              <Text weight="semibold" style={{ color: colors.danger }}>
                {f.remove}
              </Text>
            </Pressable>
            <Text size="eyebrow" tone="muted">
              {f.removeNote}
            </Text>
          </View>
        </>
      ) : null}
    </>
  );
}

export function FootballProfileScreen() {
  const m = useMessages();
  const details = api.users.profileDetails.useQuery();
  const state = api.users.onboardingState.useQuery();
  const both = slotOf({
    data:
      details.data && state.data
        ? { details: details.data, state: state.data }
        : undefined,
    error: details.error ?? state.error,
    isLoading: details.isLoading || state.isLoading,
  });
  return (
    <Screen>
      <ScreenHeader
        nav="back"
        fallback="/profile/settings"
        title={m.you.footballProfile.title}
      />
      <Block
        slot={both}
        title={m.you.footballProfile.title}
        skeletonHeight={420}
        onRetry={() => {
          void details.refetch();
          void state.refetch();
        }}
      >
        {(data) => (
          <FootballProfileForm details={data.details} state={data.state} />
        )}
      </Block>
    </Screen>
  );
}
