"use client";

import {
  boardTierCell,
  lineupName,
  ovrLabel,
  ovrSpoken,
  slotCode,
  teamsSideAverage,
  type Bibs,
  type BoardPlayer,
  type Side,
} from "@repo/domain/football-board";
import type { FootballBalanceOn } from "@repo/domain/football-lineup";
import type { Locale } from "@repo/i18n/locale";
import { Check } from "lucide-react";

import { UserAvatar } from "~/components/common/user-avatar";
import { useLocale, useMessages } from "~/components/locale-provider";
import { NicknameName } from "~/components/temba/nickname-name";
import { Hatch } from "~/components/ui/hatch";
import { cn } from "~/lib/utils";

import { BibChip, bibStyle } from "./football-bibs";
import { TierMark } from "./football-team-columns";

export type PickedRow = { userId: string; pickNumber: number | null };

/** The level a pool tile shows any player: the Tier cell in a tier Group, else the OVR. */
function levelText(player: BoardPlayer, locale: Locale) {
  return boardTierCell(player, locale)?.label ?? ovrLabel(player);
}

function PickedPlayerRow({
  player,
  row,
  bib,
  captain,
}: {
  player: BoardPlayer;
  row: PickedRow;
  bib: Bibs["slot1"];
  captain: boolean;
}) {
  const locale = useLocale();
  const m = useMessages();
  const { name, spoken, isNickname } = lineupName(player, locale);
  const meta = [slotCode(player, locale), levelText(player, locale)]
    .filter(Boolean)
    .join(" ");
  const label = [
    row.pickNumber != null
      ? m.football.pick.pickedSpoken(row.pickNumber, spoken)
      : spoken,
    captain ? m.football.captains.spoken : null,
    slotCode(player, locale),
    boardTierCell(player, locale)?.label ?? ovrSpoken(player, locale),
  ]
    .filter(Boolean)
    .join(m.common.listSeparator);
  return (
    <li
      className="flex h-11 min-w-0 items-center gap-2 rounded-md border px-2"
      style={bibStyle(bib)}
    >
      <span className="sr-only">{label}</span>
      {captain ? (
        <span
          aria-hidden="true"
          className="rounded-xs flex size-4 shrink-0 items-center justify-center text-[9px] font-semibold leading-none"
          style={{
            backgroundColor: bibStyle(bib).color,
            color: bibStyle(bib).backgroundColor,
          }}
        >
          {m.football.captains.badge}
        </span>
      ) : (
        <span
          aria-hidden="true"
          className="w-4 shrink-0 text-center font-mono text-[11px] opacity-70"
        >
          {row.pickNumber ?? ""}
        </span>
      )}
      <span aria-hidden="true" className="min-w-0 flex-1">
        <NicknameName
          name={name}
          isNickname={isNickname}
          className="text-meta block truncate [text-align:match-parent]"
        />
        <span
          dir="ltr"
          className="block truncate font-mono text-[11px] opacity-70 [text-align:match-parent]"
        >
          {meta}
        </span>
      </span>
    </li>
  );
}

function NextPickCell({
  team,
  pickNumber,
}: {
  team: string;
  pickNumber: number;
}) {
  const m = useMessages().football.pick;
  return (
    <li className="border-rule relative flex h-11 items-center justify-center overflow-hidden rounded-md border">
      <span className="sr-only">{m.nextPickSpoken(team, pickNumber)}</span>
      <Hatch className="absolute inset-0" />
      <span
        aria-hidden="true"
        className="bg-paper text-muted-foreground text-eyebrow rounded-xs relative px-1.5 py-px"
      >
        {m.nextPick(pickNumber)}
      </span>
    </li>
  );
}

/**
 * The two sides of a Captain pick (design 4c), side by side: the Side
 * captain first with a C, then each pick with its number, and a hatched
 * cell for the next pick on the side on turn. Under them each side's
 * average, by `teamsSideAverage`.
 */
export function FootballPickSides({
  sides,
  captains,
  bibs,
  teams,
  counts,
  turn,
  nextPick,
  players,
  balanceOn,
}: {
  sides: { slot1: readonly PickedRow[]; slot2: readonly PickedRow[] };
  captains: { slot1: string | null; slot2: string | null };
  bibs: Bibs;
  teams: { slot1: string; slot2: string };
  counts: { slot1: string; slot2: string };
  turn: Side | null;
  nextPick: number;
  players: readonly BoardPlayer[];
  balanceOn: FootballBalanceOn;
}) {
  const locale = useLocale();
  const m = useMessages().football.pick;
  const byId = new Map(players.map((player) => [player.userId, player]));
  const rowsOf = (side: Side) =>
    (side === 1 ? sides.slot1 : sides.slot2).flatMap((row) => {
      const player = byId.get(row.userId);
      return player ? [{ row, player }] : [];
    });
  const column = (side: Side) => {
    const bib = side === 1 ? bibs.slot1 : bibs.slot2;
    const team = side === 1 ? teams.slot1 : teams.slot2;
    const captain = side === 1 ? captains.slot1 : captains.slot2;
    return (
      <section aria-label={team} className="min-w-0 flex-1 space-y-1.5">
        <div className="flex items-center gap-2 pb-0.5">
          <BibChip bib={bib} className="size-3.5" />
          <h2 className="text-meta truncate font-semibold">{team}</h2>
          <span
            aria-hidden="true"
            className={cn(
              "size-[7px] shrink-0 rounded-full",
              turn === side ? "bg-ink" : "bg-transparent",
            )}
          />
          <span className="text-muted-foreground text-eyebrow ms-auto shrink-0 tabular-nums">
            {side === 1 ? counts.slot1 : counts.slot2}
          </span>
        </div>
        <ul className="space-y-1.5">
          {rowsOf(side).map(({ row, player }) => (
            <PickedPlayerRow
              key={row.userId}
              player={player}
              row={row}
              bib={bib}
              captain={captain === row.userId}
            />
          ))}
          {turn === side ? (
            <NextPickCell team={team} pickNumber={nextPick} />
          ) : null}
        </ul>
      </section>
    );
  };
  const average = (side: Side) =>
    m.sideAverage(
      side === 1 ? teams.slot1 : teams.slot2,
      teamsSideAverage(
        rowsOf(side).map(({ player }) => player),
        locale,
        balanceOn,
      ),
    );
  return (
    <div className="space-y-2.5">
      <div className="flex gap-2.5">
        {column(1)}
        {column(2)}
      </div>
      <div className="text-muted-foreground text-eyebrow flex justify-between gap-2.5 tabular-nums">
        <span>{average(1)}</span>
        <span>{average(2)}</span>
      </div>
    </div>
  );
}

function PoolLevel({ player, muted }: { player: BoardPlayer; muted: boolean }) {
  const locale = useLocale();
  const cell = boardTierCell(player, locale);
  return cell ? (
    <TierMark cell={cell} />
  ) : (
    <span
      dir="ltr"
      className={cn(
        "font-expanded shrink-0 font-bold",
        muted && "text-muted-foreground",
      )}
    >
      {ovrLabel(player)}
    </span>
  );
}

/**
 * The pool of a Captain pick, in the order the domain gives it, with each
 * player's position and level. While the viewer may pick, a click selects a
 * player; otherwise the pool is muted. `limit` shows the first few and how
 * many more there are, as the waiting room does.
 */
export function FootballPickPool({
  pool,
  head,
  selectable = false,
  selected = null,
  limit,
  onSelect,
}: {
  pool: readonly BoardPlayer[];
  head: string;
  selectable?: boolean;
  selected?: string | null;
  limit?: number;
  onSelect?: (userId: string | null) => void;
}) {
  const locale = useLocale();
  const messages = useMessages();
  const m = messages.football.pick;
  const shown = limit == null ? pool : pool.slice(0, limit);
  const more = pool.length - shown.length;
  return (
    <section className="space-y-2.5">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-muted-foreground text-meta">{m.poolTitle}</h2>
        <span className="text-muted-foreground text-eyebrow">{head}</span>
      </div>
      <ul className="border-rule bg-paper divide-rule divide-y overflow-hidden rounded-xl border">
        {shown.map((player) => {
          const on = selected === player.userId;
          const { name, spoken, isNickname } = lineupName(player, locale);
          const code = slotCode(player, locale);
          const body = (
            <>
              <UserAvatar
                name={player.name}
                image={player.image}
                guest={player.guest}
              />
              <span className="min-w-0 flex-1">
                <NicknameName
                  name={name}
                  isNickname={isNickname}
                  className={cn(
                    "block truncate font-semibold [text-align:match-parent]",
                    !selectable && "text-muted-foreground",
                  )}
                />
                {code ? (
                  <span className="text-muted-foreground block font-mono text-[11px]">
                    {code}
                  </span>
                ) : null}
              </span>
              <PoolLevel player={player} muted={!selectable} />
            </>
          );
          return (
            <li key={player.userId}>
              {selectable ? (
                <button
                  type="button"
                  aria-pressed={on}
                  aria-label={[
                    spoken,
                    code,
                    boardTierCell(player, locale)?.label ??
                      ovrSpoken(player, locale),
                  ]
                    .filter(Boolean)
                    .join(messages.common.listSeparator)}
                  onClick={() => onSelect?.(on ? null : player.userId)}
                  className={cn(
                    "focus-visible:ring-ring/50 flex w-full items-center gap-3 px-3.5 py-2 text-start outline-none focus-visible:ring-[3px] focus-visible:ring-inset",
                    on ? "bg-wash" : "hover:bg-wash",
                  )}
                >
                  {body}
                  <span
                    aria-hidden="true"
                    className={cn(
                      "rounded-xs flex size-[18px] shrink-0 items-center justify-center border",
                      on
                        ? "bg-control text-on-control border-control-edge"
                        : "bg-paper border-input",
                    )}
                  >
                    {on ? <Check className="size-3" /> : null}
                  </span>
                </button>
              ) : (
                <div className="flex items-center gap-3 px-3.5 py-2">
                  {body}
                </div>
              )}
            </li>
          );
        })}
        {more > 0 ? (
          <li className="text-muted-foreground text-meta px-3.5 py-3">
            {m.andMore(more)}
          </li>
        ) : null}
      </ul>
    </section>
  );
}
