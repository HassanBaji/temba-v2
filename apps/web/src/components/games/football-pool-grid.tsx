"use client";

import {
  levelLabel,
  poolSections,
  shortName,
  slotCode,
  type BoardPlayer,
} from "@repo/domain/football-board";

import { UserAvatar } from "~/components/common/user-avatar";
import { useLocale, useMessages } from "~/components/locale-provider";
import { Hatch } from "~/components/ui/hatch";
import { cn } from "~/lib/utils";

function OpenTile() {
  const m = useMessages();
  return (
    <div className="relative flex h-[74px] items-center justify-center overflow-hidden rounded-md">
      <Hatch radius="md" className="absolute inset-0" />
      <span className="text-muted-foreground relative text-[12px]">
        {m.webTournament.footballPool.openTile}
      </span>
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
  const m = useMessages();
  const locale = useLocale();
  const name = player.isViewer ? m.common.you : shortName(player.name);
  const code = slotCode(player, locale);
  const Tag = onPress ? "button" : "div";
  return (
    <Tag
      type={onPress ? "button" : undefined}
      onClick={onPress ? () => onPress(player.userId) : undefined}
      aria-label={[
        name,
        code,
        levelLabel(player.levelBand),
        player.unclaimed ? m.group.addPlayer.notOnTembaYet : null,
        player.guest ? m.group.addPlayer.guest.tag : null,
      ]
        .filter(Boolean)
        .join(m.tournament.listSeparator)}
      className={cn(
        "focus-visible:ring-ring/50 flex h-[74px] w-full min-w-0 flex-col justify-between rounded-md border p-2 text-start outline-none focus-visible:ring-[3px]",
        player.isViewer
          ? "bg-control text-on-control border-control-edge"
          : "bg-paper border-rule",
        (Boolean(player.unclaimed) || Boolean(player.guest)) &&
          "border-ink border-dashed",
        onPress && !player.isViewer && "hover:bg-wash",
      )}
    >
      <span className="flex items-center justify-between">
        <UserAvatar
          name={player.name}
          image={player.image}
          size="sm"
          guest={player.guest}
        />
        {player.role === "keeper" ? (
          <span className="bg-control text-on-control rounded-[4px] px-1 font-mono text-[11px]">
            {code}
          </span>
        ) : code ? (
          <span
            className={cn(
              "font-mono text-[11px]",
              player.isViewer
                ? "text-on-control-muted"
                : "text-muted-foreground",
            )}
          >
            {code}
          </span>
        ) : null}
      </span>
      <span className="flex items-baseline justify-between gap-1">
        <span dir="auto" className="truncate text-[12px]">
          {name}
        </span>
        <span dir="ltr" className="font-expanded text-meta">
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
  const m = useMessages();
  return (
    <ul className="grid grid-cols-4 gap-2">
      {players.map((player) => (
        <li key={player.userId} className="min-w-0">
          <PlayerTile player={player} onPress={onOpenPlayer} />
        </li>
      ))}
      {Array.from({ length: open }, (_, index) => (
        <li
          key={`open-${index}`}
          aria-label={m.webTournament.footballPool.openSeat}
        >
          <OpenTile />
        </li>
      ))}
    </ul>
  );
}

function PoolHeading({
  id,
  title,
  meta,
}: {
  id?: string;
  title: string;
  meta: string;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <h2 id={id} className="text-title font-semibold tracking-[-0.01em]">
        {title}
      </h2>
      <p className="text-muted-foreground text-meta">{meta}</p>
    </div>
  );
}

/**
 * The pool in two blocks: Keepers with a hatched cell per keeper seat still
 * open, then Players with the rest of the open seats.
 */
export function PoolSections({
  players,
  seats,
  headingId,
  onOpenPlayer,
}: {
  players: readonly BoardPlayer[];
  seats: number;
  headingId?: string;
  onOpenPlayer?: (userId: string) => void;
}) {
  const m = useMessages();
  const locale = useLocale();
  const sections = poolSections(players, seats, locale);
  return (
    <div className="space-y-3">
      <PoolHeading
        id={headingId}
        title={m.webTournament.footballPool.keepers}
        meta={sections.keepersLine}
      />
      <PoolGrid
        players={sections.keepers}
        open={sections.keeperOpenSeats}
        onOpenPlayer={onOpenPlayer}
      />
      <div className="pt-2">
        <PoolHeading title={m.common.players} meta={sections.outfieldLine} />
      </div>
      <PoolGrid
        players={sections.outfield}
        open={sections.outfieldOpenSeats}
        onOpenPlayer={onOpenPlayer}
      />
    </div>
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
  const m = useMessages();
  return (
    <div
      role="img"
      aria-label={m.tournament.home.seatsTakenSr(
        Math.min(filled, seats),
        seats,
      )}
      className="flex gap-[3px]"
    >
      {Array.from({ length: seats }, (_, index) =>
        index < filled ? (
          <span
            key={index}
            className={cn(
              "h-6 flex-1 rounded-[3px]",
              tone === "ink" ? "bg-on-focus" : "bg-ink",
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
