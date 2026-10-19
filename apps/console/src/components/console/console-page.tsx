import type { ReactNode } from "react";

import { cn } from "~/lib/utils";

/** Standard page padding from the design (26px top, 32px sides). */
export function ConsolePage({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-1 flex-col gap-[22px] px-8 pb-8 pt-[26px]",
        className,
      )}
    >
      {children}
    </div>
  );
}
