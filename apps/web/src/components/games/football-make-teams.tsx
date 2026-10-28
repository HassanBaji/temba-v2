"use client";

import { bibColors, colors } from "@repo/design-tokens";
import {
  balancedSides,
  draftSummary,
  initialTeamsDraft,
  keeperWord,
  levelLabel,
  moveAcross,
  placeOn,
  sideAverage,
  slotCode,
  switchMethod,
  type BoardPlayer,
  type Side,
  type TeamsDraft,
} from "@repo/domain/football-board";
import {
  FOOTBALL_TEAMS_METHODS,
  type FootballBib,
  type FootballTeamsMethod,
} from "@repo/domain/football-lineup";
import { formatGameStart } from "@repo/domain/format-game-start";
import { ArrowLeft, ArrowRight, Shuffle } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import * as React from "react";
import { toast } from "sonner";

import { ErrorState } from "~/components/common/error-state";
import { UserAvatar } from "~/components/common/user-avatar";
import { DashboardShell } from "~/components/dashboard-shell";
import { Button } from "~/components/ui/button";
import { Skeleton } from "~/components/ui/skeleton";
import { cn } from "~/lib/utils";
import { api } from "~/trpc/react";

import { BibChip, BibPicker, bibStyle } from "./football-bibs";
import { BibRow } from "./football-team-columns";

const METHOD_LABELS: Record<FootballTeamsMethod, string> = {
  level: "By level",
  manual: "Manual",
};

function MethodToggle({
  method,
  onChange,
}: {
  method: FootballTeamsMethod;
  onChange: (method: FootballTeamsMethod) => void;
}) {
  return (
    <div
      role="radiogroup"
      aria-label="How to make teams"
      className="border-rule flex overflow-hidden rounded-lg border"
    >
      {FOOTBALL_TEAMS_METHODS.map((value) => {
        const selected = value === method;
        return (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(value)}
            className={cn(
              "text-meta focus-visible:ring-ring/50 h-10 flex-1 outline-none focus-visible:ring-[3px]",
              selected
                ? "bg-ink text-paper font-semibold"
                : "bg-paper text-muted-foreground hover:bg-wash",
            )}
          >
            {METHOD_LABELS[value]}
          </button>
        );
      })}
    </div>
  );
}

function barColor(bib: FootballBib) {
  const fill = bibColors[bib].fill;
  return fill === colors.paper ? colors.inputBorder : fill;
}

function BalanceCard({
  draft,
  summary,
}: {
  draft: TeamsDraft;
  summary: ReturnType<typeof draftSummary>;
}) {
  const row = (side: Side) => {
    const bib = side === 1 ? draft.bibs.slot1 : draft.bibs.slot2;
    const members = side === 1 ? summary.slot1 : summary.slot2;
    const name = side === 1 ? summary.names.slot1 : summary.names.slot2;
    const share = Math.min(1, members.length / Math.max(1, summary.teamSize));
    return (
      <div className="space-y-1.5">
        <div className="flex items-center gap-2">
          <BibChip bib={bib} className="size-4" />
          <span className="font-semibold">{name}</span>
          <span className="text-muted-foreground text-meta flex-1">
            avg {sideAverage(members)}, {keeperWord(members)}
          </span>
          <span className="font-expanded tabular-nums">
            {draft.method === "manual"
              ? `${members.length} of ${summary.teamSize}`
              : members.length}
          </span>
        </div>
        <div className="bg-wash h-1.5 overflow-hidden rounded-full">
          <div
            className="h-full"
            style={{
              width: `${Math.round(share * 100)}%`,
              backgroundColor: barColor(bib),
            }}
          />
        </div>
      </div>
    );
  };
  return (
    <section className="border-rule bg-paper space-y-3 rounded-xl border p-5">
      {row(1)}
      {row(2)}
      <p aria-live="polite" className="text-muted-foreground text-meta">
        {summary.problem ?? `${summary.note} Ready to publish.`}
      </p>
    </section>
  );
}

function LevelColumns({
  draft,
  summary,
  onMove,
}: {
  draft: TeamsDraft;
  summary: ReturnType<typeof draftSummary>;
  onMove: (userId: string) => void;
}) {
  const column = (side: Side) => {
    const bib = side === 1 ? draft.bibs.slot1 : draft.bibs.slot2;
    const members = side === 1 ? summary.slot1 : summary.slot2;
    const Icon = side === 1 ? ArrowRight : ArrowLeft;
    const { fill, on } = bibColors[bib];
    return (
      <ul className="min-w-0 flex-1 space-y-2">
        {members.map((player) => (
          <li key={player.userId}>
            <BibRow
              player={player}
              bib={bib}
              trailing={
                <button
                  type="button"
                  aria-label={`Move ${player.name} to the other team`}
                  onClick={() => onMove(player.userId)}
                  className="focus-visible:ring-ring/50 flex size-[26px] shrink-0 items-center justify-center rounded-md outline-none focus-visible:ring-[3px]"
                  style={{ backgroundColor: on, color: fill }}
                >
                  <Icon aria-hidden="true" className="size-3.5" />
                </button>
              }
            />
          </li>
        ))}
      </ul>
    );
  };
  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        {column(1)}
        {column(2)}
      </div>
      <p className="text-muted-foreground text-meta">
        No subs are set here. Each captain picks starters before kick-off and
        runs the swaps on the pitch.
      </p>
    </div>
  );
}

function SwatchButton({
  bib,
  selected,
  label,
  onClick,
}: {
  bib: FootballBib;
  selected: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={selected}
      onClick={onClick}
      className={cn(
        "focus-visible:ring-ring/50 size-[34px] shrink-0 rounded-sm border-2 p-0.5 outline-none focus-visible:ring-[3px]",
        selected ? "border-current" : "border-transparent",
      )}
    >
      <span
        className={cn(
          "block size-full rounded-[4px] border",
          !selected && "opacity-55",
        )}
        style={bibStyle(bib)}
      />
    </button>
  );
}

function ManualRow({
  player,
  draft,
  names,
  onPlace,
}: {
  player: BoardPlayer;
  draft: TeamsDraft;
  names: { slot1: string; slot2: string };
  onPlace: (side: Side) => void;
}) {
  const side = draft.sides[player.userId];
  const bib =
    side === 1 ? draft.bibs.slot1 : side === 2 ? draft.bibs.slot2 : null;
  const code = slotCode(player);
  return (
    <li
      className={cn(
        "flex items-center gap-2.5 rounded-md border px-2.5 py-1.5",
        bib ? null : "bg-paper border-input border-dashed",
      )}
      style={bib ? bibStyle(bib) : undefined}
    >
      <UserAvatar name={player.name} image={player.image} />
      <div className="min-w-0 flex-1">
        <p className="truncate">{player.isViewer ? "You" : player.name}</p>
        {code ? (
          <p className="font-mono text-[11px] opacity-70">{code}</p>
        ) : null}
      </div>
      <span className="font-expanded">{levelLabel(player.levelBand)}</span>
      <SwatchButton
        bib={draft.bibs.slot1}
        selected={side === 1}
        label={`Put ${player.name} in ${names.slot1}`}
        onClick={() => onPlace(1)}
      />
      <SwatchButton
        bib={draft.bibs.slot2}
        selected={side === 2}
        label={`Put ${player.name} in ${names.slot2}`}
        onClick={() => onPlace(2)}
      />
    </li>
  );
}

function ManualLists({
  draft,
  summary,
  onPlace,
}: {
  draft: TeamsDraft;
  summary: ReturnType<typeof draftSummary>;
  onPlace: (userId: string, side: Side) => void;
}) {
  const group = (
    key: string,
    title: React.ReactNode,
    meta: string,
    members: readonly BoardPlayer[],
  ) =>
    members.length > 0 ? (
      <section key={key} className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-2 font-semibold">{title}</h2>
          <span className="text-muted-foreground text-meta">{meta}</span>
        </div>
        <ul className="space-y-2">
          {members.map((player) => (
            <ManualRow
              key={player.userId}
              player={player}
              draft={draft}
              names={summary.names}
              onPlace={(side) => onPlace(player.userId, side)}
            />
          ))}
        </ul>
      </section>
    ) : null;
  return (
    <div className="space-y-5">
      {group(
        "unplaced",
        "Not placed",
        `${summary.unplaced.length} left`,
        summary.unplaced,
      )}
      {group(
        "slot1",
        <>
          <BibChip bib={draft.bibs.slot1} className="size-3.5" />
          {summary.names.slot1}
        </>,
        `${summary.slot1.length} of ${summary.teamSize}`,
        summary.slot1,
      )}
      {group(
        "slot2",
        <>
          <BibChip bib={draft.bibs.slot2} className="size-3.5" />
          {summary.names.slot2}
        </>,
        `${summary.slot2.length} of ${summary.teamSize}`,
        summary.slot2,
      )}
    </div>
  );
}

/**
 * The Organizer splits the pool into two teams, by Level or by hand, picks
 * each team's bib colour and publishes.
 */
export function FootballMakeTeams({ gameId }: { gameId: string }) {
  const router = useRouter();
  const utils = api.useUtils();
  const game = api.games.byId.useQuery({ id: gameId });
  const board = api.games.footballBoard.useQuery({ gameId });
  const [draft, setDraft] = React.useState<TeamsDraft | null>(null);
  const gameHref = `/dashboard/games/${gameId}`;

  React.useEffect(() => {
    if (board.data && draft == null) {
      setDraft(initialTeamsDraft(board.data.players, board.data.teams));
    }
  }, [board.data, draft]);

  const publish = api.games.publishFootballTeams.useMutation({
    onSuccess: async () => {
      toast.success("Teams published");
      await Promise.all([
        utils.games.footballBoard.invalidate({ gameId }),
        utils.games.byId.invalidate({ id: gameId }),
        utils.games.listMyGames.invalidate(),
      ]);
      router.push(gameHref);
    },
  });

  const players = board.data?.players ?? [];
  const summary = draft ? draftSummary(draft, players) : null;
  const back = (
    <Button variant="outline" asChild>
      <Link href={gameHref}>Back to the game</Link>
    </Button>
  );

  let body: React.ReactNode;
  if (board.error) {
    body = (
      <ErrorState
        title="The pool could not be loaded"
        message={board.error.message}
        onRetry={() => void board.refetch()}
      />
    );
  } else if (board.data && !board.data.viewer.canMakeTeams) {
    body = (
      <section className="border-rule bg-paper space-y-1 rounded-xl border p-5">
        <h2 className="font-semibold">Teams are fixed</h2>
        <p className="text-muted-foreground text-meta">
          Only an organizer makes the teams, and only until the score is in.
        </p>
      </section>
    );
  } else if (!draft || !summary) {
    body = <Skeleton className="h-80 w-full rounded-xl" />;
  } else {
    const start = game.data?.windowStart ?? null;
    const sideSize = game.data?.sideSize ?? null;
    const intro = [
      start ? formatGameStart(start) : null,
      `${summary.teamSize} per team${sideSize ? `, ${sideSize} start` : ""}`,
    ]
      .filter(Boolean)
      .join(". ");
    body = (
      <div className="space-y-5">
        <p className="text-muted-foreground text-meta">
          {intro}.{" "}
          {draft.method === "level"
            ? "Use the arrow on a row to move that player to the other team."
            : "Pick a swatch to place a player; placed rows take their team colour."}
        </p>
        <MethodToggle
          method={draft.method}
          onChange={(method) => setDraft(switchMethod(draft, method, players))}
        />
        <BibPicker
          bibs={draft.bibs}
          onChange={(bibs) => setDraft({ ...draft, bibs })}
        />
        <BalanceCard draft={draft} summary={summary} />
        {draft.method === "level" ? (
          <LevelColumns
            draft={draft}
            summary={summary}
            onMove={(userId) => setDraft(moveAcross(draft, userId))}
          />
        ) : (
          <ManualLists
            draft={draft}
            summary={summary}
            onPlace={(userId, side) => setDraft(placeOn(draft, userId, side))}
          />
        )}
        {publish.error ? (
          <p role="alert" className="text-destructive text-meta">
            {publish.error.message}
          </p>
        ) : null}
        <div className="border-rule bg-background sticky bottom-0 flex gap-2 border-t py-4">
          {draft.method === "level" ? (
            <Button
              type="button"
              variant="outline"
              size="lg"
              onClick={() =>
                setDraft({
                  ...draft,
                  sides: balancedSides(players, Math.random),
                })
              }
            >
              <Shuffle aria-hidden="true" />
              Shuffle
            </Button>
          ) : (
            <Button
              type="button"
              variant="outline"
              size="lg"
              onClick={() => setDraft({ ...draft, sides: {} })}
            >
              Clear
            </Button>
          )}
          <Button
            type="button"
            size="lg"
            className="flex-1"
            disabled={summary.problem != null}
            pending={publish.isPending}
            onClick={() =>
              publish.mutate({
                gameId,
                method: draft.method,
                bibs: draft.bibs,
                slot1: summary.slot1.map((player) => player.userId),
                slot2: summary.slot2.map((player) => player.userId),
              })
            }
          >
            Publish teams
          </Button>
        </div>
      </div>
    );
  }

  return (
    <DashboardShell
      title={draft?.method === "manual" ? "Manual teams" : "Make teams"}
      description={`${players.length} in the pool`}
      action={back}
      isSubPage
      hideNav
    >
      {body}
    </DashboardShell>
  );
}
