"use client";

import { StepperField } from "~/components/games/stepper-field";
import { Badge } from "~/components/ui/badge";
import { sizeTournamentRounds } from "@repo/domain/tournament-schedule";
import {
  formatRoundMatchesPerTeam,
  resolveRoundCount,
  roundCountRange,
  roundMeetsCopy,
  suggestedRoundsResetLabel,
} from "@repo/domain/tournament-sizing";
import { useLocale, useMessages } from "~/components/locale-provider";

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
  const locale = useLocale();
  const m = useMessages();
  const value = resolveRoundCount(poolSizes, roundCount);
  if (value == null) {
    return null;
  }
  const range = roundCountRange(poolSizes);
  const rounds = sizeTournamentRounds(poolSizes, value);
  const onSuggestion = value === range.suggested;

  return (
    <StepperField
      id={id}
      label={m.tournament.sizing.roundsLabel}
      labelClassName={labelClassName}
      value={value}
      unit={m.webGame.overview.roundUnit(value)}
      min={range.min}
      max={range.max}
      step={1}
      onChange={(next) => {
        onRoundCount(next === range.suggested ? null : next);
      }}
      decreaseLabel={m.webGame.roundCount.fewer}
      increaseLabel={m.webGame.roundCount.more}
      error={error}
      description={
        <div className="flex flex-col gap-1">
          {onSuggestion ? (
            <Badge variant="outline">{m.tournament.sizing.suggestedTag}</Badge>
          ) : (
            <button
              type="button"
              className="text-foreground focus-visible:ring-ring/50 text-meta inline-flex min-h-11 items-center self-start underline underline-offset-4 outline-none focus-visible:ring-[3px]"
              onClick={() => {
                onRoundCount(null);
              }}
            >
              {suggestedRoundsResetLabel(range.suggested, locale)}
            </button>
          )}
          <p className="text-muted-foreground text-meta">
            {formatRoundMatchesPerTeam(rounds, locale)}
          </p>
          <p className="text-muted-foreground text-meta">
            {roundMeetsCopy(rounds.meets, locale)}
          </p>
        </div>
      }
    />
  );
}
