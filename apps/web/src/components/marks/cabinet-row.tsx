"use client";

import Link from "next/link";

import { cn } from "~/lib/utils";

import type { CabinetRowModel } from "./cabinet-model";
import { MarkCoin } from "./mark-coin";

const COLUMNS = 4;

/** "Marks, 11 received" with the top coins (3c, 3d). The whole row opens all marks. */
export function CabinetRow({
  row,
  href,
}: {
  row: CabinetRowModel;
  href: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "group flex flex-col gap-3 rounded-[18px] outline-none",
        "focus-visible:ring-ring/50 focus-visible:ring-[3px] focus-visible:ring-offset-4",
      )}
    >
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="font-expanded text-title text-ink">{row.title}</h2>
        <p className="text-meta text-muted-foreground shrink-0">{row.meta}</p>
      </div>
      <div className="border-rule bg-paper rounded-card group-hover:bg-wash flex min-h-11 gap-2 border px-3.5 pb-3.5 pt-4 transition-colors">
        {row.empty ? (
          <p className="text-meta text-muted-foreground">{row.empty}</p>
        ) : (
          Array.from({ length: COLUMNS }, (_, index) => {
            const coin = row.coins[index];
            return (
              <div
                key={coin?.kind ?? `empty-${index}`}
                className="flex min-w-0 flex-1 flex-col items-center gap-2"
              >
                {coin ? (
                  <>
                    <MarkCoin kind={coin.kind} size="cabinet" />
                    <span className="flex flex-col items-center text-center">
                      <span className="text-eyebrow line-clamp-2">
                        {coin.name}
                      </span>
                      <span
                        aria-hidden="true"
                        dir="ltr"
                        className="text-eyebrow text-muted-foreground tabular-nums"
                      >
                        {coin.count.shown}
                      </span>
                      <span className="sr-only">{coin.count.spoken}</span>
                    </span>
                  </>
                ) : null}
              </div>
            );
          })
        )}
      </div>
    </Link>
  );
}
