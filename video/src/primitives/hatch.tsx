import { useId, type CSSProperties } from "react";

import { c, hatch } from "../theme";

/** 45° hairline hatch: "not yet". */
export function Hatch({
  radius = 5,
  stroke = c.faint,
  edge = c.rule,
  bordered = true,
  style,
}: {
  radius?: number;
  stroke?: string;
  edge?: string;
  bordered?: boolean;
  style?: CSSProperties;
}) {
  const id = useId().replace(/:/g, "");
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        borderRadius: radius,
        overflow: "hidden",
        boxShadow: bordered ? `inset 0 0 0 1px ${edge}` : undefined,
        ...style,
      }}
    >
      <svg width="100%" height="100%" style={{ display: "block" }}>
        <defs>
          <pattern
            id={`h${id}`}
            patternUnits="userSpaceOnUse"
            width={hatch.period}
            height={hatch.period}
            patternTransform={`rotate(${hatch.angle})`}
          >
            <rect x={0} y={0} width={hatch.stroke * 0.8} height={hatch.period} fill={stroke} />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill={`url(#h${id})`} />
      </svg>
    </div>
  );
}
