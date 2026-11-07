import type { MarkCoinSize } from "@repo/design-tokens/marks";
import type { CoinKind } from "@repo/domain/marks";

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
    <span aria-hidden="true" className="flex shrink-0">
      {kinds.map((kind, index) => (
        <span
          key={`${kind}-${index}`}
          style={{ marginInlineStart: index === 0 ? 0 : -OVERLAP[size] }}
        >
          <MarkCoin kind={kind} size={size} />
        </span>
      ))}
    </span>
  );
}
