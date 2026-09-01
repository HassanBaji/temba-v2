"use client";

import { Calendar, Clock, MapPin, Users } from "lucide-react";
import Link from "next/link";
import * as React from "react";

import { EntityMonogram } from "~/components/common/entity-monogram";
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from "~/components/common/responsive-dialog";
import { UserAvatar } from "~/components/common/user-avatar";
import { GameStatusBadge } from "~/components/temba/game-status-badge";
import { SportBadge } from "~/components/temba/sport-badge";
import { Button } from "~/components/ui/button";
import { Card } from "~/components/ui/card";
import {
  formatGameStart,
  formatGameTimeWindow,
  formatRelativeDay,
} from "~/lib/format-game-start";
import {
  gameSummaryCtaLabel,
  type GameSummaryCta,
} from "~/lib/game-summary-cta";
import { formatPricePerPlayerCardMeta } from "~/lib/price-per-player";
import { cn } from "~/lib/utils";
import type { HubListSide, HubListSideOccupant } from "~/server/games";

function seatLabel(sideIndex: number, position: "left" | "right") {
  return `Team ${sideIndex} ${position === "left" ? "Left" : "Right"}`;
}

function vacantSeats(sides: HubListSide[]) {
  const vacant: { sideIndex: number; position: "left" | "right" }[] = [];
  for (const side of sides) {
    if (side.left == null) {
      vacant.push({ sideIndex: side.sideIndex, position: "left" });
    }
    if (side.right == null) {
      vacant.push({ sideIndex: side.sideIndex, position: "right" });
    }
  }
  return vacant;
}

function RosterSeat({ occupant }: { occupant: HubListSideOccupant | null }) {
  if (occupant) {
    return (
      <div className="flex min-w-0 flex-1 flex-col items-center gap-1.5">
        <UserAvatar name={occupant.name} image={occupant.image} size="lg" />
        <span className="text-meta w-full truncate text-center font-medium">
          {occupant.name}
        </span>
      </div>
    );
  }

  return (
    <div className="text-muted-foreground flex min-w-0 flex-1 flex-col items-center gap-1.5">
      <span
        aria-hidden="true"
        className="bg-muted text-muted-foreground flex size-10 shrink-0 items-center justify-center rounded-full text-lg font-medium"
      >
        +
      </span>
      <span className="text-meta">Available</span>
    </div>
  );
}

function FriendlyRoster({ sides }: { sides: HubListSide[] }) {
  return (
    <div className="flex items-stretch gap-3 py-1" data-slot="friendly-roster">
      {sides.map((side, index) => (
        <React.Fragment key={side.sideIndex}>
          {index > 0 ? (
            <div
              aria-hidden="true"
              className="bg-border w-px shrink-0 self-stretch"
            />
          ) : null}
          <div className="flex min-w-0 flex-1 items-start justify-around gap-2">
            <RosterSeat occupant={side.left} />
            <RosterSeat occupant={side.right} />
          </div>
        </React.Fragment>
      ))}
    </div>
  );
}

function MetaItem({
  icon: Icon,
  children,
}: {
  icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  children: React.ReactNode;
}) {
  return (
    <span className="text-meta text-muted-foreground inline-flex min-w-0 items-center gap-1.5">
      <Icon aria-hidden={true} className="size-3.5 shrink-0" />
      <span className="truncate">{children}</span>
    </span>
  );
}

export function GameSummaryCard({
  name,
  startTime,
  groupName,
  sport,
  href,
  cancelled = false,
  venueName,
  location,
  occupancy,
  windowStart,
  windowEnd,
  pricePerPlayerCents,
  actionLabel,
  sides,
  primaryAction,
  actionPending = false,
  onJoinSeat,
  onJoinWaitlist,
  onRegister,
}: {
  name: string | null;
  startTime: Date | string;
  groupName?: string | null;
  sport?: string | null;
  href?: string;
  cancelled?: boolean;
  venueName?: string | null;
  location?: string | null;
  occupancy?: string | null;
  windowStart?: Date | string | null;
  windowEnd?: Date | string | null;
  pricePerPlayerCents?: number | null;
  actionLabel?: string | null;
  sides?: HubListSide[];
  primaryAction?: GameSummaryCta;
  actionPending?: boolean;
  onJoinSeat?: (sideIndex: number, position: "left" | "right") => void;
  onJoinWaitlist?: () => void;
  onRegister?: () => void;
}) {
  const [pickerOpen, setPickerOpen] = React.useState(false);
  const title = venueName ?? name ?? "Untitled Game";
  const subtitle = venueName && name ? name : undefined;
  const venueLed = Boolean(venueName);
  const cta = primaryAction ?? (actionLabel ? "view" : undefined);
  const ctaText = cta ? gameSummaryCtaLabel(cta) : (actionLabel ?? null);
  const interactiveCta =
    cta === "join" || cta === "join_waitlist" || cta === "register";
  const showRoster = Boolean(sides && sides.length > 0);
  const priceMeta = formatPricePerPlayerCardMeta(pricePerPlayerCents);
  const dayLabel = formatRelativeDay(startTime);
  const timeLabel = venueLed
    ? formatGameTimeWindow(windowStart, windowEnd, startTime)
    : formatGameStart(startTime);
  const plainMeta = venueLed
    ? null
    : [dayLabel, timeLabel, groupName ?? "Pickup", priceMeta]
        .filter((part): part is string => Boolean(part))
        .join(" · ");

  const badges = (
    <>
      {venueLed ? null : sport ? <SportBadge sport={sport} /> : null}
      {cancelled ? <GameStatusBadge status="cancelled" /> : null}
    </>
  );

  function handleCta() {
    if (cta === "join") {
      setPickerOpen(true);
      return;
    }
    if (cta === "join_waitlist") {
      onJoinWaitlist?.();
      return;
    }
    if (cta === "register") {
      onRegister?.();
    }
  }

  const pendingLabel = cta === "register" ? "Registering…" : "Joining…";
  const actionControl =
    interactiveCta && ctaText ? (
      <Button
        type="button"
        size="sm"
        className="relative z-10 rounded-full px-4"
        disabled={actionPending}
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          handleCta();
        }}
      >
        {actionPending ? pendingLabel : ctaText}
      </Button>
    ) : ctaText && href ? (
      <Button asChild size="sm" className="relative z-10 rounded-full px-4">
        <Link href={href}>{ctaText}</Link>
      </Button>
    ) : ctaText ? (
      <span className="text-body text-brand font-semibold">{ctaText}</span>
    ) : null;

  const picker = (
    <ResponsiveDialog open={pickerOpen} onOpenChange={setPickerOpen}>
      <ResponsiveDialogContent>
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>Join</ResponsiveDialogTitle>
          <ResponsiveDialogDescription>
            Pick a vacant Position on {title}.
          </ResponsiveDialogDescription>
        </ResponsiveDialogHeader>
        <div className="flex flex-col gap-2 p-4 pt-0">
          {vacantSeats(sides ?? []).map((seat) => (
            <Button
              key={`${seat.sideIndex}-${seat.position}`}
              type="button"
              variant="outline"
              disabled={actionPending}
              onClick={() => {
                setPickerOpen(false);
                onJoinSeat?.(seat.sideIndex, seat.position);
              }}
            >
              {seatLabel(seat.sideIndex, seat.position)}
            </Button>
          ))}
        </div>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );

  const metaBlock = venueLed ? (
    <div className="grid min-w-0 flex-1 grid-cols-2 gap-x-3 gap-y-1.5">
      <MetaItem icon={Calendar}>{dayLabel}</MetaItem>
      <MetaItem icon={Clock}>{timeLabel}</MetaItem>
      {occupancy ? <MetaItem icon={Users}>{occupancy}</MetaItem> : null}
      {location ? <MetaItem icon={MapPin}>{location}</MetaItem> : null}
      {priceMeta ? (
        <span className="text-meta text-muted-foreground col-span-2 truncate font-medium">
          {priceMeta}
        </span>
      ) : null}
    </div>
  ) : (
    <p className="text-meta text-muted-foreground min-w-0 flex-1">
      {plainMeta}
    </p>
  );

  return (
    <li data-slot="game-summary-card">
      <Card
        variant="raised"
        className={cn(
          "relative gap-3 border border-transparent shadow-sm md:gap-3",
          href ? "hover:border-border" : null,
        )}
      >
        {href ? (
          <Link
            href={href}
            aria-label={title}
            className="focus-visible:ring-ring/50 absolute inset-0 z-0 rounded-lg outline-none focus-visible:ring-[3px]"
          />
        ) : null}

        <div
          className={cn(
            "relative z-10 flex min-w-0 items-start gap-3",
            href ? "pointer-events-none" : null,
          )}
        >
          {venueLed ? <EntityMonogram name={title} size="sm" /> : null}
          <div className="min-w-0 flex-1">
            <p className="text-lead truncate font-semibold">{title}</p>
            {subtitle ? (
              <p className="text-body text-muted-foreground truncate">
                {subtitle}
              </p>
            ) : null}
          </div>
          <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
            {badges}
          </div>
        </div>

        {showRoster && sides ? (
          <div
            className={cn("relative z-10", href ? "pointer-events-none" : null)}
          >
            <FriendlyRoster sides={sides} />
          </div>
        ) : null}

        <div
          className={cn(
            "relative z-10 flex min-w-0 flex-col gap-3 sm:flex-row sm:items-end",
            href ? "pointer-events-none" : null,
          )}
        >
          {metaBlock}
          {actionControl ? (
            <div className="pointer-events-auto relative z-10 shrink-0 self-start sm:self-end">
              {actionControl}
            </div>
          ) : null}
        </div>
      </Card>
      {cta === "join" ? picker : null}
    </li>
  );
}
