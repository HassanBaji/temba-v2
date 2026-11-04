"use client";

import { Lock } from "lucide-react";
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
import {
  scoreDeciderNote,
  scoreLockedLine,
  scoreSetsMeta,
  scoreTeamFirstNames,
} from "@repo/domain/friendly-game-court";
import { setLabel } from "@repo/domain/game-copy";
import {
  ORGANIZER_CONFIRM_NOTE,
  SCORE_INCOMPLETE_MESSAGE,
  scoreCanConfirm,
  scoreCanEnter,
  scoreConfirmationRows,
  scoreFooterNote,
  scoreGamesWonForSide,
  scoreNameByUserId,
  scoreOrganizerCanConfirm,
  scoreOrganizerWaitingLines,
  scoreSetBoxAccessibleLabel,
  scoreSetBoxState,
  scoreSetNeverPlayed,
  scoreShowsConfirmations,
  scorePhaseFlags,
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

/**
 * One 56×48 set box. Hatch always means "unentered" or "unplayed" here —
 * never anything else (spec: "Hatch in this section only ever means
 * 'unentered set' or 'unplayed set'"). Five visual states:
 * - `locked`: Upcoming/ongoing — hatched, `aria-hidden`, no digit.
 * - `unplayed`: Final, but this Set never happened — hatched, `aria-hidden`.
 * - `enterable`: Needs a score, viewer may write — a plain `<input>` with a
 *   hairline while empty and an ink outline once it holds a number.
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
        className="hatch inline-block h-12 w-14 shrink-0 rounded-lg"
      />
    );
  }

  if (state === "solid") {
    return (
      <div className="bg-ink text-paper flex h-12 w-14 shrink-0 items-center justify-center rounded-lg text-xl font-bold tabular-nums">
        <span className="sr-only">
          {scoreSetBoxAccessibleLabel(state, label, value)}
        </span>
        <span aria-hidden="true">{value}</span>
      </div>
    );
  }

  if (state === "outline") {
    return (
      <div className="border-ink bg-paper text-ink flex h-12 w-14 shrink-0 items-center justify-center rounded-lg border-[1.5px] text-base font-semibold tabular-nums">
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
        className="hatch text-ink flex h-12 w-14 shrink-0 items-center justify-center rounded-lg text-xl font-bold tabular-nums"
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
        "h-12 w-14 shrink-0 rounded-lg p-0 text-center text-xl font-bold tabular-nums",
        value == null ? "border-rule" : "border-ink border-[1.5px]",
        "[appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none",
      )}
    />
  );
}

function ScoreFooterNote({
  phase,
  confirmedAtLabel,
  confirmedByOrganizer,
}: {
  phase: GameScoreSectionPhase;
  confirmedAtLabel: string | null;
  confirmedByOrganizer: boolean;
}) {
  const { isFinal } = scorePhaseFlags(phase);
  const copy = scoreFooterNote(phase, confirmedAtLabel, confirmedByOrganizer);

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
  organizerCanConfirm,
  confirmPending,
  onConfirm,
}: {
  confirmation: GameScoreSectionConfirmation;
  viewerUserId: string;
  names: ReadonlyMap<string, string>;
  canConfirm: boolean;
  organizerCanConfirm: boolean;
  confirmPending: boolean;
  onConfirm: () => void;
}) {
  const rows = scoreConfirmationRows(confirmation, viewerUserId, names);
  const waitingLines = scoreOrganizerWaitingLines(confirmation);

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
      {waitingLines.map((line) => (
        <p key={line} className="text-muted-foreground text-meta">
          {line}
        </p>
      ))}
      {organizerCanConfirm ? (
        <div className="space-y-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onConfirm}
            disabled={confirmPending}
          >
            Confirm score
          </Button>
          <p className="text-muted-foreground text-meta">
            {ORGANIZER_CONFIRM_NOTE}
          </p>
        </div>
      ) : canConfirm ? (
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

/** Before the Game: one row that says when the score opens. */
function LockedScore({ courtFull }: { courtFull: boolean }) {
  return (
    <section
      data-slot="game-score-section"
      className="border-rule bg-paper flex items-center gap-3.5 rounded-xl border px-[18px] py-4"
    >
      <span className="bg-muted flex size-10 shrink-0 items-center justify-center rounded-[10px]">
        <Lock
          aria-hidden="true"
          className="text-muted-foreground size-[17px]"
        />
      </span>
      <div className="min-w-0 flex-1">
        <h2 className="text-body font-semibold">Score</h2>
        <p className="text-muted-foreground text-meta">
          {scoreLockedLine(courtFull)}
        </p>
      </div>
      <div aria-hidden="true" className="flex shrink-0 gap-1">
        {[0, 1, 2].map((index) => (
          <span key={index} className="hatch h-[22px] w-3.5 rounded-[3px]" />
        ))}
      </div>
    </section>
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
  isOrganizer,
  courtFull,
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
  isOrganizer: boolean;
  courtFull: boolean;
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

  if (scorePhaseFlags(phase).isUpcoming) {
    return <LockedScore courtFull={courtFull} />;
  }

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
  const organizerCanConfirm = scoreOrganizerCanConfirm({
    confirmation: matchResultConfirmation,
    hasResult,
    phase,
    isOrganizer,
  });

  const deciderNote = canEnter ? scoreDeciderNote(match.sets.length) : null;

  function box(
    set: GameScoreSectionMatch["sets"][number],
    index: number,
    side: GameScoreSectionSide,
  ) {
    const draft = drafts[set.id] ?? {
      slot1: set.slot1GamesWon,
      slot2: set.slot2GamesWon,
    };
    const setName = setLabel(index);
    const boxLabel = `${formatGameSideLabel("friendly_game", side.sideIndex)}, ${setName}`;
    const state = scoreSetBoxState({
      phase,
      neverPlayed: scoreSetNeverPlayed(set),
      canEnter,
      isWinningSide:
        side.gameTeamId != null && side.gameTeamId === winningGameTeamId,
    });
    if (state === "locked" || state === "unplayed") {
      return (
        <SetBox key={set.id} state={state} value={null} label={boxLabel} />
      );
    }
    if (state === "solid" || state === "outline") {
      return (
        <SetBox
          key={set.id}
          state={state}
          value={scoreGamesWonForSide(set, side.sideIndex)}
          label={boxLabel}
        />
      );
    }
    const value = side.sideIndex === 1 ? draft.slot1 : draft.slot2;
    if (state === "readonly") {
      return (
        <SetBox key={set.id} state="readonly" value={value} label={boxLabel} />
      );
    }
    return (
      <SetBox
        key={set.id}
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
  }

  return (
    <section
      data-slot="game-score-section"
      className="border-rule bg-paper overflow-hidden rounded-xl border"
    >
      <div className="flex items-baseline justify-between gap-3 px-[18px] py-3.5">
        <h2 className="text-base font-semibold">Score</h2>
        <p className="text-muted-foreground text-meta">
          {scoreSetsMeta(match.sets.length)}
        </p>
      </div>
      <div className="space-y-2.5 px-[18px] pb-[18px]">
        <div aria-hidden="true" className="flex gap-2">
          <span className="flex-1" />
          {match.sets.map((set, index) => (
            <span
              key={set.id}
              className="text-muted-foreground w-14 text-center text-[11px] uppercase tracking-[0.06em]"
            >
              {setLabel(index)}
            </span>
          ))}
        </div>

        {sides.map((side) => (
          <div key={side.sideIndex} className="flex items-center gap-2">
            <div className="min-w-0 flex-1">
              <p className="text-muted-foreground text-[11px] font-semibold uppercase tracking-[0.08em]">
                {formatGameSideLabel("friendly_game", side.sideIndex)}
              </p>
              <p className="truncate text-sm font-medium">
                {scoreTeamFirstNames(side)}
              </p>
            </div>
            {match.sets.map((set, index) => box(set, index, side))}
          </div>
        ))}

        {canEnter ? (
          <div className="flex items-center justify-between gap-3 pt-1.5">
            <p className="text-muted-foreground text-meta">{deciderNote}</p>
            <Button
              type="button"
              size="sm"
              className="shrink-0"
              onClick={() => {
                void saveSets();
              }}
              pending={scorePending}
              pendingLabel="Saving…"
            >
              Save score
            </Button>
          </div>
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
            organizerCanConfirm={organizerCanConfirm}
            confirmPending={confirmPending}
            onConfirm={onConfirm}
          />
        ) : null}

        {canEnter ? null : (
          <ScoreFooterNote
            phase={phase}
            confirmedAtLabel={
              matchResultConfirmation?.confirmedAt
                ? formatAbsoluteDay(matchResultConfirmation.confirmedAt)
                : null
            }
            confirmedByOrganizer={
              matchResultConfirmation?.confirmedByOrganizer ?? false
            }
          />
        )}
      </div>
    </section>
  );
}
