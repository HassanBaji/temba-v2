"use client";

import {
  poolSections,
  poolTileName,
  poolTileTier,
  slotCode,
  type BoardPlayer,
  type PoolTileTier,
} from "@repo/domain/football-board";
import { fishSizes } from "@repo/design-tokens/fish";

import { NicknameName } from "~/components/temba/nickname-name";
import { UserAvatar } from "~/components/common/user-avatar";
import { TierFish } from "~/components/groups/tier-fish";
import { useLocale, useMessages } from "~/components/locale-provider";
import { Hatch } from "~/components/ui/hatch";
import { cn } from "~/lib/utils";

function OpenTile() {
  const m = useMessages();
  return (
    <div className="rounded-card relative flex h-full min-h-[108px] items-center justify-center overflow-hidden">
      <Hatch radius="card" className="absolute inset-0" />
      <span className="text-muted-foreground text-meta relative">
        {m.webTournament.footballPool.openTile}
      </span>
    </div>
  );
}

/** The hatched "not yet" badge, the width of a fish. */
function ProvisionalBadge({ onControl }: { onControl: boolean }) {
  return (
    <span
      className={cn(
        "hatch block shrink-0 rounded-[4px] border",
        onControl
          ? "hatch-on-control border-on-control-muted"
          : "border-muted-foreground",
      )}
      style={fishSizes.tile}
    />
  );
}

function TierLine({
  tier,
  onControl,
}: {
  tier: PoolTileTier;
  onControl: boolean;
}) {
  return (
    <span
      className={cn(
        "mt-1 flex min-w-0 items-center gap-[5px] text-[12px] leading-4",
        onControl ? "text-on-control-muted" : "text-muted-foreground",
      )}
    >
      {tier.mark?.kind === "fish" ? (
        <TierFish
          band={tier.mark.band}
          label={tier.label}
          size="tile"
          className={onControl ? "text-on-control" : undefined}
          cutout={onControl ? "var(--color-control)" : undefined}
        />
      ) : tier.mark?.kind === "hatch" ? (
        <ProvisionalBadge onControl={onControl} />
      ) : null}
      <span dir="auto" className="truncate">
        {tier.label}
      </span>
    </span>
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
  const { name, spoken, isNickname } = poolTileName(player, locale);
  const code = slotCode(player, locale);
  const tier = poolTileTier(player, locale);
  const Tag = onPress ? "button" : "div";
  return (
    <Tag
      type={onPress ? "button" : undefined}
      onClick={onPress ? () => onPress(player.userId) : undefined}
      aria-label={[
        spoken,
        code,
        tier.spoken,
        player.unclaimed ? m.group.addPlayer.notOnTembaYet : null,
      ]
        .filter(Boolean)
        .join(m.tournament.listSeparator)}
      className={cn(
        "focus-visible:ring-ring/50 rounded-card flex h-full min-h-[108px] w-full min-w-0 flex-col justify-between gap-2.5 border p-3 text-start outline-none focus-visible:ring-[3px]",
        player.isViewer
          ? "bg-control text-on-control border-control-edge"
          : "bg-paper border-rule",
        (Boolean(player.unclaimed) || Boolean(player.guest)) &&
          "border-ink border-dashed",
        onPress && !player.isViewer && "hover:bg-wash",
      )}
    >
      <span className="flex items-start justify-between gap-1.5">
        <UserAvatar
          name={player.name}
          image={player.image}
          guest={player.guest}
        />
        {player.role === "keeper" ? (
          <span className="bg-control text-on-control rounded-xs shrink-0 px-[5px] py-0.5 font-mono text-[11px]">
            {code}
          </span>
        ) : code ? (
          <span
            className={cn(
              "shrink-0 pt-[3px] font-mono text-[11px]",
              player.isViewer
                ? "text-on-control-muted"
                : "text-muted-foreground",
            )}
          >
            {code}
          </span>
        ) : null}
      </span>
      <span className="block min-w-0">
        <NicknameName
          name={name}
          isNickname={isNickname}
          className="text-[14px] font-semibold leading-[18px]"
        />
        <TierLine tier={tier} onControl={player.isViewer} />
      </span>
    </Tag>
  );
}

/**
 * Players three to a row, then hatched open seats. Under each name, its own
 * line for the player's Group Tier in a tier Group, or their OVR elsewhere.
 */
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
    <ul className="grid grid-cols-3 gap-2">
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
