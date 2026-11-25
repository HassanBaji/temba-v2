"use client";

import type { BoardPlayer, Side } from "@repo/domain/football-board";
import type { FootballBalanceOn } from "@repo/domain/football-lineup";

import { Surface } from "~/components/ui/surface";
import { cn } from "~/lib/utils";

import type { OpenPickRoom } from "./football-pick-room-view";
import { FootballPickSides } from "./football-pick-sides";

/**
 * Whose turn it is, read out as it changes: ink while it is the viewer's
 * pick, the one focus on the page.
 */
export function FootballPickRoomBanner({
  lines,
  onTurn,
}: {
  lines: { toss: string | null; title: string; sub: string };
  onTurn: boolean;
}) {
  return (
    <Surface
      tone={onTurn ? "ink" : "paper"}
      radius="surface"
      aria-live="polite"
      className={cn("space-y-1.5 p-5", onTurn ? null : "border-rule border")}
    >
      {lines.toss ? (
        <p className="text-eyebrow opacity-70">{lines.toss}</p>
      ) : null}
      <h2 className="font-expanded text-title font-bold">{lines.title}</h2>
      <p className="text-meta opacity-70">{lines.sub}</p>
    </Surface>
  );
}

export function FootballPickRoomSides({
  room,
  teams,
  counts,
  turn,
  players,
  balanceOn,
}: {
  room: OpenPickRoom;
  teams: { slot1: string; slot2: string };
  counts: { slot1: string; slot2: string };
  turn: Side | null;
  players: readonly BoardPlayer[];
  balanceOn: FootballBalanceOn;
}) {
  return (
    <FootballPickSides
      sides={room.sides}
      captains={{
        slot1: room.captains.slot1?.userId ?? null,
        slot2: room.captains.slot2?.userId ?? null,
      }}
      bibs={room.bibs}
      teams={teams}
      counts={counts}
      turn={turn}
      nextPick={room.picks.next}
      players={players}
      balanceOn={balanceOn}
    />
  );
}
