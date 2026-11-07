import { colors, radii } from "@repo/design-tokens";
import { Pressable, View } from "react-native";

import { hairline } from "../primitives/hairline-width";
import { Text } from "../primitives/text";
import { CoinStack } from "./coin-stack";
import type { ClosedCardModel, GiveRowModel } from "./marks-model";

const ACTION_HEIGHT = 48;

function CardBody({
  title,
  line,
  coins,
}: {
  title: string;
  line: string;
  coins: GiveRowModel["coins"];
}) {
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        paddingVertical: 14,
        paddingHorizontal: 18,
      }}
    >
      <CoinStack kinds={coins} size="roster" />
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text weight="semibold">{title}</Text>
        <Text size="eyebrow" tone="muted">
          {line}
        </Text>
      </View>
    </View>
  );
}

/** 2a: "Give your marks", with Choose a player under a hairline. */
export function MarksGiveCard({
  model,
  onPress,
}: {
  model: GiveRowModel;
  onPress: () => void;
}) {
  return (
    <View
      style={{
        borderWidth: hairline,
        borderColor: colors.ink,
        borderRadius: radii.card,
        overflow: "hidden",
      }}
    >
      <CardBody title={model.title} line={model.line} coins={model.coins} />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={model.actionLabel}
        onPress={onPress}
        style={({ pressed }) => ({
          height: ACTION_HEIGHT,
          alignItems: "center",
          justifyContent: "center",
          borderTopWidth: hairline,
          borderColor: colors.rule,
          backgroundColor: pressed ? colors.wash : colors.paper,
        })}
      >
        <Text size="meta" weight="semibold">
          {model.actionLabel}
        </Text>
      </Pressable>
    </View>
  );
}

/** 2f: what the viewer gave and when the window closed. */
export function MarksClosedCard({ model }: { model: ClosedCardModel }) {
  return (
    <View
      style={{
        borderWidth: hairline,
        borderColor: colors.rule,
        borderRadius: radii.card,
      }}
    >
      <CardBody title={model.title} line={model.line} coins={model.coins} />
    </View>
  );
}
