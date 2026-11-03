import type { SurfaceTone } from "@repo/domain/surface-tone";

import { cn } from "~/lib/utils";

/** The first line of a hero: a muted label, an optional tag, then the screen's actions. */
export function HeroTopLine({
  tone,
  left,
  right,
  actions,
}: {
  tone: SurfaceTone;
  left: string;
  right?: React.ReactNode;
  actions?: React.ReactNode;
}) {
  const ink = tone === "ink";
  return (
    <div
      className={cn(
        "text-meta flex items-center justify-between gap-3",
        ink ? "text-dim" : "text-muted-foreground",
      )}
    >
      <p className="min-w-0 flex-1 truncate">{left}</p>
      {right}
      {actions ? (
        <div
          className={cn(
            "flex shrink-0 items-center gap-2",
            ink ? "text-paper" : "text-ink",
          )}
        >
          {actions}
        </div>
      ) : null}
    </div>
  );
}
