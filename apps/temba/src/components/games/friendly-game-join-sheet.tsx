"use client";

import { ArrowLeft, ChevronRight, UserRound, Users } from "lucide-react";
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
import { formatGameSideLabel } from "~/components/games/game-side-label";
import { Button } from "~/components/ui/button";
import { Field, FieldLabel } from "~/components/ui/field";
import { FormErrorSummary } from "~/components/ui/form-error-summary";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { globalFormErrorMessage } from "~/lib/form-mutation-error";
import {
  friendlyGameJoinSheetCaption,
  vacantJoinSeats,
  type FriendlyGameJoinSeat,
} from "~/lib/friendly-game-cta";
import {
  firstFullyVacantSideIndex,
  offersPartnerJoin,
} from "~/lib/friendly-game-partner";
import { preferredJoinSeat } from "~/lib/preferred-seat";
import { formatPricePerPlayerCents } from "~/lib/price-per-player";
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
};

function positionLabel(position: SeatPosition) {
  return position === "left" ? "Left" : "Right";
}

function defaultPartnerPosition(
  preferredPosition: string | null | undefined,
): SeatPosition {
  return preferredPosition === "right" ? "right" : "left";
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
  picked,
  pending,
  onPick,
}: {
  side: FriendlyGameJoinSheetSide;
  picked: FriendlyGameJoinSeat | null;
  pending: boolean;
  onPick: (seat: FriendlyGameJoinSeat) => void;
}) {
  const sideLabel = formatGameSideLabel("friendly_game", side.sideIndex);

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
 * pick, and nothing is submitted until the footer button.
 *
 * On individual Friendly games with a fully vacant side, a mode chooser
 * (artboard 02b) is the first step: Join alone reaches this picker; Join
 * with a partner is a minimal search + Position confirm that calls
 * `games.registerWithPartner`. Tickets 2–3 replace that partner step.
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
}) {
  const offerPartner = offersPartnerJoin({
    canRegister: canRegister ?? false,
    format: format ?? "",
    registrationMode: registrationMode ?? "",
    sides,
  });

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
  const [partnerPosition, setPartnerPosition] = useState<SeatPosition>("left");

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
      await utils.users.home.invalidate();
      onOpenChange(false);
    },
  });

  useEffect(() => {
    if (open) {
      setSelection({ touched: false, seat: null });
      setStep(
        offersPartnerJoin({
          canRegister: canRegister ?? false,
          format: format ?? "",
          registrationMode: registrationMode ?? "",
          sides,
        })
          ? "chooser"
          : "seat",
      );
      setSelectedPartner(null);
      setPartnerPosition("left");
      registerWithPartner.reset();
    }
    // Reset only on open, matching the picker default. Props are read fresh.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- open-gated reset
  }, [open]);

  const picked = selection.touched
    ? selection.seat
    : preferredJoinSeat(sides, onboardingState.data?.preferredPosition);

  function pick(seat: FriendlyGameJoinSeat) {
    const same =
      picked?.sideIndex === seat.sideIndex && picked.position === seat.position;
    setSelection({ touched: true, seat: same ? null : seat });
  }

  const isFull = vacantJoinSeats(sides).length === 0;
  const priceLabel = formatPricePerPlayerCents(pricePerPlayerCents);
  const partnerUserId = selectedPartner?.id;
  const vacantSideIndex = firstFullyVacantSideIndex(sides);
  const partnerError = registerWithPartner.error;

  function confirmSeat() {
    if (!picked) {
      return;
    }
    onOpenChange(false);
    onPickSeat(picked.sideIndex, picked.position);
  }

  function goPartner() {
    setPartnerPosition(
      defaultPartnerPosition(onboardingState.data?.preferredPosition),
    );
    registerWithPartner.reset();
    setStep("partner");
  }

  function confirmPartner() {
    if (!gameId || !partnerUserId || vacantSideIndex == null) {
      return;
    }
    registerWithPartner.mutate({
      gameId,
      partnerUserId,
      sideIndex: vacantSideIndex,
      position: partnerPosition,
    });
  }

  const headerTitle =
    step === "chooser"
      ? "How do you want to join?"
      : step === "partnerConfirm"
        ? "Join with a partner"
        : isFull
          ? "Game is full"
          : "Pick your spot";
  const headerDescription =
    step === "chooser"
      ? "Two seats on the same side are open, so you can take one on your own or bring someone and register as a team."
      : step === "partnerConfirm"
        ? "You register both seats. Your partner is in straight away."
        : title;
  const showSheetHeader = step !== "partner";

  return (
    <ResponsiveDialog open={open} onOpenChange={onOpenChange}>
      <ResponsiveDialogContent className="gap-0 p-0 sm:max-w-[460px]">
        {showSheetHeader ? (
          <ResponsiveDialogHeader className="px-[22px] pb-0 pt-[22px] text-left group-data-[vaul-drawer-direction=bottom]/drawer-content:text-left">
            {step === "partnerConfirm" || (offerPartner && step === "seat") ? (
              <button
                type="button"
                onClick={() => {
                  registerWithPartner.reset();
                  setStep(step === "partnerConfirm" ? "partner" : "chooser");
                }}
                className="text-ink focus-visible:ring-ring/50 mb-3 flex size-10 items-center justify-center rounded-[10px] outline-none focus-visible:ring-[3px]"
                aria-label="Back"
              >
                <ArrowLeft
                  aria-hidden="true"
                  className="size-5"
                  strokeWidth={2}
                />
              </button>
            ) : null}
            <ResponsiveDialogTitle className="text-h2 tracking-[-0.02em]">
              {headerTitle}
            </ResponsiveDialogTitle>
            <ResponsiveDialogDescription className="text-meta">
              {headerDescription}
            </ResponsiveDialogDescription>
          </ResponsiveDialogHeader>
        ) : (
          <ResponsiveDialogHeader className="sr-only">
            <ResponsiveDialogTitle>Pick a partner</ResponsiveDialogTitle>
            <ResponsiveDialogDescription>
              You register both seats. Your partner is in straight away.
            </ResponsiveDialogDescription>
          </ResponsiveDialogHeader>
        )}

        {step === "chooser" ? (
          <ModeChooser
            onJoinAlone={() => setStep("seat")}
            onJoinWithPartner={goPartner}
          />
        ) : null}

        {step === "seat" ? (
          <>
            <div className="px-[22px] pt-[18px]">
              <div className="border-rule bg-paper overflow-hidden rounded-xl border">
                <div className="flex items-start px-4 pb-4 pt-[18px]">
                  {sides.map((side, index) => (
                    <Fragment key={side.sideIndex}>
                      {index > 0 ? <NetDivider /> : null}
                      <SideColumn
                        side={side}
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
            selectedPartner={selectedPartner}
            onSelectedPartnerChange={setSelectedPartner}
            onBack={() => setStep("chooser")}
            onClose={() => onOpenChange(false)}
            onContinue={() => {
              setPartnerPosition(
                defaultPartnerPosition(onboardingState.data?.preferredPosition),
              );
              registerWithPartner.reset();
              setStep("partnerConfirm");
            }}
          />
        ) : null}

        {step === "partnerConfirm" ? (
          <div className="flex flex-col gap-4 px-[22px] pb-[max(22px,env(safe-area-inset-bottom))] pt-[18px]">
            <FormErrorSummary message={globalFormErrorMessage(partnerError)} />
            {selectedPartner ? (
              <p className="text-meta">
                Partner:{" "}
                <span className="text-ink">{selectedPartner.name}</span>
              </p>
            ) : null}
            <Field>
              <FieldLabel htmlFor="join-partner-position">
                Your Position
              </FieldLabel>
              <Select
                value={partnerPosition}
                onValueChange={(value) =>
                  setPartnerPosition(value as SeatPosition)
                }
                disabled={registerWithPartner.isPending}
              >
                <SelectTrigger id="join-partner-position" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="left">Left</SelectItem>
                  <SelectItem value="right">Right</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Button
              type="button"
              className="h-[52px] w-full"
              disabled={
                registerWithPartner.isPending ||
                !partnerUserId ||
                vacantSideIndex == null
              }
              onClick={confirmPartner}
            >
              {registerWithPartner.isPending
                ? "Registering…"
                : "Register with partner"}
            </Button>
            <p className="text-muted-foreground text-meta">
              Both seats are booked now. Your partner is in straight away.
            </p>
          </div>
        ) : null}
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
