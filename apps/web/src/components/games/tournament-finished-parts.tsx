"use client";

import { CheckIcon, ShareIcon } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import type {
  FinishedPodiumRow,
  TournamentFinishedView,
} from "@repo/domain/tournament-finished";

import { PageTitle } from "~/components/layout/page-title";
import { ResultMark } from "~/components/temba/result-mark";
import { buttonVariants } from "~/components/ui/button";
import { ShareButton } from "~/components/ui/nav-icon-button";
import { Surface } from "~/components/ui/surface";
import { useMessages } from "~/components/locale-provider";
import { pageBleed } from "~/lib/page-layout";
import { cn } from "~/lib/utils";

import { shareResultHref } from "./played/played-game-view";
import { TournamentHeaderBar } from "./tournament-header-bar";
import { InitialsMark, ROUND_CARD } from "./tournament-round-parts";

/** Rank 1 is a solid chip; every other place is outlined; a knockout exit has none. */
export function PlaceChip({
  place,
  className,
}: {
  place: number | null;
  className?: string;
}) {
  if (place == null) {
    return (
      <span aria-hidden="true" className={cn("size-6 shrink-0", className)} />
    );
  }
  return (
    <span
      aria-hidden="true"
      className={cn(
        "text-eyebrow inline-flex size-6 shrink-0 items-center justify-center rounded-sm border font-semibold tabular-nums",
        place === 1 ? "bg-ink text-paper border-ink" : "border-ink text-ink",
        className,
      )}
    >
      {place}
    </span>
  );
}

function PodiumRow({ row }: { row: FinishedPodiumRow }) {
  return (
    <li
      className={cn(
        "flex items-center gap-3 px-4 py-3.5",
        row.isViewer && "bg-wash",
      )}
    >
      <PlaceChip place={row.place} />
      <InitialsMark
        name={row.markName}
        isViewer={row.isViewer}
        className="text-meta size-11"
      />
      <div className="min-w-0 flex-1">
        <p className="text-muted-foreground text-meta">{row.smallLine}</p>
        <p
          dir="auto"
          className="text-[16px] font-semibold leading-snug tracking-[-0.01em]"
        >
          {row.mainLine}
        </p>
        {row.detailLine ? (
          <p className="text-muted-foreground text-meta">{row.detailLine}</p>
        ) : null}
      </div>
      {row.results.length > 0 ? (
        <span
          role="img"
          aria-label={row.resultsLabel ?? undefined}
          className="flex max-w-[45%] shrink-0 flex-wrap justify-end gap-0.5"
        >
          {row.results.map((result, index) => (
            <ResultMark
              key={index}
              variant={result}
              decorative
              className="size-3.5"
            />
          ))}
        </span>
      ) : null}
    </li>
  );
}

/** The winner first, then the places that matter, the viewer's line tinted. */
export function FinishedPodium({ view }: { view: TournamentFinishedView }) {
  if (view.podium.length === 0) {
    return null;
  }
  return (
    <ol
      aria-label={view.podiumLabel}
      className={cn(ROUND_CARD, "divide-rule bg-paper divide-y")}
    >
      {view.podium.map((row) => (
        <PodiumRow key={row.gameTeamId} row={row} />
      ))}
    </ol>
  );
}

/** A finished tournament's header: paper, not ink, with the winner first. */
export function TournamentFinishedHeader({
  view,
  gameId,
  backHref,
  chip,
  actions,
}: {
  view: TournamentFinishedView;
  gameId: string;
  backHref: string;
  chip: string | null;
  actions?: ReactNode;
}) {
  return (
    <Surface
      as="header"
      tone="paper"
      className={cn("pb-[22px] pt-[22px] md:-mt-6", pageBleed)}
    >
      <TournamentHeaderBar surface="paper" backHref={backHref} chip={chip}>
        <ShareButton
          variant="boxed"
          surface="paper"
          href={shareResultHref(gameId)}
          label={view.share.label}
        />
        {actions}
      </TournamentHeaderBar>
      {view.dateLine ? (
        <p className="text-muted-foreground text-meta mt-7">{view.dateLine}</p>
      ) : null}
      <PageTitle variant="hero" className="mt-1.5">
        {view.name}
      </PageTitle>
      <p className="text-muted-foreground text-meta mt-2 leading-relaxed">
        {view.summary}
      </p>
      {view.podium.length > 0 ? (
        <div className="mt-5">
          <FinishedPodium view={view} />
        </div>
      ) : null}
    </Surface>
  );
}

export function FinishedShareLink({
  gameId,
  label,
}: {
  gameId: string;
  label: string;
}) {
  return (
    <Link
      href={shareResultHref(gameId)}
      className={cn(buttonVariants({ size: "lg" }), "w-full font-semibold")}
    >
      <ShareIcon aria-hidden="true" className="size-[18px]" />
      {label}
    </Link>
  );
}

/** The Organizer's line on the Rounds tab once every score is in. */
export function FinishedScoresNote({ scoreCount }: { scoreCount: number }) {
  const m = useMessages().tournamentRounds.finished;
  return (
    <div className="border-ink rounded-card flex items-center gap-3 border px-4 py-3.5">
      <span
        aria-hidden="true"
        className="bg-ink text-paper inline-flex size-9 shrink-0 items-center justify-center rounded-md"
      >
        <CheckIcon className="size-[18px]" />
      </span>
      <div className="min-w-0">
        <p className="text-body font-semibold">{m.allScoresIn(scoreCount)}</p>
        <p className="text-muted-foreground text-meta">{m.canStillFix}</p>
      </div>
    </div>
  );
}
