import { formatGameDay } from "@repo/domain/format-game-start";
import { useRouter, useSegments } from "expo-router";
import { Share } from "lucide-react-native";
import { View } from "react-native";

import { useLocale, useMessages } from "../i18n/locale-provider";
import { sharePath } from "../played-game/played-friendly-game";
import { Button } from "../primitives/button";
import { Hairline } from "../primitives/hairline";
import { Surface } from "../primitives/surface";
import { Text } from "../primitives/text";
import { useColors } from "../theme/theme-provider";
import { api } from "../trpc/react";
import { SeriesBadge } from "./series-badge";
import { seriesEditionCard } from "./series-edition-card-model";
import { seriesPath } from "./series-path";

const CARD_GAP = 14;
const BADGE_GAP = 16;
const SHARE_ICON = 16;

/**
 * 3a: a won Social's one focus card, with who won and what number it is for
 * them. Renders nothing until the Edition is won.
 */
export function SeriesWinnersCard({
  gameId,
  windowStart,
}: {
  gameId: string;
  windowStart: Date | string | null;
}) {
  const locale = useLocale();
  const m = useMessages();
  const colors = useColors();
  const router = useRouter();
  const segments = useSegments();
  const edition = api.series.edition.useQuery({ gameId });
  const card = seriesEditionCard(edition.data, "social", locale);
  if (card?.kind !== "winners") {
    return null;
  }
  const { model } = card;
  const { seriesId } = model;

  return (
    <Surface tone="ink" style={{ gap: CARD_GAP }}>
      <View
        accessible
        accessibilityLabel={model.spoken}
        style={{ gap: CARD_GAP }}
      >
        <View
          style={{
            flexDirection: "row",
            alignItems: "baseline",
            justifyContent: "space-between",
            gap: 12,
          }}
        >
          <Text
            size="meta"
            tone="muted"
            numberOfLines={1}
            style={{ flexShrink: 1 }}
          >
            {model.title}
          </Text>
          {windowStart ? (
            <Text size="meta" tone="muted" style={{ flexShrink: 0 }}>
              {formatGameDay(windowStart, locale, {
                weekday: "short",
                month: "short",
              })}
            </Text>
          ) : null}
        </View>
        <View
          style={{ flexDirection: "row", alignItems: "center", gap: BADGE_GAP }}
        >
          <SeriesBadge
            emblem={model.emblem}
            colour={model.colour}
            size="sheet"
            surface="focus"
          />
          <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
            <Text size="meta" tone="muted">
              {m.series.game.winners}
            </Text>
            <View>
              {model.names.map((name, index) => (
                <Text key={index} size="h2" width="expanded" weight="bold">
                  {name}
                </Text>
              ))}
            </View>
          </View>
        </View>
      </View>
      {model.blocks.length > 0 ? (
        <View style={{ gap: 12 }}>
          <Hairline />
          <View style={{ flexDirection: "row", gap: 12 }}>
            {model.blocks.map((block) => (
              <View key={block.key} style={{ flex: 1, minWidth: 0 }}>
                <Text size="meta" weight="semibold">
                  {block.ordinal}
                </Text>
                {block.tally ? (
                  <Text size="eyebrow" tone="muted">
                    {block.tally}
                  </Text>
                ) : null}
              </View>
            ))}
            {model.blocks.length === 1 ? <View style={{ flex: 1 }} /> : null}
          </View>
        </View>
      ) : null}
      <View style={{ flexDirection: "row", gap: 8 }}>
        <View style={{ flex: 1 }}>
          <Button
            label={m.common.share}
            icon={<Share size={SHARE_ICON} color={colors.onFocusControl} />}
            onPress={() => router.push(sharePath(gameId))}
          />
        </View>
        {seriesId ? (
          <View style={{ flex: 1 }}>
            <Button
              label={m.series.game.seeTheSeries}
              variant="outline-inverse"
              onPress={() => router.push(seriesPath(segments, seriesId))}
            />
          </View>
        ) : null}
      </View>
    </Surface>
  );
}
