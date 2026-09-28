"use client";

import { StepperField } from "~/components/games/stepper-field";
import { Badge } from "~/components/ui/badge";
import { sizeTournamentRounds } from "~/lib/tournament-schedule";
import {
  formatRoundMatchesPerTeam,
  resolveRoundCount,
  ROUND_MEETS_COPY,
  roundCountRange,
  ROUNDS_LABEL,
  SUGGESTED_ROUNDS_TAG,
  suggestedRoundsResetLabel,
} from "~/lib/tournament-sizing";

export function RoundCountField({
  id,
  poolSizes,
  roundCount,
  onRoundCount,
  error,
  labelClassName,
}: {
  id: string;
  poolSizes: readonly number[];
  roundCount: number | null;
  onRoundCount: (roundCount: number | null) => void;
  error?: string;
  labelClassName?: string;
}) {
  const range = roundCountRange(poolSizes);
  const value = resolveRoundCount(poolSizes, roundCount);
  const rounds = sizeTournamentRounds(poolSizes, value);
  const onSuggestion = value === range.suggested;

  return (
    <StepperField
      id={id}
      label={ROUNDS_LABEL}
      labelClassName={labelClassName}
      value={value}
      unit={value === 1 ? "Round" : "Rounds"}
      min={range.min}
      max={range.max}
      step={1}
      onChange={(next) => {
        onRoundCount(next === range.suggested ? null : next);
      }}
      decreaseLabel="Fewer Rounds"
      increaseLabel="More Rounds"
      error={error}
      description={
        <div className="flex flex-col gap-1">
          {onSuggestion ? (
            <Badge variant="outline">{SUGGESTED_ROUNDS_TAG}</Badge>
          ) : (
            <button
              type="button"
              className="text-foreground focus-visible:ring-ring/50 inline-flex min-h-11 items-center self-start text-[13px] underline underline-offset-4 outline-none focus-visible:ring-[3px]"
              onClick={() => {
                onRoundCount(null);
              }}
            >
              {suggestedRoundsResetLabel(range.suggested)}
            </button>
          )}
          <p className="text-muted-foreground text-[13px]">
            {formatRoundMatchesPerTeam(rounds)}
          </p>
          <p className="text-muted-foreground text-[13px]">
            {ROUND_MEETS_COPY[rounds.meets]}
          </p>
        </div>
      }
    />
  );
}
