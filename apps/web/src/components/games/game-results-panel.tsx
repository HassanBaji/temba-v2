"use client";

import { Trophy } from "lucide-react";
import * as React from "react";
import { toast } from "sonner";

import { EmptyState } from "~/components/common/empty-state";
import { useLocale, useMessages } from "~/components/locale-provider";
import {
  formatMatchSlotLabel,
  gameTeamDisplayName,
  matchSlotOccupantLabel,
} from "@repo/domain/game-side-label";
import { GameStatusBadge } from "~/components/temba/game-status-badge";
import { ResultTag } from "~/components/temba/result-mark";
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
import { formatGameClock } from "@repo/domain/format-game-start";
import { setLabel } from "@repo/domain/game-copy";
import type { Locale } from "@repo/i18n/locale";
import type { Messages } from "@repo/i18n/messages";
import { cn } from "~/lib/utils";

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

/** A decided Match tints the winning Set-wins; a live one or a draw stays neutral. */
function scoreTone(decided: boolean, won: boolean) {
  if (!decided) {
    return "text-foreground";
  }
  return won ? "text-success" : "text-muted-foreground";
}

function matchMetaLabel(match: GameResultsMatch, m: Messages) {
  const parts: string[] = [];
  if (match.durationInMinutes != null) {
    parts.push(m.dates.minutes(match.durationInMinutes));
  }
  if (match.courtName) {
    parts.push(match.courtName);
  }
  return parts.length > 0 ? parts.join(" · ") : null;
}

function matchWindowLabel(
  match: GameResultsMatch,
  m: Messages,
  locale: Locale,
) {
  if (match.startTime && match.endTime) {
    return m.webGame.results.clockRange(
      formatGameClock(match.startTime, locale),
      formatGameClock(match.endTime, locale),
    );
  }
  if (match.startTime) {
    return formatGameClock(match.startTime, locale);
  }
  return m.webGame.results.match;
}

function outcomeLabel(
  format: string,
  match: GameResultsMatch,
  m: Messages,
  locale: Locale,
) {
  const slot1 = formatMatchSlotLabel(format, 1, locale);
  const slot2 = formatMatchSlotLabel(format, 2, locale);
  const completed = match.status === "completed";
  if (match.outcome.result === "draw") {
    return m.game.results.matchDraw;
  }
  if (match.outcome.result === "slot1") {
    return completed
      ? m.game.results.teamWon(slot1)
      : m.webGame.results.leads(slot1);
  }
  if (match.outcome.result === "slot2") {
    return completed
      ? m.game.results.teamWon(slot2)
      : m.webGame.results.leads(slot2);
  }
  if (completed) {
    return m.game.results.matchCompleted;
  }
  return m.webGame.results.noResultYet;
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
  const locale = useLocale();
  const m = useMessages();
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
        title={m.webGame.results.noMatchResults}
        description={m.webGame.results.americanoNoMatches}
      />
    );
  }

  if (matches.length === 0) {
    return (
      <EmptyState icon={Trophy} title={m.webGame.results.noMatchResults} />
    );
  }

  const canEditMatch =
    isOrganizer &&
    !cancelled &&
    (format === "friendly_tournament" || format === "friendly_game");

  return (
    <div className="space-y-6">
      {matches.map((match) => {
        const slot1Label = formatMatchSlotLabel(format, 1, locale);
        const slot2Label = formatMatchSlotLabel(format, 2, locale);
        const slot1Names = matchSlotOccupantLabel(
          gameTeams,
          match.slot1GameTeamId,
          locale,
        );
        const slot2Names = matchSlotOccupantLabel(
          gameTeams,
          match.slot2GameTeamId,
          locale,
        );
        const matchCancelled = match.status === "cancelled";
        const matchCompleted = match.status === "completed";
        const matchMeta = matchMetaLabel(match, m);
        const slot1Won = match.outcome.result === "slot1";
        const slot2Won = match.outcome.result === "slot2";
        const scored = match.outcome.result !== "none";
        const decided = matchCompleted && (slot1Won || slot2Won);

        return (
          <Card key={match.id} variant="outlined" className="gap-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="space-y-1">
                <p className="text-title font-medium">
                  {matchWindowLabel(match, m, locale)}
                </p>
                {matchMeta ? (
                  <p className="text-meta text-muted-foreground">{matchMeta}</p>
                ) : null}
              </div>
              {match.status ? <GameStatusBadge status={match.status} /> : null}
            </div>

            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              {scored ? (
                <p className="text-h2 font-bold tabular-nums">
                  <span className={scoreTone(decided, slot1Won)}>
                    {match.outcome.slot1SetWins}
                  </span>
                  <span className="text-muted-foreground mx-1 font-semibold">
                    –
                  </span>
                  <span className={scoreTone(decided, slot2Won)}>
                    {match.outcome.slot2SetWins}
                  </span>
                </p>
              ) : null}
              <p className="text-body text-muted-foreground">
                {outcomeLabel(format, match, m, locale)}
              </p>
            </div>

            {match.sets.length === 0 ? (
              <p className="text-muted-foreground text-body">
                {m.webGame.results.noSetsYet}
              </p>
            ) : (
              <div className="border-border overflow-hidden rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead>{m.webGame.results.teams}</TableHead>
                      {match.sets.map((set, index) => (
                        <TableHead key={set.id} className="text-center">
                          {setLabel(index, locale)}
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow
                      className={cn(
                        "hover:bg-transparent",
                        matchCompleted && slot1Won ? "bg-success-subtle" : null,
                      )}
                    >
                      <TableCell>
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-medium">{slot1Label}</p>
                          {matchCompleted && slot1Won ? (
                            <ResultTag variant="won">
                              {m.game.resultMark.won}
                            </ResultTag>
                          ) : null}
                        </div>
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
                    <TableRow
                      className={cn(
                        "hover:bg-transparent",
                        matchCompleted && slot2Won ? "bg-success-subtle" : null,
                      )}
                    >
                      <TableCell>
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-medium">{slot2Label}</p>
                          {matchCompleted && slot2Won ? (
                            <ResultTag variant="won">
                              {m.game.resultMark.won}
                            </ResultTag>
                          ) : null}
                        </div>
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
                <p className="text-title font-medium">
                  {m.webGame.results.scoreSets}
                </p>
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
                        <p className="text-muted-foreground text-meta w-12">
                          {setLabel(index, locale)}
                        </p>
                        <Field>
                          <FieldLabel htmlFor={`set-${set.id}-slot1`}>
                            {m.webGame.results.slotGames(slot1Label)}
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
                        <span className="text-muted-foreground text-meta">
                          –
                        </span>
                        <Field>
                          <FieldLabel htmlFor={`set-${set.id}-slot2`}>
                            {m.webGame.results.slotGames(slot2Label)}
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
                              toast.error(m.game.score.incompleteMessage);
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
                          {m.common.save}
                        </Button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ) : null}

            {(!match.bothSidesComplete || !match.bothSlotsFilled) &&
            match.status !== "completed" ? (
              <p className="text-muted-foreground text-body">
                {m.webGame.results.scoringOpens}
              </p>
            ) : null}

            {match.canComplete ? (
              <Button
                type="button"
                onClick={() => onComplete(match.id)}
                disabled={completePending}
              >
                {m.game.action.completeMatch}
              </Button>
            ) : null}

            {canEditMatch && !matchCancelled ? (
              <div className="grid gap-3 sm:grid-cols-2">
                <Field>
                  <FieldLabel htmlFor={`match-${match.id}-court`}>
                    {m.webGame.results.court}
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
                      <SelectValue placeholder={m.webGame.results.court} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">
                        {m.webGame.results.noCourt}
                      </SelectItem>
                      {courts.map((court) => (
                        <SelectItem key={court.id} value={court.id}>
                          {m.webGame.results.courtOption(
                            court.venueName,
                            court.name,
                          )}
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
                            {m.webGame.results.slotEmpty(slot1Label)}
                          </SelectItem>
                          {gameTeams.map((side) => (
                            <SelectItem key={side.id} value={side.id}>
                              {gameTeamDisplayName(side, locale)}
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
                            {m.webGame.results.slotEmpty(slot2Label)}
                          </SelectItem>
                          {gameTeams.map((side) => (
                            <SelectItem key={side.id} value={side.id}>
                              {gameTeamDisplayName(side, locale)}
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
                  ? m.game.action.cancelGame
                  : m.game.action.cancelMatch}
              </Button>
            ) : null}
          </Card>
        );
      })}
    </div>
  );
}
