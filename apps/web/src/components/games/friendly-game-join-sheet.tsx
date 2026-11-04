"use client";

import { UserRound, Users } from "lucide-react";
import { Fragment, useEffect, useState } from "react";
import { toast } from "sonner";

import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from "~/components/common/responsive-dialog";
import {
  FriendlyGamePartnerPicker,
  type FriendlyGamePartnerPick,
} from "~/components/games/friendly-game-partner-picker";
import { FriendlyGamePartnerReview } from "~/components/games/friendly-game-partner-review";
import { formatGameSideLabel } from "@repo/domain/game-side-label";
import { TournamentDetailRows } from "~/components/games/tournament-detail-rows";
import { SeatTile } from "~/components/temba/seat";
import { Button } from "~/components/ui/button";
import { FormErrorSummary } from "~/components/ui/form-error-summary";
import { BackButton, CloseButton } from "~/components/ui/nav-icon-button";
import { SelectCard, SelectCardNote } from "~/components/ui/select-card";
import { formatGameCardDay } from "@repo/domain/format-game-start";
import { globalFormErrorMessage } from "~/lib/form-mutation-error";
import {
  friendlyGameJoinSheetCaption,
  vacantJoinSeats,
  type FriendlyGameJoinSeat,
} from "@repo/domain/friendly-game-cta";
import {
  firstFullyVacantSideIndex,
  friendlyGameJoinOpeningStep,
  friendlyGameJoinSheetHeader,
  isPartnerVacantSideRace,
  offersPartnerJoin,
  partnerVacantSideRaceMessage,
  partnerVacantSideRaceRecovery,
} from "@repo/domain/friendly-game-partner";
import {
  displayLabelFromStoredBand,
  type LevelBand,
} from "@repo/domain/level-bands";
import { defaultJoinSeat } from "@repo/domain/preferred-seat";
import { formatPricePerPlayerFils } from "@repo/domain/price-per-player";
import { tournamentFieldSummary } from "@repo/domain/tournament-home";
import {
  isTournamentJoinSheet,
  tournamentJoinDetailRows,
  tournamentJoinFirstRoundDay,
  tournamentJoinHeaderLine,
  tournamentJoinOpeningSeat,
  tournamentJoinResolvedSeat,
  tournamentJoinSeatExplanation,
  tournamentJoinSeatsTakenLine,
  tournamentJoinSheetOpeningStep,
  tournamentPartnerVacantSideRaceMessage,
} from "@repo/domain/tournament-join";
import {
  isKnockoutOnly,
  isPartnerRequiredGame,
  plannedTournamentRoundCount,
  tournamentRoundSchedule,
} from "@repo/domain/tournament-rounds";
import { useLocale, useMessages } from "~/components/locale-provider";
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
  const m = useMessages();
  const joinAlone = m.game.joinSheet.joinAlone;
  const joinWithPartner = m.game.joinSheet.joinWithPartner;
  return (
    <div className="flex flex-col gap-3 px-[22px] pb-[max(22px,env(safe-area-inset-bottom))] pt-[18px]">
      <SelectCard
        onClick={onJoinAlone}
        aria-label={joinAlone.accessibleName}
        icon={<UserRound className="size-[17px]" strokeWidth={1.75} />}
        title={joinAlone.title}
        description={joinAlone.description}
        trailing="chevron"
        className="border-ink"
      >
        <TwoSeatDiagram onInk={false} />
        <SelectCardNote>{joinAlone.note}</SelectCardNote>
      </SelectCard>

      <SelectCard
        selected
        onClick={onJoinWithPartner}
        aria-label={joinWithPartner.accessibleName}
        icon={<Users className="size-[17px]" strokeWidth={1.75} />}
        title={joinWithPartner.title}
        description={joinWithPartner.description}
        trailing="chevron"
        className="hover:bg-dimrule"
      >
        <TwoSeatDiagram onInk />
        <SelectCardNote>{joinWithPartner.note}</SelectCardNote>
      </SelectCard>
    </div>
  );
}

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
  const m = useMessages();
  const seatName = m.webGame.joinSheet.seatName(
    sideLabel,
    m.tournament.position[`${position}Lower`],
  );
  return (
    <SeatTile
      occupant={occupant}
      level={occupantLevelLabel(occupant)}
      selected={selected}
      caption={m.tournament.position[position]}
      label={
        occupant
          ? m.webGame.joinSheet.seatTakenBy(seatName, occupant.name)
          : m.webGame.joinSheet.takeSeat(seatName)
      }
      disabled={occupant != null || disabled}
      onSelect={onSelect}
    />
  );
}

/** The net between the two Game teams — decoration, mirroring the "vs" rule
 * `game-lineup-section.tsx` already puts between its two columns. */
function NetDivider() {
  const m = useMessages();
  return (
    <div
      aria-hidden="true"
      className="flex w-8 shrink-0 flex-col items-center self-stretch"
    >
      <span className="h-5 shrink-0" />
      <span className="bg-rule w-px flex-1" />
      <span className="text-muted-foreground text-eyebrow py-1.5 font-semibold">
        {m.webGame.joinSheet.versus}
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
  const locale = useLocale();
  const sideLabel = formatGameSideLabel(format, side.sideIndex, locale);

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
  const locale = useLocale();
  const m = useMessages();
  const focused =
    focusedSideIndex == null
      ? null
      : (sides.find((side) => side.sideIndex === focusedSideIndex) ?? null);

  if (focused) {
    const teamLabel = formatGameSideLabel(format, focused.sideIndex, locale);
    return (
      <section>
        <div className="pb-2.5">
          <h3
            id="tournament-join-sides"
            className="font-expanded text-title tracking-[-0.03em]"
          >
            {teamLabel}
          </h3>
        </div>
        <div className="border-rule rounded-card border px-4 py-4">
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
          className="font-expanded text-title tracking-[-0.03em]"
        >
          {m.webGame.joinSheet.teams}
        </h3>
      </div>
      <div
        className="flex flex-col gap-3"
        aria-labelledby="tournament-join-sides"
      >
        {sides.map((side) => (
          <div
            key={side.sideIndex}
            className="border-rule rounded-card border px-4 py-4"
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
  pricePerPlayerFils,
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
  error,
  knockoutOnly,
}: {
  title: string;
  knockoutOnly: boolean;
  sides: readonly FriendlyGameJoinSheetSide[];
  format: string;
  picked: FriendlyGameJoinSeat | null;
  pending: boolean;
  error: string | null;
  pricePerPlayerFils?: number | null;
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
  const locale = useLocale();
  const m = useMessages();
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
          locale,
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
  const roundDates = schedule.map((entry) =>
    formatGameCardDay(entry.start, locale),
  );
  const firstRoundDay =
    roundDates[0] ?? tournamentJoinFirstRoundDay(windowStart, locale);
  const detailRows = tournamentJoinDetailRows({
    roundDates,
    roundCount,
    priceLabel: formatPricePerPlayerFils(pricePerPlayerFils, locale),
    locale,
  });

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="border-rule shrink-0 px-[22px] pb-0 pt-[22px]">
        <div className="flex items-center justify-between">
          {onBackToTeams ? (
            <BackButton
              variant="boxed"
              label={m.webGame.joinSheet.allTeams}
              onClick={onBackToTeams}
            />
          ) : (
            <CloseButton variant="boxed" onClick={onClose} />
          )}
          <p className="text-muted-foreground text-meta">
            {tournamentJoinSeatsTakenLine(
              field.seatsTaken,
              field.seatTotal,
              locale,
            )}
          </p>
        </div>
        <ResponsiveDialogHeader className="p-0 pt-6 text-start group-data-[vaul-drawer-direction=bottom]/drawer-content:text-start">
          <ResponsiveDialogTitle className="font-expanded text-display leading-none tracking-[-0.03em]">
            {m.tournament.join.takeASeatTitle}
          </ResponsiveDialogTitle>
          <ResponsiveDialogDescription className="text-body leading-relaxed">
            {tournamentJoinHeaderLine({
              name: title,
              roundCount,
              firstRoundDay,
              locale,
            })}
          </ResponsiveDialogDescription>
        </ResponsiveDialogHeader>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-[26px] overflow-y-auto overscroll-contain px-[22px] py-[22px]">
        <FormErrorSummary message={error} />
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
          <p className="text-muted-foreground text-meta leading-relaxed">
            {explanation}
          </p>
        ) : null}
        <TournamentDetailRows rows={detailRows} />
      </div>

      <div className="border-rule mt-auto flex shrink-0 flex-col gap-2.5 border-t px-[22px] pb-[max(22px,env(safe-area-inset-bottom))] pt-5">
        <Button
          type="button"
          size="lg"
          className="w-full"
          disabled={!picked || pending}
          onClick={onConfirm}
        >
          {pending
            ? m.game.cta.joining
            : picked
              ? m.webGame.joinSheet.joinSeatButton(
                  formatGameSideLabel(format, picked.sideIndex, locale),
                  m.tournament.position[`${picked.position}Lower`],
                )
              : m.tournament.join.takeASeatTitle}
        </Button>
        {onJoinWithPartner ? (
          <Button
            type="button"
            variant="outline"
            size="lg"
            className="w-full"
            disabled={pending}
            onClick={onJoinWithPartner}
          >
            {m.game.joinSheet.joinWithPartner.title}
          </Button>
        ) : null}
        <p className="text-muted-foreground text-eyebrow text-center leading-relaxed">
          {knockoutOnly
            ? m.tournament.join.leaveSeatUntilKnockoutDraw
            : m.tournament.join.leaveSeatUntilPoolDraw}
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
  pricePerPlayerFils,
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
  tournamentShape,
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
  pricePerPlayerFils?: number | null;
  /** Return the join promise to keep the sheet open until it settles. */
  onPickSeat: (
    sideIndex: number,
    position: SeatPosition,
  ) => void | Promise<unknown>;
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
  tournamentShape?: string | null;
  teamsAllowed?: number | null;
  storedRoundCount?: number | null;
  windowEnd?: Date | string | null;
  matchMinutes?: number | null;
  allowSoloRegister?: boolean;
}) {
  const locale = useLocale();
  const m = useMessages();
  const isTournamentJoin = isTournamentJoinSheet(
    format,
    poolCount,
    tournamentShape,
    sides.length,
  );
  const partnerRequired = isPartnerRequiredGame({
    format: format ?? "",
    poolCount,
    tournamentShape,
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
    ? tournamentPartnerVacantSideRaceMessage(partnerRequired, locale)
    : partnerVacantSideRaceMessage(locale);

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
  const [seatError, setSeatError] = useState<string | null>(null);

  const utils = api.useUtils();

  // Only while the sheet is open: this is a default for a picker, not
  // something every Game card on a hub needs to fetch on mount.
  const onboardingState = api.users.onboardingState.useQuery(undefined, {
    enabled: open,
  });

  const registerWithPartner = api.games.registerWithPartner.useMutation({
    onSuccess: async (result) => {
      toast.success(
        result.waitlisted
          ? m.game.toast.joinedWaitlist
          : m.webGame.joinSheet.registeredToast,
      );
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
        tournamentShape,
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
              (!tournamentJoin &&
                friendlyGameJoinOpeningStep({
                  offersPartner: offer,
                  hasInitialSeat: initialSeat != null,
                }) === "chooser")
            ? "chooser"
            : "seat",
      );
      setSelectedPartner(null);
      setPartnerRaceMessage(null);
      setSeatError(null);
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
  const priceLabel = formatPricePerPlayerFils(pricePerPlayerFils, locale);
  const vacantSideIndex = firstFullyVacantSideIndex(sides);

  async function confirmSeat() {
    if (!picked) {
      return;
    }
    const joining = onPickSeat(picked.sideIndex, picked.position);
    if (!(joining instanceof Promise)) {
      onOpenChange(false);
      return;
    }
    setSeatError(null);
    try {
      await joining;
      onOpenChange(false);
    } catch (error) {
      setSeatError(
        globalFormErrorMessage(error instanceof Error ? error : null) ??
          m.webGame.joinSheet.seatJoinFailed,
      );
    }
  }

  function goPartner() {
    registerWithPartner.reset();
    setPartnerRaceMessage(null);
    setStep("partner");
  }

  function leavePartner() {
    registerWithPartner.reset();
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

  const { title: headerTitle, description: headerDescription } =
    friendlyGameJoinSheetHeader({
      step: step === "chooser" ? "chooser" : "seat",
      isFull,
      title,
      locale,
    });
  const showSheetHeader =
    step !== "partner" &&
    step !== "partnerConfirm" &&
    !(isTournamentJoin && step === "seat");
  const roundCount = plannedTournamentRoundCount({
    format: format ?? "",
    teamsAllowed,
    poolCount,
    roundCount: storedRoundCount,
    tournamentShape,
  });

  return (
    <ResponsiveDialog open={open} onOpenChange={onOpenChange}>
      <ResponsiveDialogContent
        className="flex max-h-[90vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-[460px]"
        showCloseButton={showSheetHeader}
      >
        {showSheetHeader ? (
          <ResponsiveDialogHeader className="px-[22px] pb-0 pt-[22px] text-start group-data-[vaul-drawer-direction=bottom]/drawer-content:text-start">
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
                ? m.game.joinSheet.partnerReview.title
                : m.game.joinSheet.partnerPicker.title}
            </ResponsiveDialogTitle>
            <ResponsiveDialogDescription>
              {m.game.joinSheet.partnerPicker.description}
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
            knockoutOnly={isKnockoutOnly(format ?? "", tournamentShape)}
            title={title}
            sides={sides}
            format={format ?? "friendly_tournament"}
            picked={picked}
            pending={pending}
            pricePerPlayerFils={pricePerPlayerFils}
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
            onConfirm={() => {
              void confirmSeat();
            }}
            onJoinWithPartner={offersPartner && gameId ? goPartner : undefined}
            error={seatError}
          />
        ) : null}

        {step === "seat" && !isTournamentJoin ? (
          <>
            <div className="px-[22px] pt-[18px]">
              {(partnerRaceMessage ?? seatError) ? (
                <FormErrorSummary
                  message={partnerRaceMessage ?? seatError}
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
                  {friendlyGameJoinSheetCaption(sides, picked, locale)}
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
                    {m.tournament.join.pricePerPlayer}
                  </p>
                </div>
              ) : null}
              <Button
                type="button"
                size="lg"
                className="flex-1"
                disabled={!picked || pending}
                onClick={() => {
                  void confirmSeat();
                }}
              >
                {pending ? m.game.cta.joining : m.game.action.joinGame}
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
            pricePerPlayerFils={pricePerPlayerFils}
            notice={partnerRaceMessage}
            selectedPartner={selectedPartner}
            onSelectedPartnerChange={setSelectedPartner}
            onBack={openedAtPartner ? undefined : leavePartner}
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
            pricePerPlayerFils={pricePerPlayerFils}
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
