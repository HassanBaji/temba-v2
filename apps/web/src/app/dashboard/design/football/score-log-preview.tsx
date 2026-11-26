"use client";

import {
  bibNames,
  type Bibs,
  type BoardPlayer,
} from "@repo/domain/football-board";
import {
  logGoal,
  logOwnGoal,
  logUnknownGoal,
  logWarning,
  type MatchLogLine,
} from "@repo/domain/football-match-log";
import * as React from "react";

import {
  MatchLogList,
  WhatHappened,
} from "~/components/games/football-log-entry";
import {
  LogLineSheet,
  RedCardSheet,
} from "~/components/games/football-log-sheets";
import { FootballMatchLogCard } from "~/components/games/football-match-timeline";
import { FootballScoreCard } from "~/components/games/football-score-card";
import { useMatchLogEditor } from "~/components/games/use-match-log-editor";

const BIBS: Bibs = { slot1: "black", slot2: "white" };
const KICKOFF = new Date("2026-11-20T17:00:00Z");

function wholeGame(players: readonly BoardPlayer[]): MatchLogLine[] {
  const by = (name: string) => players.find((player) => player.name === name)!;
  const at = (minute: number, id: string) => ({
    id,
    at: new Date(KICKOFF.getTime() + minute * 60_000),
    kickoff: KICKOFF,
  });
  let lines: MatchLogLine[] = [];
  lines = logGoal(lines, by("Sofia Lopez"), at(6, "a"));
  lines = logWarning(lines, by("Hassan Ali"), at(11, "b"));
  lines = logGoal(lines, by("Khalid Hamad"), at(19, "c"));
  lines = logOwnGoal(lines, by("Ali Rahman"), at(24, "d"));
  lines = logUnknownGoal(lines, 2, at(31, "e"));
  lines = logWarning(lines, by("Hassan Ali"), at(38, "f"));
  lines = logGoal(lines, by("You Player"), at(47, "g"));
  return lines;
}

function EntryPreview({ players }: { players: BoardPlayer[] }) {
  const names = bibNames(BIBS, "en");
  const editor = useMatchLogEditor({
    kickoff: KICKOFF,
    end: new Date(KICKOFF.getTime() + 60 * 60_000),
  });
  const [redCardFor, setRedCardFor] = React.useState<BoardPlayer | null>(null);
  const [openLineId, setOpenLineId] = React.useState<string | null>(null);
  const start = editor.start;
  const lines = editor.lines;
  React.useEffect(() => {
    if (!lines) {
      start(wholeGame(players));
    }
  }, [start, players, lines]);
  if (!editor.lines) {
    return null;
  }
  return (
    <div className="max-w-[390px] space-y-5">
      <WhatHappened
        players={players}
        names={names}
        editor={editor}
        onRedCard={setRedCardFor}
      />
      <MatchLogList
        players={players}
        names={names}
        editor={editor}
        onOpenLine={setOpenLineId}
      />
      <RedCardSheet
        player={redCardFor}
        names={names}
        onCancel={() => setRedCardFor(null)}
        onGive={(reason) => {
          if (redCardFor) {
            editor.giveRedCard(redCardFor, reason);
          }
          setRedCardFor(null);
        }}
      />
      <LogLineSheet
        line={editor.lines.find((line) => line.id === openLineId) ?? null}
        players={players}
        names={names}
        editor={editor}
        onClose={() => setOpenLineId(null)}
      />
    </div>
  );
}

/** Fixture-fed states of the football Match log, for the design preview. */
export function ScoreLogPreview({
  players,
  Block,
}: {
  players: BoardPlayer[];
  Block: (props: {
    title: string;
    children: React.ReactNode;
  }) => React.ReactNode;
}) {
  const names = bibNames(BIBS, "en");
  const [log] = React.useState(() => wholeGame(players));
  const goals = new Map<string, number>();
  for (const line of log) {
    if (line.kind === "goal" && line.userId) {
      goals.set(line.userId, (goals.get(line.userId) ?? 0) + 1);
    }
  }
  const scored = players.map((player) => ({
    ...player,
    goals: goals.get(player.userId) ?? 0,
  }));
  return (
    <>
      <Block title="F6 score log entry">
        <EntryPreview players={players} />
      </Block>
      <Block title="F7 score in, with its log">
        <div className="max-w-[390px]">
          <FootballScoreCard
            bibs={BIBS}
            names={names}
            players={scored}
            match={{
              status: "pending",
              score: { slot1: 3, slot2: 2 },
              confirmed: { slot1: true, slot2: false },
              enteredByName: "You Player",
              log,
            }}
            canEnterScore={false}
            canConfirm
            canConfirmAsOrganizer={false}
            confirmPending={false}
            scoreHref="#"
            onConfirm={() => undefined}
          />
        </div>
      </Block>
      <Block title="F8 finished game log">
        <div className="max-w-[390px]">
          <FootballMatchLogCard
            lines={log}
            players={scored}
            names={names}
            confirmedByName="Faisal Ahmed"
          />
        </div>
      </Block>
    </>
  );
}
