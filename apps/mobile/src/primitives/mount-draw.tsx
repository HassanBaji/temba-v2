import { motion } from "@repo/design-tokens";
import { useEffect } from "react";
import Animated, {
  Easing,
  useAnimatedProps,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import Svg, { Path } from "react-native-svg";

import { mountMotion } from "./mount-motion";
import { useTonePalette } from "./surface-context";

const AnimatedPath = Animated.createAnimatedComponent(Path);

export type MountDrawProps = {
  d: string;
  length: number;
  width: number;
  height: number;
  strokeWidth?: number;
};

export function MountDraw({
  d,
  length,
  width,
  height,
  strokeWidth = 2,
}: MountDrawProps) {
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

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: length * (1 - progress.value),
  }));

  return (
    <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <AnimatedPath
        d={d}
        fill="none"
        stroke={palette.foreground}
        strokeWidth={strokeWidth}
        strokeDasharray={length}
        animatedProps={animatedProps}
      />
    </Svg>
  );
}
