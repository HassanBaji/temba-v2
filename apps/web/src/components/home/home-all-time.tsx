import type { ReactNode } from "react";

import { cn } from "~/lib/utils";

export type DividedFigure = {
  key: string;
  value: ReactNode;
  label: ReactNode;
};

/**
 * Generic divided-figure-pair row, factored out of this file's own
 * Played/Won/Lost pattern for the Game-details hero (game-details redesign,
 * TEM-179), which needs the same "big number over a muted label" shape on
 * both a light surface (Final hero's duration/won-by pair) and a new dark
 * surface (`divide-dimrule`/`border-dimrule` — Upcoming/Needs-a-score
 * hero's price/duration pair) that doesn't exist yet.
 */
export function DividedFigurePair({
  figures,
  surface = "light",
}: {
  figures: DividedFigure[];
  surface?: "light" | "dark";
}) {
  return (
    <div
      className={cn(
        "flex divide-x border-t",
        surface === "dark"
          ? "divide-dimrule border-dimrule"
          : "divide-rule border-rule",
      )}
    >
      {figures.map((figure) => (
        <div
          key={figure.key}
          className="flex min-w-0 flex-1 flex-col items-center gap-1 px-3 pt-4 first:pl-0 last:pr-0"
        >
          <p className="font-expanded text-[34px] tabular-nums leading-none">
            {figure.value}
          </p>
          <p
            className={cn(
              "text-meta text-center",
              surface === "dark" ? "text-dim" : "text-muted-foreground",
            )}
          >
            {figure.label}
          </p>
        </div>
      ))}
    </div>
  );
}
