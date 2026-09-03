"use client";

import {
  CalendarClock,
  ChevronRight,
  Coins,
  Gauge,
  MapPin,
  Users,
} from "lucide-react";
import Link from "next/link";
import * as React from "react";

import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from "~/components/common/responsive-dialog";
import { UserAvatar } from "~/components/common/user-avatar";
import { GameStatusBadge } from "~/components/temba/game-status-badge";
import { GameViewerStatusBadge } from "~/components/temba/game-viewer-status-badge";
import { SportBadge } from "~/components/temba/sport-badge";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Card } from "~/components/ui/card";
import {
  formatGameClock,
  formatGameTimeWindow,
  formatRelativeDay,
  gameDayProximity,
  type GameDayProximity,
} from "~/lib/format-game-start";
import { gameOccupancy, seatsLeftLabel } from "~/lib/game-occupancy";
import {
  gameSummaryCtaLabel,
  type GameSummaryCta,
  type GameViewerStatus,
} from "~/lib/game-summary-cta";
import { formatLevelRangeLabel } from "~/lib/level-range";
import { formatPricePerPlayerCardMeta } from "~/lib/price-per-player";
import { cn } from "~/lib/utils";
import { type RouterOutputs } from "~/trpc/react";

type HubListSide =
  RouterOutputs["games"]["listMyGames"][number]["sides"][number];
type HubListSideOccupant = NonNullable<HubListSide["left"]>;

/** Imminent Games earn a warm day label so the list scans by urgency. */
const DAY_TONE: Record<GameDayProximity, string> = {
  today: "text-warning",
  tomorrow: "text-foreground",
  later: "text-muted-foreground",
};

const META_TONE = {
  muted: "text-muted-foreground",
  strong: "text-foreground font-semibold",
  success: "text-success font-semibold",
} as const;

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

function RosterSeat({
  occupant,
  joinable,
}: {
  occupant: HubListSideOccupant | null;
  joinable: boolean;
}) {
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
    <div className="flex min-w-0 flex-1 flex-col items-center gap-1.5">
      <span
        aria-hidden="true"
        className={cn(
          "flex size-10 shrink-0 items-center justify-center rounded-full border-2 border-dashed text-lg font-semibold",
          joinable
            ? "border-foreground bg-muted text-foreground"
            : "border-border text-muted-foreground/70",
        )}
      >
        +
      </span>
      <span
        className={cn(
          "text-meta w-full truncate text-center",
          joinable ? "text-foreground font-medium" : "text-muted-foreground",
        )}
      >
        Open
      </span>
    </div>
  );
}

function FriendlyRoster({
  sides,
  joinable,
}: {
  sides: HubListSide[];
  joinable: boolean;
}) {
  return (
    <div
      className="bg-muted flex items-stretch gap-3 rounded-lg p-3"
      data-slot="friendly-roster"
    >
      {sides.map((side, index) => (
        <React.Fragment key={side.sideIndex}>
          {index > 0 ? (
            <div
              aria-hidden="true"
              className="bg-border w-px shrink-0 self-stretch"
            />
          ) : null}
          <div className="flex min-w-0 flex-1 items-start justify-around gap-2">
            <RosterSeat occupant={side.left} joinable={joinable} />
            <RosterSeat occupant={side.right} joinable={joinable} />
          </div>
        </React.Fragment>
      ))}
    </div>
  );
}

function MetaItem({
  icon: Icon,
  tone = "muted",
  className,
  children,
}: {
  icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  tone?: keyof typeof META_TONE;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "text-meta inline-flex min-w-0 items-center gap-1.5",
        META_TONE[tone],
      )}
    >
      <Icon aria-hidden={true} className="size-3.5 shrink-0" />
      <span className={cn("truncate", className)}>{children}</span>
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
  registeredUserCount,
  playersAllowed,
  windowStart,
  windowEnd,
  pricePerPlayerCents,
  levelMinTenths,
  levelMaxTenths,
  sides,
  primaryAction,
  viewerStatus,
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
  registeredUserCount?: number;
  playersAllowed?: number | null;
  windowStart?: Date | string | null;
  windowEnd?: Date | string | null;
  pricePerPlayerCents?: number | null;
  levelMinTenths?: number | null;
  levelMaxTenths?: number | null;
  sides?: HubListSide[];
  primaryAction?: GameSummaryCta;
  viewerStatus?: GameViewerStatus;
  actionPending?: boolean;
  onJoinSeat?: (sideIndex: number, position: "left" | "right") => void;
  onJoinWaitlist?: () => void;
  onRegister?: () => void;
}) {
  const [pickerOpen, setPickerOpen] = React.useState(false);
  const title = venueName ?? name ?? "Untitled Game";
  const eventName = venueName && name ? name : null;
  const venueLed = Boolean(venueName);
  const ctaText = primaryAction ? gameSummaryCtaLabel(primaryAction) : null;
  const interactiveCta =
    primaryAction === "join" ||
    primaryAction === "join_waitlist" ||
    primaryAction === "register";
  const showRoster = Boolean(sides && sides.length > 0);
  const priceMeta = formatPricePerPlayerCardMeta(pricePerPlayerCents);
  const levelMeta = formatLevelRangeLabel(levelMinTenths, levelMaxTenths);
  const occupancy = gameOccupancy(registeredUserCount ?? 0, playersAllowed);
  const dayLabel = formatRelativeDay(startTime, { sameDayLabel: "Today" });
  const dayTone = DAY_TONE[gameDayProximity(startTime)];
  const timeLabel = venueLed
    ? formatGameTimeWindow(windowStart, windowEnd, startTime)
    : formatGameClock(startTime);
  // Location falls back to the Venue name, which is already the title.
  const locationMeta = location && location !== title ? location : null;
  const showSeatsLeft =
    occupancy?.tone === "filling" && interactiveCta && viewerStatus == null;

  function handleCta() {
    if (primaryAction === "join") {
      setPickerOpen(true);
      return;
    }
    if (primaryAction === "join_waitlist") {
      onJoinWaitlist?.();
      return;
    }
    if (primaryAction === "register") {
      onRegister?.();
    }
  }

  const pendingLabel =
    primaryAction === "register" ? "Registering…" : "Joining…";
  const actionControl =
    interactiveCta && ctaText ? (
      <Button
        type="button"
        size="sm"
        className="relative z-10 h-10 min-h-10 rounded-md px-4"
        disabled={actionPending}
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          handleCta();
        }}
      >
        {actionPending ? pendingLabel : ctaText}
      </Button>
    ) : href ? (
      <ChevronRight
        aria-hidden={true}
        className="text-muted-foreground size-5"
      />
    ) : null;

  const picker = (
    <ResponsiveDialog open={pickerOpen} onOpenChange={setPickerOpen}>
      <ResponsiveDialogContent>
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>Pick your spot</ResponsiveDialogTitle>
          <ResponsiveDialogDescription>
            Open Positions on {title}.
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

  return (
    <li data-slot="game-summary-card">
      <Card
        className={cn(
          "shadow-xs relative gap-3 md:gap-3",
          "motion-safe:transition-[border-color,box-shadow] motion-safe:duration-150",
          href ? "hover:border-foreground/20 hover:shadow-sm" : null,
        )}
      >
        {href ? (
          <Link
            href={href}
            aria-label={`${title}, ${dayLabel} ${timeLabel}`}
            className="focus-visible:ring-ring/50 absolute inset-0 z-0 rounded-xl outline-none focus-visible:ring-[3px]"
          />
        ) : null}

        <div
          className={cn(
            "relative z-10 min-w-0 space-y-1.5",
            href ? "pointer-events-none" : null,
          )}
        >
          <div className="flex min-w-0 items-start justify-between gap-3">
            <div className="flex flex-row flex-wrap items-center gap-4">
              {levelMeta ? (
                <Badge className="flex flex-row items-center text-xs text-white">
                  <span className="tabular-nums text-white">{levelMeta}</span>
                </Badge>
              ) : null}
              <p className="text-meta flex min-w-0 items-center gap-1.5 font-semibold">
                <CalendarClock
                  aria-hidden={true}
                  className={cn("size-3.5 shrink-0", dayTone)}
                />
                <span className="min-w-0 truncate">
                  <span className={dayTone}>{dayLabel}</span>
                  <span className="text-muted-foreground/50 mx-1.5 font-normal">
                    ·
                  </span>
                  <span className="text-muted-foreground tabular-nums">
                    {timeLabel}
                  </span>
                </span>
              </p>
            </div>

            <div className="flex shrink-0 flex-wrap items-center justify-end gap-1.5">
              {cancelled ? <GameStatusBadge status="cancelled" /> : null}
              {viewerStatus ? (
                <GameViewerStatusBadge status={viewerStatus} />
              ) : null}
              {showSeatsLeft && occupancy ? (
                <Badge variant="warning">
                  {seatsLeftLabel(occupancy.seatsLeft)}
                </Badge>
              ) : null}
              {venueLed || !sport ? null : <SportBadge sport={sport} />}
            </div>
          </div>

          <div className="min-w-0">
            <p className="text-lead truncate font-semibold tracking-[-0.01em]">
              {title}
            </p>
            {eventName ? (
              <p className="text-meta text-muted-foreground truncate">
                {eventName}
              </p>
            ) : null}
          </div>
        </div>

        {showRoster && sides ? (
          <div
            className={cn(
              "relative z-10 min-w-0",
              href ? "pointer-events-none" : null,
            )}
          >
            <FriendlyRoster sides={sides} joinable={primaryAction === "join"} />
          </div>
        ) : null}

        <div
          className={cn(
            "relative z-10 flex min-w-0 items-center gap-3",
            href ? "pointer-events-none" : null,
          )}
        >
          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-3.5 gap-y-1.5">
            {venueLed ? (
              <>
                {occupancy ? (
                  <MetaItem
                    icon={Users}
                    tone={occupancy.tone === "full" ? "strong" : "muted"}
                    className="tabular-nums"
                  >
                    {occupancy.tone === "full" ? "Full" : occupancy.label}
                  </MetaItem>
                ) : null}
                {locationMeta ? (
                  <MetaItem icon={MapPin}>{locationMeta}</MetaItem>
                ) : null}
              </>
            ) : (
              <MetaItem icon={Users}>{groupName ?? "Pickup"}</MetaItem>
            )}
            {priceMeta ? (
              <MetaItem
                icon={Coins}
                tone={pricePerPlayerCents === 0 ? "success" : "muted"}
              >
                {priceMeta}
              </MetaItem>
            ) : null}
          </div>
          {actionControl ? (
            <div
              className={cn(
                "relative z-10 shrink-0",
                interactiveCta ? "pointer-events-auto" : null,
              )}
            >
              {actionControl}
            </div>
          ) : null}
        </div>
      </Card>
      {primaryAction === "join" ? picker : null}
    </li>
  );
}
