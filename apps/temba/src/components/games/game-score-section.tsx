"use client";

import { Fragment } from "react";
import * as React from "react";
import { toast } from "sonner";

import { formatGameSideLabel } from "~/components/games/game-side-label";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { formatAbsoluteDay } from "~/lib/format-game-start";
import {
  FRIENDLY_SET_GAMES_MAX,
  FRIENDLY_SET_GAMES_MIN,
  clampFriendlySetGames,
  friendlyGameResultsSaveSets,
} from "~/lib/friendly-game-results";
import { cn } from "~/lib/utils";
import { type RouterOutputs } from "~/trpc/react";

type GameScoreSectionSide = RouterOutputs["games"]["byId"]["sides"][number];
type GameScoreSectionMatch = RouterOutputs["games"]["byId"]["matches"][number];
type GameScoreSectionConfirmation = NonNullable<
  RouterOutputs["games"]["byId"]["matchResultConfirmation"]
>;

/**
 * The three phases the redesigned Score section renders (game-details
 * redesign, TEM-181). `ongoing` collapses into the same, non-enterable
 * treatment as `upcoming` — the same reconciliation `FriendlyGameDetailsHero`
 * (TEM-179) already made for its own hero: no reminder/notification exists
 * for "the window just started", and the door gate that actually matters
 * (`canScoreSets`) never turns on until `needs_results` regardless.
 */
export type GameScoreSectionPhase =
  | "upcoming"
  | "ongoing"
  | "needs_results"
  | "final";

type SetDraft = { slot1: number | null; slot2: number | null };

function nameByUserId(sides: GameScoreSectionSide[]) {
  const map = new Map<string, string>();
  for (const side of sides) {
    if (side.left) {
      map.set(side.left.userId, side.left.name);
    }
    if (side.right) {
      map.set(side.right.userId, side.right.name);
    }
  }
  return map;
}

function teamNamesLabel(side: GameScoreSectionSide) {
  return `${side.left?.name ?? "Open"} & ${side.right?.name ?? "Open"}`;
}

/** `sides[]` sideIndex 1 always backs Match slot 1, sideIndex 2 slot 2 —
 * `setFriendlyMatchSlotForSide` (`~/server/games/seats.ts`) assigns them
 * that way at seat-pick time, so this mapping holds even before either
 * side's Game team exists yet (a `null` `gameTeamId` on an open seat). */
function gamesWonForSide(
  set: GameScoreSectionMatch["sets"][number],
  sideIndex: number,
) {
  return sideIndex === 1 ? set.slot1GamesWon : set.slot2GamesWon;
}

function ScoreTeamHeader({ side }: { side: GameScoreSectionSide }) {
  return (
    <div className="min-w-0 flex-1">
      <p className="text-eyebrow text-muted-foreground font-medium uppercase tracking-[0.06em]">
        {formatGameSideLabel("friendly_game", side.sideIndex)}
      </p>
      <p className="text-meta mt-0.5 truncate font-medium">
        {teamNamesLabel(side)}
      </p>
    </div>
  );
}

/**
 * One 44×40 set box. Hatch always means "unentered" or "unplayed" here —
 * never anything else (spec: "Hatch in this section only ever means
 * 'unentered set' or 'unplayed set'"). Five visual states:
 * - `locked`: Upcoming/ongoing — hatched, `aria-hidden`, no digit.
 * - `unplayed`: Final, but this Set never happened — hatched, `aria-hidden`.
 * - `enterable`: Needs a score, viewer may write — hatched background on a
 *   real `<input>` so the box still reads "unentered" even mid-edit.
 * - `readonly`: Needs a score, viewer may not write — hatched, shows the
 *   entered digit (if any) as plain text.
 * - `solid` / `outline`: Final, this side won / lost this Set.
 */
function SetBox({
  state,
  value,
  label,
  disabled,
  onChange,
}: {
  state: "locked" | "unplayed" | "enterable" | "readonly" | "solid" | "outline";
  value: number | null;
  label: string;
  disabled?: boolean;
  onChange?: (value: number | null) => void;
}) {
  if (state === "locked" || state === "unplayed") {
    return (
      <span
        aria-hidden="true"
        className="hatch inline-block h-10 w-11 shrink-0 rounded-[5px]"
      />
    );
  }

  if (state === "solid") {
    return (
      <div className="bg-ink text-paper flex h-10 w-11 shrink-0 items-center justify-center rounded-[5px] text-base font-semibold tabular-nums">
        <span className="sr-only">
          {label}: {value} games, won this Set
        </span>
        <span aria-hidden="true">{value}</span>
      </div>
    );
  }

  if (state === "outline") {
    return (
      <div className="border-ink bg-paper text-ink flex h-10 w-11 shrink-0 items-center justify-center rounded-[5px] border-[1.5px] text-base font-semibold tabular-nums">
        <span className="sr-only">
          {label}: {value} games, lost this Set
        </span>
        <span aria-hidden="true">{value}</span>
      </div>
    );
  }

  if (state === "readonly") {
    return (
      <div
        className="hatch text-ink flex h-10 w-11 shrink-0 items-center justify-center rounded-[5px] text-base font-semibold tabular-nums"
        aria-label={`${label}: ${value ?? "not entered yet"}`}
      >
        <span aria-hidden="true">{value ?? ""}</span>
      </div>
    );
  }

  return (
    <Input
      type="number"
      inputMode="numeric"
      min={FRIENDLY_SET_GAMES_MIN}
      max={FRIENDLY_SET_GAMES_MAX}
      value={value ?? ""}
      disabled={disabled}
      aria-label={label}
      onChange={(event) => {
        const raw = event.target.value;
        if (raw === "") {
          onChange?.(null);
          return;
        }
        const parsed = Number(raw);
        onChange?.(
          Number.isFinite(parsed) ? clampFriendlySetGames(parsed) : null,
        );
      }}
      className={cn(
        "hatch h-10 w-11 shrink-0 rounded-[5px] p-0 text-center text-base font-semibold tabular-nums",
        "[appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none",
      )}
    />
  );
}

function ScoreFooterNote({
  phase,
  confirmedAtLabel,
}: {
  phase: GameScoreSectionPhase;
  confirmedAtLabel: string | null;
}) {
  const isFinal = phase === "final";
  const copy = isFinal
    ? confirmedAtLabel
      ? `Confirmed by all four players on ${confirmedAtLabel}. Nothing else needed.`
      : "Confirmed by all four players. Nothing else needed."
    : phase === "needs_results"
      ? "No score yet. Anyone who played can add it. The other three confirm before it counts towards your level."
      : "Scoring opens when the court is full. Fill the last spot and you'll be able to enter a result after the game.";

  return (
    <div className="flex items-start gap-2.5">
      <span
        aria-hidden="true"
        className={cn(
          "mt-0.5 size-3 shrink-0 rounded-[2px]",
          isFinal ? "bg-ink" : "hatch",
        )}
      />
      <p className="text-muted-foreground text-meta">{copy}</p>
    </div>
  );
}

function MatchResultConfirmations({
  confirmation,
  viewerUserId,
  names,
  canConfirm,
  confirmPending,
  onConfirm,
}: {
  confirmation: GameScoreSectionConfirmation;
  viewerUserId: string;
  names: Map<string, string>;
  canConfirm: boolean;
  confirmPending: boolean;
  onConfirm: () => void;
}) {
  const confirmedSet = new Set(confirmation.confirmedUserIds);

  return (
    <div className="border-rule space-y-2.5 border-t pt-4">
      <p className="text-meta font-medium">Confirmations</p>
      <ul className="space-y-1.5">
        {confirmation.requiredUserIds.map((userId) => {
          const isConfirmed = confirmedSet.has(userId);
          const isViewer = userId === viewerUserId;
          const name = names.get(userId) ?? "Player";
          return (
            <li
              key={userId}
              className="flex items-center justify-between gap-3 text-meta"
            >
              <span className="min-w-0 truncate">
                {name}
                {isViewer ? " (You)" : ""}
              </span>
              <span
                className={cn(
                  "shrink-0",
                  isConfirmed
                    ? "text-ink font-medium"
                    : "text-muted-foreground",
                )}
              >
                {isConfirmed ? "Confirmed" : "Waiting"}
              </span>
            </li>
          );
        })}
      </ul>
      {canConfirm ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onConfirm}
          disabled={confirmPending}
        >
          Confirm result
        </Button>
      ) : null}
    </div>
  );
}

/**
 * Score section (game-details redesign, TEM-181): replaces the old
 * `FriendlyGameResultsPanel` for the individual Friendly game details page,
 * across all three phases. One row per `match.sets` entry — never a
 * hardcoded count (spec: "Set rows render from `match.sets.length`"). The
 * old inline "Cancel Match (cancels Game)" button does not move here in any
 * form; organiser actions land in a later ticket (TEM-184).
 */
export function GameScoreSection({
  phase,
  match,
  sides,
  viewerUserId,
  winningGameTeamId,
  matchResultConfirmation,
  scorePending,
  confirmPending,
  onScoreSet,
  onConfirm,
}: {
  phase: GameScoreSectionPhase;
  match: GameScoreSectionMatch;
  sides: GameScoreSectionSide[];
  viewerUserId: string;
  winningGameTeamId: string | null;
  matchResultConfirmation: GameScoreSectionConfirmation | null;
  scorePending: boolean;
  confirmPending: boolean;
  onScoreSet: (input: {
    setId: string;
    slot1GamesWon: number;
    slot2GamesWon: number;
  }) => void | Promise<unknown>;
  onConfirm: () => void;
}) {
  const [drafts, setDrafts] = React.useState<Record<string, SetDraft>>({});

  React.useEffect(() => {
    const next: Record<string, SetDraft> = {};
    for (const set of match.sets) {
      next[set.id] = { slot1: set.slot1GamesWon, slot2: set.slot2GamesWon };
    }
    setDrafts(next);
  }, [match.sets]);

  const isUpcoming = phase === "upcoming" || phase === "ongoing";
  const isFinal = phase === "final";
  const canEnter =
    phase === "needs_results" && match.canScoreSets && !scorePending;
  const hasResult = match.outcome.result !== "none";
  const names = nameByUserId(sides);

  async function saveSets() {
    const payloads = friendlyGameResultsSaveSets(
      match.sets.map((set) => ({
        id: set.id,
        slot1: drafts[set.id]?.slot1 ?? set.slot1GamesWon,
        slot2: drafts[set.id]?.slot2 ?? set.slot2GamesWon,
      })),
    );
    if (payloads.length === 0) {
      toast.error("Enter games won for both teams");
      return;
    }
    for (const payload of payloads) {
      await onScoreSet(payload);
    }
  }

  const canConfirm =
    matchResultConfirmation != null &&
    hasResult &&
    !isFinal &&
    matchResultConfirmation.requiredUserIds.includes(viewerUserId) &&
    !matchResultConfirmation.viewerHasConfirmed;

  return (
    <section
      data-slot="game-score-section"
      className="border-rule bg-paper overflow-hidden rounded-xl border"
    >
      <h2 className="text-muted-foreground px-[22px] pb-3 pt-[22px] text-sm">
        Score
      </h2>
      <div className="border-rule space-y-4 border-t px-[22px] pb-[22px] pt-[18px]">
        <div className="flex items-start gap-3">
          {sides.map((side, index) => (
            <Fragment key={side.sideIndex}>
              {index > 0 ? (
                <span
                  aria-hidden="true"
                  className="text-dim shrink-0 self-center px-1 text-xs font-semibold"
                >
                  vs
                </span>
              ) : null}
              <ScoreTeamHeader side={side} />
            </Fragment>
          ))}
        </div>

        <ul className="space-y-2.5">
          {match.sets.map((set, index) => {
            const draft = drafts[set.id] ?? {
              slot1: set.slot1GamesWon,
              slot2: set.slot2GamesWon,
            };
            const setLabel = `Set ${index + 1}`;
            const neverPlayed =
              set.slot1GamesWon == null && set.slot2GamesWon == null;

            return (
              <li
                key={set.id}
                className="flex flex-wrap items-center justify-between gap-3"
              >
                <span className="text-muted-foreground text-meta w-14 shrink-0">
                  {setLabel}
                </span>
                <div className="flex items-center gap-2">
                  {sides.map((side) => {
                    const boxLabel = `${formatGameSideLabel("friendly_game", side.sideIndex)}, ${setLabel}`;
                    if (isUpcoming) {
                      return (
                        <SetBox
                          key={side.sideIndex}
                          state="locked"
                          value={null}
                          label={boxLabel}
                        />
                      );
                    }
                    if (isFinal) {
                      if (neverPlayed) {
                        return (
                          <SetBox
                            key={side.sideIndex}
                            state="unplayed"
                            value={null}
                            label={boxLabel}
                          />
                        );
                      }
                      const isWinningSide =
                        side.gameTeamId != null &&
                        side.gameTeamId === winningGameTeamId;
                      return (
                        <SetBox
                          key={side.sideIndex}
                          state={isWinningSide ? "solid" : "outline"}
                          value={gamesWonForSide(set, side.sideIndex)}
                          label={boxLabel}
                        />
                      );
                    }
                    // needs_results
                    const value =
                      side.sideIndex === 1 ? draft.slot1 : draft.slot2;
                    if (!canEnter) {
                      return (
                        <SetBox
                          key={side.sideIndex}
                          state="readonly"
                          value={value}
                          label={boxLabel}
                        />
                      );
                    }
                    return (
                      <SetBox
                        key={side.sideIndex}
                        state="enterable"
                        value={value}
                        label={boxLabel}
                        disabled={scorePending}
                        onChange={(next) =>
                          setDrafts((current) => ({
                            ...current,
                            [set.id]: {
                              slot1: side.sideIndex === 1 ? next : draft.slot1,
                              slot2: side.sideIndex === 2 ? next : draft.slot2,
                            },
                          }))
                        }
                      />
                    );
                  })}
                </div>
              </li>
            );
          })}
        </ul>

        {canEnter ? (
          <Button
            type="button"
            size="sm"
            onClick={() => {
              void saveSets();
            }}
            disabled={scorePending}
          >
            Save score
          </Button>
        ) : null}

        {matchResultConfirmation && hasResult && phase === "needs_results" ? (
          <MatchResultConfirmations
            confirmation={matchResultConfirmation}
            viewerUserId={viewerUserId}
            names={names}
            canConfirm={canConfirm}
            confirmPending={confirmPending}
            onConfirm={onConfirm}
          />
        ) : null}

        <ScoreFooterNote
          phase={phase}
          confirmedAtLabel={
            matchResultConfirmation?.confirmedAt
              ? formatAbsoluteDay(matchResultConfirmation.confirmedAt)
              : null
          }
        />
      </div>
    </section>
  );
}
