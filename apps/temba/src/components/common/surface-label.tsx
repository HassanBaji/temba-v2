import type { ReactNode } from "react";

import { cn } from "~/lib/utils";

const INSET = {
  home: "px-[22px] pt-[22px] pb-3",
  profile: "px-5 pt-5 pb-3",
} as const;

export function SurfaceLabel({
  children,
  meta,
  inset = "home",
  className,
}: {
  children: ReactNode;
  meta?: ReactNode;
  inset?: keyof typeof INSET;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "text-meta text-muted-foreground flex items-baseline justify-between gap-3",
        INSET[inset],
        className,
      )}
    >
      <h2 className="text-meta font-normal">{children}</h2>
      {meta ? <p className="shrink-0">{meta}</p> : null}
    </div>
  );
}
