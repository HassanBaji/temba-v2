import { sparklinePoints } from "@repo/domain/home-level-chart";

import { cn } from "~/lib/utils";

const SPARK_WIDTH = 60;
const SPARK_HEIGHT = 18;

/** A Level's recent run, newest last along the reading direction. */
export function Sparkline({
  values,
  width = SPARK_WIDTH,
  height = SPARK_HEIGHT,
  className,
}: {
  values: readonly number[];
  width?: number;
  height?: number;
  className?: string;
}) {
  const points = sparklinePoints(values, width - 4, height - 4);
  if (!points) {
    return null;
  }
  const [x = 0, y = 0] = points.split(" ").at(-1)?.split(",").map(Number) ?? [];
  return (
    <svg
      aria-hidden="true"
      width={width}
      height={height}
      className={cn("text-ink shrink-0 rtl:-scale-x-100", className)}
    >
      <g transform="translate(2 2)">
        <polyline
          points={points}
          fill="none"
          stroke="currentColor"
          strokeWidth={1.5}
          strokeLinejoin="round"
        />
        <circle cx={x} cy={y} r={2.5} fill="currentColor" />
      </g>
    </svg>
  );
}
