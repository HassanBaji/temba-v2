import { View } from "react-native";

import { hairline } from "./hairline-width";
import { useTonePalette } from "./surface-context";

export function Hairline() {
  const palette = useTonePalette();
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{ height: hairline, backgroundColor: palette.rule }}
    />
  );
}
