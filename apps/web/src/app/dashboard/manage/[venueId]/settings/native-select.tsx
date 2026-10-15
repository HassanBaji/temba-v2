import * as React from "react";

import { cn } from "~/lib/utils";

export function NativeSelect({
  className,
  ...props
}: React.ComponentProps<"select">) {
  return (
    <select
      className={cn(
        "border-input text-body focus-visible:border-ring focus-visible:ring-ring/50 h-10 rounded-md border bg-transparent px-3 outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
}
