import type { CSSProperties, ReactNode } from "react";

import { c, radii } from "../theme";
import { Text } from "./text";

/** The App's buttons: solid ink for the primary action, a hairline outline otherwise. */
export function Button({
  children,
  variant = "outline",
  height = 48,
  style,
}: {
  children: ReactNode;
  variant?: "primary" | "outline";
  height?: number;
  style?: CSSProperties;
}) {
  const primary = variant === "primary";
  return (
    <div
      style={{
        height,
        borderRadius: radii.lg,
        background: primary ? c.ink : c.paper,
        border: `1.5px solid ${c.ink}`,
        boxSizing: "border-box",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        ...style,
      }}
    >
      <Text size="lead" weight="semibold" color={primary ? c.paper : c.ink}>
        {children}
      </Text>
    </div>
  );
}
