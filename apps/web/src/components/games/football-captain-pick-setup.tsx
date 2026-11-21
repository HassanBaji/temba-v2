"use client";

import {
  mayBeSideCaptain,
  ovrLabel,
  setPickCaptain,
  slotCode,
  type BoardPlayer,
  type Side,
  type TeamsDraft,
} from "@repo/domain/football-board";
import {
  captainPickPoolLine,
  captainPickPoolOrder,
} from "@repo/domain/football-captain-pick";
import {
  FOOTBALL_FIRST_PICKS,
  type FootballBalanceOn,
  type FootballFirstPick,
} from "@repo/domain/football-lineup";
import { ChevronDown } from "lucide-react";
import * as React from "react";

import { useLocale, useMessages } from "~/components/locale-provider";
import { RovingRadioGroup } from "~/components/ui/roving-radio-group";
import { cn } from "~/lib/utils";

import { BibPicker } from "./football-bibs";
import { FootballCaptainsDialog } from "./football-captains-dialog";
import { draftCaptainName } from "./football-draft-view";

function SectionHead({ title, meta }: { title: string; meta?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <h2 className="text-muted-foreground text-meta">{title}</h2>
      {meta ? (
        <span className="text-muted-foreground text-eyebrow">{meta}</span>
      ) : null}
    </div>
  );
}

function PickCaptainChip({
  side,
  team,
  captain,
  onOpen,
}: {
  side: Side;
  team: string;
  captain: BoardPlayer | null;
  onOpen: (side: Side) => void;
}) {
  const m = useMessages();
  const copy = m.football.pick.setup;
  const name = draftCaptainName(captain ?? undefined, m.common.you);
  return (
    <button
      type="button"
      aria-haspopup="dialog"
      aria-label={copy.chipSpoken(team, name)}
      onClick={() => onOpen(side)}
      className={cn(
        "focus-visible:ring-ring/50 flex h-[42px] min-w-0 flex-1 items-center gap-2 rounded-md border px-2.5 text-start outline-none focus-visible:ring-[3px]",
        captain ? "border-rule" : "border-input border-dashed",
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          "flex size-[18px] shrink-0 items-center justify-center rounded-[5px] border text-[9px] font-semibold leading-none",
          captain
            ? "bg-control text-on-control border-control-edge"
            : "bg-paper text-muted-foreground border-input",
        )}
      >
        {m.football.captains.badge}
      </span>
      <span
        className={cn(
          "text-meta min-w-0 flex-1 truncate",
          captain ? null : "text-muted-foreground",
        )}
      >
        {name ? copy.captainChip(name, team) : copy.addCaptain(team)}
      </span>
      <ChevronDown
        aria-hidden="true"
        className="text-muted-foreground size-3.5 shrink-0"
      />
    </button>
  );
}

function FirstPickToggle({
  value,
  names,
  onChange,
}: {
  value: FootballFirstPick;
  names: { slot1: string; slot2: string };
  onChange: (value: FootballFirstPick) => void;
}) {
  const m = useMessages().football.pick.setup;
  const labels: Record<FootballFirstPick, string> = {
    toss: m.toss,
    slot1: names.slot1,
    slot2: names.slot2,
  };
  return (
    <RovingRadioGroup
      aria-label={m.firstPickTitle}
      className="border-rule flex overflow-hidden rounded-lg border"
    >
      {FOOTBALL_FIRST_PICKS.map((option) => {
        const selected = option === value;
        return (
          <button
            key={option}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(option)}
            className={cn(
              "text-meta focus-visible:ring-ring/50 h-11 flex-1 outline-none focus-visible:ring-[3px] focus-visible:ring-inset",
              selected
                ? "bg-control text-on-control font-semibold"
                : "bg-paper text-muted-foreground hover:bg-wash",
            )}
          >
            {labels[option]}
          </button>
        );
      })}
    </RovingRadioGroup>
  );
}

function PoolTile({ player }: { player: BoardPlayer }) {
  const m = useMessages();
  const locale = useLocale();
  const meta = [slotCode(player, locale), ovrLabel(player)]
    .filter(Boolean)
    .join(" ");
  return (
    <li className="border-rule flex h-10 min-w-0 items-center gap-2 rounded-md border px-2.5">
      <span className="text-meta min-w-0 flex-1 truncate">
        {draftCaptainName(player, m.common.you)}
      </span>
      <span
        dir="ltr"
        className="text-muted-foreground shrink-0 font-mono text-[11px]"
      >
        {meta}
      </span>
    </li>
  );
}

/**
 * Captain pick on Make teams (design 4a, ADR-0109): a Side captain for each
 * side from the whole roster, who picks first, the bibs, and everyone else
 * still to be picked, best level first.
 */
export function FootballCaptainPickSetup({
  draft,
  players,
  names,
  balanceOn,
  firstPick,
  onChange,
  onFirstPickChange,
}: {
  draft: TeamsDraft;
  players: readonly BoardPlayer[];
  names: { slot1: string; slot2: string };
  balanceOn: FootballBalanceOn;
  firstPick: FootballFirstPick;
  onChange: (draft: TeamsDraft) => void;
  onFirstPickChange: (firstPick: FootballFirstPick) => void;
}) {
  const locale = useLocale();
  const m = useMessages().football.pick.setup;
  const [captainsSide, setCaptainsSide] = React.useState<Side | null>(null);
  const captain = (userId: string | null) =>
    players.find((player) => player.userId === userId) ?? null;
  const eligible = players.filter(mayBeSideCaptain);
  const pool = captainPickPoolOrder(
    players.filter((player) => !draft.sides[player.userId]),
    { organizer: true, balanceOn },
  );
  return (
    <>
      <section className="space-y-2.5">
        <SectionHead title={m.captainsTitle} meta={m.captainsHint} />
        <div className="flex gap-2.5">
          <PickCaptainChip
            side={1}
            team={names.slot1}
            captain={captain(draft.captains.slot1)}
            onOpen={setCaptainsSide}
          />
          <PickCaptainChip
            side={2}
            team={names.slot2}
            captain={captain(draft.captains.slot2)}
            onOpen={setCaptainsSide}
          />
        </div>
      </section>
      <section className="space-y-2.5">
        <SectionHead title={m.firstPickTitle} />
        <FirstPickToggle
          value={firstPick}
          names={names}
          onChange={onFirstPickChange}
        />
        <p className="text-muted-foreground text-eyebrow">
          {firstPick === "toss"
            ? m.tossNote
            : m.sideNote(firstPick === "slot1" ? names.slot1 : names.slot2)}
        </p>
      </section>
      <BibPicker
        bibs={draft.bibs}
        onChange={(bibs) => onChange({ ...draft, bibs })}
      />
      <section className="space-y-2.5">
        <SectionHead
          title={m.toBePicked}
          meta={captainPickPoolLine(pool.length, locale)}
        />
        <ul className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
          {pool.map((player) => (
            <PoolTile key={player.userId} player={player} />
          ))}
        </ul>
      </section>
      <FootballCaptainsDialog
        side={captainsSide}
        bibs={draft.bibs}
        names={names}
        sides={{ slot1: eligible, slot2: eligible }}
        captains={draft.captains}
        subtitle={m.sheetBody}
        emptyNote={m.noneOnRoster}
        required
        onSideChange={setCaptainsSide}
        onPick={(side, userId) => onChange(setPickCaptain(draft, side, userId))}
        onClose={() => setCaptainsSide(null)}
      />
    </>
  );
}
