"use client";

import {
  addGoal,
  bibNames,
  removeGoal,
  scorersNote,
  scorersPayload,
  shortName,
  sideAverage,
  type Bibs,
  type BoardPlayer,
  type ScoreDraft,
  type Side,
} from "@repo/domain/football-board";
import {
  footballResultLine,
  stepFootballGoals,
} from "@repo/domain/football-lineup";
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
import { UserAvatar } from "~/components/common/user-avatar";
import { DashboardShell } from "~/components/dashboard-shell";
import { useLocale, useMessages } from "~/components/locale-provider";
import { Button } from "~/components/ui/button";
import { Skeleton } from "~/components/ui/skeleton";
import { cn } from "~/lib/utils";
import { api } from "~/trpc/react";
import { OWN_ERROR_UI } from "~/trpc/query-client";

import { BibChip } from "./football-bibs";
import { sideMembers } from "./football-team-columns";

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
        {m.game.played.avg(sideAverage(members))}
      </span>
    </div>
  );
}

function ScorerChip({
  player,
  goals,
  team,
  onAdd,
  onRemove,
}: {
  player: BoardPlayer;
  goals: number;
  team: string;
  onAdd: () => void;
  onRemove: () => void;
}) {
  const m = useMessages();
  const t = m.webTournament.footballScore;
  const scored = goals > 0;
  const name = player.isViewer ? m.common.you : shortName(player.name);
  return (
    <li
      className={cn(
        "flex items-center rounded-lg border",
        scored
          ? "bg-control text-on-control border-ink"
          : "bg-paper border-rule",
      )}
    >
      <button
        type="button"
        aria-label={t.addGoalLabel(player.name, team, goals)}
        onClick={onAdd}
        className="focus-visible:ring-ring/50 flex items-center gap-1.5 py-1 pe-2.5 ps-1 outline-none focus-visible:ring-[3px]"
      >
        <UserAvatar name={player.name} image={player.image} size="sm" />
        <span className="text-meta font-semibold">{name}</span>
        <span
          className={cn(
            "text-[12px]",
            scored ? "text-on-control-muted" : "text-muted-foreground",
          )}
        >
          {scored ? m.game.played.goals(goals) : team}
        </span>
      </button>
      {scored ? (
        <button
          type="button"
          aria-label={t.takeGoalAway(player.name)}
          onClick={onRemove}
          className="border-control-rule focus-visible:ring-ring/50 flex h-full items-center border-s px-2 outline-none focus-visible:ring-[3px]"
        >
          <Minus aria-hidden="true" className="size-3.5" />
        </button>
      ) : null}
    </li>
  );
}

/**
 * Either side, or an Organizer, enters the goals after the game and may name
 * who scored. The other side confirms the Score from the Game.
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
  const [draft, setDraft] = React.useState<ScoreDraft | null>(null);
  const gameHref = `/dashboard/games/${gameId}`;

  React.useEffect(() => {
    if (isFootball === false) {
      router.replace(gameHref);
    }
  }, [isFootball, router, gameHref]);

  React.useEffect(() => {
    if (board.data && draft == null) {
      const goals: Record<string, number> = {};
      for (const player of board.data.players) {
        if (player.goals > 0) {
          goals[player.userId] = player.goals;
        }
      }
      setDraft({
        slot1: board.data.match?.score?.slot1 ?? 0,
        slot2: board.data.match?.score?.slot2 ?? 0,
        goals,
      });
    }
  }, [board.data, draft]);

  const save = api.games.saveFootballScore.useMutation({
    meta: OWN_ERROR_UI,
    onSuccess: async () => {
      toast.success(t.savedToast);
      await Promise.all([
        utils.games.footballBoard.invalidate({ gameId }),
        utils.games.byId.invalidate({ id: gameId }),
        utils.games.listMyGames.invalidate(),
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
  } else if (!board.data || !teams || !draft) {
    body = <Skeleton className="h-80 w-full rounded-xl" />;
  } else {
    const players = board.data.players;
    const names = bibNames(teams.bibs, locale);
    const viewerSide = board.data.viewer.sideIndex;
    const otherName =
      viewerSide === 1 ? names.slot2 : viewerSide === 2 ? names.slot1 : null;
    const step = (side: Side, delta: -1 | 1) =>
      setDraft({
        ...draft,
        [side === 1 ? "slot1" : "slot2"]: stepFootballGoals(
          side === 1 ? draft.slot1 : draft.slot2,
          delta,
        ),
      });
    const scorers = [
      ...sideMembers(players, 1),
      ...sideMembers(players, 2),
    ].filter((player) => player.role !== "keeper");
    body = (
      <div className="space-y-5">
        <section className="border-rule bg-paper overflow-hidden rounded-xl border">
          <div className="divide-rule flex divide-x">
            <SideStepper
              bib={teams.bibs.slot1}
              name={names.slot1}
              goals={draft.slot1}
              members={sideMembers(players, 1)}
              onStep={(delta) => step(1, delta)}
            />
            <SideStepper
              bib={teams.bibs.slot2}
              name={names.slot2}
              goals={draft.slot2}
              members={sideMembers(players, 2)}
              onStep={(delta) => step(2, delta)}
            />
          </div>
          <p aria-live="polite" className="border-rule border-t p-5">
            {footballResultLine(draft, names, locale)}
          </p>
        </section>

        <section className="border-rule bg-paper overflow-hidden rounded-xl border">
          <div className="flex justify-between px-5 pb-3 pt-5">
            <h2 className="text-muted-foreground">{t.scorersOptional}</h2>
            <span className="text-muted-foreground text-meta">
              {t.selectNameHint}
            </span>
          </div>
          <ul className="border-rule flex flex-wrap gap-2 border-t p-5">
            {scorers.map((player) => (
              <ScorerChip
                key={player.userId}
                player={player}
                goals={draft.goals[player.userId] ?? 0}
                team={player.sideIndex === 1 ? names.slot1 : names.slot2}
                onAdd={() => setDraft(addGoal(draft, player, players))}
                onRemove={() => setDraft(removeGoal(draft, player.userId))}
              />
            ))}
          </ul>
          <p className="border-rule text-muted-foreground text-meta border-t p-5">
            {scorersNote(draft, players, names, locale)}
          </p>
        </section>

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
                slot1Goals: draft.slot1,
                slot2Goals: draft.slot2,
                scorers: scorersPayload(draft),
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
