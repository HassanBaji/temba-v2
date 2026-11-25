"use client";

import {
  lineupPlayerName,
  ofSide,
  ovrLabel,
  slotCode,
  type BoardPlayer,
  type Side,
} from "@repo/domain/football-board";
import {
  captainPickFirstPickLine,
  captainPickPoolLine,
} from "@repo/domain/football-captain-pick";
import type { FootballBalanceOn } from "@repo/domain/football-lineup";
import { BellIcon, Check } from "lucide-react";
import { toast } from "sonner";

import { UserAvatar } from "~/components/common/user-avatar";
import { useLocale, useMessages } from "~/components/locale-provider";
import { Button } from "~/components/ui/button";
import { Hatch } from "~/components/ui/hatch";
import { cn } from "~/lib/utils";

import { BibChip } from "./football-bibs";
import { FootballInfoRows } from "./football-info-rows";
import {
  pickRoomPool,
  type OpenPickRoom,
  type PickRoomNames,
} from "./football-pick-room-view";
import { FootballPickPool } from "./football-pick-sides";
import type { FootballPickRoomActions } from "./use-football-pick-room";

const POOL_PREVIEW = 4;

export type PickReminded = "sent" | "recently";

function CaptainCard({
  side,
  room,
  team,
  player,
}: {
  side: Side;
  room: OpenPickRoom;
  team: string;
  player: BoardPlayer | undefined;
}) {
  const messages = useMessages();
  const locale = useLocale();
  const m = messages.football.pick;
  const inRoom = ofSide(room.captains, side)?.inRoom ?? false;
  const name = lineupPlayerName(player, locale) ?? "";
  const presence = inRoom ? m.inRoom : m.notHereYet;
  const meta = player
    ? [slotCode(player, locale), ovrLabel(player)].filter(Boolean).join(" ")
    : null;
  return (
    <section
      className={cn(
        "relative min-w-0 flex-1 space-y-3.5 overflow-hidden rounded-xl border p-4",
        inRoom ? "border-rule bg-paper" : "border-input border-dashed",
      )}
    >
      <span className="sr-only" aria-live="polite">
        {m.presenceSpoken(team, name, presence)}
      </span>
      {inRoom ? null : <Hatch className="absolute inset-0" />}
      <div aria-hidden="true" className="relative space-y-3.5">
        <div className="flex items-center gap-2">
          <BibChip bib={ofSide(room.bibs, side)} className="size-4" />
          <span className="text-muted-foreground text-meta">{team}</span>
        </div>
        <div className="flex items-center gap-2.5">
          <UserAvatar
            name={player?.name ?? name}
            image={player?.image}
            size="lg"
          />
          <div className="min-w-0 flex-1">
            <p className="truncate font-semibold">{name}</p>
            {meta ? (
              <p
                dir="ltr"
                className="text-muted-foreground font-mono text-[11px] [text-align:match-parent]"
              >
                {meta}
              </p>
            ) : null}
          </div>
        </div>
        {inRoom ? (
          <p className="text-meta flex items-center gap-1.5 font-semibold">
            <span className="bg-control text-on-control flex size-[18px] items-center justify-center rounded-sm">
              <Check className="size-3" />
            </span>
            {m.inRoom}
          </p>
        ) : (
          <p className="bg-paper text-muted-foreground text-meta w-fit rounded-sm px-1.5 py-px">
            {m.notHereYet}
          </p>
        )}
      </div>
    </section>
  );
}

/**
 * The Pick room while it waits for both Side captains. Each captain sees
 * the other and can remind them; the Organizer can remind either, start
 * without them or stop the pick.
 */
export function FootballPickRoomWaiting({
  gameId,
  room,
  names,
  players,
  balanceOn,
  actions,
  reminded,
  onReminded,
  onStop,
}: {
  gameId: string;
  room: OpenPickRoom;
  names: PickRoomNames;
  players: readonly BoardPlayer[];
  balanceOn: FootballBalanceOn;
  actions: FootballPickRoomActions;
  reminded: Partial<Record<Side, PickReminded>>;
  onReminded: (side: Side, reminded: PickReminded) => void;
  onStop: () => void;
}) {
  const locale = useLocale();
  const m = useMessages().football.pick;
  const { remind, start, stop } = actions;
  const captainPlayer = (side: Side) =>
    names.playerOf(ofSide(room.captains, side)?.userId);
  const captainName = (side: Side) => ofSide(names.captains, side);
  const otherSide: Side | null =
    room.viewer.side === 1 ? 2 : room.viewer.side === 2 ? 1 : null;
  const inRoom = (side: Side) => ofSide(room.captains, side)?.inRoom ?? false;

  const sendReminder = (side: Side) =>
    remind.mutate(
      { gameId, side },
      {
        onSuccess: (result) => {
          onReminded(side, result.sent ? "sent" : "recently");
          toast.success(
            result.sent
              ? m.reminded(captainName(side))
              : m.remindedRecently(captainName(side)),
          );
        },
      },
    );
  const remindLabel = (side: Side) => {
    const state = reminded[side];
    const name = captainName(side);
    return state === "recently"
      ? m.remindedRecently(name)
      : state === "sent"
        ? m.reminded(name)
        : m.remind(name);
  };
  const remindButton = (side: Side) =>
    inRoom(side) ? null : (
      <Button
        key={side}
        type="button"
        variant="outline"
        size="lg"
        className="w-full"
        pending={remind.isPending && remind.variables?.side === side}
        onClick={() => sendReminder(side)}
      >
        <BellIcon aria-hidden="true" />
        {remindLabel(side)}
      </Button>
    );

  const intro =
    otherSide != null
      ? m.introCaptain(captainName(otherSide))
      : m.introOrganizer(captainName(1), captainName(2));
  const firstPickLine = captainPickFirstPickLine(
    { firstPick: room.firstPick, firstPickSide: room.firstPickSide },
    names.teams,
    locale,
  );
  return (
    <div className="space-y-5">
      <p className="text-muted-foreground text-meta">{intro}</p>
      <div className="flex gap-2.5">
        <CaptainCard
          side={1}
          room={room}
          team={names.teams.slot1}
          player={captainPlayer(1)}
        />
        <CaptainCard
          side={2}
          room={room}
          team={names.teams.slot2}
          player={captainPlayer(2)}
        />
      </div>
      <FootballInfoRows
        rows={[
          { label: m.firstPickLabel, value: firstPickLine },
          { label: m.orderLabel, value: m.orderValue },
          {
            label: m.toPickLabel,
            value: captainPickPoolLine(room.pool.length, locale),
          },
        ]}
      />
      <FootballPickPool
        pool={pickRoomPool(room, players, balanceOn)}
        head={m.poolHead(room.pool.length)}
        limit={POOL_PREVIEW}
      />
      <div className="border-rule bg-background sticky bottom-0 space-y-2 border-t py-4">
        {otherSide != null ? (
          <>
            <Button
              type="button"
              variant="outline"
              size="lg"
              className="w-full"
              disabled
            >
              {m.waitingFor(captainName(otherSide))}
            </Button>
            {remindButton(otherSide)}
          </>
        ) : (
          <>
            {remindButton(1)}
            {remindButton(2)}
          </>
        )}
        {room.viewer.isOrganizer ? (
          <>
            <Button
              type="button"
              size="lg"
              className="w-full"
              pending={start.isPending}
              disabled={stop.isPending}
              onClick={() => start.mutate({ gameId })}
            >
              {m.startNow}
            </Button>
            <p className="text-muted-foreground text-eyebrow text-center">
              {m.startNowHint}
            </p>
            <Button
              type="button"
              variant="outline"
              size="lg"
              className="w-full"
              pending={stop.isPending}
              disabled={start.isPending}
              onClick={() => onStop()}
            >
              {m.stop}
            </Button>
            <p className="text-muted-foreground text-eyebrow text-center">
              {m.stopHint}
            </p>
          </>
        ) : null}
      </div>
    </div>
  );
}
