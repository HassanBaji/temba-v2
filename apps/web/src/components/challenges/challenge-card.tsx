"use client";

import Link from "next/link";
import { MapPinIcon } from "lucide-react";

import { EntityMonogram } from "~/components/common/entity-monogram";
import { useMessages } from "~/components/locale-provider";
import { Hatch } from "~/components/ui/hatch";
import { cn } from "~/lib/utils";
import type { ChallengeCardView } from "@repo/domain/challenge-card";

export function challengeHref(challengeId: string) {
  return `/dashboard/challenges/${challengeId}`;
}

function challengeAcceptHref(challengeId: string) {
  return `${challengeHref(challengeId)}?accept=1`;
}

const acceptClassName =
  "bg-control text-on-control text-meta flex h-9 shrink-0 items-center rounded-md px-4 font-semibold";

/**
 * The poster's tiles, "vs", then the opponent's seats hatched: not yet.
 * Football rosters draw the smaller tile so six fit on one line.
 */
export function ChallengeSeats({
  card,
  compact,
}: {
  card: Pick<ChallengeCardView, "sport" | "tiles" | "opponentSeats">;
  compact?: boolean;
}) {
  const m = useMessages();
  const small = compact ?? card.sport === "football";
  return (
    <div aria-hidden="true" className="flex flex-wrap items-center gap-2.5">
      <span className="flex gap-1">
        {card.tiles.map((tile) => (
          <EntityMonogram
            key={tile.key}
            name={tile.name}
            size={small ? "2xs" : "xs"}
            tone="control"
          />
        ))}
      </span>
      <span className="text-eyebrow text-muted-foreground">
        {m.challenge.tab.vs}
      </span>
      <span className="flex gap-1">
        {Array.from({ length: card.opponentSeats }, (_, index) => (
          <Hatch
            key={index}
            radius={small ? "slot" : "sm"}
            className={cn("block", small ? "size-5" : "size-7")}
          />
        ))}
      </span>
    </div>
  );
}

/**
 * The design card's body: the Team Level letter beside the Team, the seats,
 * days, note, venues with Accept, and the proposals line. Accept is drawn,
 * not a control: the whole card opens the detail, where Accept lives. In a
 * preview (`card.preview`) it is drawn the same and does nothing.
 */
export function ChallengeCardBody({
  card,
  acceptHref,
}: {
  card: ChallengeCardView;
  acceptHref?: string;
}) {
  const m = useMessages();
  return (
    <>
      <div className="flex items-start gap-3.5">
        {card.levelBand ? (
          <span
            aria-hidden="true"
            className="font-expanded text-h1 w-13 shrink-0 leading-none"
          >
            {card.levelBand}
          </span>
        ) : (
          <span aria-hidden="true" className="w-13 shrink-0">
            <Hatch radius="sm" className="block size-7" />
          </span>
        )}
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <h3 className="text-body font-semibold">{card.title}</h3>
          <p className="text-meta text-muted-foreground">{card.sportLine}</p>
        </div>
      </div>
      <ChallengeSeats card={card} />
      <div className="flex flex-col gap-1.5">
        <p className="text-body font-medium">{card.daysLine}</p>
        {card.slotsLine ? (
          <p className="text-meta text-muted-foreground">{card.slotsLine}</p>
        ) : null}
        {card.note ? (
          <p className="text-body text-muted-foreground leading-[1.45]">
            {card.note}
          </p>
        ) : null}
      </div>
      <div className="flex items-center justify-between gap-2.5">
        <span className="text-meta text-muted-foreground flex min-w-0 items-center gap-1.5">
          <MapPinIcon aria-hidden="true" className="size-3.5 shrink-0" />
          <span className="truncate">{card.venuesLine}</span>
        </span>
        {acceptHref && card.canAccept && !card.preview ? (
          <Link
            href={acceptHref}
            className={cn(acceptClassName, "relative z-10 hover:opacity-90")}
          >
            {m.challenge.accept.cta}
          </Link>
        ) : card.canAccept || card.preview ? (
          <span aria-hidden="true" className={acceptClassName}>
            {m.challenge.accept.cta}
          </span>
        ) : null}
      </div>
      <p className="text-eyebrow text-muted-foreground -mt-1.5">
        {card.footerLine}
      </p>
      {card.nudgeLine ? (
        <p className="text-meta font-medium">{card.nudgeLine}</p>
      ) : null}
      {card.greyedLine ? (
        <p className="text-meta font-medium">{card.greyedLine}</p>
      ) : null}
    </>
  );
}

/** The card on its own hairline frame, for the post form's review. */
export function ChallengeCardPreview({ card }: { card: ChallengeCardView }) {
  return (
    <div className="border-rule bg-paper p-4.5 flex flex-col gap-3.5 rounded-xl border">
      <ChallengeCardBody card={card} />
    </div>
  );
}

/**
 * One Challenge in the Open feed; greyed when the viewer has no Team that may
 * propose. The whole card opens the detail; Accept opens it with the sheet up.
 */
export function ChallengeCard({ card }: { card: ChallengeCardView }) {
  return (
    <div
      className={cn(
        "hover:bg-muted/40 has-[a:focus-visible]:ring-ring/50 p-4.5 relative flex flex-col gap-3.5 transition-colors has-[a:focus-visible]:ring-[3px] has-[a:focus-visible]:ring-inset",
        card.greyed && "opacity-50",
      )}
    >
      <Link
        href={challengeHref(card.id)}
        aria-label={card.accessibilityLabel}
        className="absolute inset-0 outline-none"
      />
      <ChallengeCardBody
        card={card}
        acceptHref={challengeAcceptHref(card.id)}
      />
    </div>
  );
}
