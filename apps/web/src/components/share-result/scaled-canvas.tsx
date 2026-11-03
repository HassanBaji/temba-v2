"use client";

import * as React from "react";

export {
  STICKER_WIDTH,
  STORY_HEIGHT,
  STORY_WIDTH,
} from "@repo/domain/result-share-frame";

/**
 * Lays a card out at its export size and scales it down to the width it is
 * given, so the preview is the capture: the unscaled node is what gets
 * rendered to a PNG.
 */
export function ScaledCanvas({
  canvasRef,
  canvasWidth,
  canvasHeight,
  className,
  children,
}: {
  canvasRef: React.RefObject<HTMLDivElement | null>;
  canvasWidth: number;
  /** Left out for a card that takes its own height. */
  canvasHeight?: number;
  className?: string;
  children: React.ReactNode;
}) {
  const frameRef = React.useRef<HTMLDivElement | null>(null);
  const [frameWidth, setFrameWidth] = React.useState(0);
  const [measuredHeight, setMeasuredHeight] = React.useState(0);

  React.useEffect(() => {
    const frame = frameRef.current;
    const canvas = canvasRef.current;
    if (!frame) {
      return;
    }
    const observer = new ResizeObserver(() => {
      setFrameWidth(frame.clientWidth);
      if (canvas) {
        setMeasuredHeight(canvas.offsetHeight);
      }
    });
    observer.observe(frame);
    if (canvas) {
      observer.observe(canvas);
    }
    return () => observer.disconnect();
  }, [canvasRef]);

  const height = canvasHeight ?? measuredHeight;
  const scale = frameWidth > 0 ? frameWidth / canvasWidth : 0;

  return (
    <div
      ref={frameRef}
      className={className}
      style={{ position: "relative", width: "100%", height: height * scale }}
    >
      <div
        ref={canvasRef}
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: canvasWidth,
          height: canvasHeight,
          transform: `scale(${scale})`,
          transformOrigin: "top left",
          visibility: scale > 0 ? "visible" : "hidden",
        }}
      >
        {children}
      </div>
    </div>
  );
}
