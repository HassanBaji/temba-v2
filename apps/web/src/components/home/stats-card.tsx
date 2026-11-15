"use client";

import { useMessages } from "~/components/locale-provider";
import { Hatch } from "~/components/ui/hatch";
import type { HomeStats, StatMark } from "@repo/domain/home-stats";

import { SectionTitle } from "./section-title";

function Mark({ mark }: { mark: StatMark }) {
  if (mark.kind === "bar") {
    return (
      <span aria-hidden="true" className="flex h-1">
        <span
          className="bg-ink rounded-[1px]"
          style={{ width: `${mark.percent}%` }}
        />
        <Hatch className="flex-1 rounded-[1px] shadow-none" />
      </span>
    );
  }
  return (
    <span aria-hidden="true" className="flex h-1 gap-[3px]">
      {Array.from({ length: mark.total }, (_, index) =>
        index < mark.filled ? (
          <span key={index} className="bg-ink w-[9px] rounded-[1px]" />
        ) : (
          <Hatch key={index} className="w-[9px] rounded-[1px] shadow-none" />
        ),
      )}
    </span>
  );
}

export function StatsCard({ stats }: { stats: HomeStats }) {
  const m = useMessages();
  return (
    <section className="flex flex-col gap-3">
      <SectionTitle title={m.home.stats.title} meta={stats.meta} />
      <ul className="grid grid-cols-3 gap-2">
        {stats.tiles.map((tile) => (
          <li
            key={tile.key}
            aria-label={m.home.stats.tileSpoken(
              tile.label,
              tile.value,
              tile.caption,
            )}
            className="border-rule bg-paper rounded-card flex min-w-0 flex-col gap-2 border p-3.5"
          >
            <span className="text-eyebrow text-muted-foreground truncate">
              {tile.label}
            </span>
            <span className="font-expanded text-[22px] tabular-nums leading-none">
              {tile.value}
            </span>
            <Mark mark={tile.mark} />
            <span className="text-eyebrow text-muted-foreground truncate">
              {tile.caption}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
