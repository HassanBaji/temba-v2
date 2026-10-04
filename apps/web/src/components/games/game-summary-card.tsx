"use client";

import * as React from "react";

import { FriendlyGameJoinSheet } from "~/components/games/friendly-game-join-sheet";
import { formatGameSideLabel } from "~/components/games/game-side-label";
import {
  SUMMARY_CARD_ACTION_CLASS,
  SummaryCardBody,
  SummaryCardFooter,
  SummaryCardShell,
} from "~/components/games/summary-card-shell";
import { GameStatusBadge } from "~/components/temba/game-status-badge";
import { HatchFlag, OpenSeat } from "~/components/temba/seat";
import { GAME_FORMAT_LABELS } from "~/components/temba/typed-labels";
import { Button, buttonVariants } from "~/components/ui/button";
import {
  formatGameCardDay,
  formatWindowDuration,
} from "~/lib/format-game-start";
import { friendlyGameVacantSeatLabel } from "~/lib/friendly-game-players";
import { nextJoinPosition } from "~/lib/game-card-side-join";
import { gameOccupancy, spotsOpenLabel } from "~/lib/game-occupancy";
import {
  gameCardActionLabel,
  gameCardActionSolid,
  showsGameCardFooterAction,
  type GameSummaryCta,
  type GameViewerStatus,
} from "~/lib/game-summary-cta";
import { formatHomeCountdown, formatHomeKickoff } from "~/lib/home-countdown";
import { formatLevelRangeLabel } from "~/lib/level-range";
import { formatPricePerPlayerFils } from "~/lib/price-per-player";
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

function venueSubtitle(
  venueName: string | null | undefined,
  location: string | null | undefined,
  gameName: string | null | undefined,
  courtName?: string | null,
) {
  const parts: string[] = [];
  const name = gameName?.trim();
  if (name) {
    parts.push(name);
  }
  const court = courtName?.trim();
  if (court) {
    parts.push(court);
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
            "text-muted-foreground text-eyebrow max-w-full truncate font-light leading-none",
          )}
        >
          {occupant.isViewer ? "You" : firstName(occupant.name)}
        </p>
      </div>
    );
  }

  return (
    <div className="flex min-w-0 flex-1 flex-col items-center gap-[5px]">
      <OpenSeat size="chip" />
      <small className="text-muted-foreground text-eyebrow max-w-full truncate leading-none">
        Open
      </small>
    </div>
  );
}

function sideJoinAccessibleName(
  sideIndex: number,
  position: "left" | "right",
  partnerName: string | null,
) {
  const teamLabel = formatGameSideLabel("friendly_game", sideIndex);
  const positionLabel = position === "left" ? "Left" : "Right";
  const base = friendlyGameVacantSeatLabel("join", teamLabel, positionLabel);
  if (base == null) {
    return "Join";
  }
  return partnerName ? `${base} with ${partnerName}` : base;
}

function SideJoinButton({
  sideIndex,
  position,
  partnerName,
  pending,
  onJoin,
}: {
  sideIndex: number;
  position: "left" | "right";
  partnerName: string | null;
  pending: boolean;
  onJoin: (sideIndex: number, position: "left" | "right") => void;
}) {
  return (
    <div
      className="pointer-events-auto relative z-10 flex min-h-9 min-w-0 flex-1 items-center"
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
      }}
    >
      <Button
        type="button"
        size="sm"
        variant="ghost"
        className="text-body h-auto min-h-9 w-full rounded-lg px-2 py-1.5 font-semibold"
        disabled={pending}
        aria-label={sideJoinAccessibleName(sideIndex, position, partnerName)}
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          onJoin(sideIndex, position);
        }}
      >
        <span className="flex min-w-0 flex-1 flex-col items-center gap-[5px]">
          <OpenSeat size="chip" />
          <small className="text-muted-foreground text-eyebrow max-w-full truncate leading-none">
            Join {position === "left" ? "Left" : "Right"}
          </small>
        </span>
      </Button>
    </div>
  );
}

function SideRoster({
  side,
  joinPosition,
  actionPending,
  onJoinSeat,
}: {
  side: HubListSide;
  joinPosition: "left" | "right" | null;
  actionPending: boolean;
  onJoinSeat?: (sideIndex: number, position: "left" | "right") => void;
}) {
  if (joinPosition == null || onJoinSeat == null) {
    return (
      <div className="flex min-w-0 flex-1 gap-1.5">
        <SeatChip occupant={side.left} />
        <SeatChip occupant={side.right} />
      </div>
    );
  }

  const partner = joinPosition === "left" ? side.right : side.left;
  const joinButton = (
    <SideJoinButton
      sideIndex={side.sideIndex}
      position={joinPosition}
      partnerName={partner?.name ?? null}
      pending={actionPending}
      onJoin={onJoinSeat}
    />
  );

  if (side.left == null && side.right == null) {
    return (
      <div className="flex min-w-0 flex-1 items-center gap-1.5">
        <SideJoinButton
          sideIndex={side.sideIndex}
          position="left"
          partnerName={partner?.name ?? null}
          pending={actionPending}
          onJoin={onJoinSeat}
        />

        <SideJoinButton
          sideIndex={side.sideIndex}
          position="right"
          partnerName={partner?.name ?? null}
          pending={actionPending}
          onJoin={onJoinSeat}
        />
      </div>
    );
  }

  return (
    <div className="flex min-w-0 flex-1 items-center gap-1.5">
      {side.left ? <SeatChip occupant={side.left} /> : joinButton}
      {side.right ? <SeatChip occupant={side.right} /> : joinButton}
    </div>
  );
}

function FriendlyRoster({
  sides,
  joinable,
  actionPending,
  onJoinSeat,
}: {
  sides: HubListSide[];
  joinable: boolean;
  actionPending: boolean;
  onJoinSeat?: (sideIndex: number, position: "left" | "right") => void;
}) {
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
              className="text-muted-foreground text-eyebrow shrink-0 font-semibold"
            >
              vs
            </span>
          ) : null}
          <SideRoster
            side={side}
            joinPosition={joinable ? nextJoinPosition(side) : null}
            actionPending={actionPending}
            onJoinSeat={onJoinSeat}
          />
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
      <b className="text-lead block font-semibold tracking-[-0.01em]">
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
    return <span className="text-muted-foreground">{spotsOpenLabel(0)}</span>;
  }

  return <HatchFlag>{spotsOpenLabel(openSpots)}</HatchFlag>;
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
  pricePerPlayerFils,
  levelMinTenths,
  levelMaxTenths,
  sides,
  primaryAction,
  viewerStatus,
  actionPending = false,
  showPartnerJoin = false,
  gameId,
  registrationMode,
  canRegister,
  isOrganizer,
  onJoinSeat,
  onJoinWaitlist,
  onRegister,
  roundLabel,
  courtName,
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
  pricePerPlayerFils?: number | null;
  levelMinTenths?: number | null;
  levelMaxTenths?: number | null;
  sides?: HubListSide[];
  primaryAction?: GameSummaryCta;
  viewerStatus?: GameViewerStatus;
  actionPending?: boolean;
  showPartnerJoin?: boolean;
  gameId?: string;
  registrationMode?: string | null;
  canRegister?: boolean;
  isOrganizer?: boolean;
  onJoinSeat?: (sideIndex: number, position: "left" | "right") => void;
  onJoinWaitlist?: () => void;
  onRegister?: () => void;
  roundLabel?: string | null;
  courtName?: string | null;
}) {
  const [pickerOpen, setPickerOpen] = React.useState(false);
  const [startAtPartner, setStartAtPartner] = React.useState(false);
  const [now, setNow] = React.useState(() => new Date());
  const startDate = startTime instanceof Date ? startTime : new Date(startTime);

  React.useEffect(() => {
    const timer = window.setInterval(() => {
      setNow(new Date());
    }, 30_000);
    return () => window.clearInterval(timer);
  }, []);

  const title = venueName ?? name ?? "Untitled Game";
  const subtitle = venueSubtitle(
    venueName,
    location,
    venueName ? name : null,
    courtName,
  );
  const formatMeta = roundLabel ?? gameFormatLabel(format);
  const durationMeta = formatWindowDuration(windowStart, windowEnd);
  const levelMeta = formatLevelRangeLabel(levelMinTenths, levelMaxTenths);
  const priceAmount = formatPricePerPlayerFils(pricePerPlayerFils);
  const occupancy = gameOccupancy(registeredUserCount ?? 0, playersAllowed);
  const showRoster = Boolean(sides && sides.length > 0);
  const openSpots = showRoster
    ? vacantSeats(sides ?? []).length
    : (occupancy?.seatsLeft ?? 0);
  const hasOpenCount = showRoster || occupancy != null;
  const dayLabel = formatGameCardDay(startTime);
  const kickoff = formatHomeKickoff(startDate);
  const countdown = formatHomeCountdown(startDate, now);
  const showFooterAction =
    primaryAction != null &&
    showsGameCardFooterAction(primaryAction, showRoster);
  const ctaText =
    showFooterAction && primaryAction
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
      setStartAtPartner(false);
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
  const actionVariant = solidCta ? "default" : "outline";
  const actionControl =
    interactiveCta && ctaText ? (
      <Button
        type="button"
        variant={actionVariant}
        className={SUMMARY_CARD_ACTION_CLASS}
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
          buttonVariants({ variant: actionVariant }),
          SUMMARY_CARD_ACTION_CLASS,
        )}
      >
        {ctaText}
      </span>
    ) : null;

  const picker = (
    <FriendlyGameJoinSheet
      open={pickerOpen}
      onOpenChange={setPickerOpen}
      title={title}
      sides={sides ?? []}
      pending={actionPending}
      pricePerPlayerFils={pricePerPlayerFils}
      gameId={gameId}
      format={format ?? undefined}
      registrationMode={registrationMode ?? undefined}
      canRegister={canRegister}
      windowStart={windowStart}
      venueName={venueName}
      groupName={groupName}
      isOrganizer={isOrganizer}
      levelMinTenths={levelMinTenths}
      levelMaxTenths={levelMaxTenths}
      startAtPartner={startAtPartner}
      onPickSeat={(sideIndex, position) => onJoinSeat?.(sideIndex, position)}
    />
  );

  const showPrice = priceAmount != null;
  const showFormat =
    formatMeta != null || durationMeta != null || levelMeta != null;

  return (
    <li data-slot="game-summary-card">
      <SummaryCardShell
        href={href}
        linkLabel={`${title}, ${dayLabel} ${kickoff.time} ${kickoff.meridiem}`}
      >
        <SummaryCardBody>
          <div className="text-muted-foreground text-meta flex items-center justify-between font-medium">
            <span>{dayLabel}</span>
            {cancelled ? (
              <GameStatusBadge status="cancelled" />
            ) : hasOpenCount ? (
              <OpenFlag openSpots={openSpots} />
            ) : null}
          </div>

          <div className="mt-3 flex items-baseline gap-2.5">
            <b className="font-expanded text-hero tabular-nums leading-[0.9]">
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

          <h3 className="text-lead mt-2.5">{title}</h3>
          {subtitle ? (
            <p className="text-muted-foreground text-meta mt-[3px]">
              {subtitle}
            </p>
          ) : null}

          {showPrice || showFormat ? (
            <div className="border-rule mt-4 flex gap-4 border-t pt-4">
              {levelMeta ? (
                <MetaCell value={levelMeta ?? ""} note={"Level"} />
              ) : null}

              {showPrice && priceAmount ? (
                <MetaCell
                  ruled={levelMeta != null}
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
                  ruled={levelMeta != null || showPrice}
                />
              ) : null}
            </div>
          ) : null}

          {showRoster && sides ? (
            <FriendlyRoster
              sides={sides}
              joinable={primaryAction === "join"}
              actionPending={actionPending}
              onJoinSeat={onJoinSeat}
            />
          ) : null}
        </SummaryCardBody>

        <SummaryCardFooter>
          <div className="min-w-0 flex-1 text-[13.5px]">
            {formatMeta ? <p className="truncate">{formatMeta}</p> : null}
            {groupName ? (
              <small className="text-muted-foreground mt-0.5 block truncate text-[12.5px]">
                {groupName}
              </small>
            ) : null}
          </div>
          {showPartnerJoin || actionControl ? (
            <div className="flex shrink-0 items-center gap-2">
              {showPartnerJoin ? (
                <div
                  className="pointer-events-auto relative z-10 shrink-0"
                  onClick={(event) => {
                    event.stopPropagation();
                  }}
                >
                  <Button
                    type="button"
                    variant="outline"
                    data-slot="game-card-partner-join"
                    className={SUMMARY_CARD_ACTION_CLASS}
                    disabled={actionPending}
                    onClick={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      setStartAtPartner(true);
                      setPickerOpen(true);
                    }}
                  >
                    Join with a partner
                  </Button>
                </div>
              ) : null}
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
          ) : null}
        </SummaryCardFooter>
      </SummaryCardShell>
      {showPartnerJoin || (primaryAction === "join" && !showRoster)
        ? picker
        : null}
    </li>
  );
}
