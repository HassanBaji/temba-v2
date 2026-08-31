"use client";

import Link from "next/link";
import * as React from "react";

import { ListRow } from "~/components/common/row-list";
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
import {
  formatGameStart,
  formatGameTimeWindow,
  formatRelativeDay,
} from "~/lib/format-game-start";
import {
  gameSummaryCtaLabel,
  type GameSummaryCta,
} from "~/lib/game-summary-cta";
import { cn } from "~/lib/utils";

export type GameSummaryOccupant = {
  userId: string;
  name: string;
  image?: string | null;
};

export type GameSummarySide = {
  sideIndex: number;
  left: GameSummaryOccupant | null;
  right: GameSummaryOccupant | null;
};

function seatLabel(sideIndex: number, position: "left" | "right") {
  return `Team ${sideIndex} ${position === "left" ? "Left" : "Right"}`;
}

function vacantSeats(sides: GameSummarySide[]) {
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

function RosterSeat({ occupant }: { occupant: GameSummaryOccupant | null }) {
  if (occupant) {
    return (
      <div className="flex min-w-0 items-center gap-2">
        <UserAvatar name={occupant.name} image={occupant.image} size="sm" />
        <span className="truncate text-sm font-medium">{occupant.name}</span>
      </div>
    );
  }

  return (
    <div className="text-muted-foreground flex min-w-0 items-center gap-2">
      <span
        aria-hidden="true"
        className="border-border flex size-6 shrink-0 items-center justify-center rounded-full border text-xs font-medium"
      >
        +
      </span>
      <span className="text-sm">Available</span>
    </div>
  );
}

function FriendlyRoster({ sides }: { sides: GameSummarySide[] }) {
  return (
    <div
      className="divide-border grid grid-cols-2 divide-x py-2"
      data-slot="friendly-roster"
    >
      {sides.map((side) => (
        <div
          key={side.sideIndex}
          className="flex flex-col gap-2 px-3 first:pl-0 last:pr-0"
        >
          <RosterSeat occupant={side.left} />
          <RosterSeat occupant={side.right} />
        </div>
      ))}
    </div>
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
  actionLabel?: string | null;
  sides?: GameSummarySide[];
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
  const meta = venueLed
    ? [
        formatRelativeDay(startTime),
        formatGameTimeWindow(windowStart, windowEnd, startTime),
        occupancy,
        location,
      ]
        .filter((part): part is string => Boolean(part))
        .join(" · ")
    : [
        formatRelativeDay(startTime),
        formatGameStart(startTime),
        groupName ?? "Pickup",
      ]
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
        disabled={actionPending}
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          handleCta();
        }}
      >
        {actionPending ? pendingLabel : ctaText}
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

  if (showRoster || interactiveCta) {
    const body = (
      <>
        <p className="text-lead truncate font-semibold">{title}</p>
        {subtitle ? (
          <p className="text-body text-muted-foreground truncate">{subtitle}</p>
        ) : null}
        {showRoster && sides ? <FriendlyRoster sides={sides} /> : null}
        {meta ? (
          <p className="text-meta text-muted-foreground">{meta}</p>
        ) : null}
      </>
    );

    return (
      <li data-slot="list-row">
        <div
          className={cn(
            "flex min-h-16 w-full min-w-0 items-start gap-3 px-4 py-3",
            href ? "hover:bg-muted/50" : null,
          )}
        >
          {href ? (
            <Link
              href={href}
              className="focus-visible:ring-ring/50 min-w-0 flex-1 rounded-md no-underline outline-none focus-visible:ring-[3px]"
            >
              {body}
            </Link>
          ) : (
            <div className="min-w-0 flex-1">{body}</div>
          )}
          <div className="flex shrink-0 flex-col items-end gap-2 pt-0.5">
            {badges}
            {actionControl}
          </div>
        </div>
        {cta === "join" ? picker : null}
      </li>
    );
  }

  const trailing = (
    <div className="flex flex-wrap items-center gap-2">
      {badges}
      {actionControl}
    </div>
  );

  if (href) {
    return (
      <ListRow
        asChild
        title={title}
        subtitle={subtitle}
        meta={meta}
        trailing={trailing}
      >
        <Link href={href} />
      </ListRow>
    );
  }

  return (
    <ListRow
      title={title}
      subtitle={subtitle}
      meta={meta}
      trailing={trailing}
    />
  );
}
