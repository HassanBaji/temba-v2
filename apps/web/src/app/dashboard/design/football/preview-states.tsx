"use client";

import {
  bibNames,
  footballHeroLines,
  type Bibs,
  type BoardPlayer,
} from "@repo/domain/football-board";
import { createGamesHubFixtures } from "@repo/domain/games-hub-fixtures";
import type { HubGameFootball, HubGameRow } from "@repo/domain/hub-game-row";
import type { LevelBand } from "@repo/domain/level-bands";
import * as React from "react";

import { BibPicker } from "~/components/games/football-bibs";
import { FootballGameCard } from "~/components/games/football-game-card";
import { FootballGameHeroCard } from "~/components/games/football-game-hero";
import { FootballJoinDialog } from "~/components/games/football-join-dialog";
import { PoolGrid, SeatBar } from "~/components/games/football-pool-grid";
import { FootballScoreCard } from "~/components/games/football-score-card";
import { TeamColumns } from "~/components/games/football-team-columns";
import { Button } from "~/components/ui/button";

const ROSTER: [
  string,
  LevelBand,
  BoardPlayer["role"],
  BoardPlayer["position"],
][] = [
  ["Hassan Ali", "B3", "keeper", "mid"],
  ["Sofia Lopez", "C2", "outfield", "fwd"],
  ["Jonas Berg", "C1", "outfield", "def"],
  ["Ali Rahman", "C2", "outfield", "mid"],
  ["Yusuf Kamal", "B2", "outfield", "def"],
  ["Omar Malik", "C3", "outfield", "fwd"],
  ["Faisal Ahmed", "C1", "keeper", "mid"],
  ["Nasser Aziz", "C2", "outfield", "mid"],
  ["Tariq Saleh", "D1", "outfield", "def"],
  ["Khalid Hamad", "C1", "outfield", "fwd"],
];

function players(teams: boolean, goals = false): BoardPlayer[] {
  const you: BoardPlayer = {
    userId: "you",
    name: "You Player",
    image: null,
    role: "outfield",
    position: "mid",
    levelBand: "C1",
    sideIndex: teams ? 1 : null,
    goals: goals ? 2 : 0,
    isViewer: true,
  };
  return [
    you,
    ...ROSTER.map(
      ([name, levelBand, role, position], index): BoardPlayer => ({
        userId: `p${index}`,
        name,
        image: null,
        role,
        position,
        levelBand,
        sideIndex: teams ? (index % 2 === 0 ? 2 : 1) : null,
        goals: goals && index === 1 ? 1 : 0,
        isViewer: false,
      }),
    ),
  ];
}

const BIBS: Bibs = { slot1: "black", slot2: "white" };

function hubRow(
  now: Date,
  football: Partial<HubGameFootball>,
  row: Partial<HubGameRow> = {},
  teamsSet = false,
): HubGameRow {
  const base = createGamesHubFixtures(now).mixed.myGames[0]!;
  const members = (side: 1 | 2) =>
    players(true)
      .filter((player) => player.sideIndex === side)
      .map((player) => ({
        userId: player.userId,
        name: player.name,
        image: null,
        isViewer: player.isViewer,
      }));
  return {
    ...base,
    sport: "football",
    playersAllowed: 14,
    registeredUserCount: 11,
    registrationStatus: "open",
    canRegister: true,
    isRegistered: false,
    pricePerPlayerFils: 1500,
    ...row,
    football: {
      sideSize: 7,
      viewer: { sideIndex: null, role: null, position: null },
      score: null,
      matchId: null,
      matchStatus: null,
      needsViewerConfirmation: false,
      enteredByName: null,
      ...football,
      sides: teamsSet
        ? [
            { sideIndex: 1, bib: "black", members: members(1) },
            { sideIndex: 2, bib: "white", members: members(2) },
          ]
        : null,
    },
  };
}

function Block({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3">
      <h2 className="text-muted-foreground font-mono text-[11px] uppercase">
        {title}
      </h2>
      {children}
    </section>
  );
}

export function FootballPreviewStates() {
  const [now] = React.useState(() => new Date());
  const [bibs, setBibs] = React.useState<Bibs>(BIBS);
  const [joinOpen, setJoinOpen] = React.useState(false);
  const start = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000);
  const end = new Date(start.getTime() + 60 * 60 * 1000);
  const lines = (teamsSet: boolean) =>
    footballHeroLines(
      {
        windowStart: start,
        windowEnd: end,
        cancelledAt: null,
        sideSize: 7,
        venueName: "Karbabad Turf",
        pitchName: "Pitch 2",
        teamsSet,
        scored: false,
      },
      now,
    );
  const pool = players(false);
  const teams = players(true);
  const scored = players(true, true);
  const names = bibNames(BIBS);
  const playedRow = {
    windowStart: new Date(now.getTime() - 3 * 60 * 60 * 1000),
    windowEnd: new Date(now.getTime() - 2 * 60 * 60 * 1000),
    startTime: new Date(now.getTime() - 3 * 60 * 60 * 1000),
  };

  return (
    <div className="grid gap-10 lg:grid-cols-2">
      <Block title="F1 list cards">
        <ul className="flex flex-col gap-3">
          <FootballGameCard
            game={hubRow(
              now,
              {
                viewer: { sideIndex: 1, role: "outfield", position: "mid" },
                score: { slot1: 4, slot2: 3 },
                matchId: "m1",
                matchStatus: "pending",
                needsViewerConfirmation: true,
                enteredByName: "Hassan Ali",
              },
              playedRow,
              true,
            )}
            pending={false}
            onJoinWaitlist={() => undefined}
            onConfirm={() => undefined}
          />
          <FootballGameCard
            game={hubRow(now, {})}
            pending={false}
            onJoinWaitlist={() => undefined}
            onConfirm={() => undefined}
          />
          <FootballGameCard
            game={hubRow(
              now,
              { viewer: { sideIndex: 1, role: "outfield", position: "mid" } },
              {},
              true,
            )}
            pending={false}
            onJoinWaitlist={() => undefined}
            onConfirm={() => undefined}
          />
          <FootballGameCard
            game={hubRow(
              now,
              {},
              {
                registeredUserCount: 14,
                registrationStatus: "full",
                canRegister: false,
                canWaitlist: true,
              },
            )}
            pending={false}
            onJoinWaitlist={() => undefined}
            onConfirm={() => undefined}
          />
        </ul>
      </Block>

      <Block title="F2 pool">
        <FootballGameHeroCard tone="ink" lines={lines(false)}>
          <div className="border-dimrule border-t pt-4">
            <p className="text-dim text-meta">Players in</p>
            <p className="font-expanded text-display leading-none">
              {pool.length} <span className="text-dim text-body">of 14</span>
            </p>
            <div className="mt-3">
              <SeatBar seats={14} filled={pool.length} tone="ink" />
            </div>
          </div>
          <div className="mt-4 space-y-2">
            <Button
              size="lg"
              variant="inverse"
              className="w-full"
              onClick={() => setJoinOpen(true)}
            >
              Join, 1.500 BD
            </Button>
            <Button size="lg" variant="outline-inverse" className="w-full">
              Invite players
            </Button>
          </div>
        </FootballGameHeroCard>
        <PoolGrid players={pool} open={3} onOpenPlayer={() => undefined} />
      </Block>

      <Block title="F3 bibs">
        <BibPicker bibs={bibs} onChange={setBibs} />
      </Block>

      <Block title="F4 teams set">
        <FootballGameHeroCard tone="ink" lines={lines(true)}>
          <TeamColumns
            players={teams}
            bibs={BIBS}
            names={names}
            muted="text-dim"
            onOpenPlayer={() => undefined}
          />
        </FootballGameHeroCard>
        <FootballScoreCard
          bibs={BIBS}
          names={names}
          players={teams}
          match={null}
          canEnterScore={false}
          canConfirm={false}
          confirmPending={false}
          scoreHref="#"
          onConfirm={() => undefined}
        />
      </Block>

      <Block title="F5 score in">
        <FootballScoreCard
          bibs={{ slot1: "red", slot2: "sky" }}
          names={bibNames({ slot1: "red", slot2: "sky" })}
          players={scored}
          match={{
            status: "pending",
            score: { slot1: 4, slot2: 3 },
            confirmed: { slot1: false, slot2: true },
            enteredByName: "Faisal Ahmed",
          }}
          canEnterScore
          canConfirm
          confirmPending={false}
          scoreHref="#"
          onConfirm={() => undefined}
        />
      </Block>

      <FootballJoinDialog
        open={joinOpen}
        onOpenChange={setJoinOpen}
        mode="join"
        subtitle="Sat 18 Oct, Karbabad Turf, 7-a-side, 3 seats open"
        players={pool}
        viewer={{ role: null, position: null }}
        price="1.500 BD"
        teamsLine="Made by the organizer"
        pending={false}
        error={null}
        onSubmit={() => setJoinOpen(false)}
      />
    </div>
  );
}
