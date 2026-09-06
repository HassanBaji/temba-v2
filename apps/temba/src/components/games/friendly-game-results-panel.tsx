"use client";

import { Minus, Plus, Trophy } from "lucide-react";
import * as React from "react";
import { toast } from "sonner";

import { EmptyState } from "~/components/common/empty-state";
import type {
  GameResultsCourt,
  GameResultsMatch,
  GameResultsTeam,
} from "~/components/games/game-results-panel";
import {
  formatMatchSlotLabel,
  matchSlotOccupantLabel,
} from "~/components/games/game-side-label";
import { GameStatusBadge } from "~/components/temba/game-status-badge";
import { Button } from "~/components/ui/button";
import { Card } from "~/components/ui/card";
import { Field, FieldLabel } from "~/components/ui/field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import {
  FRIENDLY_SET_GAMES_MAX,
  FRIENDLY_SET_GAMES_MIN,
  friendlyGameResultsCanEnterSets,
  friendlyGameResultsIsPending,
  friendlyGameResultsSaveSets,
  friendlyGameResultsSetWinsDisplay,
  friendlyGameResultsWinnerLine,
  friendlySetGamesDisplay,
  stepFriendlySetGames,
} from "~/lib/friendly-game-results";
import { cn } from "~/lib/utils";

function optionalSelectId(value: string) {
  return value === "none" || value.length === 0 ? null : value;
}

function scoreTone(decided: boolean, won: boolean) {
  if (!decided) {
    return "text-foreground";
  }
  return won ? "text-success" : "text-muted-foreground";
}

function FriendlySetStepper({
  id,
  label,
  value,
  disabled,
  onStep,
}: {
  id: string;
  label: string;
  value: number | null;
  disabled: boolean;
  onStep: (delta: -1 | 1) => void;
}) {
  return (
    <div className="flex items-center gap-1">
      <Button
        type="button"
        variant="outline"
        size="icon-lg"
        aria-label={`Decrease ${label}`}
        disabled={disabled || value === FRIENDLY_SET_GAMES_MIN}
        onClick={() => onStep(-1)}
      >
        <Minus />
      </Button>
      <span
        id={id}
        className="w-8 text-center text-lg font-semibold tabular-nums"
      >
        {friendlySetGamesDisplay(value)}
      </span>
      <Button
        type="button"
        variant="outline"
        size="icon-lg"
        aria-label={`Increase ${label}`}
        disabled={disabled || value === FRIENDLY_SET_GAMES_MAX}
        onClick={() => onStep(1)}
      >
        <Plus />
      </Button>
    </div>
  );
}

export function FriendlyGameResultsPanel({
  matches,
  gameTeams,
  isOrganizer,
  cancelled,
  courts,
  scorePending,
  completePending,
  cancelPending,
  onScoreSet,
  onComplete,
  onUpdateCourt,
  onCancelMatch,
}: {
  matches: GameResultsMatch[];
  gameTeams: GameResultsTeam[];
  isOrganizer: boolean;
  cancelled: boolean;
  courts: GameResultsCourt[];
  scorePending: boolean;
  completePending: boolean;
  cancelPending: boolean;
  onScoreSet: (input: {
    matchId: string;
    setId: string;
    slot1GamesWon: number;
    slot2GamesWon: number;
  }) => void | Promise<unknown>;
  onComplete: (matchId: string) => void;
  onUpdateCourt: (input: { matchId: string; courtId: string | null }) => void;
  onCancelMatch: (matchId: string) => void;
}) {
  const [drafts, setDrafts] = React.useState<
    Record<string, { slot1: number | null; slot2: number | null }>
  >({});

  React.useEffect(() => {
    const next: Record<string, { slot1: number | null; slot2: number | null }> =
      {};
    for (const match of matches) {
      for (const set of match.sets) {
        next[set.id] = {
          slot1: set.slot1GamesWon,
          slot2: set.slot2GamesWon,
        };
      }
    }
    setDrafts(next);
  }, [matches]);

  if (matches.length === 0) {
    return <EmptyState icon={Trophy} title="No match results" />;
  }

  return (
    <div className="space-y-6">
      {cancelled ? (
        <p className="text-body text-muted-foreground">
          This Game was cancelled.
        </p>
      ) : null}
      {matches.map((match) => {
        const slot1Label = formatMatchSlotLabel("friendly_game", 1);
        const slot2Label = formatMatchSlotLabel("friendly_game", 2);
        const slot1Names = matchSlotOccupantLabel(
          gameTeams,
          match.slot1GameTeamId,
        );
        const slot2Names = matchSlotOccupantLabel(
          gameTeams,
          match.slot2GameTeamId,
        );
        const matchCancelled = match.status === "cancelled";
        const matchCompleted = match.status === "completed";
        const canEnter = friendlyGameResultsCanEnterSets({
          gameCancelled: cancelled,
          matchStatus: match.status,
          canScoreSets: match.canScoreSets,
        });
        const pending = friendlyGameResultsIsPending(match.sets);
        const setWins = friendlyGameResultsSetWinsDisplay(
          pending,
          match.outcome.slot1SetWins,
          match.outcome.slot2SetWins,
        );
        const winnerLine = friendlyGameResultsWinnerLine({
          matchStatus: match.status,
          outcomeResult: match.outcome.result,
          slot1Label,
          slot2Label,
        });
        const slot1Won = match.outcome.result === "slot1";
        const slot2Won = match.outcome.result === "slot2";
        const decided = matchCompleted && (slot1Won || slot2Won);
        const canAssignCourt = isOrganizer && !cancelled && !matchCancelled;

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
            await onScoreSet({
              matchId: match.id,
              setId: payload.setId,
              slot1GamesWon: payload.slot1GamesWon,
              slot2GamesWon: payload.slot2GamesWon,
            });
          }
        }

        return (
          <Card key={match.id} variant="outlined" className="gap-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="space-y-2">
                <div>
                  <p className="text-title font-medium">{slot1Label}</p>
                  {slot1Names ? (
                    <p className="text-meta text-muted-foreground">
                      {slot1Names}
                    </p>
                  ) : null}
                </div>
                <div>
                  <p className="text-title font-medium">{slot2Label}</p>
                  {slot2Names ? (
                    <p className="text-meta text-muted-foreground">
                      {slot2Names}
                    </p>
                  ) : null}
                </div>
              </div>
              {match.status ? <GameStatusBadge status={match.status} /> : null}
            </div>

            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <p className="text-h2 font-bold tabular-nums">
                <span className={scoreTone(decided, slot1Won)}>
                  {setWins.slot1}
                </span>
                <span className="text-muted-foreground mx-1 font-semibold">
                  –
                </span>
                <span className={scoreTone(decided, slot2Won)}>
                  {setWins.slot2}
                </span>
              </p>
              {winnerLine ? (
                <p
                  className={cn(
                    "text-body",
                    decided
                      ? "text-foreground font-medium"
                      : "text-muted-foreground",
                  )}
                >
                  {winnerLine}
                </p>
              ) : null}
            </div>

            {match.sets.length === 0 ? (
              <p className="text-muted-foreground text-sm">No Sets yet.</p>
            ) : (
              <ul className="space-y-3">
                {match.sets.map((set, index) => {
                  const draft = drafts[set.id] ?? {
                    slot1: set.slot1GamesWon,
                    slot2: set.slot2GamesWon,
                  };
                  const set1Won =
                    decided &&
                    draft.slot1 != null &&
                    draft.slot2 != null &&
                    draft.slot1 > draft.slot2;
                  const set2Won =
                    decided &&
                    draft.slot1 != null &&
                    draft.slot2 != null &&
                    draft.slot2 > draft.slot1;
                  const setLabel = `Set ${index + 1}`;
                  return (
                    <li
                      key={set.id}
                      className="flex flex-wrap items-center justify-between gap-3"
                    >
                      <p className="text-muted-foreground w-14 text-sm">
                        {setLabel}
                      </p>
                      {canEnter ? (
                        <div className="flex flex-wrap items-center gap-2">
                          <FriendlySetStepper
                            id={`friendly-set-${set.id}-slot1`}
                            label={`${slot1Label} ${setLabel}`}
                            value={draft.slot1}
                            disabled={scorePending}
                            onStep={(delta) =>
                              setDrafts((current) => ({
                                ...current,
                                [set.id]: {
                                  slot1: stepFriendlySetGames(
                                    draft.slot1,
                                    delta,
                                  ),
                                  slot2: draft.slot2,
                                },
                              }))
                            }
                          />
                          <span className="text-muted-foreground text-sm">
                            –
                          </span>
                          <FriendlySetStepper
                            id={`friendly-set-${set.id}-slot2`}
                            label={`${slot2Label} ${setLabel}`}
                            value={draft.slot2}
                            disabled={scorePending}
                            onStep={(delta) =>
                              setDrafts((current) => ({
                                ...current,
                                [set.id]: {
                                  slot1: draft.slot1,
                                  slot2: stepFriendlySetGames(
                                    draft.slot2,
                                    delta,
                                  ),
                                },
                              }))
                            }
                          />
                        </div>
                      ) : (
                        <p className="text-lg font-semibold tabular-nums">
                          <span className={scoreTone(decided, set1Won)}>
                            {friendlySetGamesDisplay(set.slot1GamesWon)}
                          </span>
                          <span className="text-muted-foreground mx-2 font-semibold">
                            –
                          </span>
                          <span className={scoreTone(decided, set2Won)}>
                            {friendlySetGamesDisplay(set.slot2GamesWon)}
                          </span>
                        </p>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}

            {canEnter ? (
              <Button
                type="button"
                onClick={() => {
                  void saveSets();
                }}
                disabled={scorePending}
              >
                Save
              </Button>
            ) : null}

            {(!match.bothSidesComplete || !match.bothSlotsFilled) &&
            !matchCompleted &&
            !matchCancelled &&
            !cancelled ? (
              <p className="text-muted-foreground text-sm">
                Scoring opens once both teams are full.
              </p>
            ) : null}

            {match.canComplete ? (
              <Button
                type="button"
                onClick={() => onComplete(match.id)}
                disabled={completePending}
              >
                Complete Match
              </Button>
            ) : null}

            {canAssignCourt ? (
              <Field>
                <FieldLabel htmlFor={`friendly-match-${match.id}-court`}>
                  Court
                </FieldLabel>
                <Select
                  value={match.courtId ?? "none"}
                  onValueChange={(value) =>
                    onUpdateCourt({
                      matchId: match.id,
                      courtId: optionalSelectId(value),
                    })
                  }
                >
                  <SelectTrigger id={`friendly-match-${match.id}-court`}>
                    <SelectValue placeholder="Court" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No Court</SelectItem>
                    {courts.map((court) => (
                      <SelectItem key={court.id} value={court.id}>
                        {court.venueName}: {court.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            ) : null}

            {isOrganizer && !cancelled && !matchCancelled ? (
              <Button
                variant="outline"
                onClick={() => onCancelMatch(match.id)}
                disabled={cancelPending}
              >
                Cancel Match (cancels Game)
              </Button>
            ) : null}
          </Card>
        );
      })}
    </div>
  );
}
