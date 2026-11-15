"use client";

import type { ReactNode } from "react";

import { BackButton } from "~/components/ui/nav-icon-button";
import { cn } from "~/lib/utils";

/** Back, then the role chip and the header's action boxes, on ink or paper. */
export function TournamentHeaderBar({
  surface,
  backHref,
  chip,
  children,
}: {
  surface: "ink" | "paper";
  backHref: string;
  chip: string | null;
  /** The action boxes after the chip: share, the ⋮ menu. */
  children?: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <BackButton variant="boxed" surface={surface} href={backHref} />
      <div className="flex items-center gap-2">
        {chip ? (
          <span
            className={cn(
              "text-eyebrow rounded-sm border px-2 py-1 uppercase tracking-[0.1em]",
              surface === "ink"
                ? "border-dimrule text-dim"
                : "border-rule text-muted-foreground",
            )}
          >
            {chip}
          </span>
        ) : null}
        {children}
      </div>
    </div>
  );
}
