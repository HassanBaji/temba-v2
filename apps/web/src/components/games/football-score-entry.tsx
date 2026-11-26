"use client";

import {
  bibNames,
  sideOvrAverage,
  type Bibs,
  type BoardPlayer,
  type Side,
} from "@repo/domain/football-board";
import { footballResultLine } from "@repo/domain/football-lineup";
import {
  logPayload,
  logScore,
  logScorers,
  seedLogFromScore,
} from "@repo/domain/football-match-log";
import {
  formatGameDay,
  formatGameClock,
  formatWindowDuration,
} from "@repo/domain/format-game-start";
import { sideSizeLabel } from "@repo/domain/game-shape";
import { isFootballRosterGame } from "@repo/domain/football-game-details";
import { Minus, Plus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import * as React from "react";
import { toast } from "sonner";

import { ErrorState } from "~/components/common/error-state";
import { DashboardShell } from "~/components/dashboard-shell";
import { useLocale, useMessages } from "~/components/locale-provider";
import { Button } from "~/components/ui/button";
import { Skeleton } from "~/components/ui/skeleton";
import { invalidateRatingReads } from "~/trpc/invalidate-rating-reads";
import { api } from "~/trpc/react";
import { OWN_ERROR_UI } from "~/trpc/query-client";

import { BibChip } from "./football-bibs";
import { MatchLogEntry } from "./football-log-entry";
import { sideMembers } from "./football-team-columns";
import { useMatchLogEditor } from "./use-match-log-editor";

function SideStepper({
  bib,
  name,
  goals,
  members,
  onStep,
}: {
  bib: Bibs["slot1"];
  name: string;
  goals: number;
  members: readonly BoardPlayer[];
  onStep: (delta: -1 | 1) => void;
}) {
  const m = useMessages();
  const locale = useLocale();
  const t = m.webTournament.footballScore;
  return (
    <div className="flex flex-1 flex-col items-center gap-2.5 py-5">
      <span className="text-meta flex items-center gap-1.5 font-semibold">
        <BibChip bib={bib} className="size-3.5" />
        {name}
      </span>
      <output
        aria-label={t.goalsOutput(name)}
        className="font-expanded text-[56px] tabular-nums leading-none"
      >
        {goals}
      </output>
      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          size="icon"
          aria-label={t.oneGoalFewer(name)}
          onClick={() => onStep(-1)}
        >
          <Minus aria-hidden="true" />
        </Button>
        <Button
          type="button"
          size="icon"
          aria-label={t.oneGoalMore(name)}
          onClick={() => onStep(1)}
        >
          <Plus aria-hidden="true" />
        </Button>
      </div>
      <span className="text-muted-foreground text-meta">
        {m.game.played.avg(sideOvrAverage(members, locale))}
      </span>
    </div>
  );
}

/**
 * Either side, or an Organizer, enters the Score as a Match log: each goal,
 * own goal, warning and red card with the minute it happened. Any line can
 * be changed or taken out until the other side confirms the Score, the log
 * and the cards together from the Game.
 */
export function FootballScoreEntry({ gameId }: { gameId: string }) {
  const m = useMessages();
  const locale = useLocale();
  const t = m.webTournament.footballScore;
  const router = useRouter();
  const utils = api.useUtils();
  const game = api.games.byId.useQuery({ id: gameId });
  const isFootball = game.data ? isFootballRosterGame(game.data) : null;
  const board = api.games.footballBoard.useQuery(
    { gameId },
    { enabled: isFootball === true },
  );
  const editor = useMatchLogEditor({
    kickoff: game.data?.windowStart ?? null,
    end: game.data?.windowEnd ?? null,
  });
  const gameHref = `/dashboard/games/${gameId}`;

  React.useEffect(() => {
    if (isFootball === false) {
      router.replace(gameHref);
    }
  }, [isFootball, router, gameHref]);

  const startLog = editor.start;
  React.useEffect(() => {
    if (board.data && game.data && editor.lines == null) {
      const stored = board.data.match?.log ?? [];
      startLog(
        stored.length > 0
          ? stored
          : seedLogFromScore(
              board.data.match?.score ?? null,
              board.data.players,
              {
                at: new Date(),
                kickoff: game.data.windowStart,
                end: game.data.windowEnd,
              },
            ),
        board.data.players,
      );
    }
  }, [board.data, game.data, editor.lines, startLog]);

  const save = api.games.saveFootballScore.useMutation({
    meta: OWN_ERROR_UI,
    onSuccess: async () => {
      toast.success(t.savedToast);
      await Promise.all([
        utils.games.footballBoard.invalidate({ gameId }),
        utils.games.byId.invalidate({ id: gameId }),
        utils.series.edition.invalidate({ gameId }),
        utils.games.listMyGames.invalidate(),
        invalidateRatingReads(utils),
      ]);
      router.push(gameHref);
    },
  });

  const start = game.data?.windowStart ?? null;
  const teams = board.data?.teams ?? null;
  const title = start
    ? formatGameDay(start, locale, { weekday: "short" })
    : m.game.played.score;
  const description = [
    [game.data?.venue?.name, game.data?.recordedCourts[0]?.name]
      .filter(Boolean)
      .join(", "),
    [
      start ? formatGameClock(start, locale) : null,
      formatWindowDuration(
        game.data?.windowStart,
        game.data?.windowEnd,
        locale,
      ),
      game.data?.sideSize ? sideSizeLabel(game.data.sideSize, locale) : null,
    ]
      .filter(Boolean)
      .join(", "),
  ]
    .filter(Boolean)
    .join(". ");

  let body: React.ReactNode;
  const loadError = game.error ?? board.error;
  if (loadError) {
    body = (
      <ErrorState
        title={t.loadFailed}
        error={loadError}
        onRetry={() => {
          void game.refetch();
          if (isFootball) {
            void board.refetch();
          }
        }}
      />
    );
  } else if (board.data && (!teams || !board.data.viewer.canEnterScore)) {
    body = (
      <section className="border-rule bg-paper space-y-1 rounded-xl border p-5">
        <h2 className="font-semibold">{t.closedTitle}</h2>
        <p className="text-muted-foreground text-meta">{t.closedBody}</p>
      </section>
    );
  } else if (!board.data || !teams || !editor.lines) {
    body = <Skeleton className="h-80 w-full rounded-xl" />;
  } else {
    const players = board.data.players;
    const names = bibNames(teams.bibs, locale);
    const viewerSide = board.data.viewer.sideIndex;
    const otherName =
      viewerSide === 1 ? names.slot2 : viewerSide === 2 ? names.slot1 : null;
    const lines = editor.lines;
    const score = logScore(lines);
    const step = (side: Side, delta: -1 | 1) =>
      delta === 1 ? editor.addUnknownGoal(side) : editor.removeLatestGoal(side);
    body = (
      <div className="space-y-5">
        <section className="border-rule bg-paper overflow-hidden rounded-xl border">
          <div className="divide-rule flex divide-x">
            <SideStepper
              bib={teams.bibs.slot1}
              name={names.slot1}
              goals={score.slot1}
              members={sideMembers(players, 1)}
              onStep={(delta) => step(1, delta)}
            />
            <SideStepper
              bib={teams.bibs.slot2}
              name={names.slot2}
              goals={score.slot2}
              members={sideMembers(players, 2)}
              onStep={(delta) => step(2, delta)}
            />
          </div>
          <p aria-live="polite" className="border-rule border-t p-5">
            {footballResultLine(score, names, locale)}
          </p>
        </section>

        <MatchLogEntry players={players} names={names} editor={editor} />

        {save.error ? (
          <p role="alert" className="text-destructive text-meta">
            {save.error.message}
          </p>
        ) : null}

        <div className="space-y-1.5">
          <Button
            type="button"
            size="lg"
            className="w-full"
            pending={save.isPending}
            onClick={() =>
              save.mutate({
                gameId,
                slot1Goals: score.slot1,
                slot2Goals: score.slot2,
                scorers: logScorers(lines),
                log: logPayload(lines),
              })
            }
          >
            {t.saveScore}
          </Button>
          <p className="text-muted-foreground text-meta text-center">
            {otherName ? t.otherConfirms(otherName) : t.eachSideConfirms}
          </p>
        </div>
      </div>
    );
  }

  return (
    <DashboardShell
      title={title}
      description={description || undefined}
      action={
        <Button variant="outline" asChild>
          <Link href={gameHref}>{m.webTournament.backToGame}</Link>
        </Button>
      }
      isSubPage
      hideNav
    >
      {body}
    </DashboardShell>
  );
}
