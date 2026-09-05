"use client";

import { ChevronRight, MapPin } from "lucide-react";
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
import { GAME_FORMAT_LABELS } from "~/components/temba/typed-labels";
import { Button } from "~/components/ui/button";
import { Card } from "~/components/ui/card";
import {
  formatGameClock,
  formatGameTimeWindow,
  formatRelativeDay,
} from "~/lib/format-game-start";
import { gameOccupancy, type GameOccupancy } from "~/lib/game-occupancy";
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

function gameFormatLabel(format: string | null | undefined): string | null {
  if (!format) {
    return null;
  }
  if (format in GAME_FORMAT_LABELS) {
    return GAME_FORMAT_LABELS[format as keyof typeof GAME_FORMAT_LABELS];
  }
  return format.replaceAll("_", " ");
}

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

function Hairline() {
  return <div aria-hidden="true" className="bg-muted h-px w-full" />;
}

function FillStatus({ occupancy }: { occupancy: GameOccupancy }) {
  if (occupancy.tone === "full") {
    return (
      <span className="text-muted-foreground inline-flex items-center gap-1.5 text-xs font-medium">
        <span aria-hidden="true" className="bg-success size-1.5 rounded-full" />
        Confirmed
      </span>
    );
  }

  return (
    <span className="text-warning inline-flex items-center gap-1.5 text-xs font-medium">
      <span aria-hidden="true" className="bg-warning size-1.5 rounded-full" />
      <span className="tabular-nums">{occupancy.label} players</span>
    </span>
  );
}

function PlayerColumn({
  occupant,
  joinable,
}: {
  occupant: HubListSideOccupant | null;
  joinable: boolean;
}) {
  if (occupant) {
    return (
      <div className="flex w-14 min-w-0 flex-col items-center gap-1.5">
        <UserAvatar
          name={occupant.name}
          image={occupant.image}
          // size="xl"
          className="border-border size-16 border"
        />
        <span className="w-full truncate text-center text-xs font-medium leading-tight">
          {occupant.name}
        </span>
      </div>
    );
  }

  return (
    <div className="flex w-14 min-w-0 flex-col items-center gap-1.5">
      <span
        aria-hidden="true"
        className={cn(
          "border-border flex size-16 shrink-0 items-center justify-center rounded-full border-2 border-dashed text-lg font-semibold",
          joinable
            ? "border-foreground bg-muted text-foreground"
            : "border-border text-muted-foreground/70",
        )}
      >
        +
      </span>
      <span
        className={cn(
          "w-full truncate text-center text-xs leading-tight",
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
      className="flex items-center justify-between px-1"
      data-slot="friendly-roster"
    >
      {sides.map((side, index) => (
        <React.Fragment key={side.sideIndex}>
          {index > 0 ? (
            <span
              aria-hidden="true"
              className="text-muted-foreground/40 shrink-0 text-xs font-semibold tracking-wide"
            >
              VS
            </span>
          ) : null}
          <div className="flex gap-4">
            <PlayerColumn occupant={side.left} joinable={joinable} />
            <PlayerColumn occupant={side.right} joinable={joinable} />
          </div>
        </React.Fragment>
      ))}
    </div>
  );
}

export function GameSummaryCard({
  name,
  startTime,
  groupName,
  format,
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
  format?: string | null;
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
  const timeLabel = venueLed
    ? formatGameTimeWindow(windowStart, windowEnd, startTime)
    : formatGameClock(startTime);
  const venueLine =
    venueName == null
      ? null
      : location && location !== venueName
        ? `${venueName}`
        : venueName;
  const formatMeta = gameFormatLabel(format);
  const showWaitlisted = viewerStatus === "waitlisted";
  const showFillStatus = occupancy != null && !cancelled;
  const showHeader =
    cancelled || showFillStatus || showWaitlisted || Boolean(levelMeta);

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
      <span className="text-muted-foreground group-hover:text-foreground inline-flex items-center gap-0.5 text-xs font-medium motion-safe:transition-colors">
        View match
        <ChevronRight aria-hidden="true" className="size-3.5" />
      </span>
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
          "shadow-xs group relative gap-4 rounded-2xl p-5 md:p-6",
          "motion-safe:transition-[border-color,box-shadow] motion-safe:duration-150",
          href ? "hover:border-foreground/20 hover:shadow-sm" : null,
        )}
      >
        {href ? (
          <Link
            href={href}
            aria-label={`${title}, ${dayLabel} ${timeLabel}`}
            className="focus-visible:ring-ring/50 absolute inset-0 z-0 rounded-2xl outline-none focus-visible:ring-[3px]"
          />
        ) : null}

        <div
          className={cn(
            "relative z-10 min-w-0 space-y-3",
            href ? "pointer-events-none" : null,
          )}
        >
          {showHeader ? (
            <div className="flex items-center justify-between">
              <p className="text-muted-foreground text-sm font-medium">
                {dayLabel}
              </p>
              <div className="flex min-w-0 flex-wrap items-center justify-end gap-x-3 gap-y-1">
                {cancelled ? <GameStatusBadge status="cancelled" /> : null}
                {showFillStatus && occupancy ? (
                  <FillStatus occupancy={occupancy} />
                ) : null}
                {showWaitlisted ? (
                  <GameViewerStatusBadge status="waitlisted" />
                ) : null}
              </div>
            </div>
          ) : null}
          <div className="mt-2 min-w-0">
            <p className="wrap-break-word text-4xl font-semibold tabular-nums leading-none tracking-tight md:text-5xl">
              {timeLabel}
            </p>
          </div>
          {venueLine ? (
            <p className="text-muted-foreground flex min-w-0 items-center gap-1.5 text-sm font-medium">
              <MapPin aria-hidden="true" className="size-3.5 shrink-0" />
              <span className="truncate">{venueLine}</span>
            </p>
          ) : null}
          <div className="flex items-center gap-4">
            {levelMeta ? (
              <span className="bg-primary text-primary-foreground rounded-2xl p-1 px-3 text-sm font-medium">
                {levelMeta}
              </span>
            ) : null}

            {priceMeta ? (
              <p className={cn("truncate text-sm font-medium")}>{priceMeta}</p>
            ) : null}
          </div>
        </div>

        {showRoster && sides ? (
          <>
            <Hairline />
            <div
              className={cn(
                "relative z-10 min-w-0",
                href ? "pointer-events-none" : null,
              )}
            >
              <FriendlyRoster
                sides={sides}
                joinable={primaryAction === "join"}
              />
            </div>
          </>
        ) : null}

        <Hairline />

        <div
          className={cn(
            "relative z-10 flex min-w-0 items-center justify-between gap-3",
            href ? "pointer-events-none" : null,
          )}
        >
          <div className="min-w-0 flex-1 space-y-0.5">
            {formatMeta ? (
              <p className="truncate text-xs font-medium">{formatMeta}</p>
            ) : null}
            {groupName ? (
              <p className="text-muted-foreground truncate text-xs">
                {groupName}
              </p>
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
