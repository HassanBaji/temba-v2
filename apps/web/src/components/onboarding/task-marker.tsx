import { Check } from "lucide-react";

import { Hatch } from "~/components/ui/hatch";
import { cn } from "~/lib/utils";

/**
 * The circle before a checklist row: hatched while the task is still open
 * ("not yet"), solid ink with a check once it is done.
 */
export function TaskMarker({
  done,
  className,
}: {
  done: boolean;
  className?: string;
}) {
  if (!done) {
    return (
      <Hatch
        className={cn(
          "border-rule size-[22px] shrink-0 rounded-full border",
          className,
        )}
      />
    );
  }
  return (
    <span
      aria-hidden="true"
      className={cn(
        "bg-ink text-paper flex size-[22px] shrink-0 items-center justify-center rounded-full",
        className,
      )}
    >
      <Check className="size-3.5" strokeWidth={3} />
    </span>
  );
}
