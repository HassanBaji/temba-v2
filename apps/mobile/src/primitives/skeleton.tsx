import { radii } from "@repo/design-tokens";
import { useEffect } from "react";
import type { DimensionValue } from "react-native";
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";

import { useTonePalette } from "./surface-context";

const PULSE_MS = 1000;
const PULSE_LOW = 0.5;

export type SkeletonProps = {
  width?: DimensionValue;
  height: number;
  radius?: number;
};

export function Skeleton({
  width = "100%",
  height,
  radius = radii.md,
}: SkeletonProps) {
  const palette = useTonePalette();
  const reducedMotion = useReducedMotion();
  const opacity = useSharedValue(1);

  useEffect(() => {
    if (reducedMotion) {
      opacity.value = 1;
      return;
    }
    opacity.value = withRepeat(
      withTiming(PULSE_LOW, { duration: PULSE_MS }),
      -1,
      true,
    );
  }, [reducedMotion, opacity]);

  const animatedStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <Animated.View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[
        { width, height, borderRadius: radius, backgroundColor: palette.wash },
        animatedStyle,
      ]}
    />
  );
}
