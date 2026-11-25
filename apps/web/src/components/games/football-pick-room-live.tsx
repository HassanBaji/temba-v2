"use client";

import { ofSide, type BoardPlayer } from "@repo/domain/football-board";
import { lastPick as lastPickOf } from "@repo/domain/football-captain-pick";
import type { FootballBalanceOn } from "@repo/domain/football-lineup";
import { ChevronRight } from "lucide-react";
import { toast } from "sonner";

import { ConfirmDialog } from "~/components/common/confirm-dialog";
import { useLocale, useMessages } from "~/components/locale-provider";
import { Button } from "~/components/ui/button";
import { cn } from "~/lib/utils";

import { FootballPickRoomSides } from "./football-pick-room-parts";
import {
  pickRoomCounts,
  pickRoomPool,
  pickRoomViewerTurn,
  type OpenPickRoom,
  type PickRoomNames,
} from "./football-pick-room-view";
import { FootballPickPool } from "./football-pick-sides";
import type { FootballPickRoomActions } from "./use-football-pick-room";

export type PickConfirm = "undo" | "stop";

function OrganizerAction({
  label,
  hint,
  disabled,
  onClick,
}: {
  label: string;
  hint: string;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <li>
      <button
        type="button"
        disabled={disabled}
        onClick={onClick}
        className="focus-visible:ring-ring/50 hover:bg-wash flex w-full items-center gap-3 px-3.5 py-3 text-start outline-none focus-visible:ring-[3px] focus-visible:ring-inset disabled:pointer-events-none"
      >
        <span className="min-w-0 flex-1 space-y-0.5">
          <span
            className={cn(
              "block font-semibold",
              disabled && "text-muted-foreground",
            )}
          >
            {label}
          </span>
          <span className="text-muted-foreground text-meta block">{hint}</span>
        </span>
        <ChevronRight
          aria-hidden="true"
          className="text-muted-foreground size-[18px] shrink-0 rtl:-scale-x-100"
        />
      </button>
    </li>
  );
}

/**
 * The Pick room while the pick is live. The captain on turn selects a
 * player and confirms; the other captain waits. The Organizer watches and
 * can pick for the side on turn, undo the last pick or stop.
 */
export function FootballPickRoomLive({
  gameId,
  room,
  names,
  players,
  balanceOn,
  actions,
  selected,
  onSelect,
  pickingFor,
  onPickingFor,
  onAsk,
}: {
  gameId: string;
  room: OpenPickRoom;
  names: PickRoomNames;
  players: readonly BoardPlayer[];
  balanceOn: FootballBalanceOn;
  actions: FootballPickRoomActions;
  selected: string | null;
  onSelect: (userId: string | null) => void;
  pickingFor: boolean;
  onPickingFor: (pickingFor: boolean) => void;
  onAsk: (confirm: PickConfirm) => void;
}) {
  const locale = useLocale();
  const m = useMessages().football.pick;
  const { pick, undo, stop } = actions;
  const turn = room.turn;
  const counts = pickRoomCounts(room, locale);
  const { onTurn: viewerOnTurn, mayPickFor } = pickRoomViewerTurn(room);
  const selectable = viewerOnTurn || (mayPickFor && pickingFor);
  const choice = selectable && selected ? names.playerOf(selected) : undefined;
  const choiceName = choice ? names.nameOf(choice.userId) : "";
  const lastPick = lastPickOf(room.sides);

  const sendPick = () => {
    if (!choice || turn == null) {
      return;
    }
    pick.mutate({
      gameId,
      pickedUserId: choice.userId,
      pickNumber: room.picks.next,
      forSide: viewerOnTurn ? undefined : turn,
    });
  };

  const footer = selectable ? (
    <div className="flex gap-2">
      {pickingFor && !viewerOnTurn ? (
        <Button
          type="button"
          variant="outline"
          size="lg"
          onClick={() => {
            onPickingFor(false);
            onSelect(null);
          }}
        >
          {m.cancel}
        </Button>
      ) : null}
      <Button
        type="button"
        size="lg"
        className="flex-1"
        variant={choice ? "default" : "outline"}
        disabled={!choice}
        pending={pick.isPending}
        onClick={sendPick}
      >
        {choice
          ? viewerOnTurn || turn == null
            ? m.pickPlayer(choiceName)
            : m.pickPlayerFor(choiceName, ofSide(names.captains, turn))
          : m.tapToPick}
      </Button>
    </div>
  ) : room.viewer.side != null && turn != null ? (
    <Button
      type="button"
      variant="outline"
      size="lg"
      className="w-full"
      disabled
    >
      {m.isChoosing(ofSide(names.captains, turn))}
    </Button>
  ) : null;

  return (
    <>
      <div className="space-y-5 lg:grid lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] lg:items-start lg:gap-5 lg:space-y-0">
        <div className="space-y-5">
          <FootballPickRoomSides
            room={room}
            teams={names.teams}
            counts={counts}
            turn={turn}
            players={players}
            balanceOn={balanceOn}
          />
          {room.viewer.isOrganizer ? (
            <ul className="border-rule bg-paper divide-rule divide-y overflow-hidden rounded-xl border">
              {mayPickFor && turn != null ? (
                <OrganizerAction
                  label={m.pickFor(ofSide(names.captains, turn))}
                  hint={m.pickForHint(ofSide(names.captains, turn))}
                  disabled={pickingFor}
                  onClick={() => onPickingFor(true)}
                />
              ) : null}
              <OrganizerAction
                label={m.undoLast}
                hint={
                  lastPick
                    ? m.undoHint(names.nameOf(lastPick.userId))
                    : m.undoNothing
                }
                disabled={!lastPick || undo.isPending}
                onClick={() => onAsk("undo")}
              />
              <OrganizerAction
                label={m.stop}
                hint={m.stopHint}
                disabled={stop.isPending}
                onClick={() => onAsk("stop")}
              />
            </ul>
          ) : null}
        </div>
        <FootballPickPool
          pool={pickRoomPool(room, players, balanceOn)}
          head={counts.pool}
          selectable={selectable}
          selected={selectable ? selected : null}
          onSelect={onSelect}
        />
      </div>
      {footer ? (
        <div className="border-rule bg-background sticky bottom-0 border-t py-4">
          {footer}
        </div>
      ) : null}
    </>
  );
}

/**
 * The Organizer's two confirmations: undo the last pick, and stop the pick.
 * The room keeps them beside whichever state it shows, so one that is open
 * stays open as the pick moves on.
 */
export function FootballPickRoomConfirms({
  gameId,
  room,
  names,
  actions,
  confirm,
  onChange,
  onStop,
}: {
  gameId: string;
  room: OpenPickRoom;
  names: PickRoomNames;
  actions: FootballPickRoomActions;
  confirm: PickConfirm | null;
  onChange: (confirm: PickConfirm | null) => void;
  onStop: () => void;
}) {
  const m = useMessages().football.pick;
  const { undo, stop } = actions;
  const lastPick = lastPickOf(room.sides);
  const lastPickName = lastPick ? names.nameOf(lastPick.userId) : "";
  return (
    <>
      <ConfirmDialog
        open={confirm === "undo" && lastPick != null}
        onOpenChange={(open) => onChange(open ? "undo" : null)}
        title={lastPick ? m.undoTitle(lastPick.pickNumber) : m.undoLast}
        description={
          lastPick
            ? m.undoBody(lastPickName, ofSide(names.captains, lastPick.side))
            : undefined
        }
        confirmLabel={m.undoConfirm}
        cancelLabel={m.cancel}
        variant="default"
        pending={undo.isPending}
        onConfirm={() => {
          if (lastPick) {
            undo.mutate(
              { gameId, pickNumber: lastPick.pickNumber },
              {
                onSuccess: () => toast.success(m.undone(lastPickName)),
                onSettled: () => onChange(null),
              },
            );
          }
        }}
      />
      <ConfirmDialog
        open={confirm === "stop"}
        onOpenChange={(open) => onChange(open ? "stop" : null)}
        title={m.stopTitle}
        description={m.stopBody}
        confirmLabel={m.stop}
        cancelLabel={m.cancel}
        variant="default"
        pending={stop.isPending}
        onConfirm={() => onStop()}
      />
    </>
  );
}
