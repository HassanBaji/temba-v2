"use client";

import * as React from "react";

import { americanoPlayedSummary } from "@repo/domain/tournament-americano-view";

import { TournamentAmericanoHome } from "~/components/games/tournament-americano-home";
import { AmericanoPlayedCard } from "~/components/games/tournament-americano-played-card";

import { americanoPreviewBoard, americanoPreviewDetails } from "./fixtures";

const HOUR_MS = 60 * 60 * 1000;

function Column({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-3" data-preview-column={title}>
      <p className="text-muted-foreground text-meta font-mono uppercase">
        {title}
      </p>
      <div className="border-rule max-w-column overflow-hidden rounded-xl border p-4">
        {children}
      </div>
    </div>
  );
}

const noop = () => undefined;

export function AmericanoPreviewStates() {
  const [now] = React.useState(() => new Date());
  const later = new Date(now.getTime() + 2 * HOUR_MS);
  const started = new Date(now.getTime() - 75 * 60 * 1000);
  const earlier = new Date(now.getTime() - 26 * HOUR_MS);
  const common = {
    backHref: "/dashboard/design/americano",
    sharePending: false,
    leavePending: false,
    kickPending: false,
    onShare: noop,
    onLeaveGame: noop,
  };
  const finishedBoard = americanoPreviewBoard({
    isOrganizer: false,
    played: 7,
    liveRound: false,
    start: earlier,
  });
  const played = americanoPlayedSummary({
    players: finishedBoard.players,
    matches: finishedBoard.rounds.flatMap((round) =>
      round.matches.map((match) => ({
        ...match,
        roundNumber: round.roundNumber,
      })),
    ),
    standings: finishedBoard.standings,
    viewerGamePlayerId: finishedBoard.viewerGamePlayerId ?? "",
    roundCount: 7,
    matchMinutes: 30,
    finished: true,
  });
  const predrawBoard = {
    ...americanoPreviewBoard({
      isOrganizer: true,
      played: 0,
      liveRound: false,
      start: later,
    }),
    posted: false,
    rounds: [],
  };

  return (
    <div className="grid items-start gap-10 lg:grid-cols-2 xl:grid-cols-3">
      <Column title="2a organizer, all 16 in">
        <TournamentAmericanoHome
          {...common}
          data={americanoPreviewDetails({
            isOrganizer: true,
            taken: 16,
            drawn: false,
            start: later,
          })}
          preview={{ board: predrawBoard }}
        />
      </Column>
      <Column title="2b player, 11 of 16">
        <TournamentAmericanoHome
          {...common}
          data={americanoPreviewDetails({
            isOrganizer: false,
            taken: 12,
            drawn: false,
            start: later,
          })}
          preview={{ board: predrawBoard }}
        />
      </Column>
      <Column title="3a player, round 3 on court">
        <TournamentAmericanoHome
          {...common}
          data={americanoPreviewDetails({
            isOrganizer: false,
            taken: 16,
            drawn: true,
            start: started,
          })}
          preview={{
            board: americanoPreviewBoard({
              isOrganizer: false,
              played: 2,
              liveRound: true,
              start: started,
            }),
          }}
        />
      </Column>
      <Column title="2d organizer, round 1">
        <TournamentAmericanoHome
          {...common}
          data={americanoPreviewDetails({
            isOrganizer: true,
            taken: 16,
            drawn: true,
            start: started,
          })}
          preview={{
            board: americanoPreviewBoard({
              isOrganizer: true,
              played: 0,
              liveRound: true,
              start: started,
            }),
          }}
        />
      </Column>
      <Column title="4a player, finished">
        <TournamentAmericanoHome
          {...common}
          data={americanoPreviewDetails({
            isOrganizer: false,
            taken: 16,
            drawn: true,
            start: earlier,
          })}
          preview={{ board: finishedBoard }}
        />
      </Column>
      <Column title="4b played card">
        {played ? (
          <ul>
            <AmericanoPlayedCard
              game={{
                id: "americano-preview",
                name: "Sunday Social",
                windowStart: earlier,
                displayTime: earlier,
                groupName: "Tuesday Night Padel",
                venue: { name: "World Padel Academy Bahrain" },
                americano: played,
              }}
            />
          </ul>
        ) : null}
      </Column>
    </div>
  );
}
