"use client";

import { bibColors, colors } from "@repo/design-tokens";
import type { Bibs, Side } from "@repo/domain/football-board";
import {
  footballBibName,
  MORE_FOOTBALL_BIBS,
  pickFootballBib,
  PRIMARY_FOOTBALL_BIBS,
  type FootballBib,
} from "@repo/domain/football-lineup";
import { Plus } from "lucide-react";
import * as React from "react";

import { cn } from "~/lib/utils";

/**
 * The fill and edge for a bib: white gets a visible edge on paper, black
 * one on ink.
 */
export function bibStyle(bib: FootballBib): React.CSSProperties {
  const { fill, on } = bibColors[bib];
  const edge =
    fill === colors.paper
      ? colors.inputBorder
      : fill === colors.ink
        ? colors.dimrule
        : fill;
  return { backgroundColor: fill, color: on, borderColor: edge };
}

export function BibChip({
  bib,
  className,
}: {
  bib: FootballBib;
  className?: string;
}) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "inline-block size-3 shrink-0 rounded-[3px] border",
        className,
      )}
      style={bibStyle(bib)}
    />
  );
}

function SideRow({
  side,
  bibs,
  onChange,
}: {
  side: Side;
  bibs: Bibs;
  onChange: (bibs: Bibs) => void;
}) {
  const current = side === 1 ? bibs.slot1 : bibs.slot2;
  const [more, setMore] = React.useState(MORE_FOOTBALL_BIBS.includes(current));
  const label = side === 1 ? "Team A" : "Team B";
  const swatch = (bib: FootballBib) => {
    const selected = bib === current;
    return (
      <button
        key={bib}
        type="button"
        role="radio"
        aria-checked={selected}
        aria-label={`${label}, ${footballBibName(bib, side)}`}
        onClick={() => onChange(pickFootballBib(bibs, side, bib))}
        className={cn(
          "focus-visible:ring-ring/50 flex size-10 items-center justify-center rounded-full border-2 outline-none focus-visible:ring-[3px]",
          selected ? "border-ink" : "border-transparent",
        )}
      >
        <span
          className="size-[30px] rounded-full border"
          style={bibStyle(bib)}
        />
      </button>
    );
  };
  return (
    <div className="space-y-1.5">
      <div
        role="radiogroup"
        aria-label={`${label} bib colour`}
        className="flex flex-wrap items-center gap-0.5"
      >
        <span className="text-muted-foreground text-meta w-16 shrink-0">
          {label}
        </span>
        {PRIMARY_FOOTBALL_BIBS.map(swatch)}
        <button
          type="button"
          aria-label="More colours"
          aria-expanded={more}
          onClick={() => setMore((open) => !open)}
          className="focus-visible:ring-ring/50 flex size-10 items-center justify-center rounded-full outline-none focus-visible:ring-[3px]"
        >
          <span
            className={cn(
              "flex size-[30px] items-center justify-center rounded-full border",
              more ? "border-ink" : "border-input",
            )}
          >
            <Plus aria-hidden="true" className="size-4" />
          </span>
        </button>
      </div>
      {more ? (
        <div className="flex flex-wrap gap-0.5 pl-16">
          {MORE_FOOTBALL_BIBS.map(swatch)}
        </div>
      ) : null}
    </div>
  );
}

export function BibPicker({
  bibs,
  onChange,
}: {
  bibs: Bibs;
  onChange: (bibs: Bibs) => void;
}) {
  return (
    <section className="border-rule bg-paper space-y-3 rounded-xl border p-[22px]">
      <div className="text-muted-foreground text-meta flex justify-between">
        <span>Bib colours</span>
        <span>
          {footballBibName(bibs.slot1, 1)} vs {footballBibName(bibs.slot2, 2)}
        </span>
      </div>
      <SideRow side={1} bibs={bibs} onChange={onChange} />
      <SideRow side={2} bibs={bibs} onChange={onChange} />
      <p className="text-muted-foreground text-meta">
        The plus opens more colours. The organizer brings both sets of bibs.
      </p>
    </section>
  );
}
