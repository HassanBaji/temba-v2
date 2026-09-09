import * as React from "react";

import { cn } from "~/lib/utils";

const ARC = "M6,50 C18,16 82,16 94,50";

export function TembaMark({
  variant = "reduction",
  className,
  width = 26,
  height = 26,
  ...props
}: React.ComponentProps<"svg"> & {
  variant?: "reduction" | "reversed";
}) {
  const reversed = variant === "reversed";

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 100 100"
      width={width}
      height={height}
      role="img"
      aria-hidden="true"
      className={cn("inline-block shrink-0", className)}
      {...props}
    >
      <circle
        cx="50"
        cy="50"
        r="44"
        className={reversed ? "fill-paper" : "fill-ink"}
      />
      <path
        d={ARC}
        fill="none"
        strokeWidth={6}
        className={reversed ? "stroke-ink" : "stroke-paper"}
      />
    </svg>
  );
}
