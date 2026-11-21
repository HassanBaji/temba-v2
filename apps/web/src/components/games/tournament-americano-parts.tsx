"use client";

import { PlusIcon, ShuffleIcon } from "lucide-react";
import * as React from "react";

import { formatGameClock } from "@repo/domain/format-game-start";
import { initials } from "@repo/domain/initials";
import { shortPlayerName } from "@repo/domain/player-name";
import {
  AMERICANO_PLAYER_MIN,
  AMERICANO_PLAYERS_PER_COURT,
  americanoMatchCount,
  americanoRoundOf,
  americanoRounds,
  clampAmericanoRounds,
  swapInOrder,
  type AmericanoTableRow,
} from "@repo/domain/tournament-americano";
import {
  americanoResultMark,
  signedDifference,
  viewerAmericanoMatches,
  type AmericanoViewMatch,
} from "@repo/domain/tournament-americano-view";
import { shuffledOrder } from "@repo/domain/tournament-king";

import { SeriesBadge } from "~/components/series/series-badge";
import type { SeriesTableMarks } from "~/components/series/series-edition-card-model";
import { ResultMark } from "~/components/temba/result-mark";
import { Button } from "~/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerTitle,
} from "~/components/ui/drawer";
import { FormErrorSummary } from "~/components/ui/form-error-summary";
import { CloseButton } from "~/components/ui/nav-icon-button";
import { useLocale, useMessages } from "~/components/locale-provider";
import { globalFormErrorMessage } from "~/lib/form-mutation-error";
import { cn } from "~/lib/utils";
import type { RouterOutputs } from "~/trpc/react";

import { InitialsMark, ROUND_CARD } from "./tournament-round-parts";

export type AmericanoBoard = RouterOutputs["games"]["americanoBoard"];
export type AmericanoPlayer = AmericanoBoard["players"][number];
export type AmericanoBoardRound = AmericanoBoard["rounds"][number];
export type AmericanoBoardMatch = AmericanoBoardRound["matches"][number];

export type MutationError = {
  message: string;
  data?: { zodError?: unknown } | null;
} | null;

export type AmericanoNames = ReadonlyMap<string, AmericanoPlayer>;

export function playerShortName(
  names: AmericanoNames,
  gamePlayerId: string,
  viewerGamePlayerId: string | null,
  you: string,
) {
  if (gamePlayerId === viewerGamePlayerId) {
    return you;
  }
  return shortPlayerName(names.get(gamePlayerId)?.name ?? "");
}

/** A player tile: photo or initials and a short name, solid for the viewer. */
export function AmericanoPlayerChip({
  name,
  image,
  isViewer,
  selected = false,
  onClick,
  label,
  place,
}: {
  name: string;
  image?: string | null;
  isViewer: boolean;
  selected?: boolean;
  onClick?: () => void;
  label?: string;
  /** A Waitlist entry's place in line, shown at the end. */
  place?: number;
}) {
  const m = useMessages();
  const content = (
    <>
      {image ? (
        // eslint-disable-next-line @next/next/no-img-element -- a small avatar from the media host, as `AvatarImage` renders it
        <img
          src={image}
          alt=""
          aria-hidden="true"
          className="size-6 shrink-0 rounded-sm object-cover"
        />
      ) : (
        <span
          aria-hidden="true"
          className={cn(
            "text-eyebrow w-6 shrink-0 font-semibold",
            isViewer || selected ? "text-paper" : "text-ink",
          )}
        >
          {initials(name)}
        </span>
      )}
      <span dir="auto" className="text-meta min-w-0 truncate">
        {isViewer ? m.common.you : shortPlayerName(name)}
      </span>
      {place != null ? (
        <span
          className={cn(
            "text-meta ms-auto shrink-0 tabular-nums",
            isViewer || selected ? "text-paper/70" : "text-muted-foreground",
          )}
        >
          {place}
        </span>
      ) : null}
    </>
  );
  const className = cn(
    "flex min-h-11 min-w-0 items-center gap-2 rounded-md border px-3 text-start",
    isViewer || selected
      ? "bg-ink text-paper border-ink"
      : "border-rule bg-paper text-ink",
  );
  if (onClick) {
    return (
      <button
        type="button"
        aria-pressed={selected}
        aria-label={label}
        onClick={onClick}
        className={cn(
          className,
          "focus-visible:ring-ring/50 outline-none focus-visible:ring-[3px]",
        )}
      >
        {content}
      </button>
    );
  }
  return <div className={className}>{content}</div>;
}

export function OpenSeatChip({ onClick }: { onClick?: () => void }) {
  const m = useMessages().tournamentAmericano.players;
  const inner = (
    <>
      <span
        aria-hidden="true"
        className="hatch absolute inset-0 rounded-md opacity-60"
      />
      <span className="text-muted-foreground text-meta relative flex items-center gap-1.5">
        <PlusIcon aria-hidden="true" className="size-3.5" />
        {m.openSeat}
      </span>
    </>
  );
  const className =
    "border-rule relative flex min-h-11 items-center justify-center overflow-hidden rounded-md border border-dashed";
  return onClick ? (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        className,
        "focus-visible:ring-ring/50 outline-none focus-visible:ring-[3px]",
      )}
    >
      {inner}
    </button>
  ) : (
    <div className={className}>{inner}</div>
  );
}

/** Every seat, two a row: the players in, then the open seats. */
export function AmericanoPlayersGrid({
  players,
  seatCount,
  viewerUserId,
  onOpenSeat,
  onPlayer,
  playerLabel,
}: {
  players: readonly { userId: string; name: string; image?: string | null }[];
  seatCount: number;
  viewerUserId: string;
  onOpenSeat?: () => void;
  onPlayer?: (userId: string) => void;
  playerLabel?: (name: string) => string;
}) {
  const open = Math.max(0, seatCount - players.length);
  return (
    <div className={cn(ROUND_CARD, "grid grid-cols-2 gap-1.5 p-2.5")}>
      {players.map((player) => (
        <AmericanoPlayerChip
          key={player.userId}
          name={player.name}
          image={player.image}
          isViewer={player.userId === viewerUserId}
          onClick={
            onPlayer && player.userId !== viewerUserId
              ? () => onPlayer(player.userId)
              : undefined
          }
          label={playerLabel?.(player.name)}
        />
      ))}
      {Array.from({ length: open }, (_, index) => (
        <OpenSeatChip key={`open-${index}`} onClick={onOpenSeat} />
      ))}
    </div>
  );
}

/** The Waitlist in line order, two a row, each with its place. */
export function AmericanoWaitlist({
  entries,
  viewerUserId,
}: {
  entries: readonly {
    id: string;
    userId: string | null;
    name: string;
    image: string | null;
  }[];
  viewerUserId: string;
}) {
  return (
    <ol className={cn(ROUND_CARD, "grid grid-cols-2 gap-1.5 p-2.5")}>
      {entries.map((entry, index) => (
        <li key={entry.id} className="min-w-0">
          <AmericanoPlayerChip
            name={entry.name}
            image={entry.image}
            isViewer={entry.userId === viewerUserId}
            place={index + 1}
          />
        </li>
      ))}
    </ol>
  );
}

/** R1 to Rn with their start times; hatched until the Rounds are made. */
export function AmericanoScheduleStrip({
  starts,
}: {
  starts: readonly { roundNumber: number; start: Date }[];
}) {
  const m = useMessages().tournamentAmericano.schedule;
  const locale = useLocale();
  return (
    <ol className="flex gap-1.5">
      {starts.map((entry) => (
        <li
          key={entry.roundNumber}
          className="flex min-w-0 flex-1 flex-col items-center gap-1.5"
        >
          <span className="text-muted-foreground text-[11px]">
            {m.roundShort(entry.roundNumber)}
          </span>
          <span
            aria-hidden="true"
            className="border-rule hatch block h-9 w-full rounded-md border"
          />
          <span className="text-muted-foreground text-[11px] tabular-nums">
            {formatGameClock(entry.start, locale).replace(/\s?[AP]M$/i, "")}
          </span>
        </li>
      ))}
    </ol>
  );
}

function PairNames({
  ids,
  names,
  viewerGamePlayerId,
  align = "start",
  selected,
  onPick,
}: {
  ids: readonly string[];
  names: AmericanoNames;
  viewerGamePlayerId: string | null;
  align?: "start" | "end";
  selected?: ReadonlySet<string>;
  onPick?: (gamePlayerId: string) => void;
}) {
  const m = useMessages();
  return (
    <span
      className={cn(
        "flex min-w-0 flex-1 basis-0 flex-col overflow-hidden",
        !onPick && "gap-1",
        align === "end" ? "items-end text-end" : "items-start text-start",
      )}
    >
      {ids.map((id) => {
        const name =
          id === viewerGamePlayerId
            ? m.common.you
            : (names.get(id)?.name ?? "");
        if (onPick) {
          const picked = selected?.has(id) ?? false;
          return (
            <button
              key={id}
              type="button"
              aria-pressed={picked}
              onClick={() => onPick(id)}
              className={cn(
                "text-meta focus-visible:ring-ring/50 max-w-full break-words rounded-sm px-1.5 py-1 font-semibold leading-tight outline-none focus-visible:ring-[3px]",
                align === "end" ? "text-end" : "text-start",
                picked
                  ? "bg-ink text-paper"
                  : "underline-offset-2 hover:underline",
              )}
            >
              <span dir="auto">{name}</span>
            </button>
          );
        }
        return (
          <span
            key={id}
            dir="auto"
            className={cn(
              "text-meta block max-w-full break-words font-semibold leading-tight",
              id === viewerGamePlayerId && "underline underline-offset-2",
            )}
          >
            {name}
          </span>
        );
      })}
    </span>
  );
}

export function scoreLine(match: {
  slot1GamesWon: number | null;
  slot2GamesWon: number | null;
}) {
  return match.slot1GamesWon != null && match.slot2GamesWon != null
    ? `${match.slot1GamesWon}–${match.slot2GamesWon}`
    : null;
}

/** One court in a Round: the two pairs and what can happen to the score. */
export function AmericanoGameRow({
  match,
  names,
  viewerGamePlayerId,
  onEnter,
  onConfirm,
  swap,
}: {
  match: AmericanoBoardMatch;
  names: AmericanoNames;
  viewerGamePlayerId: string | null;
  onEnter?: () => void;
  onConfirm?: () => void;
  swap?: { selected: ReadonlySet<string>; onPick: (id: string) => void };
}) {
  const m = useMessages().tournamentAmericano;
  const score = scoreLine(match);
  let trailing: React.ReactNode = null;
  if (!swap) {
    if (match.canConfirm && onConfirm) {
      trailing = (
        <Button type="button" size="sm" onClick={onConfirm}>
          {m.round.confirm}
        </Button>
      );
    } else if (
      match.canEnterScore &&
      onEnter &&
      match.state !== "confirmed" &&
      match.state !== "awaiting_confirmation"
    ) {
      trailing = (
        <Button type="button" size="sm" onClick={onEnter}>
          {m.round.enterScore}
        </Button>
      );
    } else if (score) {
      trailing = (
        <button
          type="button"
          disabled={!match.canEnterScore || !onEnter}
          onClick={onEnter}
          className="flex flex-col items-end disabled:cursor-default"
          aria-label={
            match.canEnterScore ? `${m.round.fixScore} ${score}` : undefined
          }
        >
          <span className="font-expanded text-[17px] tabular-nums leading-none">
            {score}
          </span>
          {match.state === "awaiting_confirmation" ? (
            <span className="text-muted-foreground text-[11px]">
              {m.round.toConfirm}
            </span>
          ) : null}
        </button>
      );
    } else if (match.state === "not_finished") {
      trailing = (
        <span className="text-muted-foreground text-meta">
          {m.round.notFinished}
        </span>
      );
    } else if (match.state === "on_court") {
      trailing = (
        <span className="text-muted-foreground text-meta">
          {m.round.onCourtNow}
        </span>
      );
    }
  }
  const mine = match.viewerSlot != null;
  return (
    <li
      className={cn(
        "flex min-h-14 flex-wrap items-center gap-x-2 gap-y-1.5 px-3 py-2.5 sm:gap-x-3 sm:px-4",
        mine && "bg-wash",
      )}
    >
      <span className="text-meta w-12 shrink-0 sm:w-14">{match.courtName}</span>
      <span className="flex min-w-[12.5rem] flex-1 items-center gap-2">
        <PairNames
          ids={match.slot1PlayerIds}
          names={names}
          viewerGamePlayerId={viewerGamePlayerId}
          selected={swap?.selected}
          onPick={swap?.onPick}
        />
        <span className="text-muted-foreground text-[11px]">{m.draw.vs}</span>
        <PairNames
          ids={match.slot2PlayerIds}
          names={names}
          viewerGamePlayerId={viewerGamePlayerId}
          align="end"
          selected={swap?.selected}
          onPick={swap?.onPick}
        />
      </span>
      {trailing ? (
        <span className="ms-auto flex shrink-0 justify-end">{trailing}</span>
      ) : null}
    </li>
  );
}

/** One table of players, ranked on games won. */
export function AmericanoTableCard({
  table,
  names,
  viewerGamePlayerId,
  final,
  seriesMarks = null,
}: {
  table: readonly AmericanoTableRow[];
  names: AmericanoNames;
  viewerGamePlayerId: string | null;
  final: boolean;
  /** The Series winner's row and the note, when the Social is an Edition. */
  seriesMarks?: SeriesTableMarks | null;
}) {
  const m = useMessages().tournamentAmericano.table;
  const anyPlayed = table.some((row) => row.played > 0);
  return (
    <div className="space-y-3">
      <div className={ROUND_CARD}>
        <table className="w-full table-fixed border-collapse">
          <thead>
            <tr className="text-muted-foreground border-rule border-b text-[11px]">
              <th
                scope="col"
                className="w-10 py-2.5 ps-4 text-start font-normal"
              >
                {m.place}
              </th>
              <th scope="col" className="py-2.5 text-start font-normal">
                {m.player}
              </th>
              <th scope="col" className="w-8 py-2.5 text-center font-normal">
                {m.played}
              </th>
              <th scope="col" className="w-10 py-2.5 text-center font-normal">
                {m.difference}
              </th>
              <th scope="col" className="w-11 py-2.5 pe-4 text-end font-normal">
                {m.gamesWon}
              </th>
            </tr>
          </thead>
          <tbody className="divide-rule divide-y">
            {table.map((row) => {
              const player = names.get(row.playerId);
              const isViewer = row.playerId === viewerGamePlayerId;
              return (
                <tr key={row.playerId} className={cn(isViewer && "bg-wash")}>
                  <td className="text-muted-foreground text-meta py-2 ps-4 tabular-nums">
                    {final && row.place === 1 ? (
                      <span className="bg-ink text-paper text-eyebrow inline-flex size-6 items-center justify-center rounded-sm font-semibold">
                        1
                      </span>
                    ) : (
                      row.place
                    )}
                  </td>
                  <td className="py-2">
                    <span className="flex min-w-0 items-center gap-2.5">
                      <InitialsMark
                        name={player?.name ?? ""}
                        isViewer={isViewer}
                        className="size-8"
                      />
                      <span
                        dir="auto"
                        className="text-meta min-w-0 flex-1 truncate font-semibold"
                      >
                        {player?.name}
                        {isViewer ? (
                          <span className="text-muted-foreground font-normal">
                            {" "}
                            {m.you}
                          </span>
                        ) : null}
                      </span>
                      {seriesMarks &&
                      player?.userId &&
                      seriesMarks.userIds.has(player.userId) ? (
                        <SeriesBadge
                          emblem={seriesMarks.emblem}
                          colour={seriesMarks.colour}
                          size="line"
                        />
                      ) : null}
                    </span>
                  </td>
                  <td className="text-meta py-2 text-center tabular-nums">
                    {row.played}
                  </td>
                  <td className="text-muted-foreground text-meta py-2 text-center tabular-nums">
                    {signedDifference(row.difference)}
                  </td>
                  <td className="font-expanded py-2 pe-4 text-end text-[17px] tabular-nums">
                    {row.gamesWon}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="text-muted-foreground text-meta leading-relaxed">
        {anyPlayed ? (final ? m.final : m.live) : m.empty}
      </p>
      {seriesMarks ? (
        <p className="text-muted-foreground text-meta leading-relaxed">
          {seriesMarks.note}
        </p>
      ) : null}
    </div>
  );
}

/** The viewer's Match in every Round: partner, opponents and the result. */
export function AmericanoYourRounds({
  matches,
  names,
  viewerGamePlayerId,
  finished,
  onEnter,
}: {
  matches: readonly (AmericanoViewMatch & AmericanoBoardMatch)[];
  names: AmericanoNames;
  viewerGamePlayerId: string | null;
  finished: boolean;
  onEnter?: (match: AmericanoBoardMatch, roundNumber: number) => void;
}) {
  const m = useMessages();
  const a = m.tournamentAmericano.yourRounds;
  const locale = useLocale();
  const played = viewerAmericanoMatches(matches, viewerGamePlayerId);
  if (played.length === 0) {
    return null;
  }
  const gamesFor = played.reduce(
    (sum, entry) => sum + (entry.outcome ? (entry.mine ?? 0) : 0),
    0,
  );
  const gamesAgainst = played.reduce(
    (sum, entry) => sum + (entry.outcome ? (entry.theirs ?? 0) : 0),
    0,
  );
  const shortNames = (ids: readonly string[]) =>
    ids
      .map((id) => playerShortName(names, id, viewerGamePlayerId, m.common.you))
      .join(" & ");
  return (
    <section className="space-y-3">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="font-expanded text-title tracking-[-0.03em]">
          {finished ? a.finishedTitle : a.title}
        </h2>
        <p className="text-muted-foreground text-meta">
          {finished
            ? a.finishedMeta(gamesFor, gamesAgainst)
            : a.meta(played.length)}
        </p>
      </div>
      <ol className={cn(ROUND_CARD, "divide-rule divide-y")}>
        {played.map((entry) => {
          const partner = entry.partnerId ? names.get(entry.partnerId) : null;
          const score =
            entry.mine != null && entry.theirs != null
              ? `${entry.mine}–${entry.theirs}`
              : null;
          const live =
            entry.match.state === "on_court" ||
            entry.match.state === "awaiting_confirmation";
          const line =
            entry.outcome === "won"
              ? a.won(entry.roundNumber)
              : entry.outcome === "drawn"
                ? a.drawn(entry.roundNumber)
                : entry.outcome === "lost"
                  ? a.lost(entry.roundNumber)
                  : live
                    ? a.onCourt(entry.roundNumber, entry.match.courtName ?? "")
                    : a.upcoming(entry.roundNumber);
          return (
            <li
              key={entry.match.matchId}
              className="flex min-h-16 items-center gap-3 px-4 py-3"
            >
              <ResultMark
                variant={americanoResultMark(entry.outcome)}
                className="size-4"
              />
              <InitialsMark name={partner?.name ?? ""} isViewer={false} />
              <div className="min-w-0 flex-1">
                <p dir="auto" className="text-meta truncate font-semibold">
                  {a.with(partner?.name ?? "")}
                </p>
                <p className="text-muted-foreground text-[12px] leading-snug">
                  {a.versus(shortNames(entry.opponentIds))}
                </p>
                <p className="text-muted-foreground text-[12px] leading-snug">
                  {line}
                </p>
              </div>
              {entry.match.canEnterScore &&
              live &&
              onEnter &&
              !entry.match.canConfirm &&
              entry.match.state === "on_court" ? (
                <Button
                  type="button"
                  size="sm"
                  onClick={() => onEnter(entry.match, entry.roundNumber)}
                >
                  {m.tournamentAmericano.round.enterScore}
                </Button>
              ) : score ? (
                <span className="font-expanded shrink-0 text-[17px] tabular-nums">
                  {score}
                </span>
              ) : entry.match.startTime ? (
                <span className="text-muted-foreground text-meta shrink-0">
                  {a.when(
                    formatGameClock(entry.match.startTime, locale),
                    entry.match.courtName ?? "",
                  )}
                </span>
              ) : null}
            </li>
          );
        })}
      </ol>
    </section>
  );
}

/**
 * 2c: Round 1 as it will be played, from a shuffled order. Tapping two
 * players swaps them in the order, which moves them in every Round, so the
 * no-repeat-partner rule holds whatever the Organizer swaps.
 */
export function AmericanoDrawSheet({
  open,
  onOpenChange,
  players,
  roundCount,
  viewerGamePlayerId,
  courtNames,
  firstStart,
  pending,
  error,
  onMake,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  players: readonly AmericanoPlayer[];
  roundCount: number;
  viewerGamePlayerId: string | null;
  courtNames: readonly string[];
  firstStart: Date | null;
  pending: boolean;
  error: MutationError;
  onMake: (gamePlayerIds: string[]) => Promise<void>;
}) {
  const messages = useMessages();
  const m = messages.tournamentAmericano;
  const locale = useLocale();
  const ids = React.useMemo(
    () => players.map((player) => player.gamePlayerId),
    [players],
  );
  const [order, setOrder] = React.useState<string[]>(() => shuffledOrder(ids));
  const [picked, setPicked] = React.useState<string | null>(null);
  React.useEffect(() => {
    if (open) {
      setOrder(shuffledOrder(ids));
      setPicked(null);
    }
  }, [open, ids]);

  const names: AmericanoNames = React.useMemo(
    () => new Map(players.map((player) => [player.gamePlayerId, player])),
    [players],
  );
  const enough = ids.length >= AMERICANO_PLAYER_MIN;
  const ready = enough && ids.length % AMERICANO_PLAYERS_PER_COURT === 0;
  const rounds = clampAmericanoRounds(roundCount, ids.length);
  const roundOne = ready
    ? americanoRoundOf(americanoRounds(order, rounds), 1)
    : [];
  const courtLine =
    courtNames.length > 0
      ? m.hero.courtsLine(Math.min(courtNames.length, roundOne.length))
      : "";
  const errorMessage = globalFormErrorMessage(error);

  function pick(id: string) {
    if (picked == null) {
      setPicked(id);
      return;
    }
    if (picked !== id) {
      setOrder((current) => swapInOrder(current, picked, id));
    }
    setPicked(null);
  }

  return (
    <Drawer open={open} onOpenChange={(next) => !pending && onOpenChange(next)}>
      <DrawerContent className="px-[22px] pb-[max(22px,env(safe-area-inset-bottom))]">
        <div className="mx-auto flex max-h-[85vh] w-full max-w-lg flex-col gap-4 overflow-y-auto pt-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <DrawerTitle className="text-h1">{m.draw.title}</DrawerTitle>
              <DrawerDescription className="text-meta mt-2 leading-relaxed">
                {m.draw.lead(
                  ids.length,
                  rounds,
                  americanoMatchCount(ids.length, rounds),
                )}
              </DrawerDescription>
            </div>
            <CloseButton
              variant="boxed"
              onClick={() => onOpenChange(false)}
              disabled={pending}
            />
          </div>

          {rounds < roundCount && ready ? (
            <p className="text-muted-foreground text-meta">
              {m.draw.fewerRounds(rounds, roundCount)}
            </p>
          ) : null}

          <div className="flex items-baseline justify-between gap-3">
            <p className="font-expanded text-title tracking-[-0.03em]">
              {m.draw.round(1)}{" "}
              <span className="text-muted-foreground text-meta font-sans tracking-normal">
                {m.draw.of(rounds)}
              </span>
            </p>
            {firstStart ? (
              <p className="text-muted-foreground text-meta">
                {m.draw.when(formatGameClock(firstStart, locale), courtLine)}
              </p>
            ) : null}
          </div>

          {ready ? (
            <ol className="flex flex-col gap-2">
              {roundOne.map((pairing) => (
                <li
                  key={pairing.position}
                  className={cn(ROUND_CARD, "flex items-center gap-3 p-3")}
                >
                  <span className="text-meta w-14 shrink-0">
                    {courtNames[pairing.position - 1] ??
                      m.draw.court(pairing.position)}
                  </span>
                  <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                    {[pairing.slot1, pairing.slot2].map((pair, index) => (
                      <React.Fragment key={index}>
                        {index === 1 ? (
                          <span className="text-muted-foreground text-center text-[11px]">
                            {m.draw.vs}
                          </span>
                        ) : null}
                        <div className="grid grid-cols-2 gap-1.5">
                          {pair.map((id) => {
                            const player = names.get(id);
                            return (
                              <AmericanoPlayerChip
                                key={id}
                                name={player?.name ?? ""}
                                isViewer={id === viewerGamePlayerId}
                                selected={picked === id}
                                label={
                                  picked === id
                                    ? m.draw.selected(player?.name ?? "")
                                    : player?.name
                                }
                                onClick={pending ? undefined : () => pick(id)}
                              />
                            );
                          })}
                        </div>
                      </React.Fragment>
                    ))}
                  </div>
                </li>
              ))}
            </ol>
          ) : (
            <p role="alert" className="text-destructive text-meta">
              {enough
                ? m.draw.notInFours(ids.length)
                : m.draw.belowMinimum(AMERICANO_PLAYER_MIN)}
            </p>
          )}

          {errorMessage ? <FormErrorSummary message={errorMessage} /> : null}

          <Button
            type="button"
            size="lg"
            className="w-full font-semibold"
            disabled={pending || !ready}
            aria-busy={pending}
            onClick={() => {
              void onMake(order).then(
                () => onOpenChange(false),
                () => undefined,
              );
            }}
          >
            {pending ? m.draw.making : m.draw.make(rounds)}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="lg"
            disabled={pending || !ready}
            onClick={() => {
              setOrder(shuffledOrder(ids));
              setPicked(null);
            }}
          >
            <ShuffleIcon aria-hidden="true" />
            {m.draw.shuffle}
          </Button>
          <p className="text-muted-foreground text-meta text-center leading-relaxed">
            {m.draw.foot}
          </p>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
