import { colors, motion, radii, sizes } from "@repo/design-tokens";
import { useEffect, useMemo, useRef, useState } from "react";
import { PanResponder, View, type LayoutChangeEvent } from "react-native";
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

import { hairline } from "./hairline-width";
import {
  sliderLabelLeft,
  sliderValueFromDrag,
  sliderX,
  type SliderTrack,
} from "./slider-geometry";
import { SurfaceToneContext } from "./surface-context";
import { Text } from "./text";

const THUMB = 28;
const TRACK_HEIGHT = 6;
const VALUE_LABEL_WIDTH = 72;
const MARKER_LABEL_WIDTH = 96;
const MARKER_HEIGHT = 16;
const TICK_HEIGHT = 6;

export type SliderMark = { value: number; label: string };

export type SliderProps = {
  min: number;
  max: number;
  value: number;
  onValueChange: (value: number) => void;
  label: string;
  valueText: string;
  startLabel: string;
  endLabel: string;
  edges?: readonly number[];
  marks?: readonly SliderMark[];
  marker?: SliderMark;
  disabled?: boolean;
};

export function Slider({
  min,
  max,
  value,
  onValueChange,
  label,
  valueText,
  startLabel,
  endLabel,
  edges = [],
  marks = [],
  marker,
  disabled = false,
}: SliderProps) {
  const reducedMotion = useReducedMotion();
  const [width, setWidth] = useState(0);
  const track: SliderTrack = { min, max, width, thumb: THUMB };
  const latest = useRef({ value, track, onValueChange, disabled });
  const startValue = useRef(value);
  const dragging = useRef(false);
  const settled = useRef(false);
  const x = useSharedValue(0);

  useEffect(() => {
    latest.current = { value, track, onValueChange, disabled };
  });

  useEffect(() => {
    const target = sliderX(value, { min, max, width, thumb: THUMB });
    if (dragging.current || reducedMotion || !settled.current) {
      x.value = target;
    } else {
      x.value = withTiming(target, { duration: motion.hoverMs });
    }
    settled.current = width > 0;
  }, [value, min, max, width, reducedMotion, x]);

  const responder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => !latest.current.disabled,
        onMoveShouldSetPanResponder: () => !latest.current.disabled,
        onPanResponderTerminationRequest: () => false,
        onPanResponderGrant: () => {
          startValue.current = latest.current.value;
          dragging.current = true;
        },
        onPanResponderMove: (_, gesture) => {
          const next = sliderValueFromDrag(
            startValue.current,
            gesture.dx,
            latest.current.track,
          );
          if (next !== latest.current.value) {
            latest.current.onValueChange(next);
          }
        },
        onPanResponderRelease: () => {
          dragging.current = false;
        },
        onPanResponderTerminate: () => {
          dragging.current = false;
        },
      }),
    [],
  );

  const thumbStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: x.value - THUMB / 2 }],
  }));
  const fillStyle = useAnimatedStyle(() => ({ width: x.value }));

  function adjust(delta: number) {
    onValueChange(Math.min(max, Math.max(min, value + delta)));
  }

  const at = (target: number) => sliderX(target, track);

  return (
    <View
      accessible
      accessibilityRole="adjustable"
      accessibilityLabel={label}
      accessibilityValue={{ min, max, now: value, text: valueText }}
      accessibilityState={{ disabled }}
      accessibilityActions={[{ name: "increment" }, { name: "decrement" }]}
      onAccessibilityAction={({ nativeEvent }) => {
        if (disabled) {
          return;
        }
        adjust(nativeEvent.actionName === "increment" ? 1 : -1);
      }}
      onLayout={(event: LayoutChangeEvent) =>
        setWidth(event.nativeEvent.layout.width)
      }
    >
      <View style={{ height: 32 }}>
        <SurfaceToneContext.Provider value="ink">
          <View
            style={{
              position: "absolute",
              top: 0,
              left: sliderLabelLeft(at(value), VALUE_LABEL_WIDTH, width),
              width: VALUE_LABEL_WIDTH,
              alignItems: "center",
              paddingVertical: 4,
              borderRadius: radii.sm,
              backgroundColor: colors.ink,
            }}
          >
            <Text size="meta" weight="semibold" numberOfLines={1}>
              {valueText}
            </Text>
          </View>
        </SurfaceToneContext.Provider>
      </View>

      <View
        {...responder.panHandlers}
        style={{ height: sizes.touchTarget, justifyContent: "center" }}
      >
        <View
          style={{
            height: TRACK_HEIGHT,
            borderRadius: TRACK_HEIGHT / 2,
            backgroundColor: colors.rule,
            overflow: "hidden",
          }}
        >
          <Animated.View
            style={[
              { height: TRACK_HEIGHT, backgroundColor: colors.ink },
              fillStyle,
            ]}
          />
        </View>
        {marker ? (
          <View
            pointerEvents="none"
            style={{
              position: "absolute",
              left: at(marker.value) - hairline,
              width: 2 * hairline,
              height: MARKER_HEIGHT,
              backgroundColor: colors.muted,
            }}
          />
        ) : null}
        <Animated.View
          pointerEvents="none"
          style={[
            {
              position: "absolute",
              left: 0,
              width: THUMB,
              height: THUMB,
              borderRadius: THUMB / 2,
              backgroundColor: colors.ink,
              borderWidth: 2,
              borderColor: colors.paper,
            },
            thumbStyle,
          ]}
        />
      </View>

      <View
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        style={{ height: 24 }}
      >
        {edges.map((edge) => (
          <View
            key={edge}
            style={{
              position: "absolute",
              top: 0,
              left: at(edge),
              width: hairline,
              height: TICK_HEIGHT,
              backgroundColor: colors.inputBorder,
            }}
          />
        ))}
        {marks.map((mark) => (
          <Text
            key={mark.label}
            size="meta"
            tone="muted"
            style={{
              position: "absolute",
              top: TICK_HEIGHT,
              left: at(mark.value) - 20,
              width: 40,
              textAlign: "center",
            }}
          >
            {mark.label}
          </Text>
        ))}
      </View>

      <View
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        style={{ height: 20 }}
      >
        {marker ? (
          <Text
            size="meta"
            tone="muted"
            numberOfLines={1}
            style={{
              position: "absolute",
              left: sliderLabelLeft(
                at(marker.value),
                MARKER_LABEL_WIDTH,
                width,
              ),
              width: MARKER_LABEL_WIDTH,
              textAlign: "center",
            }}
          >
            {marker.label}
          </Text>
        ) : null}
      </View>

      <View
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        style={{ flexDirection: "row", justifyContent: "space-between" }}
      >
        <Text size="meta" tone="muted">
          {startLabel}
        </Text>
        <Text size="meta" tone="muted">
          {endLabel}
        </Text>
      </View>
    </View>
  );
}
