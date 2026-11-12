import { radii, sizes, spacing } from "@repo/design-tokens";
import {
  ratingsScreenView,
  type RatingsLevelView,
  type RatingsScreenView,
  type RatingsTierRow,
} from "@repo/domain/ratings-screen";
import { isSport, type Sport } from "@repo/domain/sport";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { Pressable, View } from "react-native";
import Svg, { Circle, Path } from "react-native-svg";

import { groupPath } from "../groups/groups-model";
import { Notice } from "../groups/notice";
import { TierCell } from "../groups/tier-fish";
import { isLayoutRtl } from "../i18n/rtl";
import { useLocale, useMessages } from "../i18n/locale-provider";
import { Segmented, SettingsRow } from "../profile-settings/settings-rows";
import { Hairline } from "../primitives/hairline";
import { Hatch } from "../primitives/hatch";
import { Screen } from "../primitives/screen";
import { ScreenHeader } from "../primitives/screen-header";
import { Skeleton } from "../primitives/skeleton";
import { Surface } from "../primitives/surface";
import { useTonePalette } from "../primitives/surface-context";
import { Text } from "../primitives/text";
import { api } from "../trpc/react";
import { LevelRing } from "./level-ring";
import { SectionHead } from "./profile-parts";
import { curvePoints, pathFor } from "./profile-model";
import { InYourGroups, SECTION_GAP } from "./profile-sections";

const SPARK_WIDTH = 64;
const SPARK_HEIGHT = 22;
const REFETCH_ON_FOREGROUND = { refetchOnWindowFocus: "always" as const };

export function ratingsPath(sport: Sport) {
  return `/profile/ratings?sport=${sport}`;
}

/** The way from the You page hero to the Ratings screen. */
export function RatingsLink({
  sport,
  onOpen,
}: {
  sport: Sport;
  onOpen: () => void;
}) {
  const m = useMessages();
  const copy = m.rating.screen.open;
  return (
    <Surface padded={false} radius="card" style={{ overflow: "hidden" }}>
      <SettingsRow
        title={copy.title}
        sub={sport === "football" ? copy.football : copy.padel}
        onPress={onOpen}
      />
    </Surface>
  );
}

function Sparkline({ values }: { values: number[] }) {
  const palette = useTonePalette();
  const points = curvePoints(values, SPARK_WIDTH, SPARK_HEIGHT, {
    pad: 4,
    mirrored: isLayoutRtl(),
  });
  const last = points[points.length - 1];
  if (points.length < 2 || !last) {
    return null;
  }
  return (
    <Svg width={SPARK_WIDTH} height={SPARK_HEIGHT}>
      <Path
        d={pathFor(points)}
        fill="none"
        stroke={palette.foreground}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Circle cx={last.x} cy={last.y} r={2.8} fill={palette.foreground} />
    </Svg>
  );
}

function SectionNote({ children }: { children: string }) {
  return (
    <Text size="eyebrow" tone="muted">
      {children}
    </Text>
  );
}

/** The one ink Surface on the screen: ring, band, number, change, next band. */
function LevelSection({ view }: { view: RatingsLevelView }) {
  if (view.kind === "none") {
    return (
      <View style={{ gap: 12 }}>
        <SectionHead title={view.title} />
        <Surface tone="ink" style={{ gap: 6 }}>
          <Text size="h2" weight="bold">
            {view.message}
          </Text>
          <Text size="meta" tone="muted">
            {view.note}
          </Text>
        </Surface>
      </View>
    );
  }

  return (
    <View style={{ gap: 12 }}>
      <SectionHead title={view.title} meta={view.status} />
      <Surface tone="ink" padded={false} style={{ overflow: "hidden" }}>
        <View
          accessible
          accessibilityLabel={view.spoken}
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 20,
            padding: spacing.surface,
          }}
        >
          <LevelRing percent={view.ringPercent} hatched={view.ringHatched}>
            <Text size="h1Lg" width="expanded" weight="bold" ltr>
              {view.band}
            </Text>
          </LevelRing>
          <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
            <Text size="eyebrow" tone="muted">
              {view.numberLabel}
            </Text>
            <Text size="display" width="expanded" weight="bold">
              {view.number}
            </Text>
            {view.change ? (
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 7,
                  marginTop: 8,
                }}
              >
                <Sparkline values={view.change.points} />
                <Text weight="bold" width="expanded" ltr>
                  {view.change.delta}
                </Text>
                <Text size="eyebrow" tone="muted">
                  {view.change.caption}
                </Text>
              </View>
            ) : null}
          </View>
        </View>
        <Hairline />
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "baseline",
            gap: 12,
            paddingHorizontal: spacing.surface,
            paddingVertical: 12,
          }}
        >
          <Text size="meta" tone="muted">
            {view.footer.label}
          </Text>
          {view.footer.value ? (
            <Text size="meta" tone="muted">
              <Text weight="bold" width="expanded" ltr>
                {view.footer.value}
              </Text>
              {view.footer.detail ?? ""}
            </Text>
          ) : null}
        </View>
      </Surface>
      <SectionNote>{view.note}</SectionNote>
    </View>
  );
}

function TierItem({
  row,
  onPress,
}: {
  row: RatingsTierRow;
  onPress: () => void;
}) {
  const palette = useTonePalette();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={row.spoken}
      onPress={onPress}
      style={({ pressed }) => ({
        minHeight: sizes.touchTarget,
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        paddingHorizontal: 16,
        paddingVertical: 13,
        backgroundColor: pressed ? palette.wash : palette.background,
      })}
    >
      <View style={{ width: 44, alignItems: "center" }}>
        <TierCell cell={row.cell} />
      </View>
      <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
        <Text weight="semibold" numberOfLines={1}>
          {row.name}
        </Text>
        <Text size="eyebrow" tone="muted" numberOfLines={1}>
          {row.caption}
        </Text>
      </View>
      {row.points ? (
        <Text weight="bold" width="expanded" ltr>
          {row.points}
        </Text>
      ) : null}
    </Pressable>
  );
}

function TierSection({
  tier,
  onOpenGroup,
}: {
  tier: NonNullable<RatingsScreenView["tier"]>;
  onOpenGroup: (groupId: string) => void;
}) {
  return (
    <View style={{ gap: 12 }}>
      <SectionHead title={tier.title} meta={tier.meta} />
      <Surface padded={false} radius="card" style={{ overflow: "hidden" }}>
        {tier.rows.map((row, index) => (
          <View key={row.groupId}>
            {index > 0 ? <Hairline /> : null}
            <TierItem row={row} onPress={() => onOpenGroup(row.groupId)} />
          </View>
        ))}
      </Surface>
      <SectionNote>{tier.note}</SectionNote>
    </View>
  );
}

/** Reserved (ADR-0065): hatched, "not yet", and never a number. */
function OfficialRankSection({
  official,
}: {
  official: RatingsScreenView["official"];
}) {
  return (
    <View style={{ gap: 12 }}>
      <SectionHead title={official.title} />
      <View
        accessible
        accessibilityLabel={official.message}
        style={{
          minHeight: 72,
          borderRadius: radii.card,
          overflow: "hidden",
          justifyContent: "center",
          paddingHorizontal: 16,
          paddingVertical: 16,
        }}
      >
        <Hatch radius={radii.card} />
        <Text size="meta" weight="semibold">
          {official.message}
        </Text>
      </View>
      <SectionNote>{official.note}</SectionNote>
    </View>
  );
}

function RatingsBody({
  view,
  onOpenGroup,
}: {
  view: RatingsScreenView;
  onOpenGroup: (groupId: string) => void;
}) {
  return (
    <View style={{ gap: SECTION_GAP }}>
      {view.order.map((section) => {
        if (section === "level") {
          return <LevelSection key={section} view={view.level} />;
        }
        if (section === "tier") {
          return view.tier ? (
            <TierSection
              key={section}
              tier={view.tier}
              onOpenGroup={onOpenGroup}
            />
          ) : null;
        }
        if (section === "groups") {
          return view.inYourGroups ? (
            <InYourGroups
              key={section}
              title={view.inYourGroups.title}
              meta={view.inYourGroups.meta}
              note={view.inYourGroups.note}
              rows={view.inYourGroups.rows}
              onOpenGroup={onOpenGroup}
            />
          ) : null;
        }
        return <OfficialRankSection key={section} official={view.official} />;
      })}
    </View>
  );
}

/**
 * Ratings (screens 1a and 1b): the Temba Level, a Group tier per tier Group
 * on football, "In your groups", and the reserved Official Rank slot.
 */
export function RatingsScreen({ initialSport }: { initialSport: Sport }) {
  const m = useMessages();
  const locale = useLocale();
  const router = useRouter();
  const [sport, setSport] = useState<Sport>(initialSport);
  const [refreshing, setRefreshing] = useState(false);

  const level = api.ratings.me.useQuery({ sport }, REFETCH_ON_FOREGROUND);
  const tiers = api.ratings.myGroupTiers.useQuery(undefined, {
    ...REFETCH_ON_FOREGROUND,
    enabled: sport === "football",
  });
  const standings = api.groups.myStandings.useQuery(
    { sport },
    REFETCH_ON_FOREGROUND,
  );
  const queries =
    sport === "football" ? [level, tiers, standings] : [level, standings];
  const failed = queries.find((query) => query.error);
  const ready =
    level.data && standings.data && (sport === "padel" || tiers.data);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all(queries.map((query) => query.refetch()));
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <Screen refreshing={refreshing} onRefresh={() => void onRefresh()}>
      <ScreenHeader
        nav="back"
        fallback="/profile"
        title={m.rating.screen.title}
      >
        <Segmented
          label={m.rating.screen.sport}
          options={[
            { value: "padel" as const, label: m.common.padel },
            { value: "football" as const, label: m.common.football },
          ]}
          value={sport}
          onSelect={setSport}
        />
      </ScreenHeader>
      {failed ? (
        <Notice
          alert
          title={m.rating.screen.loadFailed}
          description={failed.error?.message}
          onRetry={() => void onRefresh()}
        />
      ) : ready ? (
        <RatingsBody
          view={ratingsScreenView(
            {
              sport,
              level: level.data,
              tiers: tiers.data ?? [],
              standings: standings.data,
            },
            locale,
          )}
          onOpenGroup={(groupId) => router.push(groupPath(groupId))}
        />
      ) : (
        <View style={{ gap: SECTION_GAP }}>
          <Skeleton height={220} radius={16} />
          <Skeleton height={180} radius={16} />
        </View>
      )}
    </Screen>
  );
}

export function RatingsRoute() {
  const { sport } = useLocalSearchParams<{ sport?: string }>();
  return <RatingsScreen initialSport={isSport(sport) ? sport : "padel"} />;
}
