"use client";

import {
  ArrowLeftRightIcon,
  CheckIcon,
  ChevronDownIcon,
  HandIcon,
  LayersIcon,
  ShuffleIcon,
  SparklesIcon,
  StepForwardIcon,
} from "lucide-react";
import * as React from "react";

import { formatGameClock } from "@repo/domain/format-game-start";

import { ScoreText } from "~/components/temba/score-text";
import { Button } from "~/components/ui/button";
import { Hatch } from "~/components/ui/hatch";
import { useLocale, useMessages } from "~/components/locale-provider";
import { pageBleed } from "~/lib/page-layout";
import { cn } from "~/lib/utils";

import {
  ROUND_CARD,
  RoundCode,
  TeamMark,
  TeamNames,
  teamShortName,
  type RoundsMatch,
  type RoundsRound,
  type RoundsTeam,
  type TournamentRoundsData,
} from "./tournament-round-parts";
import { type ScoreSheetTarget } from "./tournament-score-drawer";
import { type SwapTarget } from "./tournament-swap-drawer";
import { type TournamentRoundsActions } from "./use-tournament-rounds";

type Way = "all" | "next" | "byHand";
const WAYS: readonly Way[] = ["all", "next", "byHand"];

const SMALL_ACTION =
  "border-rule focus-visible:ring-ring/50 text-meta inline-flex min-h-11 shrink-0 items-center gap-1 rounded-md border px-2.5 font-semibold outline-none focus-visible:ring-[3px]";
const INK_ACTION =
  "bg-ink text-paper focus-visible:ring-ring/50 text-meta inline-flex min-h-11 shrink-0 items-center rounded-md px-2.5 font-semibold outline-none focus-visible:ring-[3px]";

function scoreLabel(match: RoundsMatch) {
  return match.slot1GamesWon != null && match.slot2GamesWon != null
    ? `${match.slot1GamesWon}–${match.slot2GamesWon}`
    : null;
}

export function roundMetaLine(
  round: RoundsRound,
  m: ReturnType<typeof useMessages>["tournamentRounds"],
  locale: Parameters<typeof formatGameClock>[1],
) {
  const time = round.startTime ? formatGameClock(round.startTime, locale) : "";
  const count = m.round.games(round.expectedMatchCount);
  if (round.state === "draft") {
    return `${time}, ${count}, ${m.round.draft}`;
  }
  if (round.state === "played") {
    return `${time}, ${count}, ${m.round.played}`;
  }
  if (round.state === "on_court") {
    const scored = round.matches.filter(
      (match) => match.state === "confirmed" || match.state === "cancelled",
    ).length;
    return `${time}, ${m.round.onCourt}. ${m.round.scoresIn(scored, round.matches.length)}`;
  }
  return `${time}, ${count}, ${m.round.posted}`;
}

function MatchTrailing({
  roundNumber,
  match,
  teams,
  onEnterScore,
  onSwap,
}: {
  roundNumber: number;
  match: RoundsMatch;
  teams: ReadonlyMap<string, RoundsTeam>;
  onEnterScore: (target: ScoreSheetTarget) => void;
  onSwap: (target: SwapTarget) => void;
}) {
  const m = useMessages().tournamentRounds;
  const team1 = teamShortName(teams.get(match.slot1GameTeamId));
  const team2 = teamShortName(teams.get(match.slot2GameTeamId));
  const score = scoreLabel(match);

  if (
    match.state === "draft" ||
    (match.state === "scheduled" && match.canSwap)
  ) {
    return (
      <button
        type="button"
        aria-label={m.round.swapFor(team1)}
        onClick={() => onSwap({ roundNumber, match })}
        className={SMALL_ACTION}
      >
        <ArrowLeftRightIcon aria-hidden="true" className="size-4" />
        {m.round.swap}
      </button>
    );
  }
  if (match.state === "awaiting_confirmation") {
    return match.canConfirm ? (
      <button
        type="button"
        onClick={() => onEnterScore({ roundNumber, match, mode: "confirm" })}
        className={INK_ACTION}
      >
        {m.confirm.confirm(score ?? "")}
      </button>
    ) : (
      <span className="flex shrink-0 flex-col items-end">
        <ScoreText className="font-expanded text-muted-foreground text-[16px]">
          {score ?? ""}
        </ScoreText>
        <span className="text-muted-foreground text-[11px]">
          {m.round.waiting}
        </span>
      </span>
    );
  }
  if (match.state === "confirmed") {
    return (
      <span className="flex shrink-0 items-center gap-2">
        <ScoreText className="font-expanded text-[16px]">
          {score ?? ""}
        </ScoreText>
        {match.canEnterScore ? (
          <button
            type="button"
            aria-label={m.round.editFor(team1, team2)}
            onClick={() => onEnterScore({ roundNumber, match, mode: "enter" })}
            className="text-muted-foreground text-meta focus-visible:ring-ring/50 min-h-11 px-1 underline-offset-2 outline-none hover:underline focus-visible:ring-[3px]"
          >
            {m.round.edit}
          </button>
        ) : null}
      </span>
    );
  }
  if (match.canEnterScore) {
    return (
      <span className="flex shrink-0 flex-col items-end gap-0.5">
        <button
          type="button"
          aria-label={m.round.enterScoreFor(team1, team2)}
          onClick={() => onEnterScore({ roundNumber, match, mode: "enter" })}
          className={INK_ACTION}
        >
          {m.round.enterScore}
        </button>
        {match.state === "not_finished" ? (
          <span className="text-muted-foreground text-[11px]">
            {m.round.notFinished}
          </span>
        ) : null}
      </span>
    );
  }
  if (match.state === "not_finished" || match.state === "cancelled") {
    return (
      <span className="text-muted-foreground text-meta shrink-0">
        {match.state === "cancelled" ? m.round.notPlayed : m.round.notFinished}
      </span>
    );
  }
  return (
    <span className="flex shrink-0 items-center">
      <Hatch className="border-rule size-5 rounded-full border" />
      <span className="sr-only">{m.round.notYet}</span>
    </span>
  );
}

function MatchRow({
  roundNumber,
  match,
  teams,
  viewerUserId,
  viewerGameTeamId,
  showTime,
  onEnterScore,
  onSwap,
}: {
  roundNumber: number;
  match: RoundsMatch;
  teams: ReadonlyMap<string, RoundsTeam>;
  viewerUserId: string;
  viewerGameTeamId: string | null;
  showTime: boolean;
  onEnterScore: (target: ScoreSheetTarget) => void;
  onSwap: (target: SwapTarget) => void;
}) {
  const locale = useLocale();
  const m = useMessages().tournamentRounds;
  const team1 = teams.get(match.slot1GameTeamId);
  const team2 = teams.get(match.slot2GameTeamId);
  const viewerPlays =
    viewerGameTeamId === match.slot1GameTeamId ||
    viewerGameTeamId === match.slot2GameTeamId;
  return (
    <li
      className={cn(
        "flex min-h-14 items-center gap-2 px-3 py-3",
        viewerPlays && "bg-wash",
      )}
    >
      <span className="w-12 shrink-0">
        <span className="text-meta block font-semibold">{match.courtName}</span>
        {showTime && match.startTime ? (
          <span className="text-muted-foreground text-[11px]">
            {formatGameClock(match.startTime, locale)}
          </span>
        ) : null}
      </span>
      <TeamMark
        team={team1}
        isViewer={viewerGameTeamId === match.slot1GameTeamId}
      />
      <TeamNames team={team1} viewerUserId={viewerUserId} className="flex-1" />
      <span aria-hidden="true" className="text-muted-foreground text-[11px]">
        {m.round.vs}
      </span>
      <TeamNames team={team2} viewerUserId={viewerUserId} className="flex-1" />
      <TeamMark
        team={team2}
        isViewer={viewerGameTeamId === match.slot2GameTeamId}
      />
      <MatchTrailing
        roundNumber={roundNumber}
        match={match}
        teams={teams}
        onEnterScore={onEnterScore}
        onSwap={onSwap}
      />
    </li>
  );
}

function RoundCard({
  round,
  open,
  onToggle,
  teams,
  viewerUserId,
  viewerGameTeamId,
  onEnterScore,
  onSwap,
}: {
  round: RoundsRound;
  open: boolean;
  onToggle: () => void;
  teams: ReadonlyMap<string, RoundsTeam>;
  viewerUserId: string;
  viewerGameTeamId: string | null;
  onEnterScore: (target: ScoreSheetTarget) => void;
  onSwap: (target: SwapTarget) => void;
}) {
  const m = useMessages().tournamentRounds;
  const locale = useLocale();
  const listId = React.useId();
  return (
    <section className={ROUND_CARD}>
      <h3>
        <button
          type="button"
          aria-expanded={open}
          aria-controls={listId}
          onClick={onToggle}
          className="focus-visible:ring-ring/50 flex min-h-14 w-full items-center gap-3 px-4 py-3 text-start outline-none focus-visible:ring-[3px] focus-visible:ring-inset"
        >
          <RoundCode roundNumber={round.roundNumber} />
          <span className="min-w-0 flex-1">
            <span className="text-body block font-semibold">
              {m.round.title(round.roundNumber)}
            </span>
            <span className="text-muted-foreground text-meta block">
              {roundMetaLine(round, m, locale)}
            </span>
          </span>
          <ChevronDownIcon
            aria-hidden="true"
            className={cn(
              "text-muted-foreground size-5 shrink-0 transition-transform",
              open && "rotate-180",
            )}
          />
        </button>
      </h3>
      {open ? (
        <ul id={listId} className="border-rule divide-rule divide-y border-t">
          {round.matches.map((match) => (
            <MatchRow
              key={match.matchId ?? `draft-${match.position}`}
              roundNumber={round.roundNumber}
              match={match}
              teams={teams}
              viewerUserId={viewerUserId}
              viewerGameTeamId={viewerGameTeamId}
              showTime={round.state === "draft" || round.state === "scheduled"}
              onEnterScore={onEnterScore}
              onSwap={onSwap}
            />
          ))}
        </ul>
      ) : null}
    </section>
  );
}

function WayCard({
  icon,
  title,
  body,
  value,
  selected,
  disabled,
  onSelect,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
  value: Way;
  selected: boolean;
  disabled: boolean;
  onSelect: (way: Way) => void;
}) {
  return (
    <label
      className={cn(
        "rounded-card has-focus-visible:ring-ring/50 has-focus-visible:ring-[3px] has-disabled:opacity-60 flex w-full cursor-pointer items-center gap-4 border p-5 text-start",
        selected
          ? "border-ink bg-control text-on-control"
          : "border-rule bg-paper text-ink hover:bg-wash",
      )}
    >
      <input
        type="radio"
        name="tournament-rounds-way"
        value={value}
        checked={selected}
        disabled={disabled}
        onChange={() => onSelect(value)}
        className="sr-only"
      />
      <span
        aria-hidden="true"
        className={cn(
          "inline-flex size-10 shrink-0 items-center justify-center self-start rounded-md border",
          selected ? "border-control-rule bg-control-raised" : "border-rule",
        )}
      >
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="text-title block font-semibold">{title}</span>
        <span
          className={cn(
            "text-meta mt-1 block leading-relaxed",
            selected ? "text-on-control-muted" : "text-muted-foreground",
          )}
        >
          {body}
        </span>
      </span>
      <span
        aria-hidden="true"
        className={cn(
          "inline-flex size-6 shrink-0 items-center justify-center rounded-full border",
          selected ? "bg-on-control border-on-control" : "border-rule",
        )}
      >
        {selected ? (
          <span className="bg-control size-2.5 rounded-full" />
        ) : null}
      </span>
    </label>
  );
}

function SummaryRows({ rows }: { rows: { label: string; value: string }[] }) {
  return (
    <dl className={cn(ROUND_CARD, "divide-rule divide-y")}>
      {rows.map((row) => (
        <div
          key={row.label}
          className="flex min-h-12 items-center gap-3 px-5 py-3"
        >
          <dt className="text-muted-foreground text-body flex-1">
            {row.label}
          </dt>
          <dd className="text-body text-end">{row.value}</dd>
        </div>
      ))}
    </dl>
  );
}

function NotMadeCard({
  round,
  restCount,
  pending,
  onGenerate,
  onGenerateRest,
  onPair,
}: {
  round: RoundsRound;
  restCount: number;
  pending: boolean;
  onGenerate: () => void;
  onGenerateRest: () => void;
  onPair: () => void;
}) {
  const m = useMessages().tournamentRounds;
  const locale = useLocale();
  return (
    <section className="rounded-card border-rule relative overflow-hidden border border-dashed p-3">
      <Hatch className="absolute inset-0" />
      <div className="bg-paper rounded-card relative p-5">
        <div className="flex items-start gap-3">
          <RoundCode roundNumber={round.roundNumber} muted />
          <div className="min-w-0">
            <h3 className="text-body font-semibold">
              {m.notMade.title(round.roundNumber)}
            </h3>
            {round.startTime ? (
              <p className="text-muted-foreground text-meta">
                {m.notMade.meta(formatGameClock(round.startTime, locale))}
              </p>
            ) : null}
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2.5">
          <Button
            type="button"
            disabled={pending}
            aria-busy={pending}
            onClick={onGenerate}
            className="font-semibold"
          >
            <SparklesIcon aria-hidden="true" />
            {pending
              ? m.notMade.generating
              : m.notMade.generate(round.roundNumber)}
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={pending}
            onClick={onPair}
          >
            {m.notMade.pairMyself}
          </Button>
          {restCount > 1 ? (
            <Button
              type="button"
              variant="outline"
              disabled={pending}
              onClick={onGenerateRest}
            >
              {m.notMade.generateRest}
            </Button>
          ) : null}
        </div>
        <p className="text-muted-foreground text-meta mt-4 leading-relaxed">
          {m.notMade.note}
        </p>
      </div>
    </section>
  );
}

function defaultOpenRounds(
  rounds: readonly RoundsRound[],
  current: number | null,
) {
  const open = new Set<number>();
  if (current != null) {
    open.add(current);
  }
  const firstDraft = rounds.find((round) => round.state === "draft");
  if (firstDraft) {
    open.add(firstDraft.roundNumber);
  }
  const nextPosted = rounds.find(
    (round) => round.state === "scheduled" && round.roundNumber !== current,
  );
  if (nextPosted && open.size < 2) {
    open.add(nextPosted.roundNumber);
  }
  return open;
}

export function TournamentRoundsTab({
  gameId,
  data,
  teams,
  viewerUserId,
  actions,
  details,
  afterGroup,
  onEnterScore,
  onSwap,
  onPair,
}: {
  gameId: string;
  data: TournamentRoundsData;
  teams: ReadonlyMap<string, RoundsTeam>;
  viewerUserId: string;
  actions: TournamentRoundsActions;
  details?: React.ReactNode;
  afterGroup?: { label: string; value: string } | null;
  onEnterScore: (target: ScoreSheetTarget) => void;
  onSwap: (target: SwapTarget) => void;
  onPair: (roundNumber: number) => void;
}) {
  const m = useMessages().tournamentRounds;
  const locale = useLocale();
  const [open, setOpen] = React.useState<Set<number>>(() =>
    defaultOpenRounds(data.rounds, data.currentRoundNumber),
  );
  const made = data.rounds.filter((round) => round.matches.length > 0);
  const notMade = data.rounds.filter((round) => round.state === "not_made");
  const drafts = data.rounds.filter((round) => round.state === "draft");
  const generating = actions.generate.isPending;
  const [way, setWay] = React.useState<Way>("all");
  const wayPromptId = React.useId();

  function toggle(roundNumber: number) {
    setOpen((current) => {
      const next = new Set(current);
      if (next.has(roundNumber)) {
        next.delete(roundNumber);
      } else {
        next.add(roundNumber);
      }
      return next;
    });
  }

  async function generate(scope: "all" | "rest" | "next") {
    try {
      const result = await actions.generate.mutateAsync({ gameId, scope });
      const first = result.roundNumbers[0];
      if (first != null) {
        setOpen((current) => new Set([...current, first]));
      }
    } catch {
      return;
    }
  }

  async function post(roundNumbers: number[]) {
    try {
      await actions.post.mutateAsync({ gameId, roundNumbers });
    } catch {
      return;
    }
  }

  if (!data.isOrganizer) {
    const firstHidden = notMade[0]?.roundNumber;
    const lastHidden = notMade[notMade.length - 1]?.roundNumber;
    return (
      <div className="space-y-3">
        {made.map((round) => (
          <RoundCard
            key={round.roundNumber}
            round={round}
            open={open.has(round.roundNumber)}
            onToggle={() => toggle(round.roundNumber)}
            teams={teams}
            viewerUserId={viewerUserId}
            viewerGameTeamId={data.viewerGameTeamId}
            onEnterScore={onEnterScore}
            onSwap={onSwap}
          />
        ))}
        {firstHidden != null && lastHidden != null ? (
          <div className="rounded-card border-rule relative overflow-hidden border border-dashed p-3">
            <Hatch className="absolute inset-0" />
            <p className="bg-paper text-muted-foreground text-meta rounded-card relative px-4 py-3 leading-relaxed">
              {m.notMade.later(firstHidden, lastHidden)}
            </p>
          </div>
        ) : null}
        {details ? <div className="pt-3">{details}</div> : null}
      </div>
    );
  }

  if (made.length === 0) {
    const firstSlot = data.rounds[0]?.slots[0];
    const ways: Record<
      Way,
      { icon: React.ReactNode; title: string; body: string; next: string }
    > = {
      all: {
        icon: <LayersIcon className="size-5" />,
        title: m.ways.generateAllTitle(data.roundCount),
        body: m.ways.generateAllBody,
        next: m.ways.generateAllNext,
      },
      next: {
        icon: <StepForwardIcon className="size-5" />,
        title: m.ways.oneAtATimeTitle,
        body: m.ways.oneAtATimeBody,
        next: m.ways.oneAtATimeNext,
      },
      byHand: {
        icon: <HandIcon className="size-5" />,
        title: m.ways.byHandTitle,
        body: m.ways.byHandBody,
        next: m.ways.byHandNext,
      },
    };

    function continueWithWay() {
      if (way === "byHand") {
        onPair(1);
        return;
      }
      void generate(way);
    }

    return (
      <div className="space-y-3">
        <p id={wayPromptId} className="text-muted-foreground text-body">
          {m.ways.prompt}
        </p>
        <div
          role="radiogroup"
          aria-labelledby={wayPromptId}
          className="space-y-3"
        >
          {WAYS.map((value) => (
            <WayCard
              key={value}
              value={value}
              icon={ways[value].icon}
              title={ways[value].title}
              body={ways[value].body}
              selected={way === value}
              disabled={generating}
              onSelect={setWay}
            />
          ))}
        </div>
        <div className="pt-3">
          <SummaryRows
            rows={[
              {
                label: m.ways.courts,
                value: m.ways.courtsValue(data.courtCount),
              },
              ...(firstSlot
                ? [
                    {
                      label: m.ways.slot,
                      value: m.ways.slotValue(
                        data.matchMinutes,
                        formatGameClock(firstSlot.startTime, locale),
                      ),
                    },
                  ]
                : []),
              { label: m.ways.points, value: m.ways.pointsValue },
              ...(afterGroup ? [afterGroup] : []),
            ]}
          />
        </div>
        <p className="text-muted-foreground text-meta leading-relaxed">
          {m.ways.footer}
        </p>
        <div
          className={cn(
            "border-rule bg-background sticky bottom-0 z-10 mt-3 flex items-center gap-4 border-t pb-[max(0.875rem,env(safe-area-inset-bottom))] pt-3.5",
            pageBleed,
          )}
        >
          <div className="min-w-0 flex-1">
            <p className="text-body truncate font-semibold">
              {ways[way].title}
            </p>
            <p className="text-muted-foreground text-meta truncate">
              {ways[way].next}
            </p>
          </div>
          <Button
            type="button"
            size="lg"
            className="shrink-0 px-8 font-semibold"
            disabled={generating}
            aria-busy={generating}
            onClick={continueWithWay}
          >
            {generating ? m.ways.continuing : m.ways.continue}
          </Button>
        </div>
      </div>
    );
  }

  const lastPlayed = [...data.rounds]
    .reverse()
    .find((round) => round.state === "played");
  const nextNotMade = notMade[0];
  const laterFrom = notMade[1]?.roundNumber;
  const laterTo = notMade[notMade.length - 1]?.roundNumber;
  const firstDraft = drafts[0];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-muted-foreground text-meta">
          {m.round.roundRobin(data.roundCount)}
        </p>
        {drafts.length > 0 ? (
          <button
            type="button"
            disabled={generating}
            aria-busy={generating}
            onClick={() => void generate("all")}
            className="text-meta focus-visible:ring-ring/50 inline-flex min-h-11 items-center gap-1.5 font-semibold outline-none focus-visible:ring-[3px] disabled:opacity-60"
          >
            <ShuffleIcon aria-hidden="true" className="size-4" />
            {generating ? m.round.regenerating : m.round.regenerate}
          </button>
        ) : null}
      </div>

      {lastPlayed &&
      data.currentRoundNumber != null &&
      lastPlayed.roundNumber === data.currentRoundNumber - 1 ? (
        <div
          role="status"
          className="border-ink rounded-card flex items-center gap-3 border p-4"
        >
          <span
            aria-hidden="true"
            className="bg-ink text-paper inline-flex size-8 shrink-0 items-center justify-center rounded-md"
          >
            <CheckIcon className="size-4" />
          </span>
          <div>
            <p className="text-body font-semibold">
              {m.round.complete(
                lastPlayed.roundNumber,
                lastPlayed.matches.length,
              )}
            </p>
            <p className="text-muted-foreground text-meta">
              {m.round.completeLine}
            </p>
          </div>
        </div>
      ) : null}

      {made.map((round) => (
        <RoundCard
          key={round.roundNumber}
          round={round}
          open={open.has(round.roundNumber)}
          onToggle={() => toggle(round.roundNumber)}
          teams={teams}
          viewerUserId={viewerUserId}
          viewerGameTeamId={data.viewerGameTeamId}
          onEnterScore={onEnterScore}
          onSwap={onSwap}
        />
      ))}

      {nextNotMade ? (
        <NotMadeCard
          round={nextNotMade}
          restCount={notMade.length}
          pending={generating}
          onGenerate={() => void generate("next")}
          onGenerateRest={() => void generate("rest")}
          onPair={() => onPair(nextNotMade.roundNumber)}
        />
      ) : null}
      {laterFrom != null && laterTo != null ? (
        <p className="text-muted-foreground text-meta text-center">
          {m.notMade.laterShort(laterFrom, laterTo)}
        </p>
      ) : null}

      {firstDraft ? (
        <div className="border-rule space-y-2.5 border-t pt-5">
          <Button
            type="button"
            size="lg"
            className="w-full font-semibold"
            disabled={actions.post.isPending}
            aria-busy={actions.post.isPending}
            onClick={() => void post([firstDraft.roundNumber])}
          >
            {actions.post.isPending
              ? m.round.posting
              : drafts.length > 1
                ? m.round.postFirst(firstDraft.roundNumber)
                : m.round.postOne(firstDraft.roundNumber)}
          </Button>
          {drafts.length > 1 ? (
            <Button
              type="button"
              size="lg"
              variant="outline"
              className="w-full"
              disabled={actions.post.isPending}
              onClick={() =>
                void post(drafts.map((round) => round.roundNumber))
              }
            >
              {m.round.postAll(drafts.length)}
            </Button>
          ) : null}
          <p className="text-muted-foreground text-meta text-center leading-relaxed">
            {m.round.postFooter}
          </p>
        </div>
      ) : null}
    </div>
  );
}
