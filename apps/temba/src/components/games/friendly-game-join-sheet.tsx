"use client";

import { Fragment, useEffect, useState } from "react";

import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from "~/components/common/responsive-dialog";
import { UserAvatar } from "~/components/common/user-avatar";
import { formatGameSideLabel } from "~/components/games/game-side-label";
import { Button } from "~/components/ui/button";
import {
  friendlyGameJoinSheetCaption,
  vacantJoinSeats,
  type FriendlyGameJoinSeat,
} from "~/lib/friendly-game-cta";
import { preferredJoinSeat } from "~/lib/preferred-seat";
import { formatPricePerPlayerCents } from "~/lib/price-per-player";
import { cn } from "~/lib/utils";
import { api } from "~/trpc/react";

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
 */
export function FriendlyGameJoinSheet({
  open,
  onOpenChange,
  title,
  sides,
  pending,
  pricePerPlayerCents,
  onPickSeat,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  sides: readonly FriendlyGameJoinSheetSide[];
  pending: boolean;
  pricePerPlayerCents?: number | null;
  onPickSeat: (sideIndex: number, position: SeatPosition) => void;
}) {
  // `touched` is what keeps the Preferred Position default a default: until
  // the viewer taps, the picked Position is derived, so it can appear the
  // moment `onboardingState` answers and update if a Position is taken while
  // the sheet is open. After a tap the viewer's own choice stands, including
  // the empty one they get by tapping the pre-selected Position off again.
  const [selection, setSelection] = useState<{
    touched: boolean;
    seat: FriendlyGameJoinSeat | null;
  }>({ touched: false, seat: null });

  // Only while the sheet is open: this is a default for a picker, not
  // something every Game card on a hub needs to fetch on mount.
  const onboardingState = api.users.onboardingState.useQuery(undefined, {
    enabled: open,
  });

  useEffect(() => {
    if (open) {
      setSelection({ touched: false, seat: null });
    }
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

  function confirm() {
    if (!picked) {
      return;
    }
    onOpenChange(false);
    onPickSeat(picked.sideIndex, picked.position);
  }

  return (
    <ResponsiveDialog open={open} onOpenChange={onOpenChange}>
      <ResponsiveDialogContent className="gap-0 p-0 sm:max-w-[460px]">
        <ResponsiveDialogHeader className="px-[22px] pb-0 pt-[22px] text-left group-data-[vaul-drawer-direction=bottom]/drawer-content:text-left">
          <ResponsiveDialogTitle className="text-h2 tracking-[-0.02em]">
            {isFull ? "Game is full" : "Pick your spot"}
          </ResponsiveDialogTitle>
          <ResponsiveDialogDescription className="text-meta">
            {title}
          </ResponsiveDialogDescription>
        </ResponsiveDialogHeader>

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
            onClick={confirm}
          >
            {pending ? "Joining…" : "Join game"}
          </Button>
        </div>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
