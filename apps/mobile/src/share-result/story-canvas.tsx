import { useState, type RefObject } from "react";
import { View } from "react-native";

import { isLayoutRtl } from "../i18n/rtl";

export {
  STICKER_WIDTH,
  STORY_HEIGHT,
  STORY_WIDTH,
} from "@repo/domain/result-share-frame";

/**
 * Lays a card out at its export size and scales it down to the width it is
 * given, so the preview is the capture: `captureRef(canvasRef)` renders the
 * unscaled card at full resolution.
 */
export function ScaledCanvas({
  canvasRef,
  canvasWidth,
  canvasHeight,
  onCanvasHeight,
  children,
}: {
  canvasRef: RefObject<View | null>;
  canvasWidth: number;
  /** Left out for a card that takes its own height, reported through `onCanvasHeight`. */
  canvasHeight?: number;
  onCanvasHeight?: (height: number) => void;
  children: React.ReactNode;
}) {
  const [frameWidth, setFrameWidth] = useState(0);
  const [measuredHeight, setMeasuredHeight] = useState(0);
  const height = canvasHeight ?? measuredHeight;
  const scale = frameWidth > 0 ? frameWidth / canvasWidth : 0;

  return (
    <View
      onLayout={({ nativeEvent }) => setFrameWidth(nativeEvent.layout.width)}
      // Physical on purpose: in RTL `left: 0` would become `right: 0` and the
      // card, scaled from its top-left corner, would land off-screen.
      style={{ width: "100%", height: height * scale, direction: "ltr" }}
    >
      {scale > 0 ? (
        <View
          ref={canvasRef}
          collapsable={false}
          onLayout={
            canvasHeight == null
              ? ({ nativeEvent }) => {
                  setMeasuredHeight(nativeEvent.layout.height);
                  onCanvasHeight?.(nativeEvent.layout.height);
                }
              : undefined
          }
          style={{
            position: "absolute",
            top: 0,
            // eslint-disable-next-line no-restricted-syntax -- share canvas: the frame above is LTR, see its comment
            left: 0,
            width: canvasWidth,
            height: canvasHeight,
            transform: [{ scale }],
            transformOrigin: "top left",
            direction: isLayoutRtl() ? "rtl" : "ltr",
          }}
        >
          {children}
        </View>
      ) : null}
    </View>
  );
}
