import * as React from "react";

import { cn } from "~/lib/utils";

/** A 36px hairline select at the design's block radius; native so long time lists stay keyboardable. */
export function NativeSelect({
  className,
  ...props
}: React.ComponentProps<"select">) {
  return (
    <select
      className={cn(
        "border-border text-meta rounded-block focus-visible:border-ink h-9 w-full border bg-transparent px-2.5 outline-none disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
}
