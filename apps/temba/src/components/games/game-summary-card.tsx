"use client";

import Link from "next/link";
import * as React from "react";

import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from "~/components/common/responsive-dialog";
import { GameStatusBadge } from "~/components/temba/game-status-badge";
import { GAME_FORMAT_LABELS } from "~/components/temba/typed-labels";
import { Button } from "~/components/ui/button";
import { Card } from "~/components/ui/card";
import {
  formatGameCardDay,
  formatWindowDuration,
} from "~/lib/format-game-start";
import { gameOccupancy, spotsOpenLabel } from "~/lib/game-occupancy";
import {
  gameCardActionLabel,
  gameCardActionSolid,
  type GameSummaryCta,
  type GameViewerStatus,
} from "~/lib/game-summary-cta";
import { formatHomeCountdown, formatHomeKickoff } from "~/lib/home-countdown";
import { formatLevelRangeLabel } from "~/lib/level-range";
import { formatPricePerPlayerCents } from "~/lib/price-per-player";
import { cn } from "~/lib/utils";
import { type RouterOutputs } from "~/trpc/react";
import { UserAvatar } from "../common/user-avatar";

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

function firstName(name: string) {
  return name.trim().split(/\s+/)[0] ?? name;
}

function seatLetter(name: string) {
  const grapheme = Array.from(firstName(name))[0];
  return grapheme ? grapheme.toUpperCase() : "?";
}

function venueSubtitle(
  venueName: string | null | undefined,
  location: string | null | undefined,
  gameName: string | null | undefined,
) {
  const parts: string[] = [];
  const name = gameName?.trim();
  if (name) {
    parts.push(name);
  }
  const city = location?.trim();
  if (city && city !== venueName) {
    parts.push(city);
  }
  return parts.length > 0 ? parts.join(" — ") : null;
}

function SeatChip({ occupant }: { occupant: HubListSideOccupant | null }) {
  if (occupant) {
    return (
      <div
        className={cn(
          "flex min-w-0 flex-1 flex-col items-center gap-[5px]",
          occupant.isViewer ? "text-ink" : null,
        )}
      >
        <div className="bg-wash flex h-[46px] w-full flex-col items-center justify-center gap-1 rounded-lg">
          <UserAvatar
            name={occupant.name}
            image={occupant.image}
            className="size-8"
          />
        </div>
        <p
          className={cn(
            "text-muted-foreground max-w-full truncate text-xs font-light leading-none",
          )}
        >
          {occupant.isViewer ? "You" : firstName(occupant.name)}
        </p>
      </div>
    );
  }

  return (
    <div className="flex min-w-0 flex-1 flex-col items-center gap-[5px]">
      <div className="hatch text-dim flex h-[46px] w-full items-center justify-center rounded-lg text-base font-semibold">
        +
      </div>
      <small className="text-muted-foreground max-w-full truncate text-xs leading-none">
        Open
      </small>
    </div>
  );
}

function FriendlyRoster({ sides }: { sides: HubListSide[] }) {
  return (
    <div
      className="border-rule mt-[18px] flex items-center gap-2.5 border-t pt-[18px]"
      data-slot="friendly-roster"
    >
      {sides.map((side, index) => (
        <React.Fragment key={side.sideIndex}>
          {index > 0 ? (
            <span
              aria-hidden="true"
              className="text-dim shrink-0 text-xs font-semibold"
            >
              vs
            </span>
          ) : null}
          <div className="flex min-w-0 flex-1 gap-1.5">
            <SeatChip occupant={side.left} />
            <SeatChip occupant={side.right} />
          </div>
        </React.Fragment>
      ))}
    </div>
  );
}

function MetaCell({
  value,
  note,
  ruled,
}: {
  value: string;
  note: string | null;
  ruled?: boolean;
}) {
  return (
    <div
      className={cn(
        "min-w-0 flex-1",
        ruled ? "border-rule border-l pl-4" : null,
      )}
    >
      <b className="block text-[17px] font-semibold tracking-[-0.01em]">
        {value}
      </b>
      {note ? (
        <span className="text-muted-foreground mt-1 block text-[12.5px]">
          {note}
        </span>
      ) : null}
    </div>
  );
}

function OpenFlag({ openSpots }: { openSpots: number }) {
  if (openSpots <= 0) {
    return <span className="text-dim">{spotsOpenLabel(0)}</span>;
  }

  return (
    <span className="text-ink inline-flex items-center gap-1.5">
      <i
        aria-hidden="true"
        className="hatch inline-block size-[13px] shrink-0 rounded-[3px]"
      />
      {spotsOpenLabel(openSpots)}
    </span>
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
  const [now, setNow] = React.useState(() => new Date());
  const startDate = startTime instanceof Date ? startTime : new Date(startTime);

  React.useEffect(() => {
    const timer = window.setInterval(() => {
      setNow(new Date());
    }, 30_000);
    return () => window.clearInterval(timer);
  }, []);

  const title = venueName ?? name ?? "Untitled Game";
  const subtitle = venueSubtitle(venueName, location, venueName ? name : null);
  const formatMeta = gameFormatLabel(format);
  const durationMeta = formatWindowDuration(windowStart, windowEnd);
  const levelMeta = formatLevelRangeLabel(levelMinTenths, levelMaxTenths);
  const priceAmount = formatPricePerPlayerCents(pricePerPlayerCents);
  const occupancy = gameOccupancy(registeredUserCount ?? 0, playersAllowed);
  const showRoster = Boolean(sides && sides.length > 0);
  const openSpots = showRoster
    ? vacantSeats(sides ?? []).length
    : (occupancy?.seatsLeft ?? 0);
  const hasOpenCount = showRoster || occupancy != null;
  const dayLabel = formatGameCardDay(startTime);
  const kickoff = formatHomeKickoff(startDate);
  const countdown = formatHomeCountdown(startDate, now);
  const ctaText = primaryAction
    ? gameCardActionLabel(primaryAction, {
        viewerIn: viewerStatus === "in",
        openSpots,
      })
    : null;
  const interactiveCta =
    primaryAction === "join" ||
    primaryAction === "join_waitlist" ||
    primaryAction === "register";
  const solidCta =
    Boolean(ctaText) &&
    primaryAction != null &&
    gameCardActionSolid(ctaText ?? "", primaryAction);

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
  const actionClass = cn(
    "relative z-10 h-auto min-h-0 shrink-0 rounded-[9px] px-[15px] py-[11px] text-sm font-semibold",
    solidCta
      ? null
      : "border-rule bg-paper text-ink hover:bg-paper hover:text-ink",
  );
  const actionControl =
    interactiveCta && ctaText ? (
      <Button
        type="button"
        size="sm"
        variant={solidCta ? "default" : "outline"}
        className={actionClass}
        disabled={actionPending}
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          handleCta();
        }}
      >
        {actionPending ? pendingLabel : ctaText}
      </Button>
    ) : href && ctaText ? (
      <span
        className={cn(
          "inline-flex items-center rounded-[9px] px-[15px] py-[11px] text-sm font-semibold",
          solidCta
            ? "bg-ink text-paper border-ink border"
            : "border-rule bg-paper text-ink border",
        )}
      >
        {ctaText}
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

  const showPrice = priceAmount != null;
  const showFormat =
    formatMeta != null || durationMeta != null || levelMeta != null;

  return (
    <li data-slot="game-summary-card">
      <Card
        className={cn(
          "border-rule group relative gap-0 overflow-hidden rounded-[14px] p-0",
          href ? "hover:border-foreground/20" : null,
        )}
      >
        {href ? (
          <Link
            href={href}
            aria-label={`${title}, ${dayLabel} ${kickoff.time} ${kickoff.meridiem}`}
            className="focus-visible:ring-ring/50 absolute inset-0 z-0 rounded-[14px] outline-none focus-visible:ring-[3px]"
          />
        ) : null}

        <div
          className={cn(
            "relative z-10 min-w-0 p-[22px]",
            href ? "pointer-events-none" : null,
          )}
        >
          <div className="text-muted-foreground flex items-center justify-between text-sm font-medium">
            <span>{dayLabel}</span>
            {cancelled ? (
              <GameStatusBadge status="cancelled" />
            ) : hasOpenCount ? (
              <OpenFlag openSpots={openSpots} />
            ) : null}
          </div>

          <div className="mt-3 flex items-baseline gap-2.5">
            <b className="font-expanded text-[48px] tabular-nums leading-[0.9]">
              {kickoff.time}
            </b>
            <i className="text-muted-foreground text-[18px] font-medium not-italic">
              {kickoff.meridiem}
            </i>
            {countdown ? (
              <i className="text-muted-foreground ml-auto text-[13.5px] not-italic">
                {countdown}
              </i>
            ) : null}
          </div>

          <div className="mt-2.5 text-base">
            {title}
            {subtitle ? (
              <small className="text-muted-foreground mt-[3px] block text-[13px]">
                {subtitle}
              </small>
            ) : null}
          </div>

          {showPrice || showFormat ? (
            <div className="border-rule mt-4 flex border-t pt-4">
              {showPrice && priceAmount ? (
                <MetaCell
                  value={priceAmount}
                  note={priceAmount === "Free" ? null : "per player"}
                />
              ) : null}
              {showFormat ? (
                <MetaCell
                  value={formatMeta ?? durationMeta ?? levelMeta ?? ""}
                  note={
                    formatMeta
                      ? (durationMeta ?? levelMeta)
                      : durationMeta
                        ? levelMeta
                        : null
                  }
                  ruled={showPrice}
                />
              ) : null}
            </div>
          ) : null}

          {showRoster && sides ? <FriendlyRoster sides={sides} /> : null}
        </div>

        <div
          className={cn(
            "border-rule relative z-10 flex min-w-0 items-center justify-between gap-3 border-t bg-[#fafafa] px-[22px] py-3.5",
            href ? "pointer-events-none" : null,
          )}
        >
          <div className="min-w-0 flex-1 text-[13.5px]">
            {formatMeta ? <p className="truncate">{formatMeta}</p> : null}
            {groupName ? (
              <small className="text-muted-foreground mt-0.5 block truncate text-[12.5px]">
                {groupName}
              </small>
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
