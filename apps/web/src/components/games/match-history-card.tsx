"use client";

import { UserAvatar } from "~/components/common/user-avatar";
import { InkWonMark } from "~/components/games/played/played-hero";
import { SummaryCardShell } from "~/components/games/summary-card-shell";
import { ResultMark } from "~/components/temba/result-mark";
import { ScoreText } from "~/components/temba/score-text";
import {
  matchHistoryCardModel,
  PENDING_SET_COLUMNS,
  type HistoryTeamRow,
} from "@repo/domain/match-history-card";
import { resultMarkLabel } from "@repo/domain/result-mark";
import { useLocale, useMessages } from "~/components/locale-provider";
import { cn } from "~/lib/utils";
import { type RouterOutputs } from "~/trpc/react";

type MatchHistoryRow = RouterOutputs["games"]["listMyMatchHistory"][number];

const CARD_INSET = "px-4";

const AVATAR_TILE =
  "-ms-2 size-[30px] shrink-0 rounded-full border-2 border-paper first:ms-0";

function AvatarStack({ team }: { team: HistoryTeamRow }) {
  if (team.avatars.length === 0) {
    return (
      <span aria-hidden="true" className="flex shrink-0 ps-2">
        <span className={cn("hatch", AVATAR_TILE)} />
      </span>
    );
  }

  return (
    <span className="flex shrink-0 ps-2">
      {team.avatars.map((member) => (
        <UserAvatar
          key={member.id}
          name={member.name}
          image={member.image}
          className={cn(
            AVATAR_TILE,
            "[&_[data-slot=avatar-fallback]]:bg-wash [&_[data-slot=avatar-fallback]]:text-ink [&_[data-slot=avatar-fallback]]:text-[9px] [&_[data-slot=avatar-fallback]]:font-semibold",
          )}
        />
      ))}
    </span>
  );
}

function TeamScores({ team }: { team: HistoryTeamRow }) {
  if (!team.scores) {
    return (
      <span aria-hidden="true" className="flex shrink-0 gap-1.5">
        {Array.from({ length: PENDING_SET_COLUMNS }, (_, index) => (
          <span key={index} className="hatch h-[22px] w-[22px] rounded-md" />
        ))}
      </span>
    );
  }

  const sets = team.scores.length > 1;

  return (
    <span className="flex shrink-0 items-baseline gap-1.5">
      {team.scores.map((score, index) => (
        <span
          key={index}
          className={cn(
            "font-expanded min-w-[22px] text-end tabular-nums leading-none",
            sets ? "text-title" : "text-h2",
            score.lostSet ? "text-muted-foreground" : null,
          )}
        >
          {score.games}
        </span>
      ))}
    </span>
  );
}

function TeamRow({ team }: { team: HistoryTeamRow }) {
  return (
    <div className="border-rule flex items-center gap-3 border-t py-3 first:border-t-0">
      <AvatarStack team={team} />

      <span className="min-w-0 flex-1">
        <span
          className={cn(
            "text-body block truncate",
            team.side === "mine" ? "font-semibold" : null,
            team.lost ? "text-muted-foreground" : null,
          )}
        >
          {team.label}
        </span>
        <span className="text-muted-foreground text-eyebrow mt-px block">
          {team.note}
        </span>
      </span>

      <TeamScores team={team} />
    </div>
  );
}

export function MatchHistoryCard({ row }: { row: MatchHistoryRow }) {
  const locale = useLocale();
  const m = useMessages();
  const model = matchHistoryCardModel(row, locale);
  const won = model.outcome === "won";
  const outcomeLabel = resultMarkLabel(model.outcome, locale);

  return (
    <li data-slot="match-history-card">
      <SummaryCardShell
        emphasis={won}
        href={`/dashboard/games/${row.id}`}
        linkLabel={m.webGame.history.linkLabel(
          outcomeLabel,
          model.scoreLine,
          model.meta,
        )}
      >
        <div className="pointer-events-none relative z-10 flex min-w-0 flex-col">
          <div
            className={cn(
              "flex items-center gap-2.5 py-3",
              CARD_INSET,
              won ? "surface-focus" : "bg-wash text-ink",
            )}
          >
            {won ? (
              <InkWonMark className="size-4" />
            ) : (
              <ResultMark
                variant={model.outcome}
                decorative
                className="size-4"
              />
            )}
            <span className="text-body font-semibold">{outcomeLabel}</span>
            <ScoreText
              className={cn(
                "text-meta",
                won ? "text-dim" : "text-muted-foreground",
              )}
            >
              {model.scoreLine}
            </ScoreText>
            <span
              className={cn(
                "text-eyebrow ms-auto whitespace-nowrap",
                won ? "text-dim" : "text-muted-foreground",
              )}
            >
              {model.day}
            </span>
          </div>

          {model.sport || model.groupName ? (
            <div
              className={cn(
                "flex items-center justify-between gap-3 pt-2.5",
                CARD_INSET,
              )}
            >
              {model.sport ? (
                <span className="border-rule text-muted-foreground shrink-0 rounded-md border px-[7px] py-1 font-mono text-[10px] uppercase leading-none tracking-[0.08em]">
                  {model.sport}
                </span>
              ) : null}
              {model.groupName ? (
                <span className="text-muted-foreground ms-auto min-w-0 truncate font-mono text-[10px] uppercase tracking-[0.06em]">
                  {model.groupName}
                </span>
              ) : null}
            </div>
          ) : null}

          <div className={cn("flex flex-col pt-1", CARD_INSET)}>
            {model.teams.map((team) => (
              <TeamRow key={team.side} team={team} />
            ))}
          </div>

          <div
            className={cn(
              "border-rule text-muted-foreground text-eyebrow border-t pb-3 pt-2.5",
              CARD_INSET,
            )}
          >
            <span className="block truncate">{model.place}</span>
          </div>
        </div>
      </SummaryCardShell>
    </li>
  );
}
