import type { SurfaceTone } from "@repo/domain/surface-tone";

import { cn } from "~/lib/utils";

/** The outlined mono "CHALLENGE" tag that sits beside share in a Challenge Game's hero. */
export function ChallengeTag({
  label,
  tone,
}: {
  label: string;
  tone: SurfaceTone;
}) {
  return (
    <span
      className={cn(
        "shrink-0 rounded-[6px] border px-[7px] py-1 font-mono text-[10px] uppercase leading-none tracking-[0.08em]",
        tone === "ink"
          ? "border-dimrule text-dim"
          : "border-rule text-muted-foreground",
      )}
    >
      {label}
    </span>
  );
}
