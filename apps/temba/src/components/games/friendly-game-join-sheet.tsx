"use client";

import { ArrowLeft, ChevronRight, UserRound, Users, X } from "lucide-react";
import { Fragment, useEffect, useState } from "react";
import { toast } from "sonner";

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
import { Button } from "~/components/ui/button";
import { FormErrorSummary } from "~/components/ui/form-error-summary";
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
import { defaultJoinSeat } from "~/lib/preferred-seat";
import { formatPricePerPlayerCents } from "~/lib/price-per-player";
import { tournamentFieldSummary } from "~/lib/tournament-home";
import {
  isTournamentJoinSheet,
  LEAVE_SEAT_UNTIL_POOL_DRAW_COPY,
  TAKE_A_SEAT_TITLE,
  tournamentJoinDetailRows,
  tournamentJoinFirstRoundDay,
  tournamentJoinHeaderLine,
  tournamentJoinOpeningSeat,
  tournamentJoinResolvedSeat,
  tournamentJoinSeatExplanation,
  tournamentJoinSeatsTakenLine,
  tournamentJoinSheetOpeningStep,
  tournamentPartnerVacantSideRaceMessage,
} from "~/lib/tournament-join";
import {
  isPartnerRequiredGame,
  tournamentRoundSchedule,
} from "~/lib/tournament-rounds";
import { resolvePlannedRoundCount } from "~/lib/tournament-sizing";
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
            className="text-muted-foreground size-[18px] shrink-0"
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
          !taken &&
            !selected &&
            "hatch text-muted-foreground border-transparent",
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
      <span className="text-muted-foreground py-1.5 text-xs font-semibold">
        vs
      </span>
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

function TournamentTeamSides({
  sides,
  format,
  picked,
  pending,
  focusedSideIndex,
  onFocusSide,
  onPick,
}: {
  sides: readonly FriendlyGameJoinSheetSide[];
  format: string;
  picked: FriendlyGameJoinSeat | null;
  pending: boolean;
  focusedSideIndex: number | null;
  onFocusSide: (
    side: FriendlyGameJoinSheetSide,
    position?: "left" | "right",
  ) => void;
  onPick: (seat: FriendlyGameJoinSeat) => void;
}) {
  const focused =
    focusedSideIndex == null
      ? null
      : (sides.find((side) => side.sideIndex === focusedSideIndex) ?? null);

  if (focused) {
    const teamLabel = formatGameSideLabel(format, focused.sideIndex);
    return (
      <section>
        <div className="pb-2.5">
          <h3
            id="tournament-join-sides"
            className="font-expanded text-[19px] tracking-[-0.03em]"
          >
            {teamLabel}
          </h3>
        </div>
        <div className="border-rule rounded-[14px] border px-4 py-4">
          <SideColumn
            side={focused}
            format={format}
            picked={picked}
            pending={pending}
            onPick={onPick}
          />
        </div>
      </section>
    );
  }

  return (
    <section>
      <div className="flex items-baseline gap-2.5 pb-2.5">
        <h3
          id="tournament-join-sides"
          className="font-expanded text-[19px] tracking-[-0.03em]"
        >
          Teams
        </h3>
      </div>
      <div
        className="flex flex-col gap-3"
        aria-labelledby="tournament-join-sides"
      >
        {sides.map((side) => (
          <div
            key={side.sideIndex}
            className="border-rule rounded-[14px] border px-4 py-4"
          >
            <SideColumn
              side={side}
              format={format}
              picked={picked}
              pending={pending}
              onPick={(seat) => onFocusSide(side, seat.position)}
            />
          </div>
        ))}
      </div>
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
  roundCount,
  windowStart,
  windowEnd,
  matchMinutes,
  onClose,
  onBackToTeams,
  focusedSideIndex,
  onFocusSide,
  onChooseSeat,
  onConfirm,
  onJoinWithPartner,
}: {
  title: string;
  sides: readonly FriendlyGameJoinSheetSide[];
  format: string;
  picked: FriendlyGameJoinSeat | null;
  pending: boolean;
  pricePerPlayerCents?: number | null;
  roundCount: number | null;
  windowStart?: Date | string | null;
  windowEnd?: Date | string | null;
  matchMinutes: number | null;
  onClose: () => void;
  onBackToTeams?: () => void;
  focusedSideIndex: number | null;
  onFocusSide: (
    side: FriendlyGameJoinSheetSide,
    position?: "left" | "right",
  ) => void;
  onChooseSeat: (seat: FriendlyGameJoinSeat) => void;
  onConfirm: () => void;
  onJoinWithPartner?: () => void;
}) {
  const field = tournamentFieldSummary(sides);
  const pickedSide = sides.find((side) => side.sideIndex === picked?.sideIndex);
  const occupiedPosition: SeatPosition | null =
    pickedSide?.left && !pickedSide.right
      ? "left"
      : pickedSide?.right && !pickedSide.left
        ? "right"
        : null;
  const occupant =
    occupiedPosition && pickedSide ? pickedSide[occupiedPosition] : null;
  const bothOpen =
    pickedSide != null && pickedSide.left == null && pickedSide.right == null;
  const explanation =
    !picked || (!occupant && !bothOpen)
      ? null
      : tournamentJoinSeatExplanation({
          occupantName: occupant?.name ?? null,
          occupiedPosition,
          freePosition: picked.position,
          roundCount,
        });
  const schedule =
    roundCount != null && windowStart && windowEnd
      ? tournamentRoundSchedule({
          windowStart,
          windowEnd,
          roundCount,
          matchMinutes,
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
          {onBackToTeams ? (
            <button
              type="button"
              onClick={onBackToTeams}
              className="border-rule text-ink focus-visible:ring-ring/50 flex size-11 min-h-11 min-w-11 items-center justify-center rounded-[10px] border outline-none focus-visible:ring-[3px]"
              aria-label="All teams"
            >
              <ArrowLeft
                aria-hidden="true"
                className="size-5"
                strokeWidth={2}
              />
            </button>
          ) : (
            <button
              type="button"
              onClick={onClose}
              className="border-rule text-ink focus-visible:ring-ring/50 flex size-11 min-h-11 min-w-11 items-center justify-center rounded-[10px] border outline-none focus-visible:ring-[3px]"
              aria-label="Close"
            >
              <X aria-hidden="true" className="size-5" strokeWidth={2} />
            </button>
          )}
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
        <TournamentTeamSides
          sides={sides}
          format={format}
          picked={picked}
          pending={pending}
          focusedSideIndex={focusedSideIndex}
          onFocusSide={onFocusSide}
          onPick={onChooseSeat}
        />
        {explanation ? (
          <p className="text-muted-foreground text-[13px] leading-relaxed">
            {explanation}
          </p>
        ) : null}
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
              ? `Join ${formatGameSideLabel(format, picked.sideIndex)}, ${picked.position === "left" ? "left" : "right"} seat`
              : TAKE_A_SEAT_TITLE}
        </Button>
        {onJoinWithPartner ? (
          <Button
            type="button"
            variant="outline"
            className="h-[52px] min-h-[52px] w-full"
            disabled={pending}
            onClick={onJoinWithPartner}
          >
            Join with a partner
          </Button>
        ) : null}
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
 * On individual Friendly games and allow-alone Pool tournaments with a fully
 * vacant side, a mode chooser is the first step: Join alone picks a side on
 * a team; Join with a partner stays in this dialog for Pick a partner and
 * Register the team. The tournament side step also offers Join with a
 * partner while a side is fully vacant. Hub cards can open straight on Pick
 * a partner. Pool tournaments skip the chooser when Take seat already named
 * a Position, or when no side is fully vacant.
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
  storedRoundCount,
  windowEnd,
  matchMinutes = null,
  allowSoloRegister = true,
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
  storedRoundCount?: number | null;
  windowEnd?: Date | string | null;
  matchMinutes?: number | null;
  allowSoloRegister?: boolean;
}) {
  const isTournamentJoin = isTournamentJoinSheet(
    format,
    poolCount,
    sides.length,
  );
  const partnerRequired = isPartnerRequiredGame({
    format: format ?? "",
    poolCount,
    registrationMode: registrationMode ?? "",
    allowSoloRegister,
  });
  const offersPartner = offersPartnerJoin({
    canRegister: canRegister ?? false,
    format: format ?? "",
    registrationMode: registrationMode ?? "",
    sides,
  });
  const vacantSideRaceMessage = isTournamentJoin
    ? tournamentPartnerVacantSideRaceMessage(partnerRequired)
    : PARTNER_VACANT_SIDE_RACE_MESSAGE;

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
  const [focusedSideIndex, setFocusedSideIndex] = useState<number | null>(null);

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
      setPartnerRaceMessage(vacantSideRaceMessage);
      registerWithPartner.reset();
      setStep("partner");
      if (!gameId) {
        return;
      }
      const fresh = await utils.games.byId.fetch({ id: gameId });
      if (partnerVacantSideRaceRecovery(fresh.sides) === "game_home") {
        toast.error(vacantSideRaceMessage);
        onOpenChange(false);
      }
    },
  });

  useEffect(() => {
    if (open) {
      setSelection({ touched: false, seat: null });
      const offer = offersPartner;
      const tournamentJoin = isTournamentJoinSheet(
        format,
        poolCount,
        sides.length,
      );
      const tournamentOpening = tournamentJoin
        ? tournamentJoinSheetOpeningStep({
            offersPartner: offer,
            hasInitialSeat: initialSeat != null,
            partnerRequired,
          })
        : null;
      const openPartner =
        tournamentOpening === "partner" || (startAtPartner && offer);
      setOpenedAtPartner(openPartner);
      setStep(
        openPartner
          ? "partner"
          : tournamentOpening === "chooser" ||
              (!tournamentJoin && !initialSeat && offer)
            ? "chooser"
            : "seat",
      );
      setSelectedPartner(null);
      setPartnerRaceMessage(null);
      setFocusedSideIndex(initialSeat?.sideIndex ?? null);
      registerWithPartner.reset();
    }
    // Reset only on open, matching the picker default. Props are read fresh.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- open-gated reset
  }, [open]);

  const rawPicked = selection.touched
    ? selection.seat
    : isTournamentJoin
      ? tournamentJoinOpeningSeat(
          sides,
          onboardingState.data?.preferredPosition,
          initialSeat ?? null,
        )
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

  function focusTeam(
    side: FriendlyGameJoinSheetSide,
    position?: "left" | "right",
  ) {
    const preferred = onboardingState.data?.preferredPosition;
    const preferredSeat =
      preferred === "left" || preferred === "right" ? preferred : null;
    const chosen =
      position && side[position] == null
        ? position
        : preferredSeat && side[preferredSeat] == null
          ? preferredSeat
          : side.left == null
            ? "left"
            : "right";
    setFocusedSideIndex(side.sideIndex);
    setSelection({
      touched: true,
      seat: { sideIndex: side.sideIndex, position: chosen },
    });
  }

  function backToTeams() {
    setFocusedSideIndex(null);
    setSelection({ touched: true, seat: null });
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
      setPartnerRaceMessage(vacantSideRaceMessage);
      toast.error(vacantSideRaceMessage);
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
  const roundCount = resolvePlannedRoundCount(
    teamsAllowed,
    poolCount,
    storedRoundCount,
  );

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

        {step === "chooser" && !partnerRequired ? (
          <ModeChooser
            onJoinAlone={() => {
              setFocusedSideIndex(null);
              setSelection({ touched: true, seat: null });
              setStep("seat");
            }}
            onJoinWithPartner={goPartner}
          />
        ) : null}

        {step === "seat" && isTournamentJoin && !partnerRequired ? (
          <TournamentTakeASeat
            title={title}
            sides={sides}
            format={format ?? "friendly_tournament"}
            picked={picked}
            pending={pending}
            pricePerPlayerCents={pricePerPlayerCents}
            roundCount={roundCount}
            windowStart={windowStart}
            windowEnd={windowEnd}
            matchMinutes={matchMinutes ?? null}
            onClose={() => onOpenChange(false)}
            onBackToTeams={
              focusedSideIndex != null &&
              sides.some(
                (side) =>
                  side.sideIndex === focusedSideIndex &&
                  (side.left == null || side.right == null),
              )
                ? backToTeams
                : undefined
            }
            focusedSideIndex={focusedSideIndex}
            onFocusSide={focusTeam}
            onChooseSeat={pick}
            onConfirm={confirmSeat}
            onJoinWithPartner={offersPartner && gameId ? goPartner : undefined}
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
