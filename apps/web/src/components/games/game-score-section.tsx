"use client";

import { Fragment } from "react";
import * as React from "react";
import { toast } from "sonner";

import { formatGameSideLabel } from "@repo/domain/game-side-label";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { formatAbsoluteDay } from "@repo/domain/format-game-start";
import {
  FRIENDLY_SET_GAMES_MAX,
  FRIENDLY_SET_GAMES_MIN,
  clampFriendlySetGames,
  friendlyGameResultsSaveSets,
} from "@repo/domain/friendly-game-results";
import { setLabel } from "@repo/domain/game-copy";
import {
  SCORE_INCOMPLETE_MESSAGE,
  scoreCanConfirm,
  scoreCanEnter,
  scoreConfirmationRows,
  scoreFooterNote,
  scoreGamesWonForSide,
  scoreNameByUserId,
  scoreSetBoxAccessibleLabel,
  scoreSetBoxState,
  scoreSetNeverPlayed,
  scoreShowsConfirmations,
  scorePhaseFlags,
  scoreTeamNamesLabel,
  type FriendlyScorePhase,
  type SetBoxState,
} from "@repo/domain/friendly-game-score";
import { cn } from "~/lib/utils";
import { type RouterOutputs } from "~/trpc/react";

type GameScoreSectionSide = RouterOutputs["games"]["byId"]["sides"][number];
type GameScoreSectionMatch = RouterOutputs["games"]["byId"]["matches"][number];
type GameScoreSectionConfirmation = NonNullable<
  RouterOutputs["games"]["byId"]["matchResultConfirmation"]
>;

export type GameScoreSectionPhase = FriendlyScorePhase;

type SetDraft = { slot1: number | null; slot2: number | null };

function ScoreTeamHeader({ side }: { side: GameScoreSectionSide }) {
  return (
    <div className="min-w-0 flex-1">
      <p className="text-eyebrow text-muted-foreground font-medium uppercase tracking-[0.06em]">
        {formatGameSideLabel("friendly_game", side.sideIndex)}
      </p>
      <p className="text-meta mt-0.5 truncate font-medium">
        {scoreTeamNamesLabel(side)}
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
  saving,
  onChange,
}: {
  state: SetBoxState;
  value: number | null;
  label: string;
  saving?: boolean;
  onChange?: (value: number | null) => void;
}) {
  if (state === "locked" || state === "unplayed") {
    return (
      <span
        aria-hidden="true"
        className="hatch rounded-xs inline-block h-10 w-11 shrink-0"
      />
    );
  }

  if (state === "solid") {
    return (
      <div className="bg-ink text-paper rounded-xs flex h-10 w-11 shrink-0 items-center justify-center text-base font-semibold tabular-nums">
        <span className="sr-only">
          {scoreSetBoxAccessibleLabel(state, label, value)}
        </span>
        <span aria-hidden="true">{value}</span>
      </div>
    );
  }

  if (state === "outline") {
    return (
      <div className="border-ink bg-paper text-ink rounded-xs flex h-10 w-11 shrink-0 items-center justify-center border-[1.5px] text-base font-semibold tabular-nums">
        <span className="sr-only">
          {scoreSetBoxAccessibleLabel(state, label, value)}
        </span>
        <span aria-hidden="true">{value}</span>
      </div>
    );
  }

  if (state === "readonly") {
    return (
      <div
        className="hatch text-ink rounded-xs flex h-10 w-11 shrink-0 items-center justify-center text-base font-semibold tabular-nums"
        aria-label={scoreSetBoxAccessibleLabel(state, label, value)}
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
      readOnly={saving}
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
        "hatch rounded-xs h-10 w-11 shrink-0 p-0 text-center text-base font-semibold tabular-nums",
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
  const { isFinal } = scorePhaseFlags(phase);
  const copy = scoreFooterNote(phase, confirmedAtLabel);

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
  names: ReadonlyMap<string, string>;
  canConfirm: boolean;
  confirmPending: boolean;
  onConfirm: () => void;
}) {
  const rows = scoreConfirmationRows(confirmation, viewerUserId, names);

  return (
    <div className="border-rule space-y-2.5 border-t pt-4">
      <p className="text-meta font-medium">Confirmations</p>
      <ul className="space-y-1.5">
        {rows.map((row) => (
          <li
            key={row.userId}
            className="text-meta flex items-center justify-between gap-3"
          >
            <span className="min-w-0 truncate">{row.label}</span>
            <span
              className={cn(
                "shrink-0",
                row.confirmed
                  ? "text-ink font-medium"
                  : "text-muted-foreground",
              )}
            >
              {row.status}
            </span>
          </li>
        ))}
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

  const canEnter = scoreCanEnter(phase, match.canScoreSets);
  const hasResult = match.outcome.result !== "none";
  const names = scoreNameByUserId(sides);

  async function saveSets() {
    const payloads = friendlyGameResultsSaveSets(
      match.sets.map((set) => ({
        id: set.id,
        slot1: drafts[set.id]?.slot1 ?? set.slot1GamesWon,
        slot2: drafts[set.id]?.slot2 ?? set.slot2GamesWon,
      })),
    );
    if (payloads.length === 0) {
      toast.error(SCORE_INCOMPLETE_MESSAGE);
      return;
    }
    try {
      for (const payload of payloads) {
        await onScoreSet(payload);
      }
    } catch {
      // The score mutation reports its own failure; stop at the first one.
    }
  }

  const canConfirm = scoreCanConfirm({
    confirmation: matchResultConfirmation,
    hasResult,
    phase,
    viewerUserId,
  });

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
                  className="text-muted-foreground shrink-0 self-center px-1 text-xs font-semibold"
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
            const setName = setLabel(index);
            const neverPlayed = scoreSetNeverPlayed(set);

            return (
              <li
                key={set.id}
                className="flex flex-wrap items-center justify-between gap-3"
              >
                <span className="text-muted-foreground text-meta w-14 shrink-0">
                  {setName}
                </span>
                <div className="flex items-center gap-2">
                  {sides.map((side) => {
                    const boxLabel = `${formatGameSideLabel("friendly_game", side.sideIndex)}, ${setName}`;
                    const state = scoreSetBoxState({
                      phase,
                      neverPlayed,
                      canEnter,
                      isWinningSide:
                        side.gameTeamId != null &&
                        side.gameTeamId === winningGameTeamId,
                    });
                    if (state === "locked" || state === "unplayed") {
                      return (
                        <SetBox
                          key={side.sideIndex}
                          state={state}
                          value={null}
                          label={boxLabel}
                        />
                      );
                    }
                    if (state === "solid" || state === "outline") {
                      return (
                        <SetBox
                          key={side.sideIndex}
                          state={state}
                          value={scoreGamesWonForSide(set, side.sideIndex)}
                          label={boxLabel}
                        />
                      );
                    }
                    const value =
                      side.sideIndex === 1 ? draft.slot1 : draft.slot2;
                    if (state === "readonly") {
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
                        saving={scorePending}
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
            pending={scorePending}
            pendingLabel="Saving…"
          >
            Save score
          </Button>
        ) : null}

        {matchResultConfirmation &&
        scoreShowsConfirmations({
          confirmation: matchResultConfirmation,
          hasResult,
          phase,
        }) ? (
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
