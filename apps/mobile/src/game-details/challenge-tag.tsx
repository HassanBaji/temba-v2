import { View } from "react-native";

import { hairline } from "../primitives/hairline-width";
import { useTonePalette } from "../primitives/surface-context";
import { Text } from "../primitives/text";

const TAG_RADIUS = 6;

/** The outlined mono "CHALLENGE" tag that sits beside share in a Challenge Game's hero. */
export function ChallengeTag({ label }: { label: string }) {
  const palette = useTonePalette();
  return (
    <View
      style={{
        borderWidth: hairline,
        borderColor: palette.rule,
        borderRadius: TAG_RADIUS,
        paddingVertical: 4,
        paddingHorizontal: 7,
      }}
    >
      <Text
        size="eyebrow"
        tone="muted"
        mono
        uppercase
        style={{ letterSpacing: 0.96 }}
      >
        {label}
      </Text>
    </View>
  );
}
