import { useState, type RefObject } from "react";
import { View } from "react-native";

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
      style={{ width: "100%", height: height * scale }}
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
            left: 0,
            width: canvasWidth,
            height: canvasHeight,
            transform: [{ scale }],
            transformOrigin: "top left",
          }}
        >
          {children}
        </View>
      ) : null}
    </View>
  );
}
