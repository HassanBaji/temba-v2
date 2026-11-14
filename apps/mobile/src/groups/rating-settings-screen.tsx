import { radii, sizes } from "@repo/design-tokens";
import { groupDisplayName } from "@repo/domain/group-join";
import {
  ratingSettingsChanged,
  ratingSettingsScreen,
  type GroupRatingSettings,
  type PerformanceRatingMode,
  type RatingSettingsScreen as RatingSettingsView,
} from "@repo/domain/group-rating-settings";
import { useLocalSearchParams, useRouter } from "expo-router";
import { CircleOff, UserCog, Users } from "lucide-react-native";
import { useState } from "react";
import { Pressable, View } from "react-native";

import { useLocale, useMessages } from "../i18n/locale-provider";
import { Button } from "../primitives/button";
import { Hairline } from "../primitives/hairline";
import { hairline } from "../primitives/hairline-width";
import { Screen } from "../primitives/screen";
import { ScreenHeader } from "../primitives/screen-header";
import { Skeleton } from "../primitives/skeleton";
import { Surface } from "../primitives/surface";
import { Text } from "../primitives/text";
import { useToast } from "../primitives/toast";
import { useColors } from "../theme/theme-provider";
import { api } from "../trpc/react";
import { RadioRow, ToggleCard } from "./group-form-parts";
import { groupPath } from "./groups-model";
import { Notice } from "./notice";

const MODE_ICONS = {
  off: CircleOff,
  organizer: UserCog,
  everyone: Users,
} as const;

const BAR_HEIGHT = 10;
const WEIGHT_HEIGHT = 44;

function SectionTitle({ title, aside }: { title: string; aside?: string }) {
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "baseline",
        justifyContent: "space-between",
        gap: 12,
      }}
    >
      <Text size="title" weight="semibold" accessibilityRole="header">
        {title}
      </Text>
      {aside ? (
        <Text size="meta" tone="muted">
          {aside}
        </Text>
      ) : null}
    </View>
  );
}

function ModeIcon({ mode }: { mode: PerformanceRatingMode }) {
  const colors = useColors();
  const Icon = MODE_ICONS[mode];
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      aria-hidden
      style={{
        width: sizes.touchTarget - 8,
        height: sizes.touchTarget - 8,
        alignItems: "center",
        justifyContent: "center",
        borderRadius: radii.md,
        borderWidth: hairline,
        borderColor: colors.rule,
      }}
    >
      <Icon size={sizes.iconRow} color={colors.ink} />
    </View>
  );
}

function WeightBlock({
  weight,
  onSelect,
}: {
  weight: NonNullable<RatingSettingsView["weight"]>;
  onSelect: (weightPercent: number) => void;
}) {
  const colors = useColors();
  return (
    <View
      style={{
        gap: 12,
        paddingHorizontal: 18,
        paddingVertical: 16,
        borderRadius: radii.surface,
        borderWidth: hairline,
        borderColor: colors.rule,
        backgroundColor: colors.wash,
      }}
    >
      <View accessible accessibilityLabel={weight.spoken} style={{ gap: 8 }}>
        <View
          style={{
            flexDirection: "row",
            height: BAR_HEIGHT,
            borderRadius: BAR_HEIGHT / 2,
            overflow: "hidden",
            gap: 2,
          }}
        >
          <View
            style={{ flex: weight.resultFraction, backgroundColor: colors.ink }}
          />
          <View
            style={{
              flex: 1 - weight.resultFraction,
              backgroundColor: colors.muted,
            }}
          />
        </View>
        <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
          <Text size="eyebrow">
            <Text size="body" weight="bold" width="expanded">
              {weight.resultPercent}
            </Text>{" "}
            {weight.resultShare}
          </Text>
          <Text size="eyebrow">
            <Text size="body" weight="bold" width="expanded">
              {weight.performancePercent}
            </Text>{" "}
            {weight.performanceShare}
          </Text>
        </View>
      </View>
      <View
        accessibilityRole="radiogroup"
        accessibilityLabel={weight.title}
        style={{ flexDirection: "row", gap: 6 }}
      >
        {weight.options.map((option) => (
          <Pressable
            key={option.weightPercent}
            accessibilityRole="radio"
            accessibilityLabel={option.label}
            accessibilityState={{ checked: option.selected }}
            onPress={() => onSelect(option.weightPercent)}
            style={({ pressed }) => ({
              flex: 1,
              height: WEIGHT_HEIGHT,
              alignItems: "center",
              justifyContent: "center",
              borderRadius: radii.md,
              borderWidth: hairline,
              borderColor: option.selected ? colors.ink : colors.rule,
              backgroundColor: option.selected
                ? colors.control
                : pressed
                  ? colors.wash
                  : colors.paper,
            })}
          >
            <Text
              weight="semibold"
              style={{ color: option.selected ? colors.onControl : colors.ink }}
            >
              {option.label}
            </Text>
          </Pressable>
        ))}
      </View>
      <Text size="eyebrow" tone="muted">
        {weight.note}
      </Text>
    </View>
  );
}

function ManualChanges({
  section,
}: {
  section: RatingSettingsView["manualChanges"];
}) {
  return (
    <View style={{ gap: 10 }}>
      <SectionTitle title={section.title} />
      <Surface padded={false} radius="card" style={{ overflow: "hidden" }}>
        {section.rows.map((row, index) => (
          <View key={row.label}>
            {index > 0 ? <Hairline /> : null}
            <View
              accessible
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                gap: 14,
                paddingHorizontal: 18,
                paddingVertical: 14,
              }}
            >
              <Text size="meta" tone="muted">
                {row.label}
              </Text>
              <Text size="meta" style={{ flexShrink: 1, textAlign: "right" }}>
                {row.value}
              </Text>
            </View>
          </View>
        ))}
      </Surface>
    </View>
  );
}

function RatingSettingsForm({
  groupId,
  initial,
  header,
}: {
  groupId: string;
  initial: GroupRatingSettings;
  header: React.ReactNode;
}) {
  const m = useMessages();
  const locale = useLocale();
  const router = useRouter();
  const toast = useToast();
  const utils = api.useUtils();
  const [draft, setDraft] = useState<GroupRatingSettings>(initial);
  const screen = ratingSettingsScreen(draft, locale);
  const dirty = ratingSettingsChanged(initial, draft);

  const save = api.groups.updateRatingSettings.useMutation({
    onSuccess: async () => {
      toast.show(m.rating.settings.savedToast);
      await Promise.all([
        utils.groups.byId.invalidate({ id: groupId }),
        utils.groups.ratingSettings.invalidate({ groupId }),
      ]);
      if (router.canGoBack()) {
        router.back();
      } else {
        router.replace(groupPath(groupId));
      }
    },
    onError: (error) => toast.show(error.message),
  });

  return (
    <Screen
      footer={
        <View style={{ flex: 1 }}>
          <Button
            label={m.rating.settings.save}
            size="lg"
            pending={save.isPending}
            disabled={!dirty || save.isPending}
            onPress={() => save.mutate({ groupId, ...draft })}
          />
        </View>
      }
    >
      {header}
      <View style={{ gap: 10 }}>
        <SectionTitle
          title={screen.afterEachGame}
          aside={screen.performanceRatings}
        />
        <Surface
          accessibilityRole="radiogroup"
          padded={false}
          radius="card"
          style={{ overflow: "hidden" }}
        >
          {screen.modes.map((mode, index) => (
            <View key={mode.mode}>
              {index > 0 ? <Hairline /> : null}
              <RadioRow
                title={mode.title}
                description={mode.description}
                selected={mode.selected}
                leading={<ModeIcon mode={mode.mode} />}
                onPress={() => setDraft({ ...draft, mode: mode.mode })}
              />
            </View>
          ))}
        </Surface>
      </View>
      {screen.weight ? (
        <View style={{ gap: 10 }}>
          <SectionTitle
            title={screen.weight.title}
            aside={screen.weight.name}
          />
          <WeightBlock
            weight={screen.weight}
            onSelect={(weightPercent) => setDraft({ ...draft, weightPercent })}
          />
        </View>
      ) : null}
      {screen.fairness ? (
        <View style={{ gap: 10 }}>
          <SectionTitle title={screen.fairness.title} />
          <ToggleCard
            title={screen.fairness.countsDouble}
            help={screen.fairness.countsDoubleHint}
            value={screen.fairness.countsDoubleOn}
            onChange={(organizerCountsDouble) =>
              setDraft({ ...draft, organizerCountsDouble })
            }
          />
          <Text size="eyebrow" tone="muted">
            {screen.fairness.alwaysOn}
          </Text>
        </View>
      ) : null}
      <ManualChanges section={screen.manualChanges} />
      <Text size="eyebrow" tone="muted">
        {screen.footnote}
      </Text>
    </Screen>
  );
}

/**
 * Rating settings of a tier Group: who rates after a game, how
 * much it counts and whether the organizer counts double. Only Organizers
 * change them; a member who opens the screen reads how ratings work here.
 */
export function RatingSettingsScreen({ groupId }: { groupId: string }) {
  const m = useMessages();
  const locale = useLocale();
  const query = api.groups.ratingSettings.useQuery({ groupId });
  const header = (
    <ScreenHeader
      nav="back"
      fallback={groupPath(groupId)}
      title={m.rating.settings.title}
    >
      {query.data ? (
        <Text size="meta" tone="muted" numberOfLines={1}>
          {groupDisplayName(query.data.group.name, locale)}
        </Text>
      ) : null}
    </ScreenHeader>
  );

  if (!query.data) {
    return (
      <Screen>
        {header}
        {query.error ? (
          <Notice
            alert
            title={m.rating.settings.loadFailed}
            description={query.error.message}
            onRetry={() => void query.refetch()}
          />
        ) : (
          <>
            <Skeleton height={220} radius={16} />
            <Skeleton height={160} radius={16} />
          </>
        )}
      </Screen>
    );
  }

  if (!query.data.settings) {
    return (
      <Screen>
        {header}
        <Notice
          title={query.data.line}
          description={m.rating.settings.readOnly}
        />
      </Screen>
    );
  }

  return (
    <RatingSettingsForm
      groupId={groupId}
      initial={query.data.settings}
      header={header}
    />
  );
}

export function RatingSettingsRoute() {
  const { groupId } = useLocalSearchParams<{ groupId: string }>();
  return <RatingSettingsScreen groupId={groupId} />;
}
