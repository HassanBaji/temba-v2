"use client";

import { CheckIcon, ShareIcon } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { initials } from "@repo/domain/initials";
import type {
  FinishedPodiumRow,
  TournamentFinishedView,
} from "@repo/domain/tournament-finished";

import { PageTitle } from "~/components/layout/page-title";
import { ResultMark } from "~/components/temba/result-mark";
import { buttonVariants } from "~/components/ui/button";
import { BackButton } from "~/components/ui/nav-icon-button";
import { Surface } from "~/components/ui/surface";
import { useMessages } from "~/components/locale-provider";
import { pageBleed } from "~/lib/page-layout";
import { cn } from "~/lib/utils";

import { ROUND_CARD } from "./tournament-round-parts";

const ACTION_BOX =
  "border-rule text-ink focus-visible:ring-ring/50 inline-flex size-11 shrink-0 items-center justify-center rounded-md border outline-none focus-visible:ring-[3px]";

export function tournamentShareHref(gameId: string) {
  return `/dashboard/games/${gameId}/share`;
}

/** Rank 1 is a solid chip; every other place is outlined. */
export function PlaceChip({
  place,
  className,
}: {
  place: number;
  className?: string;
}) {
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

function PodiumMark({ name, isViewer }: { name: string; isViewer: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "text-meta inline-flex size-11 shrink-0 items-center justify-center rounded-md border font-semibold",
        isViewer ? "bg-ink text-paper border-ink" : "border-rule bg-paper",
      )}
    >
      {initials(name)}
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
      <PodiumMark name={row.markName} isViewer={row.isViewer} />
      <div className="min-w-0 flex-1">
        <p className="text-muted-foreground text-meta">{row.eyebrow}</p>
        <p
          dir="auto"
          className="text-[16px] font-semibold leading-snug tracking-[-0.01em]"
        >
          {row.title}
        </p>
        {row.meta ? (
          <p className="text-muted-foreground text-meta">{row.meta}</p>
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
      <div className="flex items-center justify-between gap-3">
        <BackButton variant="boxed" surface="paper" href={backHref} />
        <div className="flex items-center gap-2">
          {chip ? (
            <span className="border-rule text-muted-foreground text-eyebrow rounded-sm border px-2 py-1 uppercase tracking-[0.1em]">
              {chip}
            </span>
          ) : null}
          <Link
            href={tournamentShareHref(gameId)}
            aria-label={view.shareLabel}
            className={ACTION_BOX}
          >
            <ShareIcon aria-hidden="true" className="size-[18px]" />
          </Link>
          {actions}
        </div>
      </div>
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
      href={tournamentShareHref(gameId)}
      className={cn(
        buttonVariants({ size: "lg" }),
        "bg-ink text-paper border-ink hover:bg-ink/90 w-full font-semibold",
      )}
    >
      <ShareIcon aria-hidden="true" className="size-[18px]" />
      {label}
    </Link>
  );
}

/** The Organizer's line on the Rounds tab once every score is in. */
export function FinishedScoresNote({
  scoreCount,
  canFix,
}: {
  scoreCount: number;
  canFix: boolean;
}) {
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
        <p className="text-muted-foreground text-meta">
          {canFix ? m.canStillFix : m.resultsPosted}
        </p>
      </div>
    </div>
  );
}
