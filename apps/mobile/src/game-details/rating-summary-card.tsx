import { ratingSummaryEntry } from "@repo/domain/performance-rating";
import { useRouter } from "expo-router";
import { View } from "react-native";

import { gameRatingSummaryPath } from "../games/games-model";
import { useLocale } from "../i18n/locale-provider";
import { Button } from "../primitives/button";
import { Surface } from "../primitives/surface";
import { Text } from "../primitives/text";
import { type RouterOutputs } from "../trpc/react";

type RatingWindow = RouterOutputs["games"]["byId"]["ratingWindow"];

/** Opens the ratings summary (screen 4d) for an Organizer once the window has settled. */
export function RatingSummaryCard({
  gameId,
  window,
  isOrganizer,
}: {
  gameId: string;
  window: RatingWindow;
  isOrganizer: boolean;
}) {
  const locale = useLocale();
  const router = useRouter();
  const entry = ratingSummaryEntry(window, isOrganizer, locale);
  if (!entry) {
    return null;
  }
  return (
    <Surface style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
      <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
        <Text weight="semibold">{entry.title}</Text>
        <Text size="meta" tone="muted">
          {entry.description}
        </Text>
      </View>
      <Button
        label={entry.cta}
        variant="outline"
        onPress={() => router.push(gameRatingSummaryPath(gameId))}
      />
    </Surface>
  );
}
