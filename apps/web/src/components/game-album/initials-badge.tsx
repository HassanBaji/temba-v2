import { initials } from "@repo/domain/initials";

import { cn } from "~/lib/utils";

/** A square with someone's initials: ink for you, paper for anyone else. */
export function InitialsBadge({
  name,
  mine,
  className,
}: {
  name: string;
  mine: boolean;
  className?: string;
}) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "flex shrink-0 items-center justify-center rounded-[5px] font-semibold leading-none",
        mine
          ? "bg-control text-on-control"
          : "border-rule bg-paper text-ink border",
        className,
      )}
    >
      {initials(name)}
    </span>
  );
}
