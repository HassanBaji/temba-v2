"use client";

import { Tag as TagIcon } from "lucide-react";
import {
  boardTierCell,
  byKeeperThenLevel,
  levelLabel,
  lineupName,
  makeTeamsLevelLabel,
  sideOvrAverage,
  slotCode,
  type Bibs,
  type BoardPlayer,
} from "@repo/domain/football-board";
import type {
  FootballBalanceOn,
  FootballBib,
} from "@repo/domain/football-lineup";
import type { GroupMemberTierCell } from "@repo/domain/group-members-table";

import { UserAvatar } from "~/components/common/user-avatar";
import { TierCell } from "~/components/groups/tier-fish";
import { useLocale, useMessages } from "~/components/locale-provider";
import { cn } from "~/lib/utils";

import { BibChip, bibStyle } from "./football-bibs";

/** A player's fish on a paper tile, so it reads on any bib colour. */
export function TierMark({ cell }: { cell: GroupMemberTierCell }) {
  return (
    <span className="bg-paper text-ink flex shrink-0 items-center rounded-sm px-1 py-0.5">
      <TierCell cell={cell} />
    </span>
  );
}

/**
 * A player row in their team's bib colour; the viewer's row is ringed.
 * `showTier` puts the player's fish where the Level sits, in a tier Group;
 * `balanceOn` shows the OVR there when Make teams balances on it.
 */
export function BibRow({
  player,
  bib,
  trailing,
  onPress,
  showTier = false,
  balanceOn,
}: {
  player: BoardPlayer;
  bib: FootballBib;
  trailing?: React.ReactNode;
  onPress?: () => void;
  showTier?: boolean;
  balanceOn?: FootballBalanceOn;
}) {
  const m = useMessages();
  const locale = useLocale();
  const { name, spoken, isNickname } = lineupName(player, locale);
  const code = slotCode(player, locale);
  const tierCell = showTier ? boardTierCell(player, locale) : null;
  const level = balanceOn
    ? makeTeamsLevelLabel(player, balanceOn)
    : levelLabel(player.levelBand);
  const label = [
    spoken,
    code,
    tierCell ? tierCell.label : level,
    player.unclaimed ? m.group.addPlayer.notOnTembaYet : null,
    player.guest ? m.group.addPlayer.guest.tag : null,
  ]
    .filter(Boolean)
    .join(m.tournament.listSeparator);
  const body = (
    <>
      <UserAvatar
        name={player.name}
        image={player.image}
        size="sm"
        guest={player.guest}
      />
      <span
        className={cn(
          "text-meta flex min-w-0 flex-1 items-center gap-1",
          player.isViewer && "font-semibold",
        )}
      >
        {isNickname ? (
          <TagIcon aria-hidden className="size-3 shrink-0" />
        ) : null}
        <span dir="auto" className="truncate [text-align:match-parent]">
          {name}
        </span>
      </span>
      {code ? (
        <span className="font-mono text-[11px] opacity-70">{code}</span>
      ) : null}
      {tierCell ? (
        <TierMark cell={tierCell} />
      ) : (
        <span dir="ltr" className="font-expanded text-meta">
          {level}
        </span>
      )}
    </>
  );
  const className = cn(
    "flex h-11 min-w-0 items-center gap-1.5 rounded-md border px-2 text-start",
    (Boolean(player.unclaimed) || Boolean(player.guest)) && "border-dashed",
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
          className="flex min-w-0 flex-1 items-center gap-1.5 text-start outline-none focus-visible:underline"
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

/**
 * A published side's heading. The mean reads in OVR, and is left out in a
 * tier Group, where the rows show fish and points are not everyone's to see.
 */
export function TeamHeader({
  bib,
  name,
  players,
  balanceOn,
  muted = "text-muted-foreground",
}: {
  bib: FootballBib;
  name: string;
  players: readonly BoardPlayer[];
  balanceOn: FootballBalanceOn;
  muted?: string;
}) {
  const m = useMessages();
  const locale = useLocale();
  return (
    <div className="flex items-center justify-between gap-1.5">
      <span className="text-meta flex items-center gap-1.5 font-semibold">
        <BibChip bib={bib} className="size-3.5" />
        {name}
      </span>
      {balanceOn === "ovr" ? (
        <span className={cn("text-[12px] tabular-nums", muted)}>
          {m.game.played.avg(sideOvrAverage(players, locale))}
        </span>
      ) : null}
    </div>
  );
}

export function sideMembers(players: readonly BoardPlayer[], side: 1 | 2) {
  return players
    .filter((player) => player.sideIndex === side)
    .sort(byKeeperThenLevel);
}

/**
 * The two published teams side by side. A row shows the player's OVR, or
 * their fish in a tier Group, as Make teams does.
 */
export function TeamColumns({
  players,
  bibs,
  names,
  balanceOn,
  muted,
  onOpenPlayer,
}: {
  players: readonly BoardPlayer[];
  bibs: Bibs;
  names: { slot1: string; slot2: string };
  balanceOn: FootballBalanceOn;
  muted?: string;
  onOpenPlayer?: (userId: string) => void;
}) {
  const m = useMessages();
  const column = (side: 1 | 2) => {
    const bib = side === 1 ? bibs.slot1 : bibs.slot2;
    const members = sideMembers(players, side);
    return (
      <div className="min-w-0 flex-1 space-y-2">
        <TeamHeader
          bib={bib}
          name={side === 1 ? names.slot1 : names.slot2}
          players={members}
          balanceOn={balanceOn}
          muted={muted}
        />
        <ul className="space-y-2">
          {members.map((player) => (
            <li key={player.userId}>
              <BibRow
                player={player}
                bib={bib}
                showTier={balanceOn === "tierPoints"}
                balanceOn={balanceOn}
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
      <span className={cn("pt-1 text-[12px]", muted)}>
        {m.webTournament.vs}
      </span>
      {column(2)}
    </div>
  );
}
