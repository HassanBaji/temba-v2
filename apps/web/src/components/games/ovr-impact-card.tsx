"use client";

import { ovrImpactView } from "@repo/domain/game-rating-impact";
import { ImpactRow } from "~/components/games/impact-row";
import { useLocale } from "~/components/locale-provider";
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
          <ImpactRow key={row.title} row={row} />
        ))}
        <ImpactRow row={view.total} total />
      </ul>
      {view.footnote ? (
        <p className="text-meta text-muted-foreground">{view.footnote}</p>
      ) : null}
    </section>
  );
}
