"use client";

import { Star } from "lucide-react";
import { useEffect, useRef } from "react";

import { fishSizes } from "@repo/design-tokens/fish";
import {
  performanceResultView,
  type PerformanceResultRow,
  type PerformanceResultView,
} from "@repo/domain/performance-rating";
import { TierFish } from "~/components/groups/tier-fish";
import { useLocale } from "~/components/locale-provider";
import { Hatch } from "~/components/ui/hatch";
import { useNow } from "~/hooks/use-now";
import { cn } from "~/lib/utils";
import { api, type RouterOutputs } from "~/trpc/react";

type RatingWindow = RouterOutputs["games"]["byId"]["ratingWindow"];
type SettledView = Extract<PerformanceResultView, { kind: "settled" }>;

/**
 * Screen 4c on a played Game: once the Rating window closes, the viewer's
 * rating and what it did to their tier points; before that, when it arrives.
 */
export function PerformanceResultCard({
  gameId,
  window,
}: {
  gameId: string;
  window: RatingWindow;
}) {
  const locale = useLocale();
  const now = useNow();
  const query = api.games.performanceRatingResult.useQuery(
    { gameId },
    { enabled: window !== null },
  );
  const { refetch } = query;
  const windowState = window?.state;
  const shownState = useRef(windowState);
  useEffect(() => {
    if (shownState.current !== windowState) {
      shownState.current = windowState;
      void refetch();
    }
  }, [windowState, refetch]);

  if (!window || !query.data) {
    return null;
  }
  const view = performanceResultView(query.data, locale, {
    viewerMayRate: window.viewerMayRate,
    now,
  });
  if (!view) {
    return null;
  }
  if (view.kind === "pending") {
    return (
      <section className="border-rule rounded-[16px] border px-[18px] py-4">
        <p className="font-semibold">{view.title}</p>
        <p className="text-meta text-muted-foreground mt-0.5">
          {view.description}
        </p>
      </section>
    );
  }
  return <SettledResult view={view} />;
}

function SettledResult({ view }: { view: SettledView }) {
  return (
    <div className="flex flex-col gap-[26px]">
      <section className="border-rule bg-wash rounded-[16px] border px-5 py-[18px]">
        <div className="text-meta text-muted-foreground flex justify-between gap-3">
          <span>{view.gameLine}</span>
          {view.scoreLine ? <span>{view.scoreLine}</span> : null}
        </div>
        {view.rating ? (
          <>
            <p className="mt-2.5 flex items-baseline gap-1">
              <span className="sr-only">{view.rating.spoken}</span>
              <span
                aria-hidden="true"
                className="font-expanded text-[52px] font-bold tabular-nums leading-[0.9] tracking-[-0.03em]"
              >
                {view.rating.value}
              </span>
              <span aria-hidden="true" className="text-muted-foreground">
                {view.rating.ofTen}
              </span>
            </p>
            <p className="border-dimrule text-meta text-muted-foreground mt-3.5 border-t pt-3">
              {view.rating.note}
            </p>
          </>
        ) : null}
      </section>

      <Section title={view.points.title} aside={view.points.aside}>
        <ul className="border-rule divide-rule bg-paper divide-y overflow-hidden rounded-[14px] border">
          {view.points.rows.map((row) => (
            <PointsRow key={row.title} row={row} />
          ))}
          <PointsRow row={view.points.total} total />
        </ul>
      </Section>

      <Section title={view.tier.title} aside={view.tier.aside}>
        <div className="border-rule bg-paper rounded-[14px] border p-4">
          <FishTrack tier={view.tier} />
          <p className="text-meta text-muted-foreground mt-3">
            {view.tier.line}
          </p>
        </div>
      </Section>

      {view.mvp ? (
        <div className="border-rule bg-paper flex items-center gap-3 rounded-[14px] border px-4 py-[13px]">
          <span className="border-rule flex size-9 shrink-0 items-center justify-center rounded-[10px] border">
            <Star aria-hidden="true" className="size-4" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-semibold">{view.mvp.title}</p>
            {view.mvp.detail ? (
              <p className="text-meta text-muted-foreground">
                {view.mvp.detail}
              </p>
            ) : null}
          </div>
        </div>
      ) : null}

      <p className="text-meta text-muted-foreground">{view.footnote}</p>
    </div>
  );
}

function Section({
  title,
  aside,
  children,
}: {
  title: string;
  aside: string | null;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-2.5">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-title font-semibold">{title}</h2>
        {aside ? (
          <p className="text-meta text-muted-foreground">{aside}</p>
        ) : null}
      </div>
      {children}
    </section>
  );
}

function PointsRow({
  row,
  total = false,
}: {
  row: PerformanceResultRow;
  total?: boolean;
}) {
  return (
    <li
      className={cn(
        "flex items-center gap-3 px-4 py-[13px]",
        total && "bg-wash py-3.5",
      )}
    >
      <div className="min-w-0 flex-1">
        <p className="font-semibold">{row.title}</p>
        <p className="text-meta text-muted-foreground">{row.detail}</p>
      </div>
      <span className="sr-only">{row.spoken}</span>
      <span
        aria-hidden="true"
        className={cn(
          "font-expanded shrink-0 font-bold tabular-nums tracking-[-0.03em]",
          total ? "text-h2" : "text-lead",
        )}
      >
        {row.delta}
      </span>
    </li>
  );
}

function FishTrack({ tier }: { tier: SettledView["tier"] }) {
  if (tier.provisional) {
    return (
      <Hatch
        role="img"
        aria-hidden={false}
        aria-label={tier.aside}
        radius="sm"
        className="block w-full"
        style={{ height: fishSizes.row.height }}
      />
    );
  }
  if (!tier.track) {
    return null;
  }
  return (
    <ul className="grid grid-cols-4 gap-1" aria-label={tier.title}>
      {tier.track.map((fish) => (
        <li
          key={fish.band}
          aria-current={fish.current ? "true" : undefined}
          className={cn(
            "flex flex-col items-center gap-1.5",
            fish.current ? "opacity-100" : "opacity-20",
          )}
        >
          <TierFish band={fish.band} label={fish.label} />
          <span className={cn("text-eyebrow", fish.current && "font-semibold")}>
            {fish.label}
          </span>
        </li>
      ))}
    </ul>
  );
}
