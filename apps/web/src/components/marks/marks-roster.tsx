"use client";

import type { FootballBib } from "@repo/domain/football-lineup";
import type { MatchSlot } from "@repo/domain/marks";

import { UserAvatar } from "~/components/common/user-avatar";
import { BibChip } from "~/components/games/football-bibs";
import { cn } from "~/lib/utils";

import { CoinStack } from "./coin-stack";
import type { RosterModel, RosterRow } from "./marks-model";

function SideSwatch({
  slot,
  bib,
}: {
  slot: MatchSlot;
  bib: FootballBib | null;
}) {
  if (bib) {
    return <BibChip bib={bib} />;
  }
  return (
    <span
      aria-hidden="true"
      className={cn(
        "size-3 shrink-0 rounded-[3px] border",
        slot === 1 ? "bg-ink border-ink" : "bg-paper border-input",
      )}
    />
  );
}

function Row({
  row,
  onPressCoins,
}: {
  row: RosterRow;
  onPressCoins: (userId: string) => void;
}) {
  return (
    <li className="border-rule flex min-h-14 items-center gap-3 border-t px-4 py-2.5 first:border-t-0">
      <UserAvatar name={row.fullName} image={row.image} />
      <div className="min-w-0 flex-1">
        <p className="text-meta truncate font-semibold">{row.name}</p>
        {row.sub ? (
          <p className="text-muted-foreground text-eyebrow truncate">
            {row.sub}
          </p>
        ) : null}
      </div>
      {row.coinsSpoken ? (
        <button
          type="button"
          aria-label={row.coinsSpoken}
          onClick={() => onPressCoins(row.userId)}
          className="focus-visible:ring-ring/50 relative flex min-h-9 items-center rounded-md outline-none after:absolute after:inset-x-0 after:top-1/2 after:min-h-11 after:-translate-y-1/2 hover:opacity-70 focus-visible:ring-[3px]"
        >
          <CoinStack kinds={row.coins} size="roster" />
        </button>
      ) : null}
      <span
        dir="ltr"
        className="text-muted-foreground text-eyebrow w-[26px] shrink-0 text-end font-mono tabular-nums"
      >
        {row.count}
      </span>
    </li>
  );
}

/** "Marks so far" (2a) and "Marks" (2f): each side's participants and their coins. */
export function MarksRoster({
  roster,
  onPressCoins,
}: {
  roster: RosterModel;
  onPressCoins: (userId: string) => void;
}) {
  return (
    <section aria-labelledby="marks-roster-title" className="space-y-3">
      <div className="flex items-baseline justify-between gap-3">
        <h2 id="marks-roster-title" className="font-expanded text-title">
          {roster.title}
        </h2>
        <p className="text-muted-foreground text-meta">{roster.meta}</p>
      </div>
      <div className="border-rule rounded-card overflow-hidden border">
        {roster.sides.map((side, index) => (
          <div
            key={side.slot}
            className={cn(index > 0 && "border-rule border-t")}
          >
            <h3
              className={cn(
                "text-muted-foreground text-eyebrow flex items-center gap-2 px-4 pb-1.5",
                index === 0 ? "pt-2.5" : "pt-3.5",
              )}
            >
              <SideSwatch slot={side.slot} bib={side.bib} />
              {side.label}
            </h3>
            <ul>
              {side.rows.map((row) => (
                <Row key={row.userId} row={row} onPressCoins={onPressCoins} />
              ))}
            </ul>
          </div>
        ))}
      </div>
      {roster.footnote ? (
        <p className="text-muted-foreground text-eyebrow">{roster.footnote}</p>
      ) : null}
    </section>
  );
}
