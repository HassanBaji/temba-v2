import { Check } from "lucide-react-native";
import { View } from "react-native";

import { Hatch } from "../primitives/hatch";
import { hairline } from "../primitives/hairline-width";
import { useTonePalette } from "../primitives/surface-context";

const MARKER = 22;
const CHECK = 13;
const SEGMENT_HEIGHT = 3;

/** Circle marker for a task row: hatched while open, solid ink with a check when done. */
export function TaskMarker({ done }: { done: boolean }) {
  const palette = useTonePalette();
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{
        width: MARKER,
        height: MARKER,
        borderRadius: MARKER / 2,
        overflow: "hidden",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: done ? palette.foreground : palette.background,
        borderWidth: done ? 0 : hairline,
        borderColor: palette.rule,
      }}
    >
      {done ? (
        <Check size={CHECK} color={palette.background} strokeWidth={2.5} />
      ) : (
        <Hatch radius={MARKER / 2} bordered={false} />
      )}
    </View>
  );
}

/** Thin segments, one per checklist step, filled from the left as tasks finish. */
export function ChecklistSegments({
  done,
  total,
  label,
}: {
  done: number;
  total: number;
  label: string;
}) {
  const palette = useTonePalette();
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel={label}
      accessibilityValue={{ min: 0, max: total, now: done }}
      style={{ flexDirection: "row", gap: 6 }}
    >
      {Array.from({ length: total }, (_, index) => (
        <View
          key={index}
          style={{
            flex: 1,
            height: SEGMENT_HEIGHT,
            borderRadius: 2,
            backgroundColor: index < done ? palette.foreground : palette.rule,
          }}
        />
      ))}
    </View>
  );
}
