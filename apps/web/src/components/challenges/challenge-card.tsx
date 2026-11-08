"use client";

import Link from "next/link";

import { EntityMonogram } from "~/components/common/entity-monogram";
import { Hatch } from "~/components/ui/hatch";
import { cn } from "~/lib/utils";
import type { ChallengeCardView } from "@repo/domain/challenge-card";

/** The poster's first six members, then the opponent's seats hatched: not yet. */
export function ChallengeSeats({ card }: { card: ChallengeCardView }) {
  return (
    <div className="space-y-1.5">
      <div aria-hidden="true" className="flex flex-wrap gap-1">
        {card.tiles.map((tile) => (
          <EntityMonogram key={tile.key} name={tile.name} />
        ))}
      </div>
      <div aria-hidden="true" className="flex flex-wrap gap-1">
        {Array.from({ length: card.opponentSeats }, (_, index) => (
          <Hatch key={index} radius="md" className="block size-10" />
        ))}
      </div>
      <p className="text-eyebrow text-muted-foreground font-mono uppercase">
        {card.opponentSeatsLabel}
      </p>
    </div>
  );
}

export function ChallengeLines({ card }: { card: ChallengeCardView }) {
  return (
    <div className="space-y-1">
      <p className="text-meta">{card.sportLine}</p>
      <p className="text-meta text-muted-foreground">{card.whenLine}</p>
      {card.slotsLine ? (
        <p className="text-meta text-muted-foreground">{card.slotsLine}</p>
      ) : null}
      <p className="text-meta text-muted-foreground">{card.venuesLine}</p>
    </div>
  );
}

export function ChallengeCardBody({ card }: { card: ChallengeCardView }) {
  return (
    <>
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-lead min-w-0 flex-1 font-semibold">{card.title}</h3>
        <p className="text-meta text-muted-foreground shrink-0">
          {card.proposalsLine}
        </p>
      </div>
      <ChallengeSeats card={card} />
      <ChallengeLines card={card} />
      {card.note ? <p className="text-meta">{card.note}</p> : null}
    </>
  );
}

/** One Challenge on the Open board; greyed when the viewer has no Team that may propose. */
export function ChallengeCard({ card }: { card: ChallengeCardView }) {
  return (
    <Link
      href={`/dashboard/challenges/${card.id}`}
      aria-label={card.accessibilityLabel}
      className={cn(
        "border-border hover:bg-muted/40 block space-y-3 rounded-lg border p-5 transition-colors",
        card.greyed && "opacity-50",
      )}
    >
      <ChallengeCardBody card={card} />
      {card.nudgeLine ? (
        <p className="text-meta font-medium">{card.nudgeLine}</p>
      ) : null}
      {card.greyedLine ? (
        <p className="text-meta font-medium">{card.greyedLine}</p>
      ) : null}
    </Link>
  );
}
