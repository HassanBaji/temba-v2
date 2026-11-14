"use client";

import { ArrowDownRight, ArrowRight, ArrowUpRight } from "lucide-react";

import {
  ratingImpactView,
  ratingScopeNotice,
} from "@repo/domain/game-rating-impact";
import type { GameRatingScope } from "@repo/domain/game-rating-scope";
import { useLocale, useMessages } from "~/components/locale-provider";
import { type RouterOutputs } from "~/trpc/react";

export type GameRatingImpactBlockValue = NonNullable<
  RouterOutputs["games"]["byId"]["ratingImpact"]
>;

const DIRECTION_ICON = {
  up: ArrowUpRight,
  down: ArrowDownRight,
  flat: ArrowRight,
} as const;

/**
 * Rating impact block (game-details redesign, TEM-182). The one block that
 * exists only on the Final phase: three cells divided by vertical hairlines
 * — level change, new level, standing sentence — explaining why the
 * viewer's Home level card changed after this Match. Figures use
 * `font-expanded` per this spec's resolved decision (fixed `wdth` 115, no
 * variable-value utility); the standing sentence reuses the Home redesign's
 * Provisional/confirmed phrasing conventions (`~/lib/game-rating-impact.ts`)
 * rather than inventing new copy. Never renders raw μ/φ/σ — `ratingImpact`
 * only carries the already-derived Level/band/Provisional fields from
 * `byId.ts` (TEM-177).
 *
 * Rendered only when `phase === "final"` and the viewer has a rating-impact
 * result for this Match — that guard lives at the call site (`page.tsx`),
 * matching every other phase-gated section on this page
 * (`FriendlyGameDetailsHero`, `GameScoreSection`): the block is omitted
 * entirely, never shown with placeholder values.
 */
export function GameRatingImpactBlock({
  ratingImpact,
}: {
  ratingImpact: GameRatingImpactBlockValue;
}) {
  const locale = useLocale();
  const m = useMessages();
  const { direction, magnitude, newLevelLabel, sentence, directionText } =
    ratingImpactView(ratingImpact, locale);
  const DirectionIcon = DIRECTION_ICON[direction];

  return (
    <section
      data-slot="game-rating-impact-block"
      className="border-rule bg-paper overflow-hidden rounded-xl border"
    >
      <h2 className="text-muted-foreground px-[22px] pb-3 pt-[22px] text-sm">
        {m.webGame.ratingImpact.title}
      </h2>
      <div className="divide-rule border-rule flex divide-x border-t px-[22px] pb-[22px]">
        <div className="mt-4 flex min-w-0 flex-col items-center gap-1 px-3 first:ps-0">
          <div className="flex items-center gap-1">
            <DirectionIcon
              aria-hidden="true"
              className="size-5 shrink-0 rtl:-scale-x-100"
            />
            <p className="font-expanded text-2xl tabular-nums leading-none">
              {magnitude}
            </p>
          </div>
          <span className="sr-only">{directionText}</span>
          <p className="text-muted-foreground text-meta">
            {m.webGame.ratingImpact.change}
          </p>
        </div>
        <div className="mt-4 flex min-w-0 flex-col items-center gap-1 px-3">
          <p className="font-expanded text-2xl tabular-nums leading-none">
            {newLevelLabel}
          </p>
          <p className="text-muted-foreground text-meta">
            {m.webGame.ratingImpact.newLevel}
          </p>
        </div>
        <div className="mt-4 flex min-w-0 flex-1 items-center px-3 last:pe-0">
          <p className="text-meta">{sentence}</p>
        </div>
      </div>
    </section>
  );
}

export function GameRatingScopeBlock({
  scope,
  sport,
  publicGame = false,
}: {
  scope: GameRatingScope;
  sport?: string | null;
  publicGame?: boolean;
}) {
  const locale = useLocale();
  const notice = ratingScopeNotice(scope, locale, sport, publicGame);
  if (!notice) {
    return null;
  }
  return (
    <section
      data-slot="game-rating-scope-block"
      className="border-rule bg-paper overflow-hidden rounded-xl border"
    >
      <div className="flex flex-col gap-1 px-[22px] py-[18px]">
        <h2 className="text-sm font-semibold">{notice.title}</h2>
        <p className="text-muted-foreground text-meta">{notice.line}</p>
      </div>
    </section>
  );
}
