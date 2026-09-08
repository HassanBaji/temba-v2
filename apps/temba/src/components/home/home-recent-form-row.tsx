"use client";

import { ErrorState } from "~/components/common/error-state";
import { Skeleton } from "~/components/ui/skeleton";
import { api } from "~/trpc/react";

import {
  deriveRecentForm,
  recentFormRecord,
  recentFormStatus,
  recentFormWinRateCopy,
  type RecentFormBar,
  type RecentFormView,
} from "./home-recent-form";

function slotLabel(bar: RecentFormBar): string {
  if (bar.kind === "empty") {
    return "Not played";
  }
  if (bar.outcome === "won") {
    return "Won";
  }
  if (bar.outcome === "lost") {
    return "Lost";
  }
  return "Drawn";
}

function FormSlot({ bar }: { bar: RecentFormBar }) {
  if (bar.kind === "empty") {
    return (
      <div className="relative h-[38px] min-w-0 flex-1">
        <div
          aria-hidden="true"
          className="hatch absolute inset-0 rounded-[5px]"
        />
        <span className="sr-only">{slotLabel(bar)}</span>
      </div>
    );
  }

  if (bar.outcome === "won") {
    return (
      <div className="bg-ink text-paper flex h-[38px] min-w-0 flex-1 items-center justify-center rounded-[5px] text-sm font-semibold">
        <span className="sr-only">{slotLabel(bar)}</span>
        <span aria-hidden="true">{bar.label}</span>
      </div>
    );
  }

  return (
    <div className="border-ink bg-paper text-ink relative flex h-[38px] min-w-0 flex-1 items-center justify-center overflow-hidden rounded-[5px] border-[1.5px] text-sm font-semibold">
      {bar.outcome === "draw" ? (
        <span
          aria-hidden="true"
          className="bg-ink absolute inset-0 origin-center opacity-80"
          style={{
            clipPath: "polygon(100% 0, 100% 1.5px, 1.5px 100%, 0 100%)",
          }}
        />
      ) : null}
      <span className="sr-only">{slotLabel(bar)}</span>
      <span aria-hidden="true" className="relative">
        {bar.label}
      </span>
    </div>
  );
}

/**
 * Standalone 46px W/L mark for the Final Game-details hero (game-details
 * redesign, TEM-179): the exact solid-ink-fill (win) / ink-outline (loss)
 * rule as `FormSlot` above, at a size no existing component renders (form
 * slots are 38px and always inline in a row, never standalone).
 */
export function WinLossMark({ outcome }: { outcome: "won" | "lost" | "draw" }) {
  const label =
    outcome === "won" ? "Win" : outcome === "lost" ? "Loss" : "Draw";
  const glyph = outcome === "won" ? "W" : outcome === "lost" ? "L" : "D";

  if (outcome === "won") {
    return (
      <div className="bg-ink text-paper flex size-[46px] shrink-0 items-center justify-center rounded-[7px] text-xl font-semibold">
        <span className="sr-only">{label}</span>
        <span aria-hidden="true">{glyph}</span>
      </div>
    );
  }

  return (
    <div className="border-ink bg-paper text-ink relative flex size-[46px] shrink-0 items-center justify-center overflow-hidden rounded-[7px] border-[1.5px] text-xl font-semibold">
      {outcome === "draw" ? (
        <span
          aria-hidden="true"
          className="bg-ink absolute inset-0 origin-center opacity-80"
          style={{
            clipPath: "polygon(100% 0, 100% 1.5px, 1.5px 100%, 0 100%)",
          }}
        />
      ) : null}
      <span className="sr-only">{label}</span>
      <span aria-hidden="true" className="relative">
        {glyph}
      </span>
    </div>
  );
}

export function HomeRecentFormBlock({ form }: { form: RecentFormView }) {
  const record = recentFormRecord(form);
  const status = recentFormStatus(form);
  const winRate = recentFormWinRateCopy(form);

  return (
    <section className="border-rule bg-paper rounded-xl border p-[22px]">
      <div className="flex items-center justify-between">
        <p className="text-muted-foreground text-sm font-normal">Recent Form</p>
        <p className="text-muted-foreground text-sm font-normal">
          Last 10 matches
        </p>
      </div>
      <div className="mt-4 flex items-end justify-between gap-3">
        <div>
          <p className="font-expanded text-[52px] tabular-nums leading-none">
            {record}
          </p>
          <p className="text-muted-foreground text-meta mt-1">{status}</p>
        </div>
        <div className="text-right">
          <p className="font-expanded text-[22px] tabular-nums leading-none">
            {winRate.value}
          </p>
          <p className="text-muted-foreground text-meta mt-1">
            {winRate.caption}
          </p>
        </div>
      </div>
      <div className="mt-4 flex gap-1">
        {form.bars.map((bar, index) => (
          <FormSlot
            key={
              bar.kind === "played" ? `${bar.label}-${index}` : `empty-${index}`
            }
            bar={bar}
          />
        ))}
      </div>
      <div className="text-muted-foreground text-meta mt-2 flex justify-between">
        <p>Most recent</p>
        <p>Oldest</p>
      </div>
    </section>
  );
}

export function HomeRecentForm() {
  const history = api.games.listMyMatchHistory.useQuery();

  if (history.isLoading) {
    return (
      <div aria-busy="true" className="border-rule rounded-xl border p-[22px]">
        <Skeleton className="h-12 w-28" />
        <div className="mt-4 flex gap-1">
          {Array.from({ length: 10 }).map((_, index) => (
            <Skeleton key={index} className="h-[38px] flex-1 rounded-[5px]" />
          ))}
        </div>
      </div>
    );
  }

  if (history.error) {
    return (
      <ErrorState
        title="Recent form could not be loaded"
        message={history.error.message}
        onRetry={() => {
          void history.refetch();
        }}
      />
    );
  }

  const form = deriveRecentForm(history.data ?? []);
  return <HomeRecentFormBlock form={form} />;
}
