"use client";

import { ListRow, RowList } from "~/components/common/row-list";
import { PairLabel } from "~/components/temba/pair-label";
import { ResultMark } from "~/components/temba/result-mark";
import { ScoreText } from "~/components/temba/score-text";
import { useLocale, useMessages } from "~/components/locale-provider";
import { formatGameStart } from "@repo/domain/format-game-start";
import { resultMarkVariant } from "@repo/domain/result-mark";
import {
  matchTrailing,
  viewerRoundSubtitle,
} from "@repo/domain/tournament-details";
import type { TournamentRoundScheduleEntry } from "@repo/domain/tournament-rounds";
import type { Locale } from "@repo/i18n/locale";

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
  const m = useMessages();
  const locale = useLocale();
  if (props.rounds.length === 0) {
    return null;
  }

  return (
    <section>
      <div className="flex items-baseline gap-2.5 pb-2.5">
        <h2 className="font-expanded text-title tracking-[-0.03em]">
          {m.tournament.poolTable.yourRounds}
        </h2>
        {props.mode === "schedule" ? (
          <p className="text-muted-foreground text-meta">
            {m.tournament.home.yourRoundsPredrawCaption}
          </p>
        ) : null}
      </div>
      <RowList
        aria-label={m.tournament.poolTable.yourRounds}
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
                    {m.tournament.card.roundShort(round.roundNumber)}
                  </span>
                }
                title={formatGameStart(round.start, locale)}
                subtitle={props.venueName ?? undefined}
                trailing={
                  <span className="text-muted-foreground text-meta">
                    {m.tournament.home.notDrawn}
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
                title={<PairLabel label={round.opponentName} />}
                subtitle={viewerRoundSubtitle(
                  round.roundNumber,
                  round.startTime,
                  locale,
                )}
                trailing={roundTrailing(round, locale)}
              />
            ))}
      </RowList>
    </section>
  );
}

function roundTrailing(round: TournamentYourRoundsResult, locale: Locale) {
  const trailing = matchTrailing({
    cancelled: round.cancelled,
    scoreLabel: round.scoreLabel,
    viewerOutcome: round.viewerOutcome,
    locale,
  });
  if (trailing.kind === "not_played") {
    return (
      <span className="text-muted-foreground text-meta">{trailing.label}</span>
    );
  }
  if (trailing.kind === "score" || trailing.kind === "draw") {
    return (
      <ScoreText className="font-expanded text-[16px]">
        {trailing.label}
      </ScoreText>
    );
  }
  return <span className="text-body font-semibold">{trailing.label}</span>;
}
