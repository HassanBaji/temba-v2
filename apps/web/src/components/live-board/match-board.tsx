"use client";

import { bibColors } from "@repo/design-tokens";
import { footballBibName, isFootballBib } from "@repo/domain/football-lineup";
import { formatGameClock } from "@repo/domain/format-game-start";
import { sideSizeLabel } from "@repo/domain/game-shape";
import { initials } from "@repo/domain/initials";
import {
  boardMinutesPlayed,
  boardScoreLead,
  formatBoardMatchTime,
  scoreboardPhase,
  padelScoreboardSets,
  padelScoreboardSetsWon,
  type FootballScoreboard,
  type FootballScoreboardSide,
  type LiveBoardPhase,
  type PadelScoreboardPlayer,
  type PadelScoreboardSet,
  type PadelScoreboard,
} from "@repo/domain/live-board";
import { shortPlayerName } from "@repo/domain/player-name";

import { useLocale, useMessages } from "~/components/locale-provider";
import { cn } from "~/lib/utils";

import {
  BoardClock,
  BoardHeader,
  BoardStrip,
  useBoardSubtitle,
  useStartLine,
  LIFTED,
  NotYet,
  boardType,
  StatusLine,
  StatusTag,
  StripFact,
  StripQr,
  useFollowLines,
  WaitingPanel,
  type LiveBoardSnapshot,
} from "./board-kit";

const MAX_SET_COLUMNS = 5;

function PhaseTag({ phase }: { phase: LiveBoardPhase }) {
  const b = useMessages().liveBoard.board;
  if (phase === "live") {
    return <StatusTag tone="live">{b.live}</StatusTag>;
  }
  return (
    <StatusTag tone="outline">{phase === "final" ? b.final : b.soon}</StatusTag>
  );
}

function SetTile({
  score,
  won,
  inPlay,
  width,
}: {
  score: number | null;
  won: boolean;
  inPlay: boolean;
  width: number;
}) {
  if (score == null) {
    return <NotYet height={112} lifted radius={14} width={width} />;
  }
  return (
    <span
      className={cn(
        "font-expanded border-on-focus flex flex-none items-center justify-center",
        won ? "bg-on-focus text-focus" : "text-on-focus",
        inPlay ? "border-2" : "border",
      )}
      style={{
        width,
        height: 112,
        borderRadius: 14,
        ...boardType(width < 100 ? 60 : 76, 1),
      }}
    >
      {score}
    </span>
  );
}

function PadelSide({
  players,
  sets,
  side,
  setsWon,
  tileWidth,
}: {
  players: readonly PadelScoreboardPlayer[];
  sets: readonly PadelScoreboardSet[];
  side: "side1" | "side2";
  setsWon: number;
  tileWidth: number;
}) {
  return (
    <div
      className="flex min-h-0 flex-1 items-center"
      style={{ gap: 20, padding: "0 32px" }}
    >
      <div className="flex min-w-0 flex-1 flex-col" style={{ gap: 12 }}>
        {players.length === 0 ? (
          <NotYet height={44} lifted radius={11} width={220} />
        ) : null}
        {players.map((player, index) => (
          <div key={index} className="flex items-center" style={{ gap: 14 }}>
            <span
              className="border-on-focus flex flex-none items-center justify-center border font-semibold"
              style={{
                width: 44,
                height: 44,
                borderRadius: 11,
                ...boardType(16),
              }}
            >
              {initials(player.name)}
            </span>
            <span className="truncate font-semibold" style={boardType(32)}>
              {player.name}
            </span>
            {player.levelBand ? (
              <span
                className="text-dim whitespace-nowrap"
                style={boardType(17)}
              >
                <span dir="ltr">{player.levelBand}</span>
              </span>
            ) : null}
          </div>
        ))}
      </div>
      {sets.length === 0 ? (
        <NotYet height={112} lifted radius={14} width={tileWidth} />
      ) : null}
      {sets.map((set, index) => (
        <SetTile
          key={index}
          inPlay={set.state === "in_play"}
          score={side === "side1" ? set.score1 : set.score2}
          width={tileWidth}
          won={set.state === side}
        />
      ))}
      <div
        className="font-expanded flex-none text-end"
        style={{ width: 96, ...boardType(76, 0.9) }}
      >
        {setsWon}
      </div>
    </div>
  );
}

export function PadelMatchScoreboard({
  snapshot,
  content,
  now,
}: {
  snapshot: LiveBoardSnapshot;
  content: PadelScoreboard;
  now: Date;
}) {
  const b = useMessages().liveBoard.board;
  const locale = useLocale();
  const follow = useFollowLines();
  const startLine = useStartLine(snapshot.game);
  const subtitle = useBoardSubtitle(snapshot.game);
  const { game, settings } = snapshot;
  const seated = content.sides[0].length + content.sides[1].length;
  const phase = scoreboardPhase({
    windowStart: game.windowStart ?? now,
    completed: content.completed,
    ready: seated > 0,
    now,
  });
  const allSets = padelScoreboardSets(content.sets, content.completed);
  const firstShown = Math.max(0, allSets.length - MAX_SET_COLUMNS);
  const sets = allSets.slice(firstShown);
  const setsWon = padelScoreboardSetsWon(allSets);
  const inPlay = allSets.findIndex((set) => set.state === "in_play");
  const tileWidth = sets.length > 3 ? 84 : 104;
  const minutes =
    game.windowStart && game.windowEnd
      ? boardMinutesPlayed(game.windowStart, game.windowEnd, now)
      : null;

  return (
    <>
      <BoardHeader
        aside={
          phase === "live" && minutes != null ? (
            <BoardClock
              label={b.matchTime}
              value={formatBoardMatchTime(minutes)}
            />
          ) : undefined
        }
        status={
          <>
            <PhaseTag phase={phase} />
            <StatusLine>
              {phase === "waiting"
                ? startLine
                : inPlay >= 0
                  ? b.setInPlayStatus(inPlay + 1)
                  : allSets.length === 0
                    ? b.noSets
                    : b.setsSaved(allSets.length)}
            </StatusLine>
          </>
        }
        subtitle={subtitle}
        title={game.name}
      />
      <div
        className={cn(LIFTED, "flex min-h-0 flex-1 flex-col overflow-hidden")}
        style={{ borderRadius: 16 }}
      >
        <div
          className="text-dim flex flex-none items-center"
          style={{ height: 44, gap: 20, padding: "0 32px", ...boardType(16) }}
        >
          <span className="flex-1 truncate">
            {b.levelValue[content.ratingScope]}
          </span>
          {sets.length === 0 ? (
            <span className="text-center" style={{ width: tileWidth }}>
              {b.set(1)}
            </span>
          ) : null}
          {sets.map((set, index) => {
            const number = firstShown + index + 1;
            return (
              <span
                key={number}
                className={cn(
                  "whitespace-nowrap text-center",
                  set.state === "in_play" && "text-on-focus font-semibold",
                )}
                style={{ width: tileWidth }}
              >
                {set.state === "in_play" && sets.length <= 3
                  ? b.setInPlay(number)
                  : b.set(number)}
              </span>
            );
          })}
          <span className="text-end" style={{ width: 96 }}>
            {b.sets}
          </span>
        </div>
        <div className="bg-dimrule flex-none" style={{ height: 1 }} />
        <PadelSide
          players={content.sides[0]}
          sets={sets}
          setsWon={setsWon.side1}
          side="side1"
          tileWidth={tileWidth}
        />
        <div
          className="bg-dimrule flex-none"
          style={{ height: 1, margin: "0 32px" }}
        />
        <PadelSide
          players={content.sides[1]}
          sets={sets}
          setsWon={setsWon.side2}
          side="side2"
          tileWidth={tileWidth}
        />
      </div>
      <BoardStrip>
        <StripFact
          label={b.facts.court}
          value={content.courtName ?? b.noCourt}
        />
        {game.windowStart ? (
          <StripFact
            label={phase === "waiting" ? b.facts.starts : b.facts.started}
            value={formatGameClock(game.windowStart, locale)}
          />
        ) : null}
        <StripFact label={b.facts.venue} value={game.venueName} />
        {settings.showQr ? (
          <StripQr lines={follow} url={game.followUrl} />
        ) : null}
      </BoardStrip>
    </>
  );
}

function squadRow(count: number) {
  if (count <= 10) {
    return { height: 38, name: 22 };
  }
  return count <= 14 ? { height: 30, name: 18 } : { height: 22, name: 15 };
}

function Squad({
  side,
  mirrored,
}: {
  side: FootballScoreboardSide;
  mirrored: boolean;
}) {
  const roles = useMessages().liveBoard.board.roles;
  const row = squadRow(side.players.length);
  return (
    <div
      className="flex flex-none flex-col justify-center"
      style={{ width: 210 }}
    >
      {side.players.map((player, index) => (
        <div
          key={`${player.name}-${index}`}
          className={cn("flex items-center", mirrored && "flex-row-reverse")}
          style={{ gap: 10, height: row.height }}
        >
          <span
            className={cn(
              "text-dim flex-none font-mono uppercase",
              mirrored && "text-end",
            )}
            style={{ width: 38, ...boardType(14) }}
          >
            {player.role ? roles[player.role] : null}
          </span>
          <span className="truncate font-semibold" style={boardType(row.name)}>
            {shortPlayerName(player.name)}
          </span>
        </div>
      ))}
    </div>
  );
}

function BibSwatch({ bib }: { bib: string | null }) {
  const fill = isFootballBib(bib) ? bibColors[bib].fill : null;
  return fill ? (
    <span
      className="border-on-focus flex-none border"
      style={{ width: 22, height: 22, borderRadius: 6, background: fill }}
    />
  ) : null;
}

function Scorers({
  side,
  end,
}: {
  side: FootballScoreboardSide;
  end: boolean;
}) {
  const b = useMessages().liveBoard.board;
  return (
    <div className="flex flex-col" style={{ gap: 6 }}>
      {side.scorers.map((scorer, index) => (
        <div
          key={index}
          className={cn("flex", end ? "justify-end" : "justify-start")}
          style={{ gap: 10, ...boardType(18) }}
        >
          <span className="font-semibold">{shortPlayerName(scorer.name)}</span>
          <span className="text-dim">{b.scorerGoals(scorer.goals)}</span>
        </div>
      ))}
    </div>
  );
}

/** "Black" sits at 40; "Light blue" steps down so a bib name is never cut. */
function bibNameSize(name: string) {
  if (name.length <= 5) {
    return 40;
  }
  return name.length <= 7 ? 32 : 24;
}

function FootballScore({
  sides,
}: {
  sides: [FootballScoreboardSide, FootballScoreboardSide];
}) {
  const locale = useLocale();
  const [first, second] = sides;
  const lead = boardScoreLead(first.goals, second.goals);
  const bibName = (side: FootballScoreboardSide, index: 1 | 2) =>
    footballBibName(isFootballBib(side.bib) ? side.bib : null, index, locale);
  const goals = (side: FootballScoreboardSide, behind: boolean) =>
    side.goals == null ? (
      <NotYet height={140} lifted radius={18} width={110} />
    ) : (
      <span
        className={cn("font-expanded", behind && "text-dim")}
        style={boardType(168, 0.86)}
      >
        {side.goals}
      </span>
    );
  return (
    <div
      className="flex min-w-0 flex-1 flex-col justify-center"
      style={{ gap: 18 }}
    >
      <div
        className="grid items-center"
        style={{
          gridTemplateColumns: "minmax(0,1fr) auto minmax(0,1fr)",
          gap: 26,
        }}
      >
        <div className="flex items-center justify-end" style={{ gap: 12 }}>
          <BibSwatch bib={first.bib} />
          <span
            className="font-expanded truncate"
            style={boardType(bibNameSize(bibName(first, 1)))}
          >
            {bibName(first, 1)}
          </span>
        </div>
        <div className="flex items-center" style={{ gap: 22 }}>
          {goals(first, lead === "side2")}
          <span
            className="bg-dim flex-none"
            style={{ width: 26, height: 6, borderRadius: 3 }}
          />
          {goals(second, lead === "side1")}
        </div>
        <div className="flex items-center" style={{ gap: 12 }}>
          <span
            className="font-expanded truncate"
            style={boardType(bibNameSize(bibName(second, 2)))}
          >
            {bibName(second, 2)}
          </span>
          <BibSwatch bib={second.bib} />
        </div>
      </div>
      {first.scorers.length + second.scorers.length > 0 ? (
        <div
          className="grid items-start"
          style={{
            gridTemplateColumns: "minmax(0,1fr) 1px minmax(0,1fr)",
            gap: 26,
          }}
        >
          <Scorers end side={first} />
          <div className="bg-dimrule self-stretch" />
          <Scorers end={false} side={second} />
        </div>
      ) : null}
    </div>
  );
}

export function FootballMatchScoreboard({
  snapshot,
  content,
  now,
}: {
  snapshot: LiveBoardSnapshot;
  content: FootballScoreboard;
  now: Date;
}) {
  const { board: b, list } = useMessages().liveBoard;
  const locale = useLocale();
  const follow = useFollowLines();
  const startLine = useStartLine(snapshot.game);
  const subtitle = useBoardSubtitle(snapshot.game);
  const { game, settings } = snapshot;
  const phase = scoreboardPhase({
    windowStart: game.windowStart ?? now,
    completed: content.completed,
    ready: content.sides != null,
    now,
  });
  const kickOff = game.windowStart
    ? formatGameClock(game.windowStart, locale)
    : null;
  const minutes =
    game.windowStart && game.windowEnd
      ? boardMinutesPlayed(game.windowStart, game.windowEnd, now)
      : null;
  const windowMinutes =
    game.windowStart && game.windowEnd
      ? Math.round(
          (new Date(game.windowEnd).getTime() -
            new Date(game.windowStart).getTime()) /
            60000,
        )
      : null;
  const squad = content.sides
    ? Math.max(...content.sides.map((side) => side.players.length))
    : null;

  return (
    <>
      <BoardHeader
        aside={
          phase === "live" && minutes != null ? (
            <BoardClock label={b.minutesPlayed} value={String(minutes)} />
          ) : undefined
        }
        status={
          <>
            <PhaseTag phase={phase} />
            {kickOff ? (
              <StatusLine>
                {phase === "waiting"
                  ? b.kicksOff(kickOff)
                  : b.kickedOff(kickOff)}
              </StatusLine>
            ) : null}
          </>
        }
        subtitle={subtitle}
        title={game.name}
      />
      {content.sides ? (
        <div
          className={cn(LIFTED, "flex min-h-0 flex-1 overflow-hidden")}
          style={{ borderRadius: 16, padding: "0 30px", gap: 18 }}
        >
          <Squad mirrored={false} side={content.sides[0]} />
          <FootballScore sides={content.sides} />
          <Squad mirrored side={content.sides[1]} />
        </div>
      ) : (
        <WaitingPanel line={startLine} title={b.waitingTeams} />
      )}
      <BoardStrip>
        <StripFact
          grow={1.25}
          label={b.facts.pitch}
          value={list(
            [game.venueName, content.courtName].flatMap((part) => part ?? []),
          )}
        />
        {kickOff && windowMinutes != null ? (
          <StripFact
            grow={1.25}
            label={b.facts.kickOff}
            value={b.kickOffValue(kickOff, windowMinutes)}
          />
        ) : null}
        {content.sideSize ? (
          <StripFact
            label={b.facts.game}
            value={
              squad
                ? b.gameValue(sideSizeLabel(content.sideSize, locale), squad)
                : sideSizeLabel(content.sideSize, locale)
            }
          />
        ) : null}
        {content.hasMvp ? (
          <StripFact
            label={b.facts.mvp}
            lead={
              content.mvpName ? undefined : (
                <NotYet height={44} radius={11} width={44} />
              )
            }
            value={
              content.mvpName ? shortPlayerName(content.mvpName) : b.mvpAfter
            }
          />
        ) : null}
        {settings.showQr ? (
          <StripQr lines={follow} url={game.followUrl} />
        ) : null}
      </BoardStrip>
    </>
  );
}
