import type { CSSProperties, ReactNode } from "react";

import { c, radii } from "../theme";

/** A bordered surface; related rows sit inside it, split by hairlines. */
export function Surface({
  tone = "paper",
  radius = radii.surface,
  padded = false,
  style,
  children,
}: {
  tone?: "paper" | "ink";
  radius?: number;
  padded?: boolean;
  style?: CSSProperties;
  children: ReactNode;
}) {
  const ink = tone === "ink";
  return (
    <div
      style={{
        background: ink ? c.ink : c.paper,
        color: ink ? c.paper : c.ink,
        borderRadius: radius,
        border: ink ? "none" : `1px solid ${c.rule}`,
        padding: padded ? 18 : 0,
        overflow: "hidden",
        position: "relative",
        ...style,
      }}
    >
      {children}
    </div>
  );
}

export function Hairline({ color = c.rule, inset = 0 }: { color?: string; inset?: number }) {
  return <div style={{ height: 1, background: color, marginLeft: inset }} />;
}
