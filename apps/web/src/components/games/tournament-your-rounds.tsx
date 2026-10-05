"use client";

import { ListRow, RowList } from "~/components/common/row-list";
import { ResultMark } from "~/components/temba/result-mark";
import { formatGameStart } from "@repo/domain/format-game-start";
import { resultMarkVariant } from "@repo/domain/result-mark";
import {
  matchTrailing,
  viewerRoundSubtitle,
} from "@repo/domain/tournament-details";
import {
  NOT_DRAWN_TRAILER,
  YOUR_ROUNDS_PREDRAW_CAPTION,
} from "@repo/domain/tournament-home";
import { YOUR_ROUNDS_HEADING } from "@repo/domain/tournament-pool-table";
import type { TournamentRoundScheduleEntry } from "@repo/domain/tournament-rounds";

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
        <h2 className="font-expanded text-title tracking-[-0.03em]">
          {YOUR_ROUNDS_HEADING}
        </h2>
        {props.mode === "schedule" ? (
          <p className="text-muted-foreground text-meta">
            {YOUR_ROUNDS_PREDRAW_CAPTION}
          </p>
        ) : null}
      </div>
      <RowList
        aria-label={YOUR_ROUNDS_HEADING}
        className="border-rule divide-rule rounded-card"
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
                  <span className="text-muted-foreground text-meta">
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
                  <ResultMark
                    variant={resultMarkVariant(round.viewerOutcome)}
                    className="size-5"
                  />
                }
                title={round.opponentName}
                subtitle={viewerRoundSubtitle(
                  round.roundNumber,
                  round.startTime,
                )}
                trailing={roundTrailing(round)}
              />
            ))}
      </RowList>
    </section>
  );
}

function roundTrailing(round: TournamentYourRoundsResult) {
  const trailing = matchTrailing({
    cancelled: round.cancelled,
    scoreLabel: round.scoreLabel,
    viewerOutcome: round.viewerOutcome,
  });
  if (trailing.kind === "not_played") {
    return (
      <span className="text-muted-foreground text-meta">{trailing.label}</span>
    );
  }
  if (trailing.kind === "score" || trailing.kind === "draw") {
    return (
      <span className="font-expanded text-[16px] tabular-nums">
        {trailing.label}
      </span>
    );
  }
  return <span className="text-body font-semibold">{trailing.label}</span>;
}
