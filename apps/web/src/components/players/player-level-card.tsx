"use client";

import { useEffect, useState } from "react";

import type { PlayerLevelCardView } from "@repo/domain/player-profile-level";
import { cn } from "~/lib/utils";

export function PlayerLevelCard({ view }: { view: PlayerLevelCardView }) {
  const [drawn, setDrawn] = useState(false);
  useEffect(() => {
    setDrawn(true);
  }, []);

  if (view.kind === "none") {
    return (
      <section className="hatch-on-ink rounded-card relative p-5">
        <h2 className="text-meta text-dim">Level</h2>
        <p className="text-lead mt-1 font-semibold">{view.label}</p>
      </section>
    );
  }

  return (
    <section className="bg-raised rounded-card p-5">
      <div className="text-meta text-dim flex items-baseline justify-between gap-3">
        <h2 className="text-meta font-normal">Level</h2>
        {view.provisional ? <p>Provisional</p> : null}
      </div>
      <p className="mt-2 flex items-baseline gap-3">
        <span
          aria-hidden="true"
          className="font-expanded text-[48px] leading-none"
        >
          {view.displayBand}
        </span>
        <span
          aria-hidden="true"
          className="font-expanded text-[24px] tabular-nums leading-none"
        >
          {view.level}
        </span>
        <span className="sr-only">{view.accessibilityLabel}</span>
      </p>
      <div
        aria-hidden="true"
        className={cn(
          "rounded-xs mt-4 h-2.5 w-full overflow-hidden",
          view.provisional ? "hatch-on-ink" : "bg-dimrule",
        )}
      >
        <div
          className="bg-paper h-full motion-reduce:transition-none"
          style={{
            width: drawn ? `${view.fillPercent}%` : "0%",
            transition: "width 900ms cubic-bezier(0.2, 0.7, 0.2, 1)",
          }}
        />
      </div>
      <div aria-hidden="true" className="text-meta text-dim mt-2 space-y-0.5">
        {view.lines.map((line) => (
          <p key={line} className="tabular-nums">
            {line}
          </p>
        ))}
      </div>
    </section>
  );
}
