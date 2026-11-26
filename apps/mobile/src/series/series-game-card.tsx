import { sizes } from "@repo/design-tokens";
import type { SeriesColour, SeriesEmblem } from "@repo/domain/series";
import { useRouter, useSegments } from "expo-router";
import { Pressable, View } from "react-native";

import { useLocale, useMessages } from "../i18n/locale-provider";
import { Surface } from "../primitives/surface";
import { useTonePalette } from "../primitives/surface-context";
import { Text } from "../primitives/text";
import { api } from "../trpc/react";
import { SeriesBadge } from "./series-badge";
import {
  seriesEditionCard,
  type SeriesEditionGame,
} from "./series-edition-card-model";
import { seriesPath } from "./series-path";

const CARD_GAP = 13;

type PaperCard = {
  emblem: SeriesEmblem;
  colour: SeriesColour;
  spoken: string;
  seriesId: string | null;
};

function CardBody({
  card,
  action,
  children,
}: {
  card: PaperCard;
  action: string;
  children: React.ReactNode;
}) {
  return (
    <>
      <SeriesBadge emblem={card.emblem} colour={card.colour} size="list" />
      <View style={{ flex: 1, minWidth: 0 }}>{children}</View>
      {card.seriesId ? (
        <Text size="meta" weight="semibold" style={{ flexShrink: 0 }}>
          {action}
        </Text>
      ) : null}
    </>
  );
}

function CardRow({
  card,
  action,
  onOpen,
  children,
}: {
  card: PaperCard;
  action: string;
  onOpen: (seriesId: string) => void;
  children: React.ReactNode;
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
  const body = (
    <CardBody card={card} action={action}>
      {children}
    </CardBody>
  );
  const { seriesId } = card;
  if (!seriesId) {
    return (
      <View accessible accessibilityLabel={card.spoken} style={row}>
        {body}
      </View>
    );
  }
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={card.spoken}
      accessibilityHint={m.openHint}
      onPress={() => onOpen(seriesId)}
      style={({ pressed }) => ({
        ...row,
        backgroundColor: pressed ? palette.wash : palette.background,
      })}
    >
      {body}
    </Pressable>
  );
}

/**
 * The paper Series card under a Game's hero: what winning its Edition takes
 * until it is decided, then who won it on a Played game. A won Social leads
 * with `SeriesWinnersCard` instead, so this renders nothing there.
 */
export function SeriesGameCard({
  gameId,
  game,
}: {
  gameId: string;
  game: SeriesEditionGame;
}) {
  const locale = useLocale();
  const m = useMessages().series.game;
  const router = useRouter();
  const segments = useSegments();
  const edition = api.series.edition.useQuery({ gameId });
  const card = seriesEditionCard(edition.data, game, locale);
  if (!card || card.kind === "winners") {
    return null;
  }
  const onOpen = (seriesId: string) =>
    router.push(seriesPath(segments, seriesId));
  return (
    <Surface padded={false} radius="card" style={{ overflow: "hidden" }}>
      {card.kind === "partOf" ? (
        <CardRow card={card.model} action={m.seeSeries} onOpen={onOpen}>
          <Text weight="semibold">{card.model.title}</Text>
          <Text size="eyebrow" tone="muted">
            {card.model.rule}
          </Text>
        </CardRow>
      ) : (
        <CardRow card={card.model} action={m.seeTheSeries} onOpen={onOpen}>
          <Text weight="semibold">{card.model.title}</Text>
          <Text size="eyebrow" tone="muted">
            {card.model.line}
          </Text>
          {card.model.ordinal ? (
            <Text size="eyebrow" weight="semibold">
              {card.model.ordinal}
            </Text>
          ) : null}
        </CardRow>
      )}
    </Surface>
  );
}
