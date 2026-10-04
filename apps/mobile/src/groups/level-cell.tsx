import type { LevelCellView } from "@repo/domain/group-home-chrome";
import { View } from "react-native";

import { Hatch } from "../primitives/hatch";
import { Text } from "../primitives/text";

const CELL_WIDTH = 44;
const CELL_HEIGHT = 20;

export function LevelCell({ view }: { view: LevelCellView }) {
  if (view.kind === "provisional") {
    return (
      <View
        accessibilityLabel="Level still Provisional"
        style={{ width: CELL_WIDTH, height: CELL_HEIGHT }}
      >
        <Hatch />
      </View>
    );
  }
  return (
    <Text
      width="expanded"
      weight="bold"
      style={{ minWidth: CELL_WIDTH, textAlign: "right" }}
    >
      {view.label}
    </Text>
  );
}
