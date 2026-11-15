import type { HubHistoryRow } from "@repo/domain/hub-game-row";
import {
  kingPlayedCardModel,
  type KingPlayedSummary,
} from "@repo/domain/tournament-king-view";
import { Crown } from "lucide-react-native";
import { Pressable, View } from "react-native";

import { useLocale } from "../i18n/locale-provider";
import { Hairline } from "../primitives/hairline";
import { hairline } from "../primitives/hairline-width";
import { Surface } from "../primitives/surface";
import { Text } from "../primitives/text";
import { useColors } from "../theme/theme-provider";

const ICON = 16;

/** One played King of the court: the place leads, then who was king. No Match results: none are recorded. */
export function KingPlayedCard({
  row,
  onOpen,
}: {
  row: HubHistoryRow & { kingOfTheCourt: KingPlayedSummary };
  onOpen: () => void;
}) {
  const colors = useColors();
  const locale = useLocale();
  const view = kingPlayedCardModel(row, locale);
  return (
    <Surface tone="paper" padded={false} style={{ overflow: "hidden" }}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={[view.headline, view.title, view.summary].join(
          ", ",
        )}
        onPress={onOpen}
        style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}
      >
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            paddingHorizontal: 16,
            paddingVertical: 12,
          }}
        >
          <Text weight="semibold" numberOfLines={1} style={{ flexShrink: 1 }}>
            {view.headline}
          </Text>
          <Text size="meta" tone="muted">
            {view.day}
          </Text>
        </View>
        <Hairline />
        <View style={{ paddingHorizontal: 16, paddingVertical: 14, gap: 12 }}>
          <View>
            <Text size="title" width="expanded" weight="bold">
              {view.title}
            </Text>
            <Text size="meta" tone="muted">
              {view.summary}
            </Text>
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 16 }}>
            {view.place != null ? (
              <Text size="hero" width="expanded" weight="bold">
                {view.place}
              </Text>
            ) : null}
            <View
              style={{
                flex: 1,
                minWidth: 0,
                borderStartWidth: view.place != null ? hairline : 0,
                borderColor: colors.rule,
                paddingStart: view.place != null ? 16 : 0,
              }}
            >
              <Text weight="semibold" numberOfLines={1}>
                {view.viewerTeam.name}
              </Text>
              {view.startedLine ? (
                <Text size="meta" tone="muted">
                  {view.startedLine}
                </Text>
              ) : null}
            </View>
          </View>
        </View>
        {view.king ? (
          <>
            <Hairline />
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 8,
                paddingHorizontal: 16,
                paddingVertical: 12,
              }}
            >
              <Crown size={ICON} color={colors.ink} />
              <Text size="meta" numberOfLines={1} style={{ flex: 1 }}>
                {view.king.label}{" "}
                <Text size="meta" weight="semibold">
                  {view.king.name}
                </Text>
              </Text>
              <Text size="meta" tone="muted">
                {view.king.trailing}
              </Text>
            </View>
          </>
        ) : null}
      </Pressable>
    </Surface>
  );
}
