import type { CSSProperties } from "react";

import { c, radii, resultMark } from "../theme";
import { Hatch } from "./hatch";

/** The app's result mark: disc with the cut-out arc, solid for a win, outline for a loss. */
export function ResultMark({
  variant,
  size,
  ink = c.ink,
  paper = c.paper,
}: {
  variant: "won" | "lost";
  size: number;
  ink?: string;
  paper?: string;
}) {
  const { viewBox, arc, wonDisc, outlineDisc, outlineStroke, wonArcStroke } = resultMark;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${viewBox} ${viewBox}`} style={{ display: "block", flexShrink: 0 }}>
      {variant === "won" ? (
        <>
          <circle {...wonDisc} fill={ink} />
          <path d={arc} fill="none" stroke={paper} strokeWidth={wonArcStroke} />
        </>
      ) : (
        <>
          <circle {...outlineDisc} fill="none" stroke={ink} strokeWidth={outlineStroke} />
          <path d={arc} fill="none" stroke={ink} strokeWidth={outlineStroke} />
        </>
      )}
    </svg>
  );
}

/** One Recent-form slot: solid for a win, outline for a loss, hatched for not played. */
export function FormSlot({
  variant,
  height = 38,
  style,
}: {
  variant: "won" | "lost" | "not-played";
  height?: number;
  style?: CSSProperties;
}) {
  const won = variant === "won";
  return (
    <div
      style={{
        position: "relative",
        flex: 1,
        height,
        borderRadius: radii.slot,
        background: won ? c.ink : c.paper,
        border: variant === "lost" ? `1.5px solid ${c.ink}` : "none",
        boxSizing: "border-box",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: won ? c.paper : c.ink,
        fontFamily: "Archivo",
        fontWeight: 600,
        fontSize: 13,
        ...style,
      }}
    >
      {variant === "not-played" ? <Hatch radius={radii.slot} /> : won ? "W" : "L"}
    </div>
  );
}
