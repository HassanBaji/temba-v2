import type { LevelCellView } from "@repo/domain/group-home-chrome";
import { View } from "react-native";

import { Hatch } from "../primitives/hatch";
import { Text } from "../primitives/text";

const CELL_WIDTH = 44;
const CELL_HEIGHT = 20;
const LEVEL_CELL_WIDTH = 64;

export function LevelCell({
  view,
  level,
}: {
  view: LevelCellView;
  level?: string | null;
}) {
  const text = view.label && level ? `${view.label} ${level}` : view.label;

  if (view.kind === "provisional") {
    const hatchText = level ? text : null;
    return (
      <View
        accessibilityLabel={
          hatchText
            ? `Level ${hatchText}, still Provisional`
            : "Level still Provisional"
        }
        style={{
          width: hatchText ? undefined : CELL_WIDTH,
          minWidth: hatchText ? CELL_WIDTH : undefined,
          height: CELL_HEIGHT,
          paddingHorizontal: hatchText ? 6 : 0,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Hatch />
        {hatchText ? (
          <Text size="meta" weight="semibold">
            {hatchText}
          </Text>
        ) : null}
      </View>
    );
  }
  return (
    <Text
      width="expanded"
      weight="bold"
      style={{
        minWidth: level ? LEVEL_CELL_WIDTH : CELL_WIDTH,
        textAlign: "right",
      }}
    >
      {text}
    </Text>
  );
}
