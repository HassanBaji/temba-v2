import type { MarkCoinSize } from "@repo/design-tokens/marks";
import type { CoinKind } from "@repo/domain/marks";
import { View } from "react-native";

import { MarkCoin } from "./mark-coin";

const OVERLAP: Record<MarkCoinSize, number> = {
  row: 5,
  roster: 6,
  cabinet: 10,
  sheet: 14,
  set: 24,
};

/** Coins overlapping in reading order. Decorative: the row's text names them. */
export function CoinStack({
  kinds,
  size,
}: {
  kinds: readonly CoinKind[];
  size: MarkCoinSize;
}) {
  if (kinds.length === 0) {
    return null;
  }
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{ flexDirection: "row", flexShrink: 0 }}
    >
      {kinds.map((kind, index) => (
        <View
          key={`${kind}-${index}`}
          style={{ marginStart: index === 0 ? 0 : -OVERLAP[size] }}
        >
          <MarkCoin kind={kind} size={size} />
        </View>
      ))}
    </View>
  );
}
