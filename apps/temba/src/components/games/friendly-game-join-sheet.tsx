"use client";

import { Check, ChevronRight, Plus, UserRound, Users, X } from "lucide-react";
import { Fragment, useEffect, useState } from "react";
import { toast } from "sonner";

import { EntityMonogram } from "~/components/common/entity-monogram";
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from "~/components/common/responsive-dialog";
import { UserAvatar } from "~/components/common/user-avatar";
import {
  FriendlyGamePartnerPicker,
  type FriendlyGamePartnerPick,
} from "~/components/games/friendly-game-partner-picker";
import { FriendlyGamePartnerReview } from "~/components/games/friendly-game-partner-review";
import { formatGameSideLabel } from "~/components/games/game-side-label";
import { TournamentDetailRows } from "~/components/games/tournament-detail-rows";
import { TAB_SEGMENT } from "~/components/groups/group-home-chrome";
import { Button } from "~/components/ui/button";
import { FormErrorSummary } from "~/components/ui/form-error-summary";
import { Tabs, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { formatGameCardDay } from "~/lib/format-game-start";
import { globalFormErrorMessage } from "~/lib/form-mutation-error";
import {
  friendlyGameJoinSheetCaption,
  vacantJoinSeats,
  type FriendlyGameJoinSeat,
} from "~/lib/friendly-game-cta";
import {
  firstFullyVacantSideIndex,
  isPartnerVacantSideRace,
  offersPartnerJoin,
  PARTNER_VACANT_SIDE_RACE_MESSAGE,
  partnerVacantSideRaceRecovery,
} from "~/lib/friendly-game-partner";
import { displayLabelFromStoredBand, type LevelBand } from "~/lib/level-bands";
import { defaultJoinSeat, remainingJoinSeatOnSide } from "~/lib/preferred-seat";
import { formatPricePerPlayerCents } from "~/lib/price-per-player";
import { tournamentFieldSummary } from "~/lib/tournament-home";
import {
  isFullyVacantJoinSide,
  isTournamentJoinSheet,
  LEAVE_SEAT_UNTIL_POOL_DRAW_COPY,
  SIT_WITH_SOMEONE_HEADING,
  START_A_TEAM_ON_YOUR_OWN_LABEL,
  START_A_TEAM_ON_YOUR_OWN_SUBLINE,
  TAKE_A_SEAT_TITLE,
  TAKEN_SEAT_LABEL,
  YOUR_SEAT_HEADING,
  tournamentJoinDetailRows,
  tournamentJoinFirstRoundDay,
  tournamentJoinHeaderLine,
  tournamentJoinOccupantSubline,
  tournamentJoinResolvedSeat,
  tournamentJoinRoundCount,
  tournamentJoinSeatExplanation,
  tournamentJoinSeatsTakenLine,
  tournamentJoinTakeSeatLabel,
  tournamentSitWithCountLine,
  tournamentStartOwnSeat,
  tournamentYourSeatAvailability,
} from "~/lib/tournament-join";
import { tournamentRoundSchedule } from "~/lib/tournament-rounds";
import { cn } from "~/lib/utils";
import { api } from "~/trpc/react";

type JoinSheetStep = "chooser" | "seat" | "partner" | "partnerConfirm";

type SeatPosition = "left" | "right";

/**
 * Structural side shape rather than one screen's router output: the sheet is
 * shared by the Game details page (`games.byId`) and the Games hub card
 * (`games.listMyGames`), whose occupants carry different extra fields but the
 * same identity bits this sheet draws.
 */
export type FriendlyGameJoinSheetSide = {
  sideIndex: number;
  left: FriendlyGameJoinSheetOccupant | null;
  right: FriendlyGameJoinSheetOccupant | null;
};

export type FriendlyGameJoinSheetOccupant = {
  name: string;
  image: string | null;
  levelBand?: LevelBand | null;
};

function occupantLevelLabel(occupant: FriendlyGameJoinSheetOccupant | null) {
  if (!occupant?.levelBand) {
    return null;
  }
  return displayLabelFromStoredBand(occupant.levelBand);
}

function positionLabel(position: SeatPosition) {
  return position === "left" ? "Left" : "Right";
}

/**
 * Two-seat mini-diagram on the 02b chooser. Hatch is decoration; the
 * accessible name on the option button carries the meaning.
 */
function TwoSeatDiagram({ onInk }: { onInk: boolean }) {
  return (
    <span aria-hidden="true" className="flex w-full gap-1.5">
      <span
        className={cn(
          "h-[26px] flex-1 rounded-md",
          onInk ? "bg-paper" : "bg-ink",
        )}
      />
      <span
        className={cn(
          "h-[26px] flex-1 rounded-md",
          onInk ? "hatch hatch-on-ink" : "hatch",
        )}
      />
    </span>
  );
}

function ModeChooser({
  onJoinAlone,
  onJoinWithPartner,
}: {
  onJoinAlone: () => void;
  onJoinWithPartner: () => void;
}) {
  return (
    <div className="flex flex-col gap-3 px-[22px] pb-[max(22px,env(safe-area-inset-bottom))] pt-[18px]">
      <button
        type="button"
        onClick={onJoinAlone}
        aria-label="Join alone. One seat. Someone else takes the other."
        className={cn(
          "border-ink bg-paper text-ink flex w-full flex-col gap-2.5 rounded-[14px] border px-5 py-[18px] text-left",
          "hover:bg-wash outline-none transition-colors",
          "focus-visible:ring-ring/50 focus-visible:ring-[3px]",
        )}
      >
        <span className="flex w-full items-center gap-3">
          <span
            aria-hidden="true"
            className="border-rule flex size-[34px] shrink-0 items-center justify-center rounded-lg border"
          >
            <UserRound className="size-[17px]" strokeWidth={1.75} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="text-[17px] font-semibold">Join alone</span>
            <span className="text-muted-foreground mt-0.5 block text-xs">
              One seat. Someone else takes the other.
            </span>
          </span>
          <ChevronRight
            aria-hidden="true"
            className="text-dim size-[18px] shrink-0"
          />
        </span>
        <TwoSeatDiagram onInk={false} />
        <span className="text-muted-foreground font-mono text-[10px] uppercase tracking-wide">
          You are in straight away
        </span>
      </button>

      <button
        type="button"
        onClick={onJoinWithPartner}
        aria-label="Join with a partner. Both seats. You play as a team. Both seats are booked now; your partner is in straight away."
        className={cn(
          "bg-ink text-paper flex w-full flex-col gap-2.5 rounded-[14px] px-5 py-[18px] text-left",
          "hover:bg-dimrule outline-none transition-colors",
          "focus-visible:ring-ring/50 focus-visible:ring-[3px]",
        )}
      >
        <span className="flex w-full items-center gap-3">
          <span
            aria-hidden="true"
            className="bg-raised flex size-[34px] shrink-0 items-center justify-center rounded-lg"
          >
            <Users className="size-[17px]" strokeWidth={1.75} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="text-[17px] font-semibold">
              Join with a partner
            </span>
            <span className="text-dim mt-0.5 block text-xs">
              Both seats. You play as a team.
            </span>
          </span>
          <ChevronRight
            aria-hidden="true"
            className="text-dim size-[18px] shrink-0"
          />
        </span>
        <TwoSeatDiagram onInk />
        <span className="text-dim font-mono text-[10px] uppercase tracking-wide">
          Both seats booked now
        </span>
      </button>
    </div>
  );
}

/**
 * One Position in the picker: hatched while open (the same "not yet" device
 * as `game-lineup-section.tsx`'s `LineupOpenChip` and the Home seat row),
 * solid ink once picked, plain paper with the occupant once taken. Meaning
 * never rides on the hatch alone — the accessible name states it.
 */
function PositionButton({
  occupant,
  position,
  sideLabel,
  selected,
  disabled,
  onSelect,
}: {
  occupant: FriendlyGameJoinSheetOccupant | null;
  position: SeatPosition;
  sideLabel: string;
  selected: boolean;
  disabled: boolean;
  onSelect: () => void;
}) {
  const taken = occupant != null;

  return (
    <div className="min-w-0 flex-1">
      <button
        type="button"
        disabled={taken || disabled}
        aria-pressed={taken ? undefined : selected}
        aria-label={
          taken
            ? `${sideLabel} ${positionLabel(position).toLowerCase()}, taken by ${occupant.name}`
            : `Take ${sideLabel} ${positionLabel(position).toLowerCase()}`
        }
        onClick={onSelect}
        className={cn(
          "flex h-[78px] w-full flex-col items-center justify-center gap-1.5 rounded-lg border px-1",
          "outline-none transition-colors",
          "focus-visible:ring-ring/50 focus-visible:ring-[3px]",
          "disabled:cursor-default",
          taken && "border-rule bg-paper",
          !taken && selected && "border-ink bg-ink text-paper",
          !taken && !selected && "hatch text-dim border-transparent",
        )}
      >
        {taken ? (
          <>
            <UserAvatar
              name={occupant.name}
              image={occupant.image}
              size="sm"
              className="shrink-0"
            />
            <span className="text-eyebrow text-ink max-w-full truncate leading-tight">
              {occupant.name}
            </span>
            {occupantLevelLabel(occupant) ? (
              <span className="text-muted-foreground text-[10px] leading-tight">
                {occupantLevelLabel(occupant)}
              </span>
            ) : null}
          </>
        ) : selected ? (
          <span className="text-meta font-semibold">You</span>
        ) : (
          <span aria-hidden="true" className="text-lead leading-none">
            +
          </span>
        )}
      </button>
      <p
        className={cn(
          "text-eyebrow mt-2 text-center",
          selected ? "text-ink font-medium" : "text-muted-foreground",
        )}
      >
        {positionLabel(position)}
      </p>
    </div>
  );
}

/** The net between the two Game teams — decoration, mirroring the "vs" rule
 * `game-lineup-section.tsx` already puts between its two columns. */
function NetDivider() {
  return (
    <div
      aria-hidden="true"
      className="flex w-8 shrink-0 flex-col items-center self-stretch"
    >
      <span className="h-5 shrink-0" />
      <span className="bg-rule w-px flex-1" />
      <span className="text-dim py-1.5 text-xs font-semibold">vs</span>
      <span className="bg-rule w-px flex-1" />
      <span className="h-7 shrink-0" />
    </div>
  );
}

function SideColumn({
  side,
  format,
  picked,
  pending,
  onPick,
}: {
  side: FriendlyGameJoinSheetSide;
  format: string;
  picked: FriendlyGameJoinSeat | null;
  pending: boolean;
  onPick: (seat: FriendlyGameJoinSeat) => void;
}) {
  const sideLabel = formatGameSideLabel(format, side.sideIndex);

  return (
    <div className="min-w-0 flex-1">
      <h3 className="text-eyebrow text-muted-foreground font-medium uppercase tracking-[0.06em]">
        {sideLabel}
      </h3>
      <div className="mt-2 flex gap-2">
        {(["left", "right"] as const).map((position) => (
          <PositionButton
            key={position}
            occupant={side[position]}
            position={position}
            sideLabel={sideLabel}
            selected={
              picked?.sideIndex === side.sideIndex &&
              picked.position === position
            }
            disabled={pending}
            onSelect={() => onPick({ sideIndex: side.sideIndex, position })}
          />
        ))}
      </div>
    </div>
  );
}

function SeatChoiceMark({ selected }: { selected: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "flex size-[22px] shrink-0 items-center justify-center rounded-full border",
        selected ? "bg-ink border-ink text-paper" : "border-rule",
      )}
    >
      {selected ? <Check className="size-[13px]" strokeWidth={3} /> : null}
    </span>
  );
}

function HalfTeamRow({
  side,
  format,
  picked,
  pending,
  onPick,
}: {
  side: FriendlyGameJoinSheetSide;
  format: string;
  picked: FriendlyGameJoinSeat | null;
  pending: boolean;
  onPick: (seat: FriendlyGameJoinSeat) => void;
}) {
  const remaining = remainingJoinSeatOnSide(side);
  if (!remaining) {
    return null;
  }
  const occupant = remaining.position === "left" ? side.right : side.left;
  if (!occupant) {
    return null;
  }
  const selected = picked?.sideIndex === side.sideIndex;
  const sideLabel = formatGameSideLabel(format, side.sideIndex);
  const occupantPosition = remaining.position === "left" ? "right" : "left";
  const freeLabel = positionLabel(remaining.position);
  const subline = tournamentJoinOccupantSubline({
    occupantPosition,
    levelLabel: occupantLevelLabel(occupant),
    openPosition: remaining.position,
  });

  return (
    <button
      type="button"
      role="radio"
      disabled={pending}
      aria-checked={selected}
      aria-label={`Sit with ${occupant.name} on ${sideLabel}. ${freeLabel} is open`}
      onClick={() => onPick(remaining)}
      className={cn(
        "flex min-h-11 w-full items-center gap-3 px-[18px] py-4 text-left",
        "outline-none transition-colors",
        "focus-visible:ring-ring/50 focus-visible:ring-[3px]",
        selected ? "bg-wash" : "bg-paper",
      )}
    >
      <EntityMonogram name={occupant.name} image={occupant.image} />
      <span className="min-w-0 flex-1">
        <span
          className={cn(
            "block truncate text-[15px]",
            selected ? "font-semibold" : "font-medium",
          )}
        >
          {occupant.name}
        </span>
        <span className="text-muted-foreground mt-0.5 block text-xs">
          {subline}
        </span>
      </span>
      <SeatChoiceMark selected={selected} />
    </button>
  );
}

function StartOwnTeamRow({
  selected,
  pending,
  onPick,
}: {
  selected: boolean;
  pending: boolean;
  onPick: () => void;
}) {
  return (
    <button
      type="button"
      role="radio"
      disabled={pending}
      aria-checked={selected}
      aria-label={START_A_TEAM_ON_YOUR_OWN_LABEL}
      onClick={onPick}
      className={cn(
        "flex min-h-11 w-full items-center gap-3 px-[18px] py-4 text-left",
        "outline-none transition-colors",
        "focus-visible:ring-ring/50 focus-visible:ring-[3px]",
        selected ? "bg-wash" : "bg-paper",
      )}
    >
      <span
        aria-hidden="true"
        className="border-rule flex size-[34px] shrink-0 items-center justify-center rounded-lg border"
      >
        <Plus className="size-4" strokeWidth={1.75} />
      </span>
      <span className="min-w-0 flex-1">
        <span
          className={cn(
            "block truncate text-[15px]",
            selected ? "font-semibold" : "font-medium",
          )}
        >
          {START_A_TEAM_ON_YOUR_OWN_LABEL}
        </span>
        <span className="text-muted-foreground mt-0.5 block text-xs">
          {START_A_TEAM_ON_YOUR_OWN_SUBLINE}
        </span>
      </span>
      <SeatChoiceMark selected={selected} />
    </button>
  );
}

function TournamentSeatList({
  sides,
  format,
  picked,
  pending,
  preferredPosition,
  onPick,
}: {
  sides: readonly FriendlyGameJoinSheetSide[];
  format: string;
  picked: FriendlyGameJoinSeat | null;
  pending: boolean;
  preferredPosition: string | null | undefined;
  onPick: (seat: FriendlyGameJoinSeat) => void;
}) {
  const halfTeams = sides.filter((side) => remainingJoinSeatOnSide(side));
  const vacantSideIndex = firstFullyVacantSideIndex(sides);
  const pickedSide = sides.find((side) => side.sideIndex === picked?.sideIndex);
  const startOwnSelected =
    picked != null && pickedSide != null && isFullyVacantJoinSide(pickedSide);
  const sitWithCount = tournamentSitWithCountLine(halfTeams.length);

  return (
    <section>
      <div className="flex items-baseline gap-2.5 pb-2.5">
        <h3
          id="tournament-join-sit-with"
          className="font-expanded text-[19px] tracking-[-0.03em]"
        >
          {SIT_WITH_SOMEONE_HEADING}
        </h3>
        {sitWithCount ? (
          <p className="text-muted-foreground text-[13px]">{sitWithCount}</p>
        ) : null}
      </div>
      <div
        role="radiogroup"
        aria-labelledby="tournament-join-sit-with"
        className="border-rule overflow-hidden rounded-[14px] border"
      >
        {halfTeams.map((side, index) => (
          <div
            key={side.sideIndex}
            className={index > 0 ? "border-rule border-t" : undefined}
          >
            <HalfTeamRow
              side={side}
              format={format}
              picked={picked}
              pending={pending}
              onPick={onPick}
            />
          </div>
        ))}
        {vacantSideIndex != null ? (
          <div
            className={
              halfTeams.length > 0 ? "border-rule border-t" : undefined
            }
          >
            <StartOwnTeamRow
              selected={startOwnSelected}
              pending={pending}
              onPick={() => {
                const seat = tournamentStartOwnSeat(
                  sides,
                  preferredPosition,
                  picked,
                );
                if (seat) {
                  onPick(seat);
                }
              }}
            />
          </div>
        ) : null}
      </div>
    </section>
  );
}

function YourSeatSegment({
  picked,
  availability,
  pending,
  roundCount,
  occupantName,
  occupiedPosition,
  onPickPosition,
}: {
  picked: FriendlyGameJoinSeat | null;
  availability: { leftTaken: boolean; rightTaken: boolean };
  pending: boolean;
  roundCount: number | null;
  occupantName: string | null;
  occupiedPosition: "left" | "right" | null;
  onPickPosition: (position: SeatPosition) => void;
}) {
  const selected =
    picked &&
    ((picked.position === "left" && !availability.leftTaken) ||
      (picked.position === "right" && !availability.rightTaken))
      ? picked.position
      : "";
  const bothDisabled = availability.leftTaken && availability.rightTaken;
  const explanation = bothDisabled
    ? null
    : tournamentJoinSeatExplanation({
        occupantName,
        occupiedPosition,
        freePosition: picked?.position ?? "right",
        roundCount,
      });

  return (
    <section>
      <div className="flex items-baseline gap-2.5 pb-2.5">
        <h3
          id="tournament-join-your-seat"
          className="font-expanded text-[19px] tracking-[-0.03em]"
        >
          {YOUR_SEAT_HEADING}
        </h3>
      </div>
      <Tabs
        value={selected}
        onValueChange={(value) => {
          if (value === "left" || value === "right") {
            onPickPosition(value);
          }
        }}
      >
        <TabsList
          aria-labelledby="tournament-join-your-seat"
          className="border-rule bg-paper w-full max-w-full justify-stretch overflow-hidden rounded-[12px] border p-0 group-data-[orientation=horizontal]/tabs:h-auto"
        >
          <TabsTrigger
            value="left"
            disabled={pending || availability.leftTaken}
            className={cn(
              TAB_SEGMENT,
              "disabled:bg-wash disabled:text-muted-foreground disabled:opacity-100",
            )}
          >
            Left
            {availability.leftTaken ? (
              <span className="ml-1.5 text-xs font-normal">
                {TAKEN_SEAT_LABEL}
              </span>
            ) : null}
          </TabsTrigger>
          <TabsTrigger
            value="right"
            disabled={pending || availability.rightTaken}
            className={cn(
              TAB_SEGMENT,
              "disabled:bg-wash disabled:text-muted-foreground disabled:opacity-100",
            )}
          >
            Right
            {availability.rightTaken ? (
              <span className="ml-1.5 text-xs font-normal">
                {TAKEN_SEAT_LABEL}
              </span>
            ) : null}
          </TabsTrigger>
        </TabsList>
      </Tabs>
      {explanation ? (
        <p className="text-muted-foreground mt-2.5 text-[13px] leading-relaxed">
          {explanation}
        </p>
      ) : null}
    </section>
  );
}

function TournamentTakeASeat({
  title,
  sides,
  format,
  picked,
  pending,
  pricePerPlayerCents,
  preferredPosition,
  roundCount,
  windowStart,
  windowEnd,
  onClose,
  onChooseSeat,
  onConfirm,
}: {
  title: string;
  sides: readonly FriendlyGameJoinSheetSide[];
  format: string;
  picked: FriendlyGameJoinSeat | null;
  pending: boolean;
  pricePerPlayerCents?: number | null;
  preferredPosition: string | null | undefined;
  roundCount: number | null;
  windowStart?: Date | string | null;
  windowEnd?: Date | string | null;
  onClose: () => void;
  onChooseSeat: (seat: FriendlyGameJoinSeat) => void;
  onConfirm: () => void;
}) {
  const field = tournamentFieldSummary(sides);
  const pickedSide = sides.find((side) => side.sideIndex === picked?.sideIndex);
  const availability = tournamentYourSeatAvailability(pickedSide);
  const occupiedPosition: SeatPosition | null =
    pickedSide?.left && !pickedSide.right
      ? "left"
      : pickedSide?.right && !pickedSide.left
        ? "right"
        : null;
  const occupant =
    occupiedPosition && pickedSide ? pickedSide[occupiedPosition] : null;
  const schedule =
    roundCount != null && windowStart && windowEnd
      ? tournamentRoundSchedule({
          windowStart,
          windowEnd,
          roundCount,
        })
      : [];
  const roundDates = schedule.map((entry) => formatGameCardDay(entry.start));
  const firstRoundDay =
    roundDates[0] ?? tournamentJoinFirstRoundDay(windowStart);
  const detailRows = tournamentJoinDetailRows({
    roundDates,
    roundCount,
    priceLabel: formatPricePerPlayerCents(pricePerPlayerCents),
  });

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="border-rule shrink-0 px-[22px] pb-0 pt-[22px]">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="border-rule text-ink focus-visible:ring-ring/50 flex size-11 min-h-11 min-w-11 items-center justify-center rounded-[10px] border outline-none focus-visible:ring-[3px]"
            aria-label="Close"
          >
            <X aria-hidden="true" className="size-5" strokeWidth={2} />
          </button>
          <p className="text-muted-foreground text-[13px]">
            {tournamentJoinSeatsTakenLine(field.seatsTaken, field.seatTotal)}
          </p>
        </div>
        <ResponsiveDialogHeader className="p-0 pt-6 text-left group-data-[vaul-drawer-direction=bottom]/drawer-content:text-left">
          <ResponsiveDialogTitle className="font-expanded text-[38px] leading-none tracking-[-0.03em]">
            {TAKE_A_SEAT_TITLE}
          </ResponsiveDialogTitle>
          <ResponsiveDialogDescription className="text-[15px] leading-relaxed">
            {tournamentJoinHeaderLine({
              name: title,
              roundCount,
              firstRoundDay,
            })}
          </ResponsiveDialogDescription>
        </ResponsiveDialogHeader>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-[26px] overflow-y-auto overscroll-contain px-[22px] py-[22px]">
        <TournamentSeatList
          sides={sides}
          format={format}
          picked={picked}
          pending={pending}
          preferredPosition={preferredPosition}
          onPick={onChooseSeat}
        />
        <YourSeatSegment
          picked={picked}
          availability={availability}
          pending={pending}
          roundCount={roundCount}
          occupantName={occupant?.name ?? null}
          occupiedPosition={occupiedPosition}
          onPickPosition={(position) => {
            if (!pickedSide) {
              return;
            }
            onChooseSeat({ sideIndex: pickedSide.sideIndex, position });
          }}
        />
        <TournamentDetailRows rows={detailRows} />
      </div>

      <div className="border-rule mt-auto flex shrink-0 flex-col gap-2.5 border-t px-[22px] pb-[max(22px,env(safe-area-inset-bottom))] pt-5">
        <Button
          type="button"
          className="h-[52px] min-h-[52px] w-full"
          disabled={!picked || pending}
          onClick={onConfirm}
        >
          {pending
            ? "Joining…"
            : picked
              ? tournamentJoinTakeSeatLabel(picked.position)
              : TAKE_A_SEAT_TITLE}
        </Button>
        <p className="text-muted-foreground text-center text-xs leading-relaxed">
          {LEAVE_SEAT_UNTIL_POOL_DRAW_COPY}
        </p>
      </div>
    </div>
  );
}

/**
 * Join sheet (join-sheet redesign): the viewer picks a Position off the
 * line-up itself — both Game teams either side of the net, taken Positions
 * shown with their occupant — then confirms in a footer that also states the
 * price. Replaces the flat list of vacant-Position buttons, which joined on
 * the first tap and showed nothing about who was already in.
 *
 * Confirming closes the sheet and leaves the outcome to the caller's
 * mutation toast, matching the pre-redesign behaviour.
 *
 * The sheet opens with the viewer's Preferred Position already picked when a
 * matching Position is free (`preferredJoinSeat`). That is a default and not
 * a rule: both Positions stay drawn and enabled, one tap moves or clears the
 * pick, and nothing is submitted until the footer button. A lone vacant
 * Position is chosen rather than asked.
 *
 * On individual Friendly games with a fully vacant side, a mode chooser
 * (artboard 02b) is the first step: Join alone reaches this picker; Join
 * with a partner stays in this dialog for Pick a partner and Register the
 * team. Hub cards can open straight on Pick a partner.
 */
export function FriendlyGameJoinSheet({
  open,
  onOpenChange,
  title,
  sides,
  pending,
  pricePerPlayerCents,
  onPickSeat,
  gameId,
  format,
  registrationMode,
  canRegister,
  windowStart,
  venueName,
  groupName,
  isOrganizer,
  levelMinTenths,
  levelMaxTenths,
  startAtPartner = false,
  initialSeat = null,
  poolCount,
  teamsAllowed,
  windowEnd,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  sides: readonly FriendlyGameJoinSheetSide[];
  pending: boolean;
  pricePerPlayerCents?: number | null;
  onPickSeat: (sideIndex: number, position: SeatPosition) => void;
  gameId?: string;
  format?: string;
  registrationMode?: string;
  canRegister?: boolean;
  windowStart?: Date | string | null;
  venueName?: string | null;
  groupName?: string | null;
  isOrganizer?: boolean;
  levelMinTenths?: number | null;
  levelMaxTenths?: number | null;
  startAtPartner?: boolean;
  initialSeat?: FriendlyGameJoinSeat | null;
  poolCount?: number | null;
  teamsAllowed?: number | null;
  windowEnd?: Date | string | null;
}) {
  const isTournamentJoin = isTournamentJoinSheet(
    format,
    poolCount,
    sides.length,
  );

  // `touched` is what keeps the Preferred Position default a default: until
  // the viewer taps, the picked Position is derived, so it can appear the
  // moment `onboardingState` answers and update if a Position is taken while
  // the sheet is open. After a tap the viewer's own choice stands, including
  // the empty one they get by tapping the pre-selected Position off again.
  const [selection, setSelection] = useState<{
    touched: boolean;
    seat: FriendlyGameJoinSeat | null;
  }>({ touched: false, seat: null });
  const [step, setStep] = useState<JoinSheetStep>("seat");
  const [selectedPartner, setSelectedPartner] =
    useState<FriendlyGamePartnerPick | null>(null);
  const [partnerRaceMessage, setPartnerRaceMessage] = useState<string | null>(
    null,
  );
  const [openedAtPartner, setOpenedAtPartner] = useState(false);

  const utils = api.useUtils();

  // Only while the sheet is open: this is a default for a picker, not
  // something every Game card on a hub needs to fetch on mount.
  const onboardingState = api.users.onboardingState.useQuery(undefined, {
    enabled: open,
  });

  const registerWithPartner = api.games.registerWithPartner.useMutation({
    onSuccess: async (result) => {
      toast.success(result.waitlisted ? "Joined waitlist" : "Registered");
      if (gameId) {
        await utils.games.byId.invalidate({ id: gameId });
        await utils.games.searchPartnerUsers.invalidate({ gameId });
        await utils.games.listPartnerSuggestions.invalidate({ gameId });
      }
      await utils.games.listMyGames.invalidate();
      await utils.games.listPublicPickup.invalidate();
      await utils.users.home.invalidate();
      onOpenChange(false);
    },
    onError: async (error) => {
      if (
        !isPartnerVacantSideRace({
          message: error.message,
          data: { code: error.data?.code },
        })
      ) {
        return;
      }
      setPartnerRaceMessage(PARTNER_VACANT_SIDE_RACE_MESSAGE);
      registerWithPartner.reset();
      setStep("partner");
      if (!gameId) {
        return;
      }
      const fresh = await utils.games.byId.fetch({ id: gameId });
      if (partnerVacantSideRaceRecovery(fresh.sides) === "game_home") {
        toast.error(PARTNER_VACANT_SIDE_RACE_MESSAGE);
        onOpenChange(false);
      }
    },
  });

  useEffect(() => {
    if (open) {
      setSelection({ touched: false, seat: null });
      const offer = offersPartnerJoin({
        canRegister: canRegister ?? false,
        format: format ?? "",
        registrationMode: registrationMode ?? "",
        sides,
      });
      const tournamentJoin = isTournamentJoinSheet(
        format,
        poolCount,
        sides.length,
      );
      const openPartner = startAtPartner && offer && !tournamentJoin;
      setOpenedAtPartner(openPartner);
      setStep(
        openPartner
          ? "partner"
          : initialSeat || tournamentJoin
            ? "seat"
            : offer
              ? "chooser"
              : "seat",
      );
      setSelectedPartner(null);
      setPartnerRaceMessage(null);
      registerWithPartner.reset();
    }
    // Reset only on open, matching the picker default. Props are read fresh.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- open-gated reset
  }, [open]);

  const rawPicked = selection.touched
    ? selection.seat
    : (initialSeat ??
      defaultJoinSeat(sides, onboardingState.data?.preferredPosition));
  const picked = isTournamentJoin
    ? tournamentJoinResolvedSeat(sides, rawPicked)
    : rawPicked;

  function pick(seat: FriendlyGameJoinSeat) {
    const same =
      picked?.sideIndex === seat.sideIndex && picked.position === seat.position;
    setSelection({ touched: true, seat: same ? null : seat });
  }

  function chooseSeat(seat: FriendlyGameJoinSeat) {
    setSelection({ touched: true, seat });
  }

  const isFull = vacantJoinSeats(sides).length === 0;
  const priceLabel = formatPricePerPlayerCents(pricePerPlayerCents);
  const vacantSideIndex = firstFullyVacantSideIndex(sides);

  function confirmSeat() {
    if (!picked) {
      return;
    }
    onOpenChange(false);
    onPickSeat(picked.sideIndex, picked.position);
  }

  function goPartner() {
    registerWithPartner.reset();
    setPartnerRaceMessage(null);
    setStep("partner");
  }

  function leavePartner() {
    registerWithPartner.reset();
    if (openedAtPartner) {
      onOpenChange(false);
      return;
    }
    setStep("chooser");
  }

  function confirmPartner(position: SeatPosition) {
    if (!gameId || !selectedPartner) {
      return;
    }
    if (vacantSideIndex == null) {
      setPartnerRaceMessage(PARTNER_VACANT_SIDE_RACE_MESSAGE);
      toast.error(PARTNER_VACANT_SIDE_RACE_MESSAGE);
      onOpenChange(false);
      return;
    }
    registerWithPartner.mutate({
      gameId,
      partnerUserId: selectedPartner.id,
      sideIndex: vacantSideIndex,
      position,
    });
  }

  const headerTitle =
    step === "chooser"
      ? "How do you want to join?"
      : isFull
        ? "Game is full"
        : "Pick your spot";
  const headerDescription =
    step === "chooser"
      ? "Two seats on the same side are open, so you can take one on your own or bring someone and register as a team."
      : title;
  const showSheetHeader =
    step !== "partner" &&
    step !== "partnerConfirm" &&
    !(isTournamentJoin && step === "seat");
  const roundCount = tournamentJoinRoundCount(teamsAllowed, poolCount);

  return (
    <ResponsiveDialog open={open} onOpenChange={onOpenChange}>
      <ResponsiveDialogContent
        className="flex max-h-[90vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-[460px]"
        showCloseButton={showSheetHeader}
      >
        {showSheetHeader ? (
          <ResponsiveDialogHeader className="px-[22px] pb-0 pt-[22px] text-left group-data-[vaul-drawer-direction=bottom]/drawer-content:text-left">
            <ResponsiveDialogTitle className="text-h2 tracking-[-0.02em]">
              {headerTitle}
            </ResponsiveDialogTitle>
            <ResponsiveDialogDescription className="text-meta">
              {headerDescription}
            </ResponsiveDialogDescription>
          </ResponsiveDialogHeader>
        ) : step === "partner" || step === "partnerConfirm" ? (
          <ResponsiveDialogHeader className="sr-only">
            <ResponsiveDialogTitle>
              {step === "partnerConfirm"
                ? "Register the team"
                : "Pick a partner"}
            </ResponsiveDialogTitle>
            <ResponsiveDialogDescription>
              You register both seats. Your partner is in straight away.
            </ResponsiveDialogDescription>
          </ResponsiveDialogHeader>
        ) : null}

        {step === "chooser" ? (
          <ModeChooser
            onJoinAlone={() => setStep("seat")}
            onJoinWithPartner={goPartner}
          />
        ) : null}

        {step === "seat" && isTournamentJoin ? (
          <TournamentTakeASeat
            title={title}
            sides={sides}
            format={format ?? "friendly_tournament"}
            picked={picked}
            pending={pending}
            pricePerPlayerCents={pricePerPlayerCents}
            preferredPosition={onboardingState.data?.preferredPosition}
            roundCount={roundCount}
            windowStart={windowStart}
            windowEnd={windowEnd}
            onClose={() => onOpenChange(false)}
            onChooseSeat={chooseSeat}
            onConfirm={confirmSeat}
          />
        ) : null}

        {step === "seat" && !isTournamentJoin ? (
          <>
            <div className="px-[22px] pt-[18px]">
              {partnerRaceMessage ? (
                <FormErrorSummary
                  message={partnerRaceMessage}
                  className="mb-4"
                />
              ) : null}
              <div className="border-rule bg-paper overflow-hidden rounded-xl border">
                <div className="flex items-start px-4 pb-4 pt-[18px]">
                  {sides.map((side, index) => (
                    <Fragment key={side.sideIndex}>
                      {index > 0 ? <NetDivider /> : null}
                      <SideColumn
                        side={side}
                        format={format ?? "friendly_game"}
                        picked={picked}
                        pending={pending}
                        onPick={pick}
                      />
                    </Fragment>
                  ))}
                </div>
                <p
                  aria-live="polite"
                  className="border-rule text-muted-foreground text-meta border-t px-4 py-3"
                >
                  {friendlyGameJoinSheetCaption(sides, picked)}
                </p>
              </div>
            </div>

            <div className="border-rule mt-[22px] flex items-center gap-4 border-t px-[22px] pb-[max(22px,env(safe-area-inset-bottom))] pt-4">
              {priceLabel ? (
                <div className="shrink-0">
                  <p className="font-expanded text-lead tabular-nums leading-none">
                    {priceLabel}
                  </p>
                  <p className="text-muted-foreground text-eyebrow mt-1.5">
                    per player
                  </p>
                </div>
              ) : null}
              <Button
                type="button"
                className="h-[52px] flex-1"
                disabled={!picked || pending}
                onClick={confirmSeat}
              >
                {pending ? "Joining…" : "Join game"}
              </Button>
            </div>
          </>
        ) : null}

        {step === "partner" && gameId ? (
          <FriendlyGamePartnerPicker
            gameId={gameId}
            vacantSeatCount={vacantJoinSeats(sides).length}
            windowStart={windowStart}
            venueName={venueName}
            groupName={groupName}
            pricePerPlayerCents={pricePerPlayerCents}
            notice={partnerRaceMessage}
            selectedPartner={selectedPartner}
            onSelectedPartnerChange={setSelectedPartner}
            onBack={leavePartner}
            onClose={() => onOpenChange(false)}
            onContinue={() => {
              registerWithPartner.reset();
              setPartnerRaceMessage(null);
              setStep("partnerConfirm");
            }}
          />
        ) : null}

        {step === "partnerConfirm" && selectedPartner ? (
          <FriendlyGamePartnerReview
            partner={selectedPartner}
            viewerPreferredPosition={onboardingState.data?.preferredPosition}
            windowStart={windowStart}
            venueName={venueName}
            isOrganizer={isOrganizer}
            pricePerPlayerCents={pricePerPlayerCents}
            levelMinTenths={levelMinTenths}
            levelMaxTenths={levelMaxTenths}
            pending={registerWithPartner.isPending}
            errorMessage={globalFormErrorMessage(registerWithPartner.error)}
            onBack={() => {
              registerWithPartner.reset();
              setStep("partner");
            }}
            onRegister={confirmPartner}
          />
        ) : null}
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
