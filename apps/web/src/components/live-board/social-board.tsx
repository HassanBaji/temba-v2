"use client";

import {
  formatGameClock,
  formatGameClockWithoutMeridiem,
  formatGameDay,
} from "@repo/domain/format-game-start";
import {
  boardPage,
  boardScoreLead,
  boardSideLabel,
  formatBoardClock,
  LIVE_BOARD_SCREENS,
  liveBoardScene,
  socialBoardView,
  type LiveBoardMatch,
  type LiveBoardRound,
  type LiveBoardRoundMark,
  type LiveBoardScreen,
  type LiveBoardTable,
  type LiveBoardTableRow,
  type SocialBoardContent,
  type SocialBoardView,
} from "@repo/domain/live-board";
import { shortPlayerName } from "@repo/domain/player-name";
import { poolLabel } from "@repo/domain/tournament-pool-draw";
import { POOL_POINTS } from "@repo/domain/tournament-round-state";

import { useLocale, useMessages } from "~/components/locale-provider";
import { cn } from "~/lib/utils";

import {
  BoardClock,
  BoardHeader,
  BoardStrip,
  useBoardSubtitle,
  LIFTED,
  MessageStrip,
  NotYet,
  PLAIN,
  px,
  QrCell,
  RoundBars,
  ScreenBars,
  SectionHead,
  StatusLine,
  StatusTag,
  StripFact,
  StripLead,
  StripQr,
  useFollowLines,
  WaitingPanel,
  type LiveBoardSnapshot,
} from "./board-kit";
import { courtGrid, placeCode, STRIP_CELLS, tableLayout } from "./board-layout";

type Social = SocialBoardContent;

/** The message strip's height and the gap above it. */
const MESSAGE_ROOM = 116;

function useSideLabel() {
  const joiner = useMessages().liveBoard.joiner;
  return (players: readonly string[]) =>
    players.length === 1
      ? shortPlayerName(players[0] ?? "")
      : boardSideLabel(players, joiner);
}

function useCourtLabel() {
  const m = useMessages().liveBoard.board;
  return (match: LiveBoardMatch, index: number) =>
    match.courtName ?? m.court(index + 1);
}

function CourtCard({
  match,
  index,
  dense,
}: {
  match: LiveBoardMatch;
  index: number;
  dense: boolean;
}) {
  const m = useMessages().liveBoard.board;
  const locale = useLocale();
  const sideLabel = useSideLabel();
  const courtLabel = useCourtLabel();
  const lead = boardScoreLead(match.score1, match.score2);
  const state =
    match.state === "scheduled"
      ? match.startTime
        ? m.state.scheduled(
            formatGameClockWithoutMeridiem(match.startTime, locale),
          )
        : m.state.scheduledNoTime
      : m.state[match.state];
  const nameSize = dense ? 20 : 25;
  const scoreSize = dense ? 44 : 56;
  const rows = [
    { side: match.side1, score: match.score1, ahead: lead !== "side2" },
    { side: match.side2, score: match.score2, ahead: lead !== "side1" },
  ];
  return (
    <div
      className="bg-focus flex min-h-0 flex-col justify-center"
      style={{
        padding: dense ? "14px 18px" : "18px 24px",
        gap: dense ? 7 : 10,
      }}
    >
      <div
        className="text-dim flex items-center justify-between"
        style={px(dense ? 14 : 16)}
      >
        <span className="truncate">{courtLabel(match, index)}</span>
        <span className="whitespace-nowrap">{state}</span>
      </div>
      {rows.map((row) => (
        <div
          key={row.side.id}
          className={cn(
            "flex items-center justify-between",
            !row.ahead && "text-dim",
          )}
          style={{ gap: 12 }}
        >
          <span className="truncate font-semibold" style={px(nameSize)}>
            {sideLabel(row.side.players)}
          </span>
          {row.score == null ? (
            <NotYet height={dense ? 38 : 48} lifted width={dense ? 36 : 46} />
          ) : (
            <span
              className="font-expanded flex-none text-end"
              style={{ ...px(scoreSize, 0.9), minWidth: 35 }}
            >
              {row.score}
            </span>
          )}
        </div>
      ))}
    </div>
  );
}

function CourtGrid({ round, turn }: { round: LiveBoardRound; turn: number }) {
  const grid = courtGrid(round.matches.length);
  const page = boardPage(round.matches, grid.pageSize, turn);
  return (
    <div
      className="bg-dimrule border-dimrule grid min-h-0 flex-1 overflow-hidden border"
      style={{
        gridTemplateColumns: `repeat(${grid.columns}, minmax(0, 1fr))`,
        gridAutoRows: "minmax(0, 1fr)",
        gap: 1,
        borderRadius: 16,
      }}
    >
      {page.items.map((match, index) => (
        <CourtCard
          key={match.id}
          dense={grid.dense}
          index={page.page * grid.pageSize + index}
          match={match}
        />
      ))}
    </div>
  );
}

function CourtList({ round, turn }: { round: LiveBoardRound; turn: number }) {
  const sideLabel = useSideLabel();
  const courtLabel = useCourtLabel();
  const page = boardPage(round.matches, 4, turn);
  return (
    <div
      className={cn(
        PLAIN,
        "divide-rule flex min-h-0 flex-1 flex-col divide-y overflow-hidden",
      )}
      style={{ borderRadius: 16 }}
    >
      {page.items.map((match, index) => {
        const lead = boardScoreLead(match.score1, match.score2);
        return (
          <div
            key={match.id}
            className="flex min-h-0 flex-1 flex-col justify-center"
            style={{ padding: "0 18px", gap: 5 }}
          >
            <span className="text-muted-foreground" style={px(14)}>
              {courtLabel(match, page.page * 4 + index)}
            </span>
            {[
              {
                side: match.side1,
                score: match.score1,
                ahead: lead !== "side2",
              },
              {
                side: match.side2,
                score: match.score2,
                ahead: lead !== "side1",
              },
            ].map((row) => (
              <div
                key={row.side.id}
                className={cn(
                  "flex items-center justify-between",
                  !row.ahead && "text-muted-foreground",
                )}
                style={{ gap: 8 }}
              >
                <span className="truncate font-semibold" style={px(18)}>
                  {sideLabel(row.side.players)}
                </span>
                {row.score == null ? (
                  <NotYet height={24} width={23} />
                ) : (
                  <span
                    className="font-expanded flex-none text-end"
                    style={{ ...px(28, 0.9), minWidth: 17 }}
                  >
                    {row.score}
                  </span>
                )}
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
}

function RoundMarks({
  marks,
  lifted,
}: {
  marks: readonly LiveBoardRoundMark[];
  lifted: boolean;
}) {
  const gap = marks.length > 7 ? 3 : 5;
  const size = Math.max(
    8,
    Math.min(16, Math.floor((150 - gap * (marks.length - 1)) / marks.length)),
  );
  return (
    <span className="flex justify-end" style={{ gap }}>
      {marks.map((mark, index) =>
        mark === "none" ? (
          <NotYet
            key={index}
            height={size}
            lifted={lifted}
            radius={4}
            width={size}
          />
        ) : (
          <span
            key={index}
            className={cn(
              "border-ink flex flex-none items-center justify-center border",
              mark === "won" && "bg-ink",
            )}
            style={{ width: size, height: size, borderRadius: 4 }}
          >
            {mark === "drawn" ? (
              <span
                className="bg-ink"
                style={{ width: size / 2, height: 1.5, borderRadius: 1 }}
              />
            ) : null}
          </span>
        ),
      )}
    </span>
  );
}

type TableVariant = "compact" | "full" | "final" | "mini";

const TABLE_COLUMNS: Record<TableVariant, string> = {
  compact: "26px minmax(0,1fr) 24px 24px 24px 24px 40px 40px",
  full: "34px minmax(0,1fr) 34px 34px 34px 34px 74px 56px 60px 150px",
  final: "34px minmax(0,1fr) 34px 34px 34px 34px 56px 60px 150px",
  mini: "26px minmax(0,1fr) 40px",
};

function BoardTable({
  rows,
  variant,
  ranks,
  lifted = false,
}: {
  rows: readonly LiveBoardTableRow[];
  variant: TableVariant;
  ranks: Social["ranks"];
  lifted?: boolean;
}) {
  const m = useMessages().liveBoard;
  const c = m.board.columns;
  const sideLabel = useSideLabel();
  const wide = variant === "full" || variant === "final";
  const dense = rows.length > 8;
  const nameSize = (wide ? 23 : 19) - (dense ? 4 : 0);
  const numberSize = (wide ? 20 : 18) - (dense ? 3 : 0);
  const pointsSize = (wide ? 30 : 23) - (dense ? 5 : 0);
  const muted = lifted ? "text-dim" : "text-muted-foreground";
  const rule = lifted ? "border-dimrule" : "border-rule";
  const grid = {
    gridTemplateColumns: TABLE_COLUMNS[variant],
    gap: 8,
    padding: wide ? "0 22px" : "0 18px",
  };
  const stats = variant !== "mini";
  return (
    <div
      className={cn(
        lifted ? LIFTED : PLAIN,
        "flex min-h-0 flex-1 flex-col overflow-hidden",
      )}
      style={{ borderRadius: 16 }}
    >
      <div
        className={cn(muted, "grid flex-none items-center")}
        style={{ ...grid, height: wide ? 40 : 36, fontSize: wide ? 15 : 14 }}
      >
        <span>{c.rank}</span>
        <span>{ranks === "players" ? c.player : c.team}</span>
        {stats ? (
          <>
            <span className="text-end">{c.played}</span>
            <span className="text-end">{c.won}</span>
            <span className="text-end">{c.drawn}</span>
            <span className="text-end">{c.lost}</span>
            {variant === "full" ? (
              <span className="text-end">{c.games}</span>
            ) : null}
            <span className="text-end">{c.difference}</span>
          </>
        ) : null}
        <span className="text-end">
          {ranks === "players" ? c.gamesWon : c.points}
        </span>
        {wide ? <span className="text-end">{c.rounds}</span> : null}
      </div>
      {rows.map((row) => (
        <div
          key={row.id}
          className={cn(rule, "grid min-h-0 flex-1 items-center border-t")}
          style={grid}
        >
          <span className={cn(muted, "font-mono")} style={px(wide ? 15 : 14)}>
            {placeCode(row.place)}
          </span>
          <span className="truncate font-semibold" style={px(nameSize)}>
            {sideLabel(row.players)}
          </span>
          {stats ? (
            <>
              {[row.played, row.won, row.drawn, row.lost].map(
                (value, index) => (
                  <span
                    key={index}
                    className={cn(muted, "text-end")}
                    style={px(numberSize)}
                  >
                    {value}
                  </span>
                ),
              )}
              {variant === "full" ? (
                <span className={cn(muted, "text-end")} style={px(numberSize)}>
                  <span dir="ltr">
                    {row.gamesFor}–{row.gamesAgainst}
                  </span>
                </span>
              ) : null}
              <span className={cn(muted, "text-end")} style={px(numberSize)}>
                <span dir="ltr">{m.signed(row.difference)}</span>
              </span>
            </>
          ) : null}
          <span className="font-expanded text-end" style={px(pointsSize)}>
            {row.points}
          </span>
          {wide ? <RoundMarks lifted={lifted} marks={row.rounds} /> : null}
        </div>
      ))}
    </div>
  );
}

type TablePage = {
  table: LiveBoardTable;
  rows: LiveBoardTableRow[];
};

/** Every table cut into the pages a screen can hold, walked one per turn. */
function tablePage(
  tables: readonly LiveBoardTable[],
  turn: number,
): TablePage | null {
  const pages = tables.flatMap((table) => {
    const { pageSize } = tableLayout(table.rows.length);
    const count = Math.max(1, Math.ceil(table.rows.length / pageSize));
    return Array.from({ length: count }, (_, index) => ({
      table,
      rows: table.rows.slice(index * pageSize, (index + 1) * pageSize),
    }));
  });
  return pages.length === 0 ? null : (pages[turn % pages.length] ?? null);
}

function useTableTitle() {
  const m = useMessages().liveBoard.board;
  const locale = useLocale();
  return (table: LiveBoardTable, title: string = m.standings) =>
    table.poolIndex == null
      ? title
      : m.standingsOf(poolLabel(table.poolIndex, locale));
}

function NextStrip({
  round,
  label,
  followUrl,
  turn,
}: {
  round: LiveBoardRound | null;
  label: (time: string | null) => string;
  followUrl: string | null;
  turn: number;
}) {
  const m = useMessages().liveBoard.board;
  const locale = useLocale();
  const sideLabel = useSideLabel();
  const courtLabel = useCourtLabel();
  const follow = useFollowLines();
  const page = boardPage(round?.matches ?? [], STRIP_CELLS, turn);
  return (
    <BoardStrip>
      {round ? (
        <StripLead
          label={label(
            round.startTime
              ? formatGameClockWithoutMeridiem(round.startTime, locale)
              : null,
          )}
          value={m.round(round.roundNumber)}
        />
      ) : (
        <StripLead label={m.lastRound} value={m.lastRoundLine} />
      )}
      {round && page.items.length === 0 ? (
        <div
          className="text-muted-foreground flex min-w-0 flex-1 items-center"
          style={{ padding: "0 18px", gap: 14, ...px(17) }}
        >
          <NotYet height={44} radius={11} width={44} />
          {m.notPosted}
        </div>
      ) : null}
      {page.items.map((match, index) => (
        <div
          key={match.id}
          className="flex min-w-0 flex-1 flex-col justify-center"
          style={{ padding: "0 18px", gap: 3 }}
        >
          <span className="text-muted-foreground truncate" style={px(13)}>
            {courtLabel(match, page.page * STRIP_CELLS + index)}
          </span>
          <span className="truncate font-semibold" style={px(17)}>
            {sideLabel(match.side1.players)}
          </span>
          <span className="truncate font-semibold" style={px(17)}>
            {sideLabel(match.side2.players)}
          </span>
        </div>
      ))}
      {!round ? <div className="flex-1" /> : null}
      {followUrl ? <StripQr lines={follow} url={followUrl} /> : null}
    </BoardStrip>
  );
}

function NextUpGrid({
  round,
  content,
  turn,
}: {
  round: LiveBoardRound;
  content: Social;
  turn: number;
}) {
  const m = useMessages().liveBoard.board;
  const locale = useLocale();
  const sideLabel = useSideLabel();
  const courtLabel = useCourtLabel();
  const grid = courtGrid(round.matches.length);
  const page = boardPage(round.matches, grid.pageSize, turn);
  const rowOf = new Map(
    content.tables.flatMap((table) => table.rows).map((row) => [row.id, row]),
  );
  const standing = (id: string) => {
    const row = rowOf.get(id);
    if (!row) {
      return null;
    }
    return content.ranks === "players"
      ? m.placeGames(row.place, row.points)
      : m.placePoints(row.place, row.points);
  };
  const nameSize = grid.dense ? 21 : 27;
  return (
    <div
      className="bg-dimrule border-dimrule grid min-h-0 flex-1 overflow-hidden border"
      style={{
        gridTemplateColumns: `repeat(${grid.columns}, minmax(0, 1fr))`,
        gridAutoRows: "minmax(0, 1fr)",
        gap: 1,
        borderRadius: 16,
      }}
    >
      {page.items.map((match, index) => (
        <div
          key={match.id}
          className="bg-focus flex min-h-0 flex-col justify-center"
          style={{
            padding: grid.dense ? "14px 18px" : "18px 26px",
            gap: grid.dense ? 6 : 9,
          }}
        >
          <div
            className="flex items-center justify-between"
            style={{ gap: 12 }}
          >
            <span
              className="font-expanded truncate"
              style={px(grid.dense ? 18 : 22)}
            >
              {courtLabel(match, page.page * grid.pageSize + index)}
            </span>
            {match.startTime ? (
              <span className="text-dim" style={px(16)}>
                {formatGameClockWithoutMeridiem(match.startTime, locale)}
              </span>
            ) : null}
          </div>
          {[match.side1, match.side2].map((side, sideIndex) => (
            <div key={side.id} className="contents">
              {sideIndex === 1 ? (
                <div
                  className="text-dim flex items-center"
                  style={{ gap: 12, ...px(14) }}
                >
                  <span>{m.against}</span>
                  <span className="bg-dimrule flex-1" style={{ height: 1 }} />
                </div>
              ) : null}
              <div
                className="flex items-baseline justify-between"
                style={{ gap: 12 }}
              >
                <span className="truncate font-semibold" style={px(nameSize)}>
                  {sideLabel(side.players)}
                </span>
                <span className="text-dim whitespace-nowrap" style={px(16)}>
                  {standing(side.id)}
                </span>
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

function LiveScreens({
  snapshot,
  content,
  view,
  now,
}: {
  snapshot: LiveBoardSnapshot;
  content: Social;
  view: SocialBoardView;
  now: Date;
}) {
  const m = useMessages().liveBoard.board;
  const locale = useLocale();
  const tableTitle = useTableTitle();
  const scene = liveBoardScene(snapshot.settings, now);
  const current = view.current;
  if (!current) {
    return null;
  }
  // A screen with no bottom strip makes room, so the message covers no row.
  const messageRoom = snapshot.settings.message ? MESSAGE_ROOM : 0;
  const hasNext = (view.next?.matches.length ?? 0) > 0;
  const screen: LiveBoardScreen =
    scene.screen === "next_up" && !hasNext ? "on_court" : scene.screen;
  const followUrl = snapshot.settings.showQr ? snapshot.game.followUrl : null;
  const table = tablePage(content.tables, scene.turn);
  const after = (short: boolean) =>
    short
      ? m.afterRoundShort(view.tableAfterRound)
      : m.afterRound(view.tableAfterRound, content.roundCount);
  const roundMeta = current.startTime
    ? (current.state === "scheduled" ? m.roundStarts : m.roundStarted)(
        current.roundNumber,
        formatGameClockWithoutMeridiem(current.startTime, locale),
      )
    : m.round(current.roundNumber);

  return (
    <>
      {screen === "on_court" ? (
        <div className="flex min-h-0 flex-1 flex-col" style={{ gap: 20 }}>
          <div className="flex min-h-0 flex-1" style={{ gap: 24 }}>
            <div className="flex min-w-0 flex-1 flex-col">
              <SectionHead meta={roundMeta} title={m.onCourtNow} />
              <CourtGrid round={current} turn={scene.turn} />
            </div>
            {table ? (
              <div className="flex flex-none flex-col" style={{ width: 500 }}>
                <SectionHead
                  meta={after(false)}
                  title={tableTitle(table.table)}
                />
                <BoardTable
                  ranks={content.ranks}
                  rows={table.rows}
                  variant="compact"
                />
              </div>
            ) : null}
          </div>
          <NextStrip
            followUrl={followUrl}
            label={m.next}
            round={view.next}
            turn={scene.turn}
          />
        </div>
      ) : null}

      {screen === "standings" ? (
        <div
          className="flex min-h-0 flex-1"
          style={{ gap: 24, paddingBottom: messageRoom }}
        >
          {table ? (
            <div className="flex min-w-0 flex-1 flex-col">
              <SectionHead
                meta={m.afterWithRule(
                  after(false),
                  content.ranks === "players"
                    ? m.gamesRule
                    : m.pointsRule(
                        POOL_POINTS.win,
                        POOL_POINTS.draw,
                        POOL_POINTS.loss,
                      ),
                )}
                title={tableTitle(table.table)}
              />
              <BoardTable
                lifted
                ranks={content.ranks}
                rows={table.rows}
                variant="full"
              />
            </div>
          ) : null}
          <div className="flex flex-none flex-col" style={{ width: 292 }}>
            <SectionHead
              meta={m.round(current.roundNumber)}
              title={m.onCourtNow}
            />
            <CourtList round={current} turn={scene.turn} />
          </div>
        </div>
      ) : null}

      {screen === "next_up" && view.next ? (
        <div className="flex min-h-0 flex-1 flex-col" style={{ gap: 20 }}>
          <div className="flex min-h-0 flex-1" style={{ gap: 24 }}>
            <div className="flex min-w-0 flex-1 flex-col">
              <SectionHead
                meta={m.nextUpMeta(
                  view.next.startTime
                    ? formatGameClockWithoutMeridiem(
                        view.next.startTime,
                        locale,
                      )
                    : null,
                  content.matchMinutes,
                )}
                title={m.nextUp(view.next.roundNumber)}
              />
              <NextUpGrid
                content={content}
                round={view.next}
                turn={scene.turn}
              />
            </div>
            {table ? (
              <div className="flex flex-none flex-col" style={{ width: 330 }}>
                <SectionHead
                  meta={after(true)}
                  title={tableTitle(table.table)}
                />
                <BoardTable
                  ranks={content.ranks}
                  rows={table.rows}
                  variant="mini"
                />
              </div>
            ) : null}
          </div>
          <NextStrip
            followUrl={followUrl}
            label={m.then}
            round={view.then}
            turn={scene.turn}
          />
        </div>
      ) : null}

      <ScreenBars
        active={LIVE_BOARD_SCREENS.indexOf(scene.screen)}
        count={LIVE_BOARD_SCREENS.length}
      />
    </>
  );
}

function FinalScreen({
  snapshot,
  content,
  now,
}: {
  snapshot: LiveBoardSnapshot;
  content: Social;
  now: Date;
}) {
  const m = useMessages().liveBoard.board;
  const sideLabel = useSideLabel();
  const tableTitle = useTableTitle();
  const table = tablePage(
    content.tables,
    liveBoardScene(snapshot.settings, now).turn,
  );
  if (!table) {
    return null;
  }
  const all = table.table.rows;
  const [first, ...rest] = all;
  const players = content.ranks === "players";
  const summary = (row: LiveBoardTableRow, winner: boolean) => {
    if (players) {
      return m.winnerGamesSummary(row.points, row.won, row.drawn, row.lost);
    }
    return winner
      ? m.winnerSummary(
          row.points,
          row.won,
          row.drawn,
          row.lost,
          row.difference,
        )
      : m.placeSummary(row.points, row.won, row.drawn, row.lost);
  };
  const matchCount = content.rounds.reduce(
    (sum, round) =>
      sum + round.matches.filter((match) => match.state === "confirmed").length,
    0,
  );
  return (
    <div
      className="flex min-h-0 flex-1"
      style={{
        gap: 24,
        paddingBottom: snapshot.settings.message ? MESSAGE_ROOM : 0,
      }}
    >
      <div className="flex flex-none flex-col" style={{ width: 400, gap: 14 }}>
        {first && first.played > 0 ? (
          <div
            className={cn(LIFTED, "flex min-h-0 flex-col justify-between")}
            style={{ flex: 1.5, borderRadius: 16, padding: "24px 28px" }}
          >
            <div className="flex items-center justify-between">
              <span className="text-dim" style={px(18)}>
                {first.players.length === 1 ? m.winner : m.winners}
              </span>
              <span className="font-expanded" style={px(22)}>
                {m.firstOf(all.length)}
              </span>
            </div>
            <div>
              {first.players.map((name, index) => (
                <div
                  key={index}
                  className="font-expanded truncate"
                  style={px(38, 1.1)}
                >
                  {name}
                </div>
              ))}
            </div>
            <div className="text-dim" style={px(18)}>
              {summary(first, true)}
            </div>
          </div>
        ) : null}
        <div
          className={cn(
            PLAIN,
            "divide-rule flex min-h-0 flex-1 flex-col divide-y overflow-hidden",
          )}
          style={{ borderRadius: 16 }}
        >
          {rest.slice(0, 2).map((row) => (
            <div
              key={row.id}
              className="flex min-h-0 flex-1 items-center"
              style={{ padding: "0 24px", gap: 18 }}
            >
              <span className="font-expanded" style={{ ...px(40), width: 34 }}>
                {row.place}
              </span>
              <div className="min-w-0 flex-1">
                <div className="truncate font-semibold" style={px(24)}>
                  {sideLabel(row.players)}
                </div>
                <div
                  className="text-muted-foreground truncate"
                  style={{ ...px(15), marginTop: 3 }}
                >
                  {summary(row, false)}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="flex min-w-0 flex-1 flex-col">
        <SectionHead
          meta={m.roundsGames(content.rounds.length, matchCount)}
          title={tableTitle(table.table, m.finalStandings)}
        />
        <BoardTable ranks={content.ranks} rows={table.rows} variant="final" />
      </div>
    </div>
  );
}

export function SocialBoard({
  snapshot,
  content,
  now,
}: {
  snapshot: LiveBoardSnapshot;
  content: Social;
  now: Date;
}) {
  const m = useMessages();
  const b = m.liveBoard.board;
  const locale = useLocale();
  const follow = useFollowLines();
  const { game, settings } = snapshot;
  const view = socialBoardView(content, now);
  const subtitle = useBoardSubtitle(game);

  if (view.phase === "final") {
    return (
      <>
        <BoardHeader
          aside={
            settings.showQr ? (
              <QrCell
                lines={[b.resultsIn, b.resultsTemba]}
                size={66}
                url={game.followUrl}
              />
            ) : undefined
          }
          status={
            <>
              <StatusTag tone="outline">{b.final}</StatusTag>
              {content.finishedAt ? (
                <StatusLine>
                  {b.finished(formatGameClock(content.finishedAt, locale))}
                </StatusLine>
              ) : null}
            </>
          }
          subtitle={subtitle}
          title={b.finalTitle(game.name)}
        />
        <FinalScreen content={content} now={now} snapshot={snapshot} />
        {settings.message ? <MessageStrip message={settings.message} /> : null}
      </>
    );
  }

  if (view.phase === "waiting" || !view.current) {
    return (
      <>
        <BoardHeader
          status={<StatusTag tone="outline">{b.soon}</StatusTag>}
          subtitle={subtitle}
          title={game.name}
        />
        <WaitingPanel
          line={
            game.windowStart
              ? b.startsAt(
                  formatGameDay(game.windowStart, locale, { weekday: "long" }),
                  formatGameClock(game.windowStart, locale),
                )
              : b.waitingStart
          }
          title={b.waitingRounds}
        />
        <BoardStrip>
          <StripFact label={b.facts.venue} value={game.venueName} />
          {game.groupName ? (
            <StripFact label={b.facts.group} value={game.groupName} />
          ) : null}
          {settings.showQr ? (
            <StripQr lines={follow} url={game.followUrl} />
          ) : null}
        </BoardStrip>
        {settings.message ? <MessageStrip message={settings.message} /> : null}
      </>
    );
  }

  const current = view.current;
  return (
    <>
      <BoardHeader
        aside={
          view.clock ? (
            <BoardClock
              label={
                view.clock.kind === "left"
                  ? b.clockLeft
                  : b.clockStarts(current.roundNumber)
              }
              value={formatBoardClock(view.clock.seconds)}
            />
          ) : undefined
        }
        status={
          <>
            <div className="flex items-center" style={{ gap: 12 }}>
              <StatusTag
                tone={current.state === "scheduled" ? "outline" : "live"}
              >
                {current.state === "scheduled" ? b.soon : b.live}
              </StatusTag>
              <span className="whitespace-nowrap font-semibold" style={px(18)}>
                {m.tournamentRounds.progress.roundOf(
                  current.roundNumber,
                  content.roundCount,
                )}
              </span>
            </div>
            <RoundBars
              reached={
                current.state === "scheduled"
                  ? current.roundNumber - 1
                  : current.roundNumber
              }
              total={content.roundCount}
            />
          </>
        }
        subtitle={subtitle}
        title={game.name}
      />
      <LiveScreens
        content={content}
        now={now}
        snapshot={snapshot}
        view={view}
      />
      {settings.message ? <MessageStrip message={settings.message} /> : null}
    </>
  );
}
