import { View, type StyleProp, type ViewStyle } from "react-native";

import { scorePairs } from "./score-pairs";
import { Text, type TextProps } from "./text";

type ScoreTextProps = Pick<TextProps, "size" | "weight" | "width" | "tone"> & {
  style?: StyleProp<ViewStyle>;
};

/**
 * A score as `[own][–][other]` in a row: the row mirrors with the layout, so
 * the viewer's or slot 1's number sits on the start side in both directions,
 * whatever the bidi algorithm would make of one "6–4" string.
 */
export function ScorePair({
  own,
  other,
  accessibilityLabel,
  style,
  ...text
}: ScoreTextProps & {
  own: number | string;
  other: number | string;
  accessibilityLabel?: string;
}) {
  return (
    <View
      accessible
      accessibilityLabel={accessibilityLabel ?? `${own}–${other}`}
      style={[{ flexDirection: "row", alignItems: "baseline" }, style]}
    >
      <Text {...text}>{String(own)}</Text>
      <Text {...text}>–</Text>
      <Text {...text}>{String(other)}</Text>
    </View>
  );
}

/**
 * A domain score line ("6–4 7–5") as one `ScorePair` per set, first set at
 * the start. Text that is not only scores renders as it is.
 */
export function ScoreLine({
  score,
  gap = 8,
  numberOfLines,
  style,
  ...text
}: ScoreTextProps & {
  score: string;
  gap?: number;
  numberOfLines?: number;
}) {
  const pairs = scorePairs(score);
  if (!pairs) {
    return (
      <View style={style}>
        <Text {...text} numberOfLines={numberOfLines}>
          {score}
        </Text>
      </View>
    );
  }
  return (
    <View
      accessible
      accessibilityLabel={score}
      style={[{ flexDirection: "row", alignItems: "baseline", gap }, style]}
    >
      {pairs.map((pair, index) => (
        <ScorePair key={index} own={pair.own} other={pair.other} {...text} />
      ))}
    </View>
  );
}
