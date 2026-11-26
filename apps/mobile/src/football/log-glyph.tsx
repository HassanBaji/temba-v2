import { footballCardColors } from "@repo/design-tokens/marks";
import type { MatchLogKind } from "@repo/domain/football-match-log";
import { Ban } from "lucide-react-native";
import { View } from "react-native";

import { useTonePalette } from "../primitives/surface-context";

const CARD_SIZES = {
  sm: { width: 9, height: 13, radius: 2 },
  lg: { width: 30, height: 42, radius: 4 },
} as const;
const DOT = 10;
const OWN_GOAL_ICON = 14;

/** A warning or a red card, drawn as the card itself. */
export function CardMark({
  kind,
  size = "sm",
}: {
  kind: "warning" | "red_card";
  size?: keyof typeof CARD_SIZES;
}) {
  const card = CARD_SIZES[size];
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      aria-hidden
      style={{
        width: card.width,
        height: card.height,
        borderRadius: card.radius,
        backgroundColor:
          kind === "warning"
            ? footballCardColors.warning
            : footballCardColors.redCard,
      }}
    />
  );
}

/** What a log line is: a dot for a goal, a struck circle for an own goal, the card for a card. */
export function LogGlyph({
  kind,
  color,
}: {
  kind: MatchLogKind;
  color?: string;
}) {
  const palette = useTonePalette();
  const ink = color ?? palette.foreground;
  if (kind === "warning" || kind === "red_card") {
    return <CardMark kind={kind} />;
  }
  if (kind === "own_goal") {
    return (
      <View
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        aria-hidden
      >
        <Ban size={OWN_GOAL_ICON} color={ink} strokeWidth={2.5} />
      </View>
    );
  }
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      aria-hidden
      style={{
        width: DOT,
        height: DOT,
        borderRadius: DOT / 2,
        backgroundColor: ink,
      }}
    />
  );
}

export function scoreDash(score: { slot1: number; slot2: number }) {
  return `${score.slot1}–${score.slot2}`;
}
