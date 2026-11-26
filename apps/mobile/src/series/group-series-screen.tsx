import { radii, sizes, spacing } from "@repo/design-tokens";
import { useRouter, useSegments } from "expo-router";
import { Plus } from "lucide-react-native";
import { useCallback, useState } from "react";
import { Pressable, View } from "react-native";

import { groupNewSeriesPath, groupPath } from "../groups/groups-model";
import { Notice } from "../groups/notice";
import { useLocale, useMessages } from "../i18n/locale-provider";
import { Button } from "../primitives/button";
import { hairline } from "../primitives/hairline-width";
import { Screen } from "../primitives/screen";
import { ScreenHeader } from "../primitives/screen-header";
import { Skeleton } from "../primitives/skeleton";
import { Surface } from "../primitives/surface";
import { useTonePalette } from "../primitives/surface-context";
import { Text } from "../primitives/text";
import { SectionHead } from "../profile/profile-parts";
import { useColors } from "../theme/theme-provider";
import { api } from "../trpc/react";
import { SeriesBadge } from "./series-badge";
import { seriesPath } from "./series-path";
import {
  groupSeriesScreenModel,
  type GroupSeriesRow,
  type GroupSeriesSection,
} from "./group-series-screen-model";

const ROW_GAP = 13;
const ENDED_LABEL_WIDTH = 56;

function Row({
  row,
  first,
  onOpen,
}: {
  row: GroupSeriesRow;
  first: boolean;
  onOpen: (seriesId: string) => void;
}) {
  const palette = useTonePalette();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={row.spoken}
      onPress={() => onOpen(row.id)}
      style={({ pressed }) => ({
        minHeight: sizes.touchTarget,
        flexDirection: "row",
        alignItems: "center",
        gap: ROW_GAP,
        paddingHorizontal: 16,
        paddingVertical: ROW_GAP,
        borderTopWidth: first ? 0 : hairline,
        borderColor: palette.rule,
        backgroundColor: pressed ? palette.wash : palette.background,
      })}
    >
      <SeriesBadge emblem={row.emblem} colour={row.colour} size="list" />
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text weight="semibold">{row.name}</Text>
        <Text size="eyebrow" tone="muted">
          {row.line}
        </Text>
      </View>
      {row.trailing?.kind === "next" ? (
        <View style={{ flexShrink: 0 }}>
          <Text size="eyebrow" tone="muted" style={{ textAlign: "right" }}>
            {row.trailing.label}
          </Text>
          <Text size="eyebrow" tone="muted" style={{ textAlign: "right" }}>
            {row.trailing.date}
          </Text>
        </View>
      ) : null}
      {row.trailing?.kind === "ended" ? (
        <Text
          size="eyebrow"
          tone="muted"
          style={{ maxWidth: ENDED_LABEL_WIDTH, textAlign: "right" }}
        >
          {row.trailing.label}
        </Text>
      ) : null}
    </Pressable>
  );
}

function SeriesCard({
  section,
  onOpen,
}: {
  section: GroupSeriesSection;
  onOpen: (seriesId: string) => void;
}) {
  return (
    <Surface padded={false} radius="card" style={{ overflow: "hidden" }}>
      {section.rows.map((row, index) => (
        <Row key={row.id} row={row} first={index === 0} onOpen={onOpen} />
      ))}
    </Surface>
  );
}

/**
 * The Group's Series (1a), opened from the Group's More menu (web
 * `/dashboard/groups/[id]/series`): running and ended Series, and New series
 * pinned at the bottom for a Group approver.
 */
export function GroupSeriesScreen({ groupId }: { groupId: string }) {
  const m = useMessages();
  const locale = useLocale();
  const colors = useColors();
  const router = useRouter();
  const segments = useSegments();
  const [refreshing, setRefreshing] = useState(false);
  const query = api.series.listForGroup.useQuery(
    { groupId },
    { refetchOnWindowFocus: "always" },
  );
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await query.refetch();
    } finally {
      setRefreshing(false);
    }
  }, [query]);

  const bar = m.series.tab.title;
  const fallback = groupPath(groupId);

  if (!query.data) {
    return (
      <Screen>
        <ScreenHeader nav="back" fallback={fallback} barTitle={bar} />
        {query.error ? (
          <Notice
            alert
            title={m.series.tab.loadError}
            description={query.error.message}
            onRetry={() => void query.refetch()}
          />
        ) : (
          <>
            <Skeleton height={26} width={120} radius={radii.sm} />
            <Skeleton height={150} radius={radii.card} />
          </>
        )}
      </Screen>
    );
  }

  const model = groupSeriesScreenModel(query.data, locale);
  const openSeries = (seriesId: string) =>
    router.push(seriesPath(segments, seriesId));
  const hasCards = model.running !== null || model.ended !== null;

  return (
    <Screen
      refreshing={refreshing}
      onRefresh={onRefresh}
      footer={
        model.canCreate ? (
          <View style={{ flex: 1 }}>
            <Button
              label={m.series.tab.newSeries}
              size="lg"
              icon={<Plus size={sizes.iconAction} color={colors.onControl} />}
              onPress={() => router.push(groupNewSeriesPath(groupId))}
            />
          </View>
        ) : undefined
      }
    >
      <ScreenHeader
        nav="back"
        fallback={fallback}
        barTitle={bar}
        title={model.groupName}
      >
        <Text tone="muted">{m.series.tab.note}</Text>
      </ScreenHeader>

      {model.empty ? <Text>{model.empty}</Text> : null}

      {hasCards ? (
        <View style={{ gap: 8 }}>
          <View style={{ gap: spacing.section }}>
            {model.running ? (
              <View style={{ gap: 10 }}>
                <SectionHead
                  title={m.series.tab.runningTitle}
                  meta={model.running.meta}
                />
                <SeriesCard section={model.running} onOpen={openSeries} />
              </View>
            ) : null}
            {model.ended ? (
              <View style={{ gap: 10 }}>
                <SectionHead
                  title={m.series.tab.ended}
                  meta={model.ended.meta}
                />
                <SeriesCard section={model.ended} onOpen={openSeries} />
              </View>
            ) : null}
          </View>
          {model.canCreate ? (
            <Text size="eyebrow" tone="muted">
              {m.series.tab.endHint}
            </Text>
          ) : null}
        </View>
      ) : null}
    </Screen>
  );
}
