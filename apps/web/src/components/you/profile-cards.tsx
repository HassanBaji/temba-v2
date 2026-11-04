"use client";

import Link from "next/link";

import { UserAvatar } from "~/components/common/user-avatar";
import { useMessages } from "~/components/locale-provider";
import { ResultMark } from "~/components/temba/result-mark";
import { cn } from "~/lib/utils";

import type { PartnerRowView, RecentRowView, TileView } from "./you-form-model";
import { YouCard, YouSection } from "./you-section";

export function ProfileTiles({ tiles }: { tiles: readonly TileView[] }) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {tiles.map((tile) => (
        <YouCard key={tile.label} className="flex flex-col gap-1 px-4 py-3.5">
          <p className="text-eyebrow text-muted-foreground">{tile.label}</p>
          <p className="font-expanded text-h2 text-ink tabular-nums leading-tight">
            {tile.value}
          </p>
          {tile.sub ? (
            <p className="text-eyebrow text-muted-foreground">{tile.sub}</p>
          ) : null}
        </YouCard>
      ))}
    </div>
  );
}

export function PartnersCard({
  title,
  meta,
  rows,
}: {
  title: string;
  meta: string;
  rows: readonly PartnerRowView[];
}) {
  const m = useMessages();

  return (
    <YouSection title={title} meta={rows.length > 0 ? meta : null}>
      {rows.length === 0 ? (
        <YouCard className="text-meta text-muted-foreground px-5 py-4">
          {m.you.partners.empty}
        </YouCard>
      ) : (
        <YouCard>
          <ul className="divide-rule divide-y">
            {rows.map((row) => (
              <li
                key={row.userId}
                className="flex items-center gap-3 px-4 py-3"
              >
                <span className="sr-only">{row.spoken}</span>
                <UserAvatar
                  name={row.name}
                  image={row.image}
                  className="border-rule text-eyebrow [&_[data-slot=avatar-fallback]]:bg-paper size-9 rounded-[9px] border font-semibold data-[size=default]:size-9 [&_[data-slot=avatar-fallback]]:rounded-[9px]"
                />
                <div aria-hidden="true" className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="text-body text-ink truncate">
                      {row.name}
                    </span>
                    <span className="text-meta text-ink shrink-0 font-semibold tabular-nums">
                      {row.record}
                    </span>
                  </div>
                  <div className="bg-wash mt-1.5 h-1 overflow-hidden rounded-full">
                    <div
                      className="bg-ink h-full rounded-full"
                      style={{ width: `${row.percent}%` }}
                    />
                  </div>
                </div>
                <span
                  aria-hidden="true"
                  className="text-meta text-muted-foreground w-10 shrink-0 text-end tabular-nums"
                >
                  {row.percent}%
                </span>
              </li>
            ))}
          </ul>
        </YouCard>
      )}
    </YouSection>
  );
}

function RecentRowBody({ row }: { row: RecentRowView }) {
  return (
    <>
      <ResultMark variant={row.outcome} className="size-4" />
      <div className="min-w-0 flex-1">
        <p className="text-meta text-ink truncate">{row.title}</p>
        <p className="text-eyebrow text-muted-foreground truncate">{row.sub}</p>
      </div>
      <div className="flex shrink-0 flex-col items-end">
        {row.score ? (
          <span
            dir="ltr"
            className="text-meta text-ink whitespace-pre font-semibold tabular-nums"
          >
            {row.score}
          </span>
        ) : null}
        {row.delta ? (
          <span
            dir="ltr"
            className="text-eyebrow text-muted-foreground tabular-nums"
          >
            {row.delta}
          </span>
        ) : null}
      </div>
    </>
  );
}

export function RecentMatchesCard({
  meta,
  rows,
}: {
  meta: string;
  rows: readonly RecentRowView[];
}) {
  const m = useMessages();
  const rowClassName = "flex items-center gap-3 px-4 py-3";

  return (
    <YouSection title={m.you.recent.title} meta={rows.length > 0 ? meta : null}>
      {rows.length === 0 ? (
        <YouCard className="text-meta text-muted-foreground px-5 py-4">
          {m.you.recent.empty}
        </YouCard>
      ) : (
        <YouCard>
          <ul className="divide-rule divide-y">
            {rows.map((row) => (
              <li key={row.matchId}>
                {row.href ? (
                  <Link
                    href={row.href}
                    className={cn(
                      rowClassName,
                      "hover:bg-wash focus-visible:ring-ring/50 outline-none focus-visible:ring-[3px] focus-visible:ring-inset",
                    )}
                  >
                    <RecentRowBody row={row} />
                  </Link>
                ) : (
                  <div className={rowClassName}>
                    <RecentRowBody row={row} />
                  </div>
                )}
              </li>
            ))}
          </ul>
        </YouCard>
      )}
    </YouSection>
  );
}
