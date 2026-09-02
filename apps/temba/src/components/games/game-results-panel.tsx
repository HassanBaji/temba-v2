"use client";

import { Trophy } from "lucide-react";
import * as React from "react";
import { toast } from "sonner";

import { EmptyState } from "~/components/common/empty-state";
import {
  formatMatchSlotLabel,
  gameTeamDisplayName,
  matchSlotOccupantLabel,
} from "~/components/games/game-side-label";
import { GameStatusBadge } from "~/components/temba/game-status-badge";
import { Button } from "~/components/ui/button";
import { Card } from "~/components/ui/card";
import { Field, FieldLabel } from "~/components/ui/field";
import { Input } from "~/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import { formatGameClock } from "~/lib/format-game-start";

export type GameResultsMatch = {
  id: string;
  startTime: Date | null;
  endTime: Date | null;
  durationInMinutes: number | null;
  status: string | null;
  courtId: string | null;
  courtName: string | null;
  slot1GameTeamId: string | null;
  slot2GameTeamId: string | null;
  bothSlotsFilled: boolean;
  bothSidesComplete: boolean;
  canScoreSets: boolean;
  canComplete: boolean;
  outcome: {
    result: string;
    slot1SetWins: number;
    slot2SetWins: number;
  };
  sets: {
    id: string;
    slot1GamesWon: number | null;
    slot2GamesWon: number | null;
  }[];
};

export type GameResultsTeam = {
  id: string;
  name: string | null;
  members: { name: string }[];
};

export type GameResultsCourt = {
  id: string;
  name: string;
  venueName: string;
};

function optionalSelectId(value: string) {
  return value === "none" || value.length === 0 ? null : value;
}

function gamesWonDisplay(value: number | null) {
  return value == null ? "—" : String(value);
}

function matchWindowLabel(match: GameResultsMatch) {
  if (match.startTime && match.endTime) {
    return `${formatGameClock(match.startTime)} – ${formatGameClock(match.endTime)}`;
  }
  if (match.startTime) {
    return formatGameClock(match.startTime);
  }
  return "Match";
}

function outcomeLabel(format: string, match: GameResultsMatch) {
  const slot1 = formatMatchSlotLabel(format, 1);
  const slot2 = formatMatchSlotLabel(format, 2);
  const completed = match.status === "completed";
  if (match.outcome.result === "draw") {
    return "Match draw";
  }
  if (match.outcome.result === "slot1") {
    return completed ? `${slot1} won` : `${slot1} leads`;
  }
  if (match.outcome.result === "slot2") {
    return completed ? `${slot2} won` : `${slot2} leads`;
  }
  if (completed) {
    return "Match completed";
  }
  return "No result yet";
}

export function GameResultsPanel({
  format,
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
  onUpdateSlots,
  onCancelMatch,
}: {
  format: string;
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
  }) => void;
  onComplete: (matchId: string) => void;
  onUpdateCourt: (input: { matchId: string; courtId: string | null }) => void;
  onUpdateSlots: (input: {
    matchId: string;
    startTime: Date | null;
    endTime: Date | null;
    durationInMinutes: number | null;
    courtId: string | null;
    slot1GameTeamId: string | null;
    slot2GameTeamId: string | null;
  }) => void;
  onCancelMatch: (matchId: string) => void;
}) {
  const [setScores, setSetScores] = React.useState<
    Record<string, { slot1: string; slot2: string }>
  >({});

  React.useEffect(() => {
    const nextScores: Record<string, { slot1: string; slot2: string }> = {};
    for (const match of matches) {
      for (const set of match.sets) {
        nextScores[set.id] = {
          slot1: set.slot1GamesWon == null ? "" : String(set.slot1GamesWon),
          slot2: set.slot2GamesWon == null ? "" : String(set.slot2GamesWon),
        };
      }
    }
    setSetScores(nextScores);
  }, [matches]);

  if (format === "americano") {
    return (
      <EmptyState
        icon={Trophy}
        title="No match results"
        description="Americano has no Matches this slice."
      />
    );
  }

  if (matches.length === 0) {
    return (
      <EmptyState
        icon={Trophy}
        title="No match results"
        description="No Matches on this Game."
      />
    );
  }

  const canEditMatch =
    isOrganizer &&
    !cancelled &&
    (format === "friendly_tournament" || format === "friendly_game");

  return (
    <div className="space-y-6">
      {matches.map((match) => {
        const slot1Label = formatMatchSlotLabel(format, 1);
        const slot2Label = formatMatchSlotLabel(format, 2);
        const slot1Names = matchSlotOccupantLabel(
          gameTeams,
          match.slot1GameTeamId,
        );
        const slot2Names = matchSlotOccupantLabel(
          gameTeams,
          match.slot2GameTeamId,
        );
        const matchCancelled = match.status === "cancelled";

        return (
          <Card key={match.id} variant="outlined" className="gap-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="space-y-1">
                <p className="text-title font-medium">
                  {matchWindowLabel(match)}
                </p>
                <p className="text-meta text-muted-foreground">
                  {match.durationInMinutes
                    ? `${match.durationInMinutes} min`
                    : "Duration not set"}
                  {match.courtName ? ` · ${match.courtName}` : " · no Court"}
                </p>
              </div>
              {match.status ? <GameStatusBadge status={match.status} /> : null}
            </div>

            <p className="text-body text-muted-foreground">
              {outcomeLabel(format, match)} · {match.outcome.slot1SetWins}–
              {match.outcome.slot2SetWins} Set-wins
            </p>

            {match.sets.length === 0 ? (
              <p className="text-muted-foreground text-sm">
                No Sets on this Match.
              </p>
            ) : (
              <div className="border-border overflow-hidden rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead>Teams</TableHead>
                      {match.sets.map((set, index) => (
                        <TableHead key={set.id} className="text-center">
                          Set-{index + 1}
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow className="hover:bg-transparent">
                      <TableCell>
                        <p className="font-medium">{slot1Label}</p>
                        {slot1Names ? (
                          <p className="text-meta text-muted-foreground">
                            {slot1Names}
                          </p>
                        ) : null}
                      </TableCell>
                      {match.sets.map((set) => (
                        <TableCell
                          key={set.id}
                          className="text-center tabular-nums"
                        >
                          {gamesWonDisplay(set.slot1GamesWon)}
                        </TableCell>
                      ))}
                    </TableRow>
                    <TableRow className="hover:bg-transparent">
                      <TableCell>
                        <p className="font-medium">{slot2Label}</p>
                        {slot2Names ? (
                          <p className="text-meta text-muted-foreground">
                            {slot2Names}
                          </p>
                        ) : null}
                      </TableCell>
                      {match.sets.map((set) => (
                        <TableCell
                          key={set.id}
                          className="text-center tabular-nums"
                        >
                          {gamesWonDisplay(set.slot2GamesWon)}
                        </TableCell>
                      ))}
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            )}

            {match.canScoreSets ? (
              <div className="space-y-3">
                <p className="text-title font-medium">Score sets</p>
                <ul className="space-y-3">
                  {match.sets.map((set, index) => {
                    const scores = setScores[set.id] ?? {
                      slot1: "",
                      slot2: "",
                    };
                    return (
                      <li
                        key={set.id}
                        className="flex flex-wrap items-end gap-2"
                      >
                        <p className="text-muted-foreground w-12 text-sm">
                          Set {index + 1}
                        </p>
                        <Field>
                          <FieldLabel htmlFor={`set-${set.id}-slot1`}>
                            {slot1Label} games
                          </FieldLabel>
                          <Input
                            type="number"
                            min={0}
                            id={`set-${set.id}-slot1`}
                            className="w-20"
                            value={scores.slot1}
                            onChange={(event) =>
                              setSetScores((current) => ({
                                ...current,
                                [set.id]: {
                                  slot1: event.target.value,
                                  slot2: scores.slot2,
                                },
                              }))
                            }
                          />
                        </Field>
                        <span className="text-muted-foreground text-sm">–</span>
                        <Field>
                          <FieldLabel htmlFor={`set-${set.id}-slot2`}>
                            {slot2Label} games
                          </FieldLabel>
                          <Input
                            type="number"
                            min={0}
                            id={`set-${set.id}-slot2`}
                            className="w-20"
                            value={scores.slot2}
                            onChange={(event) =>
                              setSetScores((current) => ({
                                ...current,
                                [set.id]: {
                                  slot1: scores.slot1,
                                  slot2: event.target.value,
                                },
                              }))
                            }
                          />
                        </Field>
                        <Button
                          type="button"
                          onClick={() => {
                            if (
                              scores.slot1.trim().length === 0 ||
                              scores.slot2.trim().length === 0
                            ) {
                              toast.error("Enter games won for both teams");
                              return;
                            }
                            onScoreSet({
                              matchId: match.id,
                              setId: set.id,
                              slot1GamesWon: Number(scores.slot1),
                              slot2GamesWon: Number(scores.slot2),
                            });
                          }}
                          disabled={scorePending}
                        >
                          Save
                        </Button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ) : null}

            {(!match.bothSidesComplete || !match.bothSlotsFilled) &&
            match.status !== "completed" ? (
              <p className="text-muted-foreground text-sm">
                Scoring is frozen until both teams have two Positions.
              </p>
            ) : null}

            {match.canComplete ? (
              <Button
                type="button"
                variant="brand"
                onClick={() => onComplete(match.id)}
                disabled={completePending}
              >
                Complete Match
              </Button>
            ) : null}

            {canEditMatch && !matchCancelled ? (
              <div className="grid gap-3 sm:grid-cols-2">
                <Field>
                  <FieldLabel htmlFor={`match-${match.id}-court`}>
                    Court
                  </FieldLabel>
                  <Select
                    value={match.courtId ?? "none"}
                    onValueChange={(value) => {
                      const courtId = optionalSelectId(value);
                      if (format === "friendly_game") {
                        onUpdateCourt({ matchId: match.id, courtId });
                        return;
                      }
                      onUpdateSlots({
                        matchId: match.id,
                        startTime: match.startTime,
                        endTime: match.endTime,
                        durationInMinutes: match.durationInMinutes,
                        courtId,
                        slot1GameTeamId: match.slot1GameTeamId,
                        slot2GameTeamId: match.slot2GameTeamId,
                      });
                    }}
                  >
                    <SelectTrigger id={`match-${match.id}-court`}>
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
                {format === "friendly_tournament" ? (
                  <>
                    <Field>
                      <FieldLabel htmlFor={`match-${match.id}-slot1`}>
                        {slot1Label}
                      </FieldLabel>
                      <Select
                        value={match.slot1GameTeamId ?? "none"}
                        onValueChange={(value) =>
                          onUpdateSlots({
                            matchId: match.id,
                            startTime: match.startTime,
                            endTime: match.endTime,
                            durationInMinutes: match.durationInMinutes,
                            courtId: match.courtId,
                            slot1GameTeamId: optionalSelectId(value),
                            slot2GameTeamId: match.slot2GameTeamId,
                          })
                        }
                      >
                        <SelectTrigger id={`match-${match.id}-slot1`}>
                          <SelectValue placeholder={slot1Label} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">
                            {slot1Label} empty
                          </SelectItem>
                          {gameTeams.map((side) => (
                            <SelectItem key={side.id} value={side.id}>
                              {gameTeamDisplayName(side)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </Field>
                    <Field>
                      <FieldLabel htmlFor={`match-${match.id}-slot2`}>
                        {slot2Label}
                      </FieldLabel>
                      <Select
                        value={match.slot2GameTeamId ?? "none"}
                        onValueChange={(value) =>
                          onUpdateSlots({
                            matchId: match.id,
                            startTime: match.startTime,
                            endTime: match.endTime,
                            durationInMinutes: match.durationInMinutes,
                            courtId: match.courtId,
                            slot1GameTeamId: match.slot1GameTeamId,
                            slot2GameTeamId: optionalSelectId(value),
                          })
                        }
                      >
                        <SelectTrigger id={`match-${match.id}-slot2`}>
                          <SelectValue placeholder={slot2Label} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">
                            {slot2Label} empty
                          </SelectItem>
                          {gameTeams.map((side) => (
                            <SelectItem key={side.id} value={side.id}>
                              {gameTeamDisplayName(side)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </Field>
                  </>
                ) : null}
              </div>
            ) : null}

            {isOrganizer && !cancelled && !matchCancelled ? (
              <Button
                variant="outline"
                onClick={() => onCancelMatch(match.id)}
                disabled={cancelPending}
              >
                {format === "friendly_game"
                  ? "Cancel Match (cancels Game)"
                  : "Cancel Match"}
              </Button>
            ) : null}
          </Card>
        );
      })}
    </div>
  );
}
