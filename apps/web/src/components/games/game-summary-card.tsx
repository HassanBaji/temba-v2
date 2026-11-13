"use client";

import * as React from "react";

import { FriendlyGameJoinSheet } from "~/components/games/friendly-game-join-sheet";
import {
  SUMMARY_CARD_ACTION_CLASS,
  SummaryCardBody,
  SummaryCardFooter,
  SummaryCardShell,
} from "~/components/games/summary-card-shell";
import { useLocale, useMessages } from "~/components/locale-provider";
import { SportGlyph } from "~/components/temba/sport-glyph";
import { GameStatusBadge } from "~/components/temba/game-status-badge";
import { HatchFlag, OpenSeat } from "~/components/temba/seat";
import { Badge } from "~/components/ui/badge";
import { Button, buttonVariants } from "~/components/ui/button";
import {
  formatGameCardDay,
  formatWindowDuration,
} from "@repo/domain/format-game-start";
import { nextJoinPosition } from "@repo/domain/game-card-side-join";
import { spotsOpenLabel } from "@repo/domain/game-occupancy";
import {
  firstName,
  gameCardFormatCell,
  gameCardOpenSpots,
  gameCardRosterOccupancy,
  gameCardSportTag,
  gameCardSubtitle,
  sideJoinAccessibleName,
} from "@repo/domain/game-card";
import { gameCustomName } from "@repo/domain/game-custom-name";
import { gameFormatLabel } from "@repo/domain/game-format-label";
import { ratingScopeTag } from "@repo/domain/game-rating-impact";
import type { GameRatingScope } from "@repo/domain/game-rating-scope";
import {
  gameCardActionLabel,
  gameCardActionSolid,
  showsGameCardFooterAction,
  type GameSummaryCta,
  type GameViewerStatus,
} from "@repo/domain/game-summary-cta";
import {
  formatHomeCountdown,
  formatHomeKickoff,
} from "@repo/domain/home-countdown";
import { formatLevelRangeLabel } from "@repo/domain/level-range";
import { formatPricePerPlayerFils } from "@repo/domain/price-per-player";
import { cn } from "~/lib/utils";
import { type RouterOutputs } from "~/trpc/react";
import { UserAvatar } from "../common/user-avatar";

type HubListSide =
  RouterOutputs["games"]["listMyGames"][number]["sides"][number];
type HubListSideOccupant = NonNullable<HubListSide["left"]>;

function SeatChip({ occupant }: { occupant: HubListSideOccupant | null }) {
  const m = useMessages();
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
          {occupant.isViewer ? m.common.you : firstName(occupant.name)}
        </p>
      </div>
    );
  }

  return (
    <div className="flex min-w-0 flex-1 flex-col items-center gap-[5px]">
      <OpenSeat size="chip" />
      <small className="text-muted-foreground text-eyebrow max-w-full truncate leading-none">
        {m.webGame.seatBlocks.open}
      </small>
    </div>
  );
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
  const locale = useLocale();
  const m = useMessages();
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
        aria-label={sideJoinAccessibleName(
          sideIndex,
          position,
          partnerName,
          locale,
        )}
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          onJoin(sideIndex, position);
        }}
      >
        <span className="flex min-w-0 flex-1 flex-col items-center gap-[5px]">
          <OpenSeat size="chip" />
          <small className="text-muted-foreground text-eyebrow max-w-full truncate leading-none">
            {m.webGame.summary.joinPosition(m.game.players[position])}
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
  onJoinSeat?: (
    sideIndex: number,
    position: "left" | "right" | "either",
  ) => void;
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
  onJoinSeat?: (
    sideIndex: number,
    position: "left" | "right" | "either",
  ) => void;
}) {
  const m = useMessages();
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
              {m.webGame.joinSheet.versus}
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
        ruled ? "border-rule border-s ps-4" : null,
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
  const locale = useLocale();
  if (openSpots <= 0) {
    return (
      <span className="text-muted-foreground">{spotsOpenLabel(0, locale)}</span>
    );
  }

  return <HatchFlag>{spotsOpenLabel(openSpots, locale)}</HatchFlag>;
}

export function GameSummaryCard({
  name,
  hasCustomName,
  startTime,
  groupName,
  format,
  sport,
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
  rated = true,
  ratingScope,
  publicGame = false,
  challenge = false,
}: {
  name: string | null;
  /** Omitted by callers that predate it, which keep showing `name` as given. */
  hasCustomName?: boolean;
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
  onJoinSeat?: (
    sideIndex: number,
    position: "left" | "right" | "either",
  ) => void;
  onJoinWaitlist?: () => void;
  onRegister?: () => void;
  roundLabel?: string | null;
  courtName?: string | null;
  rated?: boolean;
  ratingScope?: GameRatingScope;
  /** A Public Game is tagged as counting for Temba Level (ADR-0071). */
  publicGame?: boolean;
  /** A Challenge Game carries the CHALLENGE marker. */
  challenge?: boolean;
}) {
  const locale = useLocale();
  const m = useMessages();
  const [pickerOpen, setPickerOpen] = React.useState(false);
  const [startAtPartner, setStartAtPartner] = React.useState(false);
  const [now, setNow] = React.useState(() => new Date());
  const startDate = startTime instanceof Date ? startTime : new Date(startTime);
  const ratingTag = ratingScopeTag(
    { rated, ratingScope, sport, publicGame },
    locale,
  );

  React.useEffect(() => {
    const timer = window.setInterval(() => {
      setNow(new Date());
    }, 30_000);
    return () => window.clearInterval(timer);
  }, []);

  const customName =
    hasCustomName === undefined
      ? name
      : gameCustomName({ name, hasCustomName });
  const title = venueName ?? customName ?? m.webGame.summary.untitledGame;
  const subtitle = gameCardSubtitle(
    {
      venueName,
      location,
      customName: venueName ? customName : null,
      courtName,
      windowEnd,
    },
    locale,
  );
  const formatMeta =
    roundLabel ?? (format ? gameFormatLabel(format, locale) : null);
  const durationMeta = formatWindowDuration(windowStart, windowEnd, locale);
  const levelMeta = formatLevelRangeLabel(
    levelMinTenths,
    levelMaxTenths,
    locale,
  );
  const priceAmount = formatPricePerPlayerFils(pricePerPlayerFils, locale);
  const { showRoster, openSpots, hasOpenCount } = gameCardOpenSpots({
    sides,
    registeredUserCount,
    playersAllowed,
  });
  const sportTag = gameCardSportTag(sport, locale);
  const rosterOccupancy = gameCardRosterOccupancy({
    format: format ?? "",
    sport,
    registeredUserCount: registeredUserCount ?? 0,
    playersAllowed,
  });
  const dayLabel = formatGameCardDay(startTime, locale);
  const kickoff = formatHomeKickoff(startDate, locale);
  const countdown = formatHomeCountdown(startDate, now, locale);
  const showFooterAction =
    primaryAction != null &&
    showsGameCardFooterAction(primaryAction, showRoster);
  const ctaText =
    showFooterAction && primaryAction
      ? gameCardActionLabel(primaryAction, locale, {
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
    gameCardActionSolid(ctaText ?? "", primaryAction, locale);

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
    primaryAction === "register" ? m.webGame.registering : m.game.cta.joining;
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
  const formatCell = gameCardFormatCell({
    formatMeta,
    durationMeta,
    levelMeta,
  });

  return (
    <li data-slot="game-summary-card">
      <SummaryCardShell
        href={href}
        linkLabel={m.webGame.summary.linkLabel(
          title,
          dayLabel,
          kickoff.time,
          kickoff.meridiem,
        )}
      >
        <SummaryCardBody>
          <div className="text-muted-foreground text-meta flex items-center justify-between font-medium">
            <span className="flex items-center gap-2">
              {dayLabel}
              {sportTag && sport ? (
                <span className="inline-flex items-center gap-1">
                  <SportGlyph sport={sport} className="size-3.5" />
                  {sportTag.label}
                </span>
              ) : null}
            </span>
            {challenge ? (
              <Badge variant="outline" data-slot="game-card-challenge">
                {m.challenge.marker}
              </Badge>
            ) : null}
            {ratingTag ? (
              <Badge variant="outline" data-slot="game-card-rating-scope">
                {ratingTag}
              </Badge>
            ) : null}
            {cancelled ? (
              <GameStatusBadge status="cancelled" />
            ) : hasOpenCount ? (
              <span className="flex items-center gap-2">
                {rosterOccupancy ? (
                  <span
                    className="tabular-nums"
                    aria-label={m.webGame.summary.occupancyPlayers(
                      rosterOccupancy.label,
                    )}
                  >
                    {rosterOccupancy.label}
                  </span>
                ) : null}
                <OpenFlag openSpots={openSpots} />
              </span>
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
              <i className="text-muted-foreground ms-auto text-[13.5px] not-italic">
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

          {showPrice || formatCell ? (
            <div className="border-rule mt-4 flex gap-4 border-t pt-4">
              {levelMeta ? (
                <MetaCell value={levelMeta ?? ""} note={m.common.level} />
              ) : null}

              {showPrice && priceAmount ? (
                <MetaCell
                  ruled={levelMeta != null}
                  value={priceAmount}
                  note={
                    priceAmount === m.createGame.price.free
                      ? null
                      : m.webGame.summary.perPlayer
                  }
                />
              ) : null}

              {formatCell ? (
                <MetaCell
                  value={formatCell.value}
                  note={formatCell.note}
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
            {groupName ? (
              <p className="truncate">{m.game.played.group}</p>
            ) : formatMeta ? (
              <p className="truncate">{formatMeta}</p>
            ) : null}
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
                    {m.game.joinSheet.joinWithPartner.title}
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
