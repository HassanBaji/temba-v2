"use client";

import {
  byKeeperThenLevel,
  levelLabel,
  shortName,
  sideAverage,
  slotCode,
  type Bibs,
  type BoardPlayer,
} from "@repo/domain/football-board";
import type { FootballBib } from "@repo/domain/football-lineup";

import { UserAvatar } from "~/components/common/user-avatar";
import { cn } from "~/lib/utils";

import { BibChip, bibStyle } from "./football-bibs";

/** A player row in their team's bib colour; the viewer's row is ringed. */
export function BibRow({
  player,
  bib,
  trailing,
  onPress,
}: {
  player: BoardPlayer;
  bib: FootballBib;
  trailing?: React.ReactNode;
  onPress?: () => void;
}) {
  const name = player.isViewer ? "You" : shortName(player.name);
  const code = slotCode(player);
  const label = [name, code, levelLabel(player.levelBand)]
    .filter(Boolean)
    .join(", ");
  const body = (
    <>
      <UserAvatar name={player.name} image={player.image} size="sm" />
      <span
        className={cn(
          "text-meta min-w-0 flex-1 truncate",
          player.isViewer && "font-semibold",
        )}
      >
        {name}
      </span>
      {code ? (
        <span className="font-mono text-[11px] opacity-70">{code}</span>
      ) : null}
      <span className="font-expanded text-meta">
        {levelLabel(player.levelBand)}
      </span>
    </>
  );
  const className = cn(
    "flex h-11 min-w-0 items-center gap-1.5 rounded-md border px-2 text-left",
    player.isViewer &&
      "ring-current ring-2 ring-offset-1 ring-offset-transparent",
  );
  return (
    <div className={className} style={bibStyle(bib)}>
      {onPress ? (
        <button
          type="button"
          onClick={onPress}
          aria-label={label}
          className="flex min-w-0 flex-1 items-center gap-1.5 text-left outline-none focus-visible:underline"
        >
          {body}
        </button>
      ) : (
        <span
          aria-label={label}
          className="flex min-w-0 flex-1 items-center gap-1.5"
        >
          {body}
        </span>
      )}
      {trailing}
    </div>
  );
}

export function TeamHeader({
  bib,
  name,
  players,
  muted = "text-muted-foreground",
}: {
  bib: FootballBib;
  name: string;
  players: readonly BoardPlayer[];
  muted?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-1.5">
      <span className="text-meta flex items-center gap-1.5 font-semibold">
        <BibChip bib={bib} className="size-3.5" />
        {name}
      </span>
      <span className={cn("text-[12px]", muted)}>
        avg {sideAverage(players)}
      </span>
    </div>
  );
}

export function sideMembers(players: readonly BoardPlayer[], side: 1 | 2) {
  return players
    .filter((player) => player.sideIndex === side)
    .sort(byKeeperThenLevel);
}

/** The two published teams side by side. */
export function TeamColumns({
  players,
  bibs,
  names,
  muted,
  onOpenPlayer,
}: {
  players: readonly BoardPlayer[];
  bibs: Bibs;
  names: { slot1: string; slot2: string };
  muted?: string;
  onOpenPlayer?: (userId: string) => void;
}) {
  const column = (side: 1 | 2) => {
    const bib = side === 1 ? bibs.slot1 : bibs.slot2;
    const members = sideMembers(players, side);
    return (
      <div className="min-w-0 flex-1 space-y-2">
        <TeamHeader
          bib={bib}
          name={side === 1 ? names.slot1 : names.slot2}
          players={members}
          muted={muted}
        />
        <ul className="space-y-2">
          {members.map((player) => (
            <li key={player.userId}>
              <BibRow
                player={player}
                bib={bib}
                onPress={
                  onOpenPlayer ? () => onOpenPlayer(player.userId) : undefined
                }
              />
            </li>
          ))}
        </ul>
      </div>
    );
  };
  return (
    <div className="flex gap-2">
      {column(1)}
      <span className={cn("pt-1 text-[12px]", muted)}>vs</span>
      {column(2)}
    </div>
  );
}
