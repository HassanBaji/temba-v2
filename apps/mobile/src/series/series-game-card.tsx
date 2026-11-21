import { sizes } from "@repo/design-tokens";
import { useRouter, useSegments } from "expo-router";
import { Pressable, View } from "react-native";

import { useLocale, useMessages } from "../i18n/locale-provider";
import { Surface } from "../primitives/surface";
import { useTonePalette } from "../primitives/surface-context";
import { Text } from "../primitives/text";
import { api } from "../trpc/react";
import { SeriesBadge } from "./series-badge";
import {
  seriesGameCardModel,
  type SeriesGameCardModel,
} from "./series-game-card-model";
import { seriesPath } from "./series-path";

const CARD_GAP = 13;

function CardBody({ model }: { model: SeriesGameCardModel }) {
  const m = useMessages().series.game;
  return (
    <>
      <SeriesBadge emblem={model.emblem} colour={model.colour} size="list" />
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text weight="semibold">{model.title}</Text>
        <Text size="eyebrow" tone="muted">
          {model.rule}
        </Text>
      </View>
      {model.seriesId ? (
        <Text size="meta" weight="semibold" style={{ flexShrink: 0 }}>
          {m.seeSeries}
        </Text>
      ) : null}
    </>
  );
}

function CardRow({
  model,
  onOpen,
}: {
  model: SeriesGameCardModel;
  onOpen: (seriesId: string) => void;
}) {
  const m = useMessages().series.game;
  const palette = useTonePalette();
  const row = {
    minHeight: sizes.touchTarget,
    flexDirection: "row",
    alignItems: "center",
    gap: CARD_GAP,
    paddingHorizontal: 16,
    paddingVertical: CARD_GAP,
  } as const;
  const { seriesId } = model;
  if (!seriesId) {
    return (
      <View accessible accessibilityLabel={model.spoken} style={row}>
        <CardBody model={model} />
      </View>
    );
  }
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={model.spoken}
      accessibilityHint={m.openHint}
      onPress={() => onOpen(seriesId)}
      style={({ pressed }) => ({
        ...row,
        backgroundColor: pressed ? palette.wash : palette.background,
      })}
    >
      <CardBody model={model} />
    </Pressable>
  );
}

/**
 * What winning this Game's Edition means, with a way to its Series page.
 * Shown until the Edition is decided.
 */
export function SeriesGameCard({ gameId }: { gameId: string }) {
  const locale = useLocale();
  const router = useRouter();
  const segments = useSegments();
  const edition = api.series.edition.useQuery({ gameId });
  const model = seriesGameCardModel(edition.data, locale);
  if (!model) {
    return null;
  }
  return (
    <Surface padded={false} radius="card" style={{ overflow: "hidden" }}>
      <CardRow
        model={model}
        onOpen={(seriesId) => router.push(seriesPath(segments, seriesId))}
      />
    </Surface>
  );
}
