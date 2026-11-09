"use client";

import { Check, UserRound } from "lucide-react";
import type * as React from "react";

import { EntityMonogram } from "~/components/common/entity-monogram";
import { useLocale, useMessages } from "~/components/locale-provider";
import { Hatch } from "~/components/ui/hatch";
import type {
  GameInviteHero,
  GameInviteHeroTile,
  gameInviteHeroModel,
  gameInviteLevelCard,
} from "@repo/domain/game-invite-hero";
import type {
  InviteSeatCourt as InviteSeatCourtModel,
  InviteSeatTile,
} from "@repo/domain/game-invite-join-sheet";
import { initials } from "@repo/domain/initials";
import { sportLabel } from "@repo/domain/sport";
import { cn } from "~/lib/utils";

const COLUMNS = 6;

function Tile({ tile }: { tile: GameInviteHeroTile }) {
  const m = useMessages();
  if (tile.kind === "open") {
    return (
      <span
        role="img"
        aria-label={m.mobileInvite.link.hero.openSeatA11y}
        className="relative h-11 overflow-hidden rounded-[9px]"
      >
        <Hatch tone="ink" className="absolute inset-0 rounded-[9px]" />
      </span>
    );
  }
  return (
    <span
      className={cn(
        "text-meta flex h-11 items-center justify-center rounded-[9px] font-semibold",
        tile.isViewer ? "bg-on-focus text-focus" : "bg-raised text-on-focus",
      )}
    >
      {tile.initials}
    </span>
  );
}

/** The design's roster: one tile per player, the open seats hatched. */
export function InviteHeroTiles({
  tiles,
  label,
}: {
  tiles: GameInviteHeroTile[];
  label: string;
}) {
  if (tiles.length === 0) {
    return null;
  }
  return (
    <div
      role="group"
      aria-label={label}
      className="grid gap-1.5"
      style={{ gridTemplateColumns: `repeat(${COLUMNS}, minmax(0, 1fr))` }}
    >
      {tiles.map((tile, index) => (
        <Tile key={index} tile={tile} />
      ))}
    </div>
  );
}

function SeatTile({
  seat,
  onSit,
}: {
  seat: InviteSeatTile;
  onSit: ((seat: InviteSeatTile) => void) | null;
}) {
  const m = useMessages();
  if (seat.occupant) {
    return (
      <div className="bg-raised flex min-h-[64px] items-center gap-2.5 rounded-[10px] px-3 py-2.5">
        <span className="bg-on-focus text-focus text-eyebrow flex size-8 shrink-0 items-center justify-center rounded-lg font-semibold">
          {initials(seat.occupant.name)}
        </span>
        <span className="min-w-0">
          <span className="text-meta block truncate font-semibold">
            {seat.occupant.name}
          </span>
          <span className="text-dim block text-[12px]">{seat.sub}</span>
        </span>
      </div>
    );
  }
  const label = m.mobileInvite.link.hero.sitHere;
  const body = (
    <>
      <Hatch tone="ink" className="absolute inset-0 rounded-[10px]" />
      <span className="relative block">
        <span className="text-meta block font-semibold">{label}</span>
        <span className="text-dim block text-[12px]">{seat.sub}</span>
      </span>
    </>
  );
  if (!onSit) {
    return (
      <div className="border-dimrule relative min-h-[64px] overflow-hidden rounded-[10px] border border-dashed px-3 py-2.5">
        {body}
      </div>
    );
  }
  return (
    <button
      type="button"
      aria-label={`${label}, ${seat.sub}`}
      onClick={() => onSit(seat)}
      className="border-dimrule hover:border-on-focus focus-visible:ring-on-focus/40 relative min-h-[64px] overflow-hidden rounded-[10px] border border-dashed px-3 py-2.5 text-start outline-none focus-visible:ring-[3px]"
    >
      {body}
    </button>
  );
}

/** Design 3a: the court on a padel link, the open seats as Sit here tiles. */
export function InviteSeatCourt({
  court,
  onSit,
}: {
  court: InviteSeatCourtModel[];
  onSit: ((seat: InviteSeatTile) => void) | null;
}) {
  return (
    <div className="space-y-2">
      {court.map((side, index) => (
        <div key={side.sideIndex} className="space-y-2">
          {index > 0 ? (
            <div className="flex items-center gap-3">
              <span className="bg-dimrule h-px flex-1" />
              <span className="text-dim text-[11px] font-semibold tracking-[0.08em]">
                VS
              </span>
              <span className="bg-dimrule h-px flex-1" />
            </div>
          ) : null}
          <div className="grid grid-cols-2 gap-2">
            {side.seats.map((seat) => (
              <SeatTile key={seat.position} seat={seat} onSit={onSit} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

/** Design 3e: one Sit here tile under the football pool; seats are not positional yet. */
export function InviteSitHereTile({
  sub,
  onSit,
}: {
  sub: string;
  onSit: (() => void) | null;
}) {
  const m = useMessages();
  const label = m.mobileInvite.link.hero.sitHere;
  const body = (
    <>
      <Hatch tone="ink" className="absolute inset-0 rounded-[10px]" />
      <span className="relative block">
        <span className="text-meta block font-semibold">{label}</span>
        <span className="text-dim block text-[12px]">{sub}</span>
      </span>
    </>
  );
  return onSit ? (
    <button
      type="button"
      aria-label={`${label}, ${sub}`}
      onClick={onSit}
      className="border-dimrule hover:border-on-focus focus-visible:ring-on-focus/40 relative mt-2 w-full overflow-hidden rounded-[10px] border border-dashed px-3 py-3 text-start outline-none focus-visible:ring-[3px]"
    >
      {body}
    </button>
  ) : (
    <div className="border-dimrule relative mt-2 overflow-hidden rounded-[10px] border border-dashed px-3 py-3">
      {body}
    </div>
  );
}

/** Design 3a: the Game itself, when and where and who is in. */
export function GameInviteCard({
  model,
  seats,
  countHint,
  afterSeats,
}: {
  model: ReturnType<typeof gameInviteHeroModel>;
  /** Replaces the roster tiles, e.g. the court to pick a seat on. */
  seats?: React.ReactNode;
  /** `tap a seat, pick your side after`, beside the count. */
  countHint?: string | null;
  /** Under the roster, e.g. the football Sit here tile. */
  afterSeats?: React.ReactNode;
}) {
  return (
    <div className="border-dimrule rounded-xl border p-5">
      <div className="flex items-center justify-between gap-3">
        <p className="text-meta text-dim">{model.status}</p>
        {model.sport ? (
          <span className="text-eyebrow text-dim border-dimrule rounded-xs border px-[7px] py-1 font-mono uppercase">
            {model.sport}
          </span>
        ) : null}
      </div>
      {model.time ? (
        <h1 className="mt-3 flex flex-wrap items-baseline gap-x-2">
          <span className="text-[54px] font-bold leading-[0.94] tracking-[-0.03em] [font-variation-settings:'wdth'_118,'wght'_700]">
            {model.time}
          </span>
          {model.meridiem ? (
            <span className="text-dim text-[22px] [font-variation-settings:'wdth'_100,'wght'_500]">
              {model.meridiem}
            </span>
          ) : null}
        </h1>
      ) : null}
      {model.dayLine ? <p className="text-lead mt-2">{model.dayLine}</p> : null}
      {model.detailLine ? (
        <p className="text-meta text-dim">{model.detailLine}</p>
      ) : null}
      <div className="border-dimrule mt-5 border-t pt-4">
        <div className="mb-3 flex items-baseline justify-between gap-3">
          <p className="text-meta font-semibold">{model.countLine}</p>
          {countHint ? (
            <p className="text-dim text-[12px]">{countHint}</p>
          ) : null}
        </div>
        {seats ?? (
          <InviteHeroTiles tiles={model.tiles} label={model.rosterA11y} />
        )}
        {afterSeats}
      </div>
    </div>
  );
}

/** Design 3a, 3b: the viewer's band against the Game's range. */
export function GameInviteLevelCard({
  card,
}: {
  card: NonNullable<ReturnType<typeof gameInviteLevelCard>>;
}) {
  return (
    <div className="border-dimrule flex items-center gap-4 rounded-xl border p-4">
      {card.band ? (
        <span className="w-12 shrink-0 text-[28px] font-bold leading-none tracking-[-0.03em] [font-variation-settings:'wdth'_118,'wght'_700]">
          {card.band}
        </span>
      ) : (
        <span className="bg-raised flex size-9 shrink-0 items-center justify-center rounded-lg">
          <UserRound aria-hidden="true" className="size-4" />
        </span>
      )}
      <p className="text-meta text-dim">{card.text}</p>
    </div>
  );
}

/** Design 3a: the Group the Game lives in, and the door to it. */
export function GameInviteGroupCard({
  group,
  line,
  action,
}: {
  group: NonNullable<GameInviteHero["groupCard"]>;
  line: string;
  action?: React.ReactNode;
}) {
  const m = useMessages();
  const name = group.name ?? m.group.untitled;
  return (
    <div className="border-dimrule divide-dimrule divide-y overflow-hidden rounded-xl border">
      <div className="flex items-start gap-3 p-4">
        {group.imageUrl ? (
          <EntityMonogram name={name} image={group.imageUrl} size="lg" />
        ) : (
          <span
            aria-hidden="true"
            className="bg-raised text-meta flex size-12 shrink-0 items-center justify-center rounded-lg font-semibold"
          >
            {initials(name)}
          </span>
        )}
        <div className="min-w-0 flex-1">
          <GroupSport sport={group.sport} />
          <p className="text-lead truncate font-semibold">{name}</p>
          <p className="text-meta text-dim">
            {m.mobileInvite.link.group.members(group.memberCount)}
          </p>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-3 px-4 py-3">
        <MemberStack names={group.memberNames} />
        <p className="text-meta text-dim min-w-0 flex-1 basis-36">{line}</p>
        {action}
      </div>
    </div>
  );
}

function GroupSport({ sport }: { sport: string | null }) {
  const label = sportLabel(sport, useLocale());
  return label ? <p className="text-eyebrow text-dim">{label}</p> : null;
}

function MemberStack({ names }: { names: string[] }) {
  if (names.length === 0) {
    return null;
  }
  return (
    <span
      aria-hidden="true"
      className="flex shrink-0 -space-x-0.5 rtl:space-x-reverse"
    >
      {names.slice(0, 3).map((name, index) => (
        <span
          key={`${name}-${index}`}
          className="bg-raised border-dimrule flex size-7 items-center justify-center rounded-md border text-[10px] font-semibold"
        >
          {initials(name)}
        </span>
      ))}
    </span>
  );
}

/** Label and value lines split by hairlines, on the ink page. */
export function GameInviteRows({
  rows,
}: {
  rows: readonly { label: string; value: string }[];
}) {
  if (rows.length === 0) {
    return null;
  }
  return (
    <dl className="border-dimrule divide-dimrule divide-y overflow-hidden rounded-xl border">
      {rows.map((row) => (
        <div
          key={row.label}
          className="text-body flex justify-between gap-4 px-4 py-3.5"
        >
          <dt className="text-dim">{row.label}</dt>
          <dd className="text-end">{row.value}</dd>
        </div>
      ))}
    </dl>
  );
}

/** A decided answer on the page: joined the Group, or in the Game. */
export function GameInviteNotice({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="border-on-focus flex items-center gap-3 rounded-xl border p-4">
      <span className="bg-on-focus text-focus flex size-9 shrink-0 items-center justify-center rounded-lg">
        <Check aria-hidden="true" className="size-4" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-body font-semibold">{title}</p>
        <p className="text-meta text-dim">{description}</p>
      </div>
      {action}
    </div>
  );
}

/** Design 1f on the web: the request with the Organizers, the seat maybe held. */
export function GameInviteRequestCard({
  title,
  description,
  sharedBy,
  withdraw,
}: {
  title: string;
  description: string;
  sharedBy: { label: string; value: string } | null;
  withdraw: React.ReactNode;
}) {
  return (
    <div className="border-on-focus divide-dimrule divide-y overflow-hidden rounded-xl border">
      <div className="flex items-start gap-3 p-4">
        <span className="relative size-9 shrink-0 overflow-hidden rounded-full">
          <Hatch tone="ink" className="absolute inset-0 rounded-full" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-body font-semibold">{title}</p>
          <p className="text-meta text-dim">{description}</p>
        </div>
      </div>
      {sharedBy ? (
        <div className="text-meta flex justify-between gap-4 px-4 py-3.5">
          <span className="text-dim">{sharedBy.label}</span>
          <span className="text-end">{sharedBy.value}</span>
        </div>
      ) : null}
      {withdraw}
    </div>
  );
}

/** The bar fixed under the page: what is open, and the one action. */
export function GameInviteBar({
  title,
  subline,
  action,
}: {
  title: string | null;
  subline: string | null;
  action?: React.ReactNode;
}) {
  const hasLines = Boolean(title) || Boolean(subline);
  return (
    <div className="bg-focus border-dimrule px-6.5 sticky bottom-0 z-10 -mx-[26px] mt-auto flex items-center gap-3.5 border-t py-3 pb-[max(env(safe-area-inset-bottom),20px)]">
      {hasLines ? (
        <div className="min-w-0 flex-1">
          {title ? <p className="text-body font-semibold">{title}</p> : null}
          {subline ? <p className="text-meta text-dim">{subline}</p> : null}
        </div>
      ) : null}
      {action ? (
        <div className={cn("shrink-0", !hasLines && "flex-1")}>{action}</div>
      ) : null}
    </div>
  );
}
