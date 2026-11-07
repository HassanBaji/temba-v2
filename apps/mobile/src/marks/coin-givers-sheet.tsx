import { radii } from "@repo/design-tokens";
import { View } from "react-native";

import { useLocale } from "../i18n/locale-provider";
import { Avatar } from "../primitives/avatar";
import { hairline } from "../primitives/hairline-width";
import { Sheet } from "../primitives/sheet";
import { Text } from "../primitives/text";
import { useColors } from "../theme/theme-provider";
import { MarkCoin } from "./mark-coin";
import { coinGiversModel } from "./marks-model";
import type { GameMarksController } from "./use-game-marks";

const TALL_AFTER_KINDS = 2;

/** E24: who gave each coin on a player's roster row, teammate or opponent. */
export function CoinGiversSheet({ marks }: { marks: GameMarksController }) {
  const locale = useLocale();
  const colors = useColors();
  const userId = marks.sheet?.kind === "givers" ? marks.sheet.userId : null;
  const model =
    marks.data && userId ? coinGiversModel(marks.data, userId, locale) : null;
  const tall = (model?.kinds.length ?? 0) > TALL_AFTER_KINDS;

  return (
    <Sheet
      visible={model != null}
      onClose={marks.closeSheet}
      closeButton
      tall={tall}
      titleSize="lead"
      title={model?.title}
    >
      {model?.kinds.map((entry) => (
        <View
          key={entry.kind}
          style={{
            borderWidth: hairline,
            borderColor: colors.rule,
            borderRadius: radii.card,
            paddingVertical: 12,
            paddingHorizontal: 14,
            gap: 10,
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
            <MarkCoin kind={entry.kind} size="roster" />
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text size="meta" weight="semibold">
                {entry.name}
              </Text>
              {entry.note ? (
                <Text size="eyebrow" tone="muted">
                  {entry.note}
                </Text>
              ) : null}
            </View>
            {entry.count ? (
              <Text size="eyebrow" tone="muted" mono ltr>
                {entry.count}
              </Text>
            ) : null}
          </View>
          {entry.givers.map((giver) => (
            <View
              key={giver.userId}
              style={{ flexDirection: "row", alignItems: "center", gap: 10 }}
            >
              <Avatar name={giver.name} uri={giver.image} size="sm" />
              <Text
                size="meta"
                numberOfLines={1}
                style={{ flex: 1, minWidth: 0 }}
              >
                {giver.name}
              </Text>
              {giver.relation ? (
                <Text size="eyebrow" tone="muted">
                  {giver.relation}
                </Text>
              ) : null}
            </View>
          ))}
        </View>
      ))}
    </Sheet>
  );
}
