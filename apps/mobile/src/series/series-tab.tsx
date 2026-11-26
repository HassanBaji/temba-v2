import { radii, sizes, spacing } from "@repo/design-tokens";
import { useRouter, useSegments } from "expo-router";
import { Plus } from "lucide-react-native";
import { Pressable, View } from "react-native";

import { groupNewSeriesPath } from "../groups/groups-model";
import { Notice } from "../groups/notice";
import { useLocale, useMessages } from "../i18n/locale-provider";
import { Button } from "../primitives/button";
import { hairline } from "../primitives/hairline-width";
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
  seriesTabModel,
  type SeriesTabRow,
  type SeriesTabSection,
} from "./series-tab-model";

const ROW_GAP = 13;
const ENDED_LABEL_WIDTH = 56;

function Row({
  row,
  first,
  onOpen,
}: {
  row: SeriesTabRow;
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
  section: SeriesTabSection;
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

/** The Group's Series tab (1a), read when the tab is first shown. */
export function SeriesTab({ groupId }: { groupId: string }) {
  const m = useMessages();
  const locale = useLocale();
  const colors = useColors();
  const router = useRouter();
  const segments = useSegments();
  const query = api.series.listForGroup.useQuery({ groupId });

  if (!query.data) {
    return query.error ? (
      <Notice
        alert
        title={m.series.tab.loadError}
        description={query.error.message}
        onRetry={() => void query.refetch()}
      />
    ) : (
      <View style={{ gap: 12 }}>
        <Skeleton height={26} width={120} radius={radii.sm} />
        <Skeleton height={150} radius={radii.card} />
      </View>
    );
  }

  const model = seriesTabModel(query.data, locale);
  const openSeries = (seriesId: string) =>
    router.push(seriesPath(segments, seriesId));
  const note = (
    <Text size="eyebrow" tone="muted">
      {m.series.tab.note}
    </Text>
  );

  return (
    <View style={{ gap: spacing.section }}>
      {model.running ? (
        <View style={{ gap: 8 }}>
          <View style={{ gap: 10 }}>
            <SectionHead title={m.series.tab.title} meta={model.running.meta} />
            <SeriesCard section={model.running} onOpen={openSeries} />
          </View>
          {note}
        </View>
      ) : (
        <View style={{ gap: 8 }}>
          {note}
          {model.empty ? <Text>{model.empty}</Text> : null}
        </View>
      )}

      {model.ended ? (
        <View style={{ gap: 10 }}>
          <SectionHead title={m.series.tab.ended} meta={model.ended.meta} />
          <SeriesCard section={model.ended} onOpen={openSeries} />
        </View>
      ) : null}

      {model.canCreate ? (
        <Button
          label={m.series.tab.newSeries}
          size="lg"
          icon={<Plus size={sizes.iconAction} color={colors.onControl} />}
          onPress={() => router.push(groupNewSeriesPath(groupId))}
        />
      ) : null}
    </View>
  );
}
