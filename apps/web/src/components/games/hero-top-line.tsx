import type { SurfaceTone } from "@repo/domain/surface-tone";

import { cn } from "~/lib/utils";

/** The first line of a hero: a muted label, then an optional tag. */
export function HeroTopLine({
  tone,
  left,
  right,
}: {
  tone: SurfaceTone;
  left: string;
  right?: React.ReactNode;
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
    </div>
  );
}
