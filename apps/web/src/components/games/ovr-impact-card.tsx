"use client";

import {
  ovrImpactView,
  type OvrImpactRow,
} from "@repo/domain/game-rating-impact";
import { useLocale } from "~/components/locale-provider";
import { cn } from "~/lib/utils";
import { type RouterOutputs } from "~/trpc/react";

type RatingImpact = RouterOutputs["games"]["byId"]["ratingImpact"];

/** "What moved your OVR" on a played football Game that counts for Temba Level. */
export function OvrImpactCard({
  ratingImpact,
}: {
  ratingImpact: RatingImpact;
}) {
  const locale = useLocale();
  if (!ratingImpact?.ovr) {
    return null;
  }
  const view = ovrImpactView(
    { ...ratingImpact, ovr: ratingImpact.ovr },
    locale,
  );

  return (
    <section
      data-slot="ovr-impact-card"
      className="flex flex-col gap-2.5"
      aria-labelledby="ovr-impact-title"
    >
      <p className="text-eyebrow font-semibold">{view.tag}</p>
      <div className="flex items-baseline justify-between gap-3">
        <h2 id="ovr-impact-title" className="text-title font-semibold">
          {view.title}
        </h2>
        <p className="text-meta text-muted-foreground tabular-nums">
          <bdi dir="ltr">{view.aside}</bdi>
        </p>
      </div>
      <ul className="border-rule divide-rule bg-paper divide-y overflow-hidden rounded-[14px] border">
        {view.rows.map((row) => (
          <OvrRow key={row.title} row={row} />
        ))}
        <OvrRow row={view.total} total />
      </ul>
      {view.footnote ? (
        <p className="text-meta text-muted-foreground">{view.footnote}</p>
      ) : null}
    </section>
  );
}

function OvrRow({
  row,
  total = false,
}: {
  row: OvrImpactRow;
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
        <p className="font-semibold tabular-nums">{row.title}</p>
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
        <bdi dir="ltr">{row.delta}</bdi>
      </span>
    </li>
  );
}
