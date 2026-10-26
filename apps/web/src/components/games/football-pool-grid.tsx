"use client";

import {
  levelLabel,
  shortName,
  slotCode,
  type BoardPlayer,
} from "@repo/domain/football-board";
import { KEEPER_CODE } from "@repo/domain/football-lineup";

import { UserAvatar } from "~/components/common/user-avatar";
import { Hatch } from "~/components/ui/hatch";
import { cn } from "~/lib/utils";

function OpenTile() {
  return (
    <div className="relative flex h-[74px] items-center justify-center overflow-hidden rounded-md">
      <Hatch radius="md" className="absolute inset-0" />
      <span className="text-muted-foreground relative text-[12px]">open</span>
    </div>
  );
}

function PlayerTile({
  player,
  onPress,
}: {
  player: BoardPlayer;
  onPress?: (userId: string) => void;
}) {
  const name = player.isViewer ? "You" : shortName(player.name);
  const code = slotCode(player);
  const Tag = onPress ? "button" : "div";
  return (
    <Tag
      type={onPress ? "button" : undefined}
      onClick={onPress ? () => onPress(player.userId) : undefined}
      aria-label={[name, code, levelLabel(player.levelBand)]
        .filter(Boolean)
        .join(", ")}
      className={cn(
        "focus-visible:ring-ring/50 flex h-[74px] w-full min-w-0 flex-col justify-between rounded-md border p-2 text-left outline-none focus-visible:ring-[3px]",
        player.isViewer
          ? "bg-ink text-paper border-ink"
          : "bg-paper border-rule",
        onPress && !player.isViewer && "hover:bg-wash",
      )}
    >
      <span className="flex items-center justify-between">
        <UserAvatar name={player.name} image={player.image} size="sm" />
        {code === KEEPER_CODE ? (
          <span className="bg-ink text-paper rounded-[4px] px-1 font-mono text-[11px]">
            {code}
          </span>
        ) : code ? (
          <span
            className={cn(
              "font-mono text-[11px]",
              player.isViewer ? "text-dim" : "text-muted-foreground",
            )}
          >
            {code}
          </span>
        ) : null}
      </span>
      <span className="flex items-baseline justify-between gap-1">
        <span className="truncate text-[12px]">{name}</span>
        <span className="font-expanded text-meta">
          {levelLabel(player.levelBand)}
        </span>
      </span>
    </Tag>
  );
}

/** Players four to a row, then hatched open seats. */
export function PoolGrid({
  players,
  open,
  onOpenPlayer,
}: {
  players: readonly BoardPlayer[];
  open: number;
  onOpenPlayer?: (userId: string) => void;
}) {
  return (
    <ul className="grid grid-cols-4 gap-2">
      {players.map((player) => (
        <li key={player.userId} className="min-w-0">
          <PlayerTile player={player} onPress={onOpenPlayer} />
        </li>
      ))}
      {Array.from({ length: open }, (_, index) => (
        <li key={`open-${index}`} aria-label="Open seat">
          <OpenTile />
        </li>
      ))}
    </ul>
  );
}

/** One square per side seat: filled when taken, hatched while open. */
export function SeatBar({
  seats,
  filled,
  tone = "paper",
}: {
  seats: number;
  filled: number;
  tone?: "paper" | "ink";
}) {
  return (
    <div
      role="img"
      aria-label={`${Math.min(filled, seats)} of ${seats} seats taken`}
      className="flex gap-[3px]"
    >
      {Array.from({ length: seats }, (_, index) =>
        index < filled ? (
          <span
            key={index}
            className={cn(
              "h-6 flex-1 rounded-[3px]",
              tone === "ink" ? "bg-paper" : "bg-ink",
            )}
          />
        ) : (
          <span
            key={index}
            className="relative h-6 flex-1 overflow-hidden rounded-[3px]"
          >
            <Hatch tone={tone} className="absolute inset-0 rounded-[3px]" />
          </span>
        ),
      )}
    </div>
  );
}
