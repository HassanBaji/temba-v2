import { rateGameEntry } from "@repo/domain/performance-rating";
import { useRouter } from "expo-router";
import { View } from "react-native";

import { gameRatePath } from "../games/games-model";
import { useLocale } from "../i18n/locale-provider";
import { Button } from "../primitives/button";
import { Surface } from "../primitives/surface";
import { Text } from "../primitives/text";
import { type RouterOutputs } from "../trpc/react";

type RatingWindow = RouterOutputs["games"]["byId"]["ratingWindow"];

/** Opens Rate the game (screen 4a) while the Organizer may still rate. */
export function RateGameCard({
  gameId,
  window,
}: {
  gameId: string;
  window: RatingWindow;
}) {
  const locale = useLocale();
  const router = useRouter();
  const entry = rateGameEntry(window, locale);
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
        onPress={() => router.push(gameRatePath(gameId))}
      />
    </Surface>
  );
}
