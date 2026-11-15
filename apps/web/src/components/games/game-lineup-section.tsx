"use client";

import { ArrowLeftRight, Plus, UserPlus } from "lucide-react";
import { Fragment } from "react";

import {
  courtSeatName,
  courtSeatRow,
  courtSeatSubline,
  courtSpotsLabel,
} from "@repo/domain/friendly-game-court";
import { friendlyGameOpenSeatLabel } from "@repo/domain/friendly-game-players";
import { formatGameSideLabel } from "@repo/domain/game-side-label";
import {
  offersSetSides,
  offersSwapSides,
  openSeatSideLabel,
  seatSideLabel,
  teamHasNoSidesPicked,
} from "@repo/domain/padel-sides";
import type { PlayedRow } from "@repo/domain/played-game";
import { NicknameName } from "~/components/temba/nickname-name";
import { UserAvatar } from "~/components/common/user-avatar";
import { useLocale, useMessages } from "~/components/locale-provider";
import { GuestTag, NotOnTembaTag } from "~/components/temba/seat";
import { Button } from "~/components/ui/button";
import { cn } from "~/lib/utils";
import { type RouterOutputs } from "~/trpc/react";

type GameDetailsSide = RouterOutputs["games"]["byId"]["sides"][number];
type GameDetailsSeat = NonNullable<GameDetailsSide["left"]>;
type SeatPosition = "left" | "right";

export type OpenSeatAction = { label: string; onClick: () => void };

const SEAT_CELL =
  "flex min-w-0 flex-1 flex-col items-center gap-2 px-1 py-1.5 text-center";

function SeatLabels({
  title,
  subline,
  strong,
  unclaimed = false,
  guest = false,
  isNickname = false,
}: {
  title: string;
  subline: string;
  strong: boolean;
  unclaimed?: boolean;
  guest?: boolean;
  isNickname?: boolean;
}) {
  return (
    <span className="flex max-w-full flex-col items-center gap-0.5">
      <NicknameName
        name={title}
        isNickname={isNickname}
        className={cn(
          "max-w-full text-sm",
          strong ? "font-semibold" : "font-medium",
        )}
      />
      {unclaimed ? <NotOnTembaTag /> : null}
      {guest ? <GuestTag /> : null}
      <span className="text-muted-foreground text-meta max-w-full truncate">
        {subline}
      </span>
    </span>
  );
}

function OpenSeat({
  position,
  subline,
  action,
  busy,
}: {
  position: SeatPosition;
  subline: string;
  action: OpenSeatAction | null;
  busy: boolean;
}) {
  const locale = useLocale();
  const m = useMessages();
  const body = (
    <>
      <span
        aria-hidden="true"
        className="hatch border-rule flex size-[52px] items-center justify-center rounded-full border border-dashed"
      >
        {action ? <Plus className="text-muted-foreground size-[18px]" /> : null}
      </span>
      <SeatLabels title={m.game.court.open} subline={subline} strong={false} />
    </>
  );

  if (!action) {
    return (
      <div
        className={SEAT_CELL}
        aria-label={friendlyGameOpenSeatLabel(position, locale)}
      >
        {body}
      </div>
    );
  }
  return (
    <button
      type="button"
      aria-label={action.label}
      disabled={busy}
      onClick={action.onClick}
      className={cn(
        SEAT_CELL,
        "hover:bg-muted/60 focus-visible:ring-ring/50 rounded-lg outline-none transition-colors focus-visible:ring-[3px] disabled:opacity-50",
      )}
    >
      {body}
    </button>
  );
}

function TakenSeat({
  side,
  seat,
  position,
  viewerUserId,
  onPress,
}: {
  side: GameDetailsSide;
  seat: GameDetailsSeat;
  position: SeatPosition;
  viewerUserId: string;
  onPress?: (row: PlayedRow) => void;
}) {
  const locale = useLocale();
  const m = useMessages();
  const row = courtSeatRow(seat, position, viewerUserId, locale);
  const name = courtSeatName(row, locale);
  const subline =
    seatSideLabel(side, position, viewerUserId, locale) ??
    courtSeatSubline(position, seat.levelBand, locale);
  const body = (
    <>
      <UserAvatar
        name={seat.name}
        image={seat.image}
        guest={row.guest}
        className={cn(
          "size-[52px] [&_[data-slot=avatar-fallback]]:text-base [&_[data-slot=avatar-fallback]]:font-bold",
          row.isYou
            ? "[&_[data-slot=avatar-fallback]]:bg-control [&_[data-slot=avatar-fallback]]:text-on-control"
            : "[&_[data-slot=avatar-fallback]]:text-ink",
        )}
      />
      <SeatLabels
        title={name}
        subline={subline}
        strong={row.isYou}
        unclaimed={row.unclaimed}
        guest={row.guest}
        isNickname={row.isNickname === true}
      />
    </>
  );

  if (!onPress) {
    return <div className={SEAT_CELL}>{body}</div>;
  }
  return (
    <button
      type="button"
      aria-label={m.webGame.lineup.seatLabel(name, subline)}
      onClick={() => onPress(row)}
      className={cn(
        SEAT_CELL,
        "hover:bg-muted/60 focus-visible:ring-ring/50 rounded-lg outline-none transition-colors focus-visible:ring-[3px]",
      )}
    >
      {body}
    </button>
  );
}

/**
 * An Organizer's note on a full Game team whose players picked no sides: set
 * them for the sheet, or swap them once set. Never needed to play or score.
 */
function SidesPanel({
  side,
  viewerUserId,
  isOrganizer,
  pending,
  onSetSides,
}: {
  side: GameDetailsSide;
  viewerUserId: string;
  isOrganizer: boolean;
  pending: boolean;
  onSetSides: (sideIndex: number, leftUserId: string) => void;
}) {
  const m = useMessages();
  const canSet = offersSetSides(side, isOrganizer);
  const canSwap = isOrganizer && offersSwapSides(side, viewerUserId);
  if ((!canSet && !canSwap) || !side.left || !side.right) {
    return null;
  }
  const leftUserId = canSet ? side.left.userId : side.right.userId;
  return (
    <div className="border-rule flex items-center gap-3 rounded-lg border border-dashed px-3 py-2.5">
      <p className="text-muted-foreground text-meta flex-1 leading-snug">
        {canSet ? m.game.sides.setSidesPrompt : m.game.sides.setSidesDone}
      </p>
      <Button
        type="button"
        size="sm"
        variant={canSet ? "default" : "outline"}
        className="shrink-0"
        disabled={pending}
        onClick={() => onSetSides(side.sideIndex, leftUserId)}
      >
        {canSet ? m.game.sides.setSides : m.game.sides.swap}
      </Button>
    </div>
  );
}

function SideHalf({
  side,
  labelBelow,
  viewerUserId,
  busy,
  openSeatAction,
  onPressPlayer,
  isOrganizer,
  setSidesPending,
  onSetSides,
}: {
  side: GameDetailsSide;
  labelBelow: boolean;
  viewerUserId: string;
  busy: boolean;
  openSeatAction: (
    sideIndex: number,
    position: SeatPosition,
  ) => OpenSeatAction | null;
  onPressPlayer?: (row: PlayedRow) => void;
  isOrganizer: boolean;
  setSidesPending: boolean;
  onSetSides?: (sideIndex: number, leftUserId: string) => void;
}) {
  const locale = useLocale();
  const m = useMessages();
  const label = (
    <div className="flex items-baseline justify-between gap-3">
      <p className="text-muted-foreground text-[11px] font-semibold uppercase tracking-[0.08em]">
        {formatGameSideLabel("friendly_game", side.sideIndex, locale)}
      </p>
      {teamHasNoSidesPicked(side) ? (
        <p className="text-muted-foreground text-eyebrow">
          {m.game.sides.noSidesPicked}
        </p>
      ) : null}
    </div>
  );
  return (
    <div
      className={cn(
        "flex flex-col gap-2.5 px-3",
        labelBelow ? "pb-3 pt-4" : "pb-3.5 pt-3",
      )}
    >
      {labelBelow ? null : label}
      {/* Left and Right are court sides, so the seats keep their side in Arabic. */}
      <div className="flex rtl:flex-row-reverse">
        {(["left", "right"] as const).map((position, index) => {
          const seat = side[position];
          const cell = seat ? (
            <TakenSeat
              key={position}
              side={side}
              seat={seat}
              position={position}
              viewerUserId={viewerUserId}
              onPress={seat.guest && !isOrganizer ? undefined : onPressPlayer}
            />
          ) : (
            <OpenSeat
              key={position}
              position={position}
              subline={openSeatSideLabel(side, position, locale)}
              action={openSeatAction(side.sideIndex, position)}
              busy={busy}
            />
          );
          return (
            <Fragment key={position}>
              {index > 0 ? (
                <span aria-hidden="true" className="bg-rule w-px shrink-0" />
              ) : null}
              {cell}
            </Fragment>
          );
        })}
      </div>
      {onSetSides ? (
        <SidesPanel
          side={side}
          viewerUserId={viewerUserId}
          isOrganizer={isOrganizer}
          pending={setSidesPending}
          onSetSides={onSetSides}
        />
      ) : null}
      {labelBelow ? label : null}
    </div>
  );
}

function Net() {
  const m = useMessages();
  return (
    <div aria-hidden="true" className="border-ink relative border-t-[1.5px]">
      <span className="bg-paper absolute left-1/2 top-[-10px] -translate-x-1/2 px-2 text-[11px] font-bold uppercase tracking-[0.08em]">
        {m.webGame.joinSheet.versus}
      </span>
    </div>
  );
}

/**
 * The padel court from above: Team A across the top, the net, Team B below,
 * each side's left and right spot. Open spots are hatched until filled.
 */
export function GameLineupSection({
  sides,
  viewerUserId,
  vacantSeatCount,
  hint,
  busy,
  openSeatAction,
  onInvite,
  onPressPlayer,
  note = null,
  isOrganizer = false,
  setSidesPending = false,
  onSetSides,
  onPickSide,
}: {
  sides: GameDetailsSide[];
  viewerUserId: string;
  vacantSeatCount: number;
  hint: string | null;
  busy: boolean;
  openSeatAction: (
    sideIndex: number,
    position: SeatPosition,
  ) => OpenSeatAction | null;
  onInvite?: () => void;
  onPressPlayer?: (row: PlayedRow) => void;
  /** How sides work for this viewer, under the court. */
  note?: string | null;
  isOrganizer?: boolean;
  setSidesPending?: boolean;
  onSetSides?: (sideIndex: number, leftUserId: string) => void;
  onPickSide?: () => void;
}) {
  const locale = useLocale();
  const m = useMessages();
  return (
    <section
      data-slot="game-lineup-section"
      className="border-rule bg-paper overflow-hidden rounded-xl border"
    >
      <div className="flex min-h-[68px] items-center justify-between gap-3 px-[18px] py-3.5">
        <div className="flex min-w-0 items-baseline gap-2">
          <h2 className="text-base font-semibold">{m.webGame.lineup.title}</h2>
          <p className="text-muted-foreground text-meta truncate">
            {courtSpotsLabel(vacantSeatCount, locale)}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {onPickSide ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onPickSide}
            >
              <ArrowLeftRight aria-hidden="true" className="size-[15px]" />
              {m.game.sides.pickASide}
            </Button>
          ) : null}
          {onInvite ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onInvite}
            >
              <UserPlus aria-hidden="true" className="size-[15px]" />
              {m.invite.door.inviteButton}
            </Button>
          ) : null}
        </div>
      </div>
      <div className="px-3.5 pb-3.5">
        <div className="border-ink overflow-hidden rounded-xl border-[1.5px]">
          {sides.map((side, index) => (
            <Fragment key={side.sideIndex}>
              {index > 0 ? <Net /> : null}
              <SideHalf
                side={side}
                labelBelow={index > 0}
                viewerUserId={viewerUserId}
                busy={busy}
                openSeatAction={openSeatAction}
                onPressPlayer={onPressPlayer}
                isOrganizer={isOrganizer}
                setSidesPending={setSidesPending}
                onSetSides={onSetSides}
              />
            </Fragment>
          ))}
        </div>
        {hint ? (
          <p className="text-muted-foreground text-meta px-1 pt-3">{hint}</p>
        ) : null}
        {note ? (
          <p className="text-muted-foreground text-meta px-1 pt-3 leading-relaxed">
            {note}
          </p>
        ) : null}
      </div>
    </section>
  );
}
