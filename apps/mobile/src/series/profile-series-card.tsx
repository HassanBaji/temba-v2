import { sizes } from "@repo/design-tokens";
import { useRouter, useSegments } from "expo-router";
import { ArrowRight } from "lucide-react-native";
import { useState } from "react";
import { Pressable, View } from "react-native";

import { gamePath } from "../games/games-model";
import { useLocale } from "../i18n/locale-provider";
import { mirrorInRtl } from "../i18n/rtl";
import { hairline } from "../primitives/hairline-width";
import { Surface } from "../primitives/surface";
import { Text } from "../primitives/text";
import { SectionHead } from "../profile/profile-parts";
import { useColors } from "../theme/theme-provider";
import { api } from "../trpc/react";
import {
  PROFILE_SERIES_COLUMNS,
  profileSeriesAllModel,
  profileSeriesCardModel,
  profileSeriesSheetModel,
  type ProfileSeriesBadge,
  type SeriesForPlayer,
} from "./profile-series-model";
import { SeriesBadge } from "./series-badge";
import { seriesPath } from "./series-path";
import { SeriesWinsSheet } from "./series-wins-sheet";

type Opened = { mode: "series"; badge: ProfileSeriesBadge } | { mode: "all" };

const GRID_GAP = 8;

function BadgeButton({
  badge,
  onOpen,
}: {
  badge: ProfileSeriesBadge;
  onOpen: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={badge.label}
      onPress={onOpen}
      style={({ pressed }) => ({
        flex: 1,
        minWidth: 0,
        minHeight: sizes.touchTarget,
        alignItems: "center",
        gap: 7,
        paddingVertical: 4,
        opacity: pressed ? 0.6 : 1,
      })}
    >
      <SeriesBadge
        emblem={badge.emblem}
        colour={badge.colour}
        size="card"
        count={badge.wins}
      />
      <View style={{ alignItems: "center" }}>
        <Text
          size="eyebrow"
          weight="semibold"
          numberOfLines={2}
          style={{ textAlign: "center" }}
        >
          {badge.name}
        </Text>
        {badge.groupName ? (
          <Text
            size="eyebrow"
            tone="muted"
            numberOfLines={2}
            style={{ textAlign: "center" }}
          >
            {badge.groupName}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}

/**
 * A player's Series wins on their profile (4a): a badge per Series won, each
 * opening the wins behind it, and "All series wins". Not split by sport. No
 * card while loading, when hidden, or with nothing won.
 */
export function ProfileSeriesCard({
  userId,
  data,
}: {
  userId: string;
  data: SeriesForPlayer | undefined;
}) {
  const locale = useLocale();
  const colors = useColors();
  const router = useRouter();
  const segments = useSegments();
  const [opened, setOpened] = useState<Opened | null>(null);
  // Keeps the last sheet's content while it slides closed.
  const [shown, setShown] = useState<Opened | null>(null);
  if (opened && opened !== shown) {
    setShown(opened);
  }
  const seriesId = shown?.mode === "series" ? shown.badge.seriesId : null;
  const wins = api.series.playerWins.useQuery(
    { userId, seriesId: seriesId ?? "" },
    { enabled: seriesId !== null },
  );

  const card = profileSeriesCardModel(data, locale);
  if (!card || !data || data.hidden) {
    return null;
  }

  const sheet = !shown
    ? null
    : shown.mode === "all"
      ? profileSeriesAllModel(data, locale)
      : profileSeriesSheetModel(shown.badge, wins.data, locale);
  const leaveTo = (href: string) => {
    setOpened(null);
    router.push(href);
  };

  return (
    <View style={{ gap: 10 }}>
      <SectionHead title={card.title} meta={card.meta} />
      <Surface padded={false} radius="card" style={{ overflow: "hidden" }}>
        <View style={{ paddingHorizontal: 12, paddingVertical: 16, gap: 16 }}>
          {card.rows.map((row) => (
            <View
              key={row.map((badge) => badge.seriesId).join(":")}
              style={{ flexDirection: "row", gap: GRID_GAP }}
            >
              {Array.from({ length: PROFILE_SERIES_COLUMNS }, (_, index) => {
                const badge = row[index];
                return badge ? (
                  <BadgeButton
                    key={badge.seriesId}
                    badge={badge}
                    onOpen={() => setOpened({ mode: "series", badge })}
                  />
                ) : (
                  <View key={`empty-${index}`} style={{ flex: 1 }} />
                );
              })}
            </View>
          ))}
        </View>
        <Pressable
          accessibilityRole="button"
          onPress={() => setOpened({ mode: "all" })}
          style={({ pressed }) => ({
            minHeight: sizes.touchTarget,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            paddingHorizontal: 16,
            paddingVertical: 12,
            borderTopWidth: hairline,
            borderColor: colors.rule,
            backgroundColor: pressed ? colors.wash : colors.paper,
          })}
        >
          <Text size="meta" weight="semibold">
            {card.allWins}
          </Text>
          <ArrowRight
            size={sizes.iconRow}
            color={colors.ink}
            style={mirrorInRtl}
          />
        </Pressable>
      </Surface>
      <SeriesWinsSheet
        visible={opened !== null}
        model={sheet}
        error={wins.error?.message ?? null}
        onRetry={() => void wins.refetch()}
        onClose={() => setOpened(null)}
        onOpenGame={(gameId) => leaveTo(gamePath(gameId))}
        onOpenSeries={(id) => leaveTo(seriesPath(segments, id))}
      />
    </View>
  );
}
