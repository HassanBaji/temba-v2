import { gameCardSportTag } from "@repo/domain/game-card";
import { View } from "react-native";

import { useLocale } from "../i18n/locale-provider";
import { useTonePalette } from "../primitives/surface-context";
import { Text } from "../primitives/text";
import { SportGlyph } from "./sport-glyph";

export function SportTag({ sport }: { sport: string | null | undefined }) {
  const locale = useLocale();
  const palette = useTonePalette();
  const tag = gameCardSportTag(sport, locale);
  if (!tag) {
    return null;
  }
  return (
    <View
      accessibilityLabel={tag.label}
      style={{ flexDirection: "row", alignItems: "center", gap: 4 }}
    >
      <SportGlyph sport={sport ?? null} color={palette.muted} size={12} />
      <Text size="eyebrow" tone="muted" mono uppercase>
        {tag.label}
      </Text>
    </View>
  );
}
