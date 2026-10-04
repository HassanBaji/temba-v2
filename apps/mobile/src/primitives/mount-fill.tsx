import { motion, radii } from "@repo/design-tokens";
import { useEffect } from "react";
import { View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

import { mountMotion } from "./mount-motion";
import { useTonePalette } from "./surface-context";

export type MountFillProps = {
  percent: number;
  height?: number;
};

export function MountFill({ percent, height = 8 }: MountFillProps) {
  const palette = useTonePalette();
  const reducedMotion = useReducedMotion();
  const plan = mountMotion({ reducedMotion, durationMs: motion.levelDrawMs });
  const progress = useSharedValue(plan.from);

  useEffect(() => {
    progress.value = withTiming(plan.to, {
      duration: plan.durationMs,
      easing: Easing.out(Easing.quad),
    });
  }, [plan.to, plan.durationMs, progress]);

  const clamped = Math.min(100, Math.max(0, percent));
  const fillStyle = useAnimatedStyle(() => ({
    width: `${clamped * progress.value}%`,
  }));

  return (
    <View
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: clamped }}
      style={{
        height,
        borderRadius: radii.sm,
        overflow: "hidden",
        backgroundColor: palette.wash,
      }}
    >
      <Animated.View
        style={[{ height, backgroundColor: palette.foreground }, fillStyle]}
      />
    </View>
  );
}
