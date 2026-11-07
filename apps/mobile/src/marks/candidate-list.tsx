import { radii } from "@repo/design-tokens";
import { Pressable, View } from "react-native";

import { useMessages } from "../i18n/locale-provider";
import { Avatar } from "../primitives/avatar";
import { hairline } from "../primitives/hairline-width";
import { Text } from "../primitives/text";
import { useColors } from "../theme/theme-provider";
import { CoinStack } from "./coin-stack";
import type { CandidateRow } from "./marks-model";

const RING = 20;
const DOT = 8;
const ROW_MIN_HEIGHT = 56;

function Radio({ selected }: { selected: boolean }) {
  const colors = useColors();
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{
        width: RING,
        height: RING,
        borderRadius: RING / 2,
        borderWidth: hairline,
        borderColor: selected ? colors.ink : colors.inputBorder,
        backgroundColor: selected ? colors.ink : colors.sheet,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {selected ? (
        <View
          style={{
            width: DOT,
            height: DOT,
            borderRadius: DOT / 2,
            backgroundColor: colors.paper,
          }}
        />
      ) : null}
    </View>
  );
}

/** The MVP sheets' radio rows (2d, 2e): one participant each, with hints. */
export function CandidateList({
  rows,
  selected,
  trailing,
  onSelect,
}: {
  rows: CandidateRow[];
  selected: string | null;
  trailing: "coins" | "marks";
  onSelect: (userId: string) => void;
}) {
  const m = useMessages();
  const colors = useColors();
  return (
    <View
      accessibilityRole="radiogroup"
      style={{
        borderWidth: hairline,
        borderColor: colors.rule,
        borderRadius: radii.card,
        overflow: "hidden",
      }}
    >
      {rows.map((row, index) => {
        const on = row.userId === selected;
        return (
          <Pressable
            key={row.userId}
            accessibilityRole="radio"
            accessibilityLabel={[
              row.name,
              row.sub,
              trailing === "marks" ? row.marks : null,
            ]
              .filter(Boolean)
              .join(m.common.listSeparator)}
            accessibilityState={{ checked: on }}
            onPress={() => onSelect(row.userId)}
            style={({ pressed }) => ({
              minHeight: ROW_MIN_HEIGHT,
              flexDirection: "row",
              alignItems: "center",
              gap: 12,
              paddingVertical: 10,
              paddingHorizontal: 14,
              borderTopWidth: index === 0 ? 0 : hairline,
              borderColor: colors.rule,
              backgroundColor: on || pressed ? colors.wash : colors.sheet,
            })}
          >
            <Radio selected={on} />
            <Avatar name={row.name} uri={row.image} />
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text
                size="meta"
                weight={on ? "semibold" : "regular"}
                numberOfLines={1}
              >
                {row.name}
              </Text>
              {row.sub ? (
                <Text size="eyebrow" tone="muted" numberOfLines={1}>
                  {row.sub}
                </Text>
              ) : null}
            </View>
            {trailing === "coins" ? (
              <CoinStack kinds={row.coins} size="row" />
            ) : (
              <Text size="eyebrow" tone="muted">
                {row.marks}
              </Text>
            )}
          </Pressable>
        );
      })}
    </View>
  );
}
