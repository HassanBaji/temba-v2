import type { ReactNode } from "react";

import { cn } from "~/lib/utils";

const FIGURES = [
  { key: "played", label: "Played" },
  { key: "won", label: "Won" },
  { key: "lost", label: "Lost" },
] as const;

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
 * hero's price/duration pair) that doesn't exist yet. `HomeAllTime` below
 * is untouched and keeps rendering its own three-column row directly.
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
          className="flex min-w-0 flex-1 flex-col items-center gap-1 px-3 py-4 first:pl-0 last:pr-0"
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

export function HomeAllTime({
  gamesPlayed,
  gamesWon,
  gamesLost,
}: {
  gamesPlayed: number;
  gamesWon: number;
  gamesLost: number;
}) {
  const values = {
    played: gamesPlayed,
    won: gamesWon,
    lost: gamesLost,
  };

  return (
    <section className="border-rule bg-paper overflow-hidden rounded-xl border">
      <h2 className="text-muted-foreground px-[22px] pb-3 pt-[22px] text-sm">
        All time
      </h2>
      <div className="divide-rule border-rule flex divide-x border-t px-[22px] pb-[22px]">
        {FIGURES.map((figure) => (
          <div
            key={figure.key}
            className="mt-4 flex min-w-0 flex-1 flex-col items-center gap-1 px-3 first:pl-0 last:pr-0"
          >
            <p className="font-expanded text-[34px] tabular-nums leading-none">
              {values[figure.key]}
            </p>
            <p className="text-muted-foreground text-meta">{figure.label}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
