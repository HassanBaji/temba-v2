import { radii, sizes } from "@repo/design-tokens";
import { Pressable, View } from "react-native";

import { useMessages } from "../i18n/locale-provider";
import { hairline } from "../primitives/hairline-width";
import { Text } from "../primitives/text";
import { useColors } from "../theme/theme-provider";
import type { CabinetRowModel } from "./cabinet-model";
import { MarkCoin } from "./mark-coin";

const COLUMNS = 4;

/** "Marks, 11 received" with the top coins (3c, 3d). The whole row opens all marks. */
export function CabinetRow({
  row,
  onOpen,
}: {
  row: CabinetRowModel;
  onOpen: () => void;
}) {
  const m = useMessages();
  const colors = useColors();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={row.spoken}
      accessibilityHint={m.mobileMarks.cabinet.showAll}
      onPress={onOpen}
      style={({ pressed }) => ({
        minHeight: sizes.touchTarget,
        gap: 12,
        opacity: pressed ? 0.6 : 1,
      })}
    >
      <View
        style={{
          flexDirection: "row",
          alignItems: "baseline",
          justifyContent: "space-between",
          gap: 12,
        }}
      >
        <Text size="title" width="expanded" weight="bold">
          {row.title}
        </Text>
        <Text size="meta" tone="muted">
          {row.meta}
        </Text>
      </View>
      <View
        style={{
          borderWidth: hairline,
          borderColor: colors.rule,
          borderRadius: radii.card,
          paddingHorizontal: 14,
          paddingTop: 16,
          paddingBottom: 14,
          flexDirection: "row",
          gap: 8,
        }}
      >
        {row.empty ? (
          <Text size="meta" tone="muted">
            {row.empty}
          </Text>
        ) : (
          Array.from({ length: COLUMNS }, (_, index) => {
            const coin = row.coins[index];
            return (
              <View
                key={coin?.kind ?? `empty-${index}`}
                style={{ flex: 1, minWidth: 0, alignItems: "center", gap: 8 }}
              >
                {coin ? (
                  <>
                    <MarkCoin kind={coin.kind} size="cabinet" />
                    <View style={{ alignItems: "center" }}>
                      <Text
                        size="eyebrow"
                        numberOfLines={2}
                        style={{ textAlign: "center" }}
                      >
                        {coin.name}
                      </Text>
                      <Text size="eyebrow" tone="muted" mono ltr>
                        {coin.count}
                      </Text>
                    </View>
                  </>
                ) : null}
              </View>
            );
          })
        )}
      </View>
    </Pressable>
  );
}
