"use client";

import { footballCardColors } from "@repo/design-tokens/marks";
import { type MatchLogKind } from "@repo/domain/football-match-log";
import { Ban } from "lucide-react";

import { cn } from "~/lib/utils";

/** A warning or a red card, drawn as the card itself. */
export function CardShape({
  kind,
  className,
}: {
  kind: "warning" | "red_card";
  className?: string;
}) {
  return (
    <span
      aria-hidden="true"
      className={cn("inline-block h-[13px] w-[9px] rounded-[2px]", className)}
      style={{
        backgroundColor:
          kind === "warning"
            ? footballCardColors.warning
            : footballCardColors.redCard,
      }}
    />
  );
}

/** What a log line is: a dot for a goal, a struck circle for an own goal, the card for a card. */
export function LogGlyph({
  kind,
  className,
}: {
  kind: MatchLogKind;
  className?: string;
}) {
  if (kind === "warning" || kind === "red_card") {
    return <CardShape kind={kind} className={className} />;
  }
  if (kind === "own_goal") {
    return <Ban aria-hidden="true" className={cn("size-4", className)} />;
  }
  return (
    <span
      aria-hidden="true"
      className={cn("bg-ink inline-block size-3 rounded-full", className)}
    />
  );
}
