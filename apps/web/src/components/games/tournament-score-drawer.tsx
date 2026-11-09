"use client";

import { FlagIcon, MinusIcon, PlusIcon } from "lucide-react";
import * as React from "react";

import {
  FRIENDLY_SET_GAMES_MAX,
  FRIENDLY_SET_GAMES_MIN,
} from "@repo/domain/friendly-game-results";
import { formatGameClock } from "@repo/domain/format-game-start";
import { tournamentScoreOutcome } from "@repo/domain/tournament-round-state";

import { ResultMark } from "~/components/temba/result-mark";
import { Button } from "~/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerTitle,
} from "~/components/ui/drawer";
import { CloseButton } from "~/components/ui/nav-icon-button";
import { useLocale, useMessages } from "~/components/locale-provider";
import { cn } from "~/lib/utils";

import {
  TeamMark,
  TeamNames,
  teamShortName,
  type RoundsMatch,
  type RoundsTeam,
} from "./tournament-round-parts";
import { type TournamentRoundsActions } from "./use-tournament-rounds";

export type ScoreSheetTarget = {
  roundNumber: number;
  match: RoundsMatch;
  mode: "enter" | "confirm";
};

function scoreLabel(first: number, second: number) {
  return `${first}–${second}`;
}

function Stepper({
  team,
  value,
  viewerUserId,
  isViewerTeam,
  onChange,
}: {
  team: RoundsTeam | undefined;
  value: number;
  viewerUserId: string;
  isViewerTeam: boolean;
  onChange: (next: number) => void;
}) {
  const m = useMessages().tournamentRounds.score;
  const name = teamShortName(team);
  return (
    <div
      className={cn(
        "rounded-card flex min-w-0 flex-1 flex-col gap-3 border p-4",
        isViewerTeam ? "border-ink" : "border-rule",
      )}
    >
      <div className="flex min-w-0 items-center gap-2.5">
        <TeamMark team={team} isViewer={isViewerTeam} />
        <TeamNames team={team} viewerUserId={viewerUserId} />
      </div>
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          aria-label={m.fewer(name)}
          disabled={value <= FRIENDLY_SET_GAMES_MIN}
          onClick={() => onChange(value - 1)}
          className="border-rule focus-visible:ring-ring/50 inline-flex size-11 shrink-0 items-center justify-center rounded-full border outline-none focus-visible:ring-[3px] disabled:opacity-40"
        >
          <MinusIcon aria-hidden="true" className="size-4" />
        </button>
        <output
          aria-live="polite"
          aria-label={m.gamesFor(name, value)}
          className="font-expanded text-[52px] tabular-nums leading-none"
        >
          {value}
        </output>
        <button
          type="button"
          aria-label={m.more(name)}
          disabled={value >= FRIENDLY_SET_GAMES_MAX}
          onClick={() => onChange(value + 1)}
          className="bg-ink text-paper focus-visible:ring-ring/50 inline-flex size-11 shrink-0 items-center justify-center rounded-full outline-none focus-visible:ring-[3px] disabled:opacity-40"
        >
          <PlusIcon aria-hidden="true" className="size-4" />
        </button>
      </div>
      <p className="text-muted-foreground text-meta text-center">{m.games}</p>
    </div>
  );
}

function OutcomeLine({
  first,
  second,
  firstTeam,
  secondTeam,
  viewerIsFirst,
  rated,
}: {
  first: number;
  second: number;
  firstTeam: RoundsTeam | undefined;
  secondTeam: RoundsTeam | undefined;
  viewerIsFirst: boolean | null;
  rated: boolean;
}) {
  const m = useMessages().tournamentRounds.score;
  const outcome = tournamentScoreOutcome(first, second);
  let title: string;
  let subline: string;
  let variant: "won" | "lost" | "draw";
  if (outcome === "draw") {
    title = m.draw;
    subline = m.drawLine;
    variant = "draw";
  } else {
    const firstWins = outcome === "slot1";
    const loser = firstWins ? secondTeam : firstTeam;
    subline = m.otherGetsNothing(teamShortName(loser));
    if (viewerIsFirst == null) {
      title = m.teamWins(teamShortName(firstWins ? firstTeam : secondTeam));
      variant = "won";
    } else {
      const viewerWins = viewerIsFirst === firstWins;
      title = viewerWins ? m.youWin : m.youLose;
      variant = viewerWins ? "won" : "lost";
    }
  }
  return (
    <div className="border-rule rounded-card flex items-center gap-3 border p-4">
      <ResultMark variant={variant} decorative className="size-6" />
      <div className="min-w-0 flex-1">
        <p className="text-body font-semibold">{title}</p>
        <p className="text-muted-foreground text-meta">{subline}</p>
      </div>
      {rated ? (
        <p className="text-muted-foreground text-meta shrink-0">
          {m.countsForRating}
        </p>
      ) : null}
    </div>
  );
}

export function TournamentScoreDrawer({
  gameId,
  target,
  teams,
  viewerUserId,
  isOrganizer,
  matchMinutes,
  rated,
  actions,
  onClose,
  onCorrect,
}: {
  gameId: string;
  target: ScoreSheetTarget | null;
  teams: ReadonlyMap<string, RoundsTeam>;
  viewerUserId: string;
  isOrganizer: boolean;
  matchMinutes: number;
  rated: boolean;
  actions: TournamentRoundsActions;
  onClose: () => void;
  onCorrect: (target: ScoreSheetTarget) => void;
}) {
  const m = useMessages().tournamentRounds;
  const locale = useLocale();
  const match = target?.match;
  const viewerSlot = match?.viewerSlot ?? null;
  // The viewer's team reads first; an Organizer off the Match reads slot 1 first.
  const flipped = viewerSlot === 2;
  const firstTeamId = match
    ? flipped
      ? match.slot2GameTeamId
      : match.slot1GameTeamId
    : "";
  const secondTeamId = match
    ? flipped
      ? match.slot1GameTeamId
      : match.slot2GameTeamId
    : "";
  const firstTeam = teams.get(firstTeamId);
  const secondTeam = teams.get(secondTeamId);
  const stored = match
    ? flipped
      ? [match.slot2GamesWon, match.slot1GamesWon]
      : [match.slot1GamesWon, match.slot2GamesWon]
    : [null, null];

  const [first, setFirst] = React.useState(0);
  const [second, setSecond] = React.useState(0);
  React.useEffect(() => {
    setFirst(stored[0] ?? 0);
    setSecond(stored[1] ?? 0);
    // Reset only when a different Match opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [match?.matchId, target?.mode]);

  const busy =
    actions.enterScore.isPending ||
    actions.confirm.isPending ||
    actions.notFinished.isPending;
  const court = match?.courtName ?? "";
  const final = isOrganizer && viewerSlot == null;
  const opponents = teamShortName(secondTeam);

  async function save() {
    if (!match?.matchId) {
      return;
    }
    const [slot1GamesWon, slot2GamesWon] = flipped
      ? [second, first]
      : [first, second];
    try {
      await actions.enterScore.mutateAsync({
        gameId,
        matchId: match.matchId,
        slot1GamesWon,
        slot2GamesWon,
      });
      onClose();
    } catch {
      return;
    }
  }

  async function markNotFinished() {
    if (!match?.matchId) {
      return;
    }
    try {
      await actions.notFinished.mutateAsync({
        gameId,
        matchId: match.matchId,
      });
      onClose();
    } catch {
      return;
    }
  }

  async function confirm() {
    if (!match?.matchId) {
      return;
    }
    try {
      await actions.confirm.mutateAsync({ gameId, matchId: match.matchId });
      onClose();
    } catch {
      return;
    }
  }

  const enteredName = match?.enteredByName ?? teamShortName(secondTeam);
  const storedLabel =
    stored[0] != null && stored[1] != null
      ? scoreLabel(stored[0], stored[1])
      : "";

  return (
    <Drawer
      open={target != null}
      onOpenChange={(open) => {
        if (!open && !busy) {
          onClose();
        }
      }}
    >
      <DrawerContent className="px-[22px] pb-[max(22px,env(safe-area-inset-bottom))]">
        {target && match ? (
          <div className="mx-auto flex w-full max-w-lg flex-col gap-4 pt-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <DrawerTitle className="text-h1">
                  {target.mode === "confirm"
                    ? m.confirm.title(enteredName, storedLabel)
                    : m.score.title(target.roundNumber, court)}
                </DrawerTitle>
                <DrawerDescription className="text-meta mt-2 leading-relaxed">
                  {target.mode === "confirm"
                    ? m.confirm.lead(
                        target.roundNumber,
                        court,
                        enteredName,
                        match.standsAt
                          ? formatGameClock(match.standsAt, locale)
                          : "",
                      )
                    : final
                      ? m.score.leadOrganizer(matchMinutes)
                      : m.score.lead(matchMinutes, opponents)}
                </DrawerDescription>
              </div>
              <CloseButton variant="boxed" onClick={onClose} disabled={busy} />
            </div>

            {target.mode === "confirm" ? (
              <div className="border-rule rounded-card flex items-center gap-3 border p-4">
                <TeamMark team={firstTeam} isViewer={viewerSlot != null} />
                <TeamNames
                  team={firstTeam}
                  viewerUserId={viewerUserId}
                  className="flex-1"
                />
                <span className="font-expanded text-[34px] tabular-nums leading-none">
                  {storedLabel}
                </span>
                <TeamNames
                  team={secondTeam}
                  viewerUserId={viewerUserId}
                  className="flex-1 text-end"
                />
                <TeamMark team={secondTeam} isViewer={false} />
              </div>
            ) : (
              <div className="flex gap-3">
                <Stepper
                  team={firstTeam}
                  value={first}
                  viewerUserId={viewerUserId}
                  isViewerTeam={viewerSlot != null}
                  onChange={setFirst}
                />
                <Stepper
                  team={secondTeam}
                  value={second}
                  viewerUserId={viewerUserId}
                  isViewerTeam={false}
                  onChange={setSecond}
                />
              </div>
            )}

            <OutcomeLine
              first={target.mode === "confirm" ? (stored[0] ?? 0) : first}
              second={target.mode === "confirm" ? (stored[1] ?? 0) : second}
              firstTeam={firstTeam}
              secondTeam={secondTeam}
              viewerIsFirst={viewerSlot != null ? true : null}
              rated={rated}
            />

            {target.mode === "confirm" ? (
              <>
                <div className="flex gap-2.5">
                  <Button
                    type="button"
                    size="lg"
                    className="flex-1 font-semibold"
                    disabled={busy}
                    aria-busy={actions.confirm.isPending}
                    onClick={() => void confirm()}
                  >
                    {actions.confirm.isPending
                      ? m.confirm.confirming
                      : m.confirm.confirm(storedLabel)}
                  </Button>
                  <Button
                    type="button"
                    size="lg"
                    variant="outline"
                    disabled={busy}
                    onClick={() => onCorrect({ ...target, mode: "enter" })}
                  >
                    {m.confirm.correct}
                  </Button>
                </div>
                <p className="text-muted-foreground text-meta text-center leading-relaxed">
                  {m.confirm.cantAgree}
                </p>
              </>
            ) : (
              <>
                {match.canMarkNotFinished ? (
                  <Button
                    type="button"
                    variant="outline"
                    disabled={busy}
                    aria-busy={actions.notFinished.isPending}
                    onClick={() => void markNotFinished()}
                  >
                    <FlagIcon aria-hidden="true" />
                    {actions.notFinished.isPending
                      ? m.score.marking
                      : m.score.didntFinish}
                  </Button>
                ) : null}
                <Button
                  type="button"
                  size="lg"
                  className="w-full font-semibold"
                  disabled={busy}
                  aria-busy={actions.enterScore.isPending}
                  onClick={() => void save()}
                >
                  {actions.enterScore.isPending
                    ? m.score.saving
                    : m.score.save(scoreLabel(first, second))}
                </Button>
              </>
            )}
          </div>
        ) : null}
      </DrawerContent>
    </Drawer>
  );
}
