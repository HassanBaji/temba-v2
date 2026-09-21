"use client";

import { ListRow, RowList } from "~/components/common/row-list";
import { ResultMark } from "~/components/temba/result-mark";
import { formatGameCardDay, formatGameStart } from "~/lib/format-game-start";
import {
  NOT_DRAWN_TRAILER,
  YOUR_ROUNDS_PREDRAW_CAPTION,
} from "~/lib/tournament-home";
import { YOUR_ROUNDS_HEADING } from "~/lib/tournament-pool-table";
import type { TournamentRoundScheduleEntry } from "~/lib/tournament-rounds";

export type TournamentYourRoundsResult = {
  matchId: string;
  roundNumber: number | null;
  startTime: Date | string | null;
  opponentName: string;
  viewerOutcome: "won" | "lost" | "draw" | null;
  scoreLabel: string | null;
  cancelled: boolean;
};

export function TournamentYourRounds(
  props:
    | {
        mode: "schedule";
        venueName: string | null;
        rounds: readonly TournamentRoundScheduleEntry[];
      }
    | {
        mode: "results";
        rounds: readonly TournamentYourRoundsResult[];
      },
) {
  if (props.rounds.length === 0) {
    return null;
  }

  return (
    <section>
      <div className="flex items-baseline gap-2.5 pb-2.5">
        <h2 className="font-expanded text-[19px] tracking-[-0.03em]">
          {YOUR_ROUNDS_HEADING}
        </h2>
        {props.mode === "schedule" ? (
          <p className="text-muted-foreground text-[13px]">
            {YOUR_ROUNDS_PREDRAW_CAPTION}
          </p>
        ) : null}
      </div>
      <RowList
        aria-label={YOUR_ROUNDS_HEADING}
        className="border-rule divide-rule rounded-[14px]"
      >
        {props.mode === "schedule"
          ? props.rounds.map((round) => (
              <ListRow
                key={round.roundNumber}
                className="min-h-11"
                leading={
                  <span
                    aria-hidden="true"
                    className="text-eyebrow text-muted-foreground inline-block w-[22px] tabular-nums"
                  >
                    {`R${round.roundNumber}`}
                  </span>
                }
                title={formatGameStart(round.start)}
                subtitle={props.venueName ?? undefined}
                trailing={
                  <span className="text-muted-foreground text-sm">
                    {NOT_DRAWN_TRAILER}
                  </span>
                }
              />
            ))
          : props.rounds.map((round) => (
              <ListRow
                key={round.matchId}
                className="min-h-11"
                icon={
                  round.viewerOutcome === "draw" ? undefined : (
                    <ResultMark
                      variant={resultMark(round)}
                      className="size-5"
                    />
                  )
                }
                title={round.opponentName}
                subtitle={roundSubtitle(round.roundNumber, round.startTime)}
                trailing={roundTrailing(round)}
              />
            ))}
      </RowList>
    </section>
  );
}

function resultMark(
  round: TournamentYourRoundsResult,
): "won" | "lost" | "not-played" {
  if (round.viewerOutcome === "won") {
    return "won";
  }
  if (round.viewerOutcome === "lost") {
    return "lost";
  }
  return "not-played";
}

function roundTrailing(round: TournamentYourRoundsResult) {
  if (round.cancelled) {
    return <span className="text-muted-foreground text-sm">Not played</span>;
  }
  if (round.scoreLabel) {
    return (
      <span className="font-expanded text-[16px] tabular-nums">
        {round.scoreLabel}
      </span>
    );
  }
  if (round.viewerOutcome === "draw") {
    return <span className="font-expanded text-[16px] tabular-nums">Draw</span>;
  }
  return <span className="text-sm font-semibold">Open</span>;
}

function roundSubtitle(
  roundNumber: number | null,
  startTime: Date | string | null,
) {
  const round = roundNumber != null ? `Round ${roundNumber}` : "Round";
  if (!startTime) {
    return round;
  }
  return `${round}, ${formatGameCardDay(startTime)}`;
}
