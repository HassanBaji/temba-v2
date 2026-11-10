import type { CSSProperties, ReactNode } from "react";

import { c, expanded as expandedToken, font, numerals, typeScale } from "../theme";

export type TextSize = keyof typeof typeScale | keyof typeof numerals | number;
type Weight = "regular" | "medium" | "semibold" | "bold";

const WEIGHTS: Record<Weight, number> = {
  regular: 400,
  medium: 500,
  semibold: 600,
  bold: 700,
};

function metrics(size: TextSize) {
  if (typeof size === "number") return { size, lineHeight: size * 1.08 };
  if (size in typeScale) return typeScale[size as keyof typeof typeScale];
  const px = numerals[size as keyof typeof numerals];
  return { size: px, lineHeight: px };
}

/** The app's Text primitive: Archivo, tabular figures, the expanded width for numerals. */
export function Text({
  size = "body",
  weight = "regular",
  expanded = false,
  color = c.ink,
  muted = false,
  align,
  style,
  children,
}: {
  size?: TextSize;
  weight?: Weight;
  expanded?: boolean;
  color?: string;
  muted?: boolean;
  align?: CSSProperties["textAlign"];
  style?: CSSProperties;
  children: ReactNode;
}) {
  const m = metrics(size);
  return (
    <span
      style={{
        display: "block",
        fontFamily: font.sans,
        fontSize: m.size,
        lineHeight: `${m.lineHeight}px`,
        fontWeight: expanded ? expandedToken.weight : WEIGHTS[weight],
        fontStretch: expanded ? `${expandedToken.width}%` : "100%",
        letterSpacing: expanded ? `${expandedToken.letterSpacingEm}em` : undefined,
        fontVariantNumeric: "tabular-nums",
        color: muted ? c.muted : color,
        textAlign: align ?? "left",
        whiteSpace: "nowrap",
        unicodeBidi: "plaintext",
        ...style,
      }}
    >
      {children}
    </span>
  );
}
