import * as React from "react";

import { cn } from "~/lib/utils";

export function ChoiceChip({
  selected = false,
  dashed = false,
  className,
  ...props
}: React.ComponentProps<"button"> & {
  selected?: boolean;
  dashed?: boolean;
}) {
  const { role, ...rest } = props;
  const radio = role === "radio";
  return (
    <button
      type="button"
      role={role}
      aria-checked={radio ? selected : undefined}
      className={cn(
        "focus-visible:ring-ring/50 inline-flex min-h-11 min-w-11 items-center justify-center gap-1.5 rounded-[10px] border px-3.5 text-sm outline-none focus-visible:ring-[3px] disabled:pointer-events-none disabled:opacity-40",
        selected
          ? "border-ink bg-ink text-paper font-semibold"
          : "border-rule bg-paper text-ink hover:bg-wash",
        dashed && !selected && "text-muted-foreground border-dashed",
        className,
      )}
      {...rest}
    />
  );
}
