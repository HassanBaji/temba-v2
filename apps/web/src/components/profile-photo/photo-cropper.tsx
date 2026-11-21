"use client";

import * as React from "react";
import { ZoomIn, ZoomOut } from "lucide-react";

import { useMessages } from "~/components/locale-provider";
import { Slider } from "~/components/ui/slider";
import {
  cropImageBox,
  panCrop,
  PHOTO_CROP_MAX_ZOOM,
  zoomCrop,
  type PhotoCrop,
  type Size,
} from "~/lib/photo-crop";
import { cn } from "~/lib/utils";

const KEY_STEP = 0.02;
const KEY_STEP_LARGE = 0.1;
const KEY_ZOOM = 1.1;
const WHEEL_ZOOM_RATE = 0.002;

type Point = { x: number; y: number };

function CroppedImage({
  src,
  natural,
  crop,
}: {
  src: string;
  natural: Size;
  crop: PhotoCrop;
}) {
  const box = cropImageBox(crop, natural);
  return (
    // eslint-disable-next-line @next/next/no-img-element -- a blob: URL positioned by the crop, not a static asset
    <img
      src={src}
      alt=""
      draggable={false}
      className="pointer-events-none absolute max-w-none select-none"
      style={{
        left: `${box.left}%`,
        top: `${box.top}%`,
        width: `${box.width}%`,
        height: `${box.height}%`,
      }}
    />
  );
}

function distance(a: Point, b: Point) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function midpoint(a: Point, b: Point): Point {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

/**
 * Frames a picked photo in the square the profile photo is saved as. Drag or
 * the arrow keys move it; a pinch, the scroll wheel, the slider or +/− zoom.
 * The previews draw the same crop at the sizes the photo is shown at.
 */
export function PhotoCropper({
  src,
  natural,
  crop,
  onCropChange,
  disabled = false,
}: {
  src: string;
  natural: Size;
  crop: PhotoCrop;
  onCropChange: React.Dispatch<React.SetStateAction<PhotoCrop>>;
  disabled?: boolean;
}) {
  const m = useMessages();
  const copy = m.webAuth.onboarding.photo;
  const hintId = React.useId();
  const frameRef = React.useRef<HTMLDivElement>(null);
  const pointers = React.useRef(new Map<number, Point>());

  const toFrameUnits = React.useCallback((point: Point) => {
    const rect = frameRef.current?.getBoundingClientRect();
    if (!rect || rect.width === 0) {
      return null;
    }
    return {
      x: (point.x - rect.left) / rect.width - 0.5,
      y: (point.y - rect.top) / rect.height - 0.5,
      side: rect.width,
    };
  }, []);

  React.useEffect(() => {
    const frame = frameRef.current;
    if (!frame || disabled) {
      return;
    }
    // React's onWheel is passive, so it cannot stop the page from scrolling.
    const onWheel = (event: WheelEvent) => {
      const focus = toFrameUnits({ x: event.clientX, y: event.clientY });
      if (!focus) {
        return;
      }
      event.preventDefault();
      const factor = Math.exp(-event.deltaY * WHEEL_ZOOM_RATE);
      onCropChange((current) =>
        zoomCrop(current, current.zoom * factor, natural, focus),
      );
    };
    frame.addEventListener("wheel", onWheel, { passive: false });
    return () => frame.removeEventListener("wheel", onWheel);
  }, [disabled, natural, onCropChange, toFrameUnits]);

  function onPointerDown(event: React.PointerEvent<HTMLDivElement>) {
    if (disabled || (event.pointerType === "mouse" && event.button !== 0)) {
      return;
    }
    event.currentTarget.setPointerCapture(event.pointerId);
    pointers.current.set(event.pointerId, {
      x: event.clientX,
      y: event.clientY,
    });
  }

  function onPointerMove(event: React.PointerEvent<HTMLDivElement>) {
    const tracked = pointers.current;
    const previous = tracked.get(event.pointerId);
    if (!previous) {
      return;
    }
    const next = { x: event.clientX, y: event.clientY };
    const side = frameRef.current?.getBoundingClientRect().width ?? 0;
    if (side === 0) {
      return;
    }
    const other = [...tracked.entries()].find(
      ([id]) => id !== event.pointerId,
    )?.[1];
    tracked.set(event.pointerId, next);

    if (!other) {
      onCropChange((current) =>
        panCrop(
          current,
          { x: (next.x - previous.x) / side, y: (next.y - previous.y) / side },
          natural,
        ),
      );
      return;
    }

    const before = distance(previous, other);
    if (before === 0) {
      return;
    }
    const ratio = distance(next, other) / before;
    const fromMid = midpoint(previous, other);
    const toMid = midpoint(next, other);
    const focus = toFrameUnits(toMid);
    if (!focus) {
      return;
    }
    onCropChange((current) =>
      zoomCrop(
        panCrop(
          current,
          {
            x: (toMid.x - fromMid.x) / side,
            y: (toMid.y - fromMid.y) / side,
          },
          natural,
        ),
        current.zoom * ratio,
        natural,
        focus,
      ),
    );
  }

  function onPointerEnd(event: React.PointerEvent<HTMLDivElement>) {
    pointers.current.delete(event.pointerId);
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    if (disabled) {
      return;
    }
    const step = event.shiftKey ? KEY_STEP_LARGE : KEY_STEP;
    const moves: Record<string, Point> = {
      ArrowLeft: { x: -step, y: 0 },
      ArrowRight: { x: step, y: 0 },
      ArrowUp: { x: 0, y: -step },
      ArrowDown: { x: 0, y: step },
    };
    const move = moves[event.key];
    if (move) {
      event.preventDefault();
      onCropChange((current) => panCrop(current, move, natural));
      return;
    }
    if (event.key === "+" || event.key === "=") {
      event.preventDefault();
      onCropChange((current) =>
        zoomCrop(current, current.zoom * KEY_ZOOM, natural),
      );
    } else if (event.key === "-" || event.key === "_") {
      event.preventDefault();
      onCropChange((current) =>
        zoomCrop(current, current.zoom / KEY_ZOOM, natural),
      );
    }
  }

  return (
    <div className="flex w-full flex-col items-center gap-3">
      <div
        ref={frameRef}
        role="group"
        tabIndex={disabled ? -1 : 0}
        aria-label={copy.frameLabel}
        aria-describedby={hintId}
        aria-disabled={disabled || undefined}
        className={cn(
          "border-rule bg-wash focus-visible:ring-ring/50 relative aspect-square w-full max-w-64 touch-none select-none overflow-hidden rounded-md border outline-none focus-visible:ring-[3px]",
          disabled ? "opacity-50" : "cursor-grab active:cursor-grabbing",
        )}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerEnd}
        onPointerCancel={onPointerEnd}
        onLostPointerCapture={onPointerEnd}
        onKeyDown={onKeyDown}
      >
        <CroppedImage src={src} natural={natural} crop={crop} />
        <div
          aria-hidden="true"
          className="bg-scrim pointer-events-none absolute inset-0 [mask-image:radial-gradient(circle_closest-side,transparent_calc(100%-1px),black_100%)]"
        />
      </div>

      <p id={hintId} className="text-meta text-muted-foreground text-center">
        {copy.hint}
      </p>

      <div className="flex w-full max-w-64 items-center gap-3">
        <ZoomOut
          aria-hidden="true"
          className="text-muted-foreground size-4 shrink-0"
        />
        <Slider
          min={1}
          max={PHOTO_CROP_MAX_ZOOM}
          step={0.01}
          value={[crop.zoom]}
          disabled={disabled}
          thumbLabel={copy.zoom}
          thumbValueText={copy.zoomValue(Math.round(crop.zoom * 100))}
          onValueChange={([zoom]) => {
            if (zoom !== undefined) {
              onCropChange((current) => zoomCrop(current, zoom, natural));
            }
          }}
        />
        <ZoomIn
          aria-hidden="true"
          className="text-muted-foreground size-4 shrink-0"
        />
      </div>

      <div className="flex flex-col items-center gap-2">
        <p className="text-eyebrow text-muted-foreground font-mono uppercase">
          {copy.previewLabel}
        </p>
        <div aria-hidden="true" className="flex items-end gap-3">
          <span className="border-rule rounded-card relative size-14 overflow-hidden border">
            <CroppedImage src={src} natural={natural} crop={crop} />
          </span>
          <span className="border-rule relative size-10 overflow-hidden rounded-full border">
            <CroppedImage src={src} natural={natural} crop={crop} />
          </span>
          <span className="border-rule relative size-8 overflow-hidden rounded-full border">
            <CroppedImage src={src} natural={natural} crop={crop} />
          </span>
        </div>
      </div>
    </div>
  );
}
