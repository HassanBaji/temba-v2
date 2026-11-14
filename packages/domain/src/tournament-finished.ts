import type { Locale } from "@repo/i18n/locale";
import { messagesFor } from "@repo/i18n/messages";

import { formatAbsoluteDay, formatGameDay } from "./format-game-start";
import { shortPlayerName } from "./player-name";
import type { ComputedPoolTable, PoolTableRow } from "./pool-table";
import { resultMarkLabel, type ResultMarkVariant } from "./result-mark";
import {
  tournamentFallbackName,
  type TournamentDetails,
} from "./tournament-details";
import { tournamentRoundCount } from "./tournament-home";
import { poolLetter } from "./tournament-knockout";
import {
  knockoutFinalists,
  type KnockoutViewTeam,
} from "./tournament-knockout-view";
import { hasKnockout, isKnockoutOnly } from "./tournament-rounds";

type FinishedGame = Pick<
  TournamentDetails,
  | "name"
  | "format"
  | "tournamentShape"
  | "drawPostedAt"
  | "cancelledAt"
  | "poolTables"
  | "knockout"
  | "gameTeams"
  | "viewerUserId"
  | "isOrganizer"
  | "windowStart"
  | "venue"
  | "groupName"
  | "teamsAllowed"
  | "poolCount"
  | "roundCount"
  | "matches"
>;

/**
 * The last Pool Match is settled (a Pool-only day) or the Final has a winner
 * (any day with a knockout). A cancelled day never finishes.
 */
export function isTournamentFinished(
  game: Pick<
    FinishedGame,
    "format" | "tournamentShape" | "drawPostedAt" | "cancelledAt" | "knockout"
  > & { poolTables: { finished: boolean } | null },
): boolean {
  if (game.drawPostedAt == null || game.cancelledAt != null) {
    return false;
  }
  if (hasKnockout(game.format, game.tournamentShape)) {
    return knockoutFinalists(game.knockout) != null;
  }
  return Boolean(game.poolTables?.finished);
}

/**
 * One line of the top of the table. The viewer's own line leads with who they
 * played with, so its small line names the pair and its main line the finish.
 */
export type FinishedPodiumRow = {
  gameTeamId: string;
  /** The place on the chip; null when the line is a knockout exit. */
  place: number | null;
  /** The Pool the place is counted in, when there is more than one. */
  pool: string | null;
  /** The name the initials mark is drawn from. */
  markName: string;
  isViewer: boolean;
  smallLine: string;
  mainLine: string;
  detailLine: string | null;
  /** The team's Matches in order; empty when there is nothing to draw. */
  results: ResultMarkVariant[];
  resultsLabel: string | null;
};

/** The viewer's Pool Matches: how many, and padel games for and against. */
export type ViewerDay = {
  matchCount: number;
  gamesFor: number;
  gamesAgainst: number;
  poolWinnerGameTeamId: string | null;
};

export type TournamentShareKind = "placing" | "table";

export type TournamentFinishedView = {
  dateLine: string | null;
  name: string;
  summary: string;
  podiumLabel: string;
  podium: FinishedPodiumRow[];
  viewerDay: ViewerDay | null;
  share: { kind: TournamentShareKind; label: string };
};

type TeamMembers = FinishedGame["gameTeams"][number]["members"];

function membersOf(game: Pick<FinishedGame, "gameTeams">, gameTeamId: string) {
  return (
    game.gameTeams.find((team) => team.id === gameTeamId)?.members ??
    ([] as TeamMembers)
  );
}

function teamNames(
  game: Pick<FinishedGame, "gameTeams">,
  gameTeamId: string,
  fallback: string,
) {
  const members = membersOf(game, gameTeamId);
  return members.length > 0
    ? members.map((member) => member.name).join(" & ")
    : fallback;
}

function markName(
  game: Pick<FinishedGame, "gameTeams">,
  gameTeamId: string,
  fallback: string,
) {
  return membersOf(game, gameTeamId)[0]?.name ?? fallback;
}

function viewerPartner(
  game: Pick<FinishedGame, "gameTeams" | "viewerUserId">,
  gameTeamId: string,
) {
  const partner = membersOf(game, gameTeamId).find(
    (member) => member.id !== game.viewerUserId,
  );
  return partner ? shortPlayerName(partner.name) : null;
}

function viewerGameTeamId(game: FinishedGame) {
  return (
    game.gameTeams.find((team) =>
      team.members.some((member) => member.id === game.viewerUserId),
    )?.id ?? null
  );
}

function poolMatchesOf(pool: ComputedPoolTable, gameTeamId: string) {
  return pool.matches
    .filter(
      (match) =>
        match.slot1GameTeamId === gameTeamId ||
        match.slot2GameTeamId === gameTeamId,
    )
    .sort((a, b) => (a.roundNumber ?? 0) - (b.roundNumber ?? 0));
}

function poolTeamResults(
  pool: ComputedPoolTable,
  gameTeamId: string,
): ResultMarkVariant[] {
  return poolMatchesOf(pool, gameTeamId).map((match) => {
    if (match.cancelled || match.outcome === "none") {
      return "not-played";
    }
    if (match.outcome === "draw") {
      return "draw";
    }
    const mine = match.slot1GameTeamId === gameTeamId ? "slot1" : "slot2";
    return match.outcome === mine ? "won" : "lost";
  });
}

function poolViewerDay(pool: ComputedPoolTable, gameTeamId: string): ViewerDay {
  const matches = poolMatchesOf(pool, gameTeamId);
  let gamesFor = 0;
  let gamesAgainst = 0;
  for (const match of matches) {
    if (match.cancelled) {
      continue;
    }
    const first = match.slot1GameTeamId === gameTeamId;
    for (const set of match.sets) {
      gamesFor += (first ? set.slot1GamesWon : set.slot2GamesWon) ?? 0;
      gamesAgainst += (first ? set.slot2GamesWon : set.slot1GamesWon) ?? 0;
    }
  }
  return {
    matchCount: matches.length,
    gamesFor,
    gamesAgainst,
    poolWinnerGameTeamId: pool.winnerGameTeamId,
  };
}

function resultsLabel(results: readonly ResultMarkVariant[], locale: Locale) {
  if (results.length === 0) {
    return null;
  }
  return messagesFor(locale).tournamentRounds.finished.resultsLabel(
    results.map((result) => resultMarkLabel(result, locale)).join(", "),
  );
}

function poolName(pool: ComputedPoolTable, locale: Locale) {
  return messagesFor(locale).tournament.card.group(poolLetter(pool.poolIndex));
}

function teamRecord(row: PoolTableRow) {
  return {
    won: row.won ?? 0,
    drawn: row.drawn ?? 0,
    lost: row.lost ?? 0,
    points: row.points ?? 0,
  };
}

function findPoolOf(game: FinishedGame, gameTeamId: string | null) {
  if (!gameTeamId) {
    return null;
  }
  for (const pool of game.poolTables?.pools ?? []) {
    const row = pool.rows.find((entry) => entry.gameTeamId === gameTeamId);
    if (row) {
      return { pool, row };
    }
  }
  return null;
}

function poolPodiumRow(
  game: FinishedGame,
  entry: { row: PoolTableRow; pool: ComputedPoolTable },
  inPool: boolean,
  locale: Locale,
): FinishedPodiumRow {
  const m = messagesFor(locale).tournamentRounds.finished;
  const { row, pool } = entry;
  const poolLabel = inPool ? poolName(pool, locale) : null;
  const placeText = poolLabel
    ? m.placeInPool(m.place(row.position), poolLabel)
    : m.place(row.position);
  const winnerText = poolLabel ? m.wonPool(poolLabel) : m.wonTheDay;
  const record = teamRecord(row);
  const recordLine = m.record(record);
  const base = {
    gameTeamId: row.gameTeamId,
    place: row.position,
    pool: poolLabel,
    markName: markName(game, row.gameTeamId, row.name),
    isViewer: row.isViewer,
  };
  if (!row.isViewer) {
    return {
      ...base,
      smallLine: row.position === 1 ? winnerText : placeText,
      mainLine: teamNames(game, row.gameTeamId, row.name),
      detailLine: recordLine,
      results: [],
      resultsLabel: null,
    };
  }
  const behind = (pool.rows[0]?.points ?? 0) - record.points;
  const results = poolTeamResults(pool, row.gameTeamId);
  return {
    ...base,
    smallLine: m.you(viewerPartner(game, row.gameTeamId)),
    mainLine:
      row.position === 1
        ? winnerText
        : m.placeWithPoints(placeText, record.points),
    detailLine:
      row.position > 1 && behind > 0
        ? m.behind(recordLine, behind)
        : recordLine,
    results,
    resultsLabel: resultsLabel(results, locale),
  };
}

function poolPodium(game: FinishedGame, locale: Locale): FinishedPodiumRow[] {
  const tables = game.poolTables;
  const first = tables?.pools[0];
  if (!tables || !first) {
    return [];
  }
  const multiplePools = tables.pools.length > 1;
  const entries = multiplePools
    ? tables.pools.flatMap((pool) =>
        pool.rows[0] ? [{ row: pool.rows[0], pool }] : [],
      )
    : first.rows.slice(0, 3).map((row) => ({ row, pool: first }));
  const viewer = findPoolOf(game, viewerGameTeamId(game));
  if (
    viewer &&
    !entries.some((entry) => entry.row.gameTeamId === viewer.row.gameTeamId)
  ) {
    entries.push(viewer);
  }
  return entries.map((entry) =>
    poolPodiumRow(game, entry, multiplePools, locale),
  );
}

type ViewerKnockout = {
  results: ResultMarkVariant[];
  /** The round the viewer's team lost in; null if they never lost. */
  exitRound: string | null;
};

function viewerKnockout(
  game: FinishedGame,
  gameTeamId: string,
): ViewerKnockout | null {
  const results: ResultMarkVariant[] = [];
  let exitRound: string | null = null;
  for (const round of game.knockout ?? []) {
    for (const place of round.places) {
      if (place.kind !== "match") {
        continue;
      }
      const slot =
        place.slot1.kind === "team" &&
        place.slot1.team.gameTeamId === gameTeamId
          ? 1
          : place.slot2.kind === "team" &&
              place.slot2.team.gameTeamId === gameTeamId
            ? 2
            : null;
      if (slot == null) {
        continue;
      }
      const through = place.winner ?? place.walkover;
      if (through == null) {
        results.push("not-played");
      } else if (through === slot) {
        results.push("won");
      } else {
        results.push("lost");
        exitRound = round.name;
      }
    }
  }
  return results.length > 0 ? { results, exitRound } : null;
}

function knockoutFinalistRow(
  game: FinishedGame,
  team: KnockoutViewTeam,
  place: 1 | 2,
  locale: Locale,
): FinishedPodiumRow {
  const m = messagesFor(locale).tournamentRounds.finished;
  const finish = place === 1 ? m.champion : m.runnerUp;
  const results = team.isViewer
    ? (viewerKnockout(game, team.gameTeamId)?.results ?? [])
    : [];
  return {
    gameTeamId: team.gameTeamId,
    place,
    pool: null,
    markName: markName(game, team.gameTeamId, team.name),
    isViewer: team.isViewer,
    smallLine: team.isViewer
      ? m.you(viewerPartner(game, team.gameTeamId))
      : finish,
    mainLine: team.isViewer
      ? finish
      : teamNames(game, team.gameTeamId, team.name),
    detailLine: place === 1 ? m.wonTheFinal : null,
    results,
    resultsLabel: resultsLabel(results, locale),
  };
}

function knockoutPodium(
  game: FinishedGame,
  locale: Locale,
): FinishedPodiumRow[] {
  const finalists = knockoutFinalists(game.knockout);
  if (!finalists) {
    return [];
  }
  const rows = [knockoutFinalistRow(game, finalists.champion, 1, locale)];
  if (finalists.runnerUp) {
    rows.push(knockoutFinalistRow(game, finalists.runnerUp, 2, locale));
  }
  const teamId = viewerGameTeamId(game);
  if (!teamId || rows.some((row) => row.gameTeamId === teamId)) {
    return rows;
  }
  const knockout = viewerKnockout(game, teamId);
  if (knockout?.exitRound) {
    const m = messagesFor(locale).tournamentRounds.finished;
    rows.push({
      gameTeamId: teamId,
      place: null,
      pool: null,
      markName: markName(game, teamId, ""),
      isViewer: true,
      smallLine: m.you(viewerPartner(game, teamId)),
      mainLine: m.outIn(knockout.exitRound),
      detailLine: null,
      results: knockout.results,
      resultsLabel: resultsLabel(knockout.results, locale),
    });
    return rows;
  }
  // Out in the groups: their Pool place is their finish.
  const viewer = findPoolOf(game, teamId);
  if (viewer) {
    rows.push(poolPodiumRow(game, viewer, true, locale));
  }
  return rows;
}

function tournamentFinishedPodium(
  game: FinishedGame,
  locale: Locale,
): FinishedPodiumRow[] {
  return hasKnockout(game.format, game.tournamentShape)
    ? knockoutPodium(game, locale)
    : poolPodium(game, locale);
}

function drawnTeamCount(game: FinishedGame) {
  const drawn = game.gameTeams.filter(
    (team) =>
      team.members.length > 0 &&
      (team.poolIndex != null || team.knockoutSeed != null),
  ).length;
  return drawn > 0 ? drawn : (game.teamsAllowed ?? game.gameTeams.length);
}

/**
 * The viewer's own placing card when they played and have a place to show; the
 * final table for an Organizer, someone who did not play, or a knockout exit.
 */
function shareKindOf(
  game: FinishedGame,
  podium: readonly FinishedPodiumRow[],
): TournamentShareKind {
  if (game.isOrganizer) {
    return "table";
  }
  return podium.some((row) => row.isViewer && row.place != null)
    ? "placing"
    : "table";
}

/** The finished hero, top of the table and share door; null until it is over. */
export function tournamentFinishedView(
  game: FinishedGame,
  locale: Locale,
): TournamentFinishedView | null {
  if (!isTournamentFinished(game)) {
    return null;
  }
  const m = messagesFor(locale).tournamentRounds.finished;
  const knockoutOnly = isKnockoutOnly(game.format, game.tournamentShape);
  const viewer = findPoolOf(game, viewerGameTeamId(game));
  const podium = tournamentFinishedPodium(game, locale);
  const kind = shareKindOf(game, podium);
  return {
    dateLine: game.windowStart
      ? m.dateLine(formatAbsoluteDay(game.windowStart, locale))
      : null,
    name: game.name ?? tournamentFallbackName(locale),
    summary: m.summary(
      game.venue?.name ?? null,
      drawnTeamCount(game),
      knockoutOnly ? null : tournamentRoundCount(game),
      game.groupName?.trim() ? game.groupName : null,
    ),
    podiumLabel: m.podiumLabel,
    podium,
    viewerDay: viewer
      ? poolViewerDay(viewer.pool, viewer.row.gameTeamId)
      : null,
    share: {
      kind,
      label: kind === "placing" ? m.shareYourDay : m.shareTable,
    },
  };
}

type ShareCardBase = {
  tag: string;
  eyebrow: string;
  imageLabel: string;
  message: string;
};

export type TournamentPlacingCard = ShareCardBase & {
  kind: "placing";
  placing: string;
  placingNote: string;
  markName: string;
  team: string;
  record: string | null;
  results: ResultMarkVariant[];
};

export type TournamentTableCardRow = {
  /** "1", "2"… or a Pool's letter when the rows are Pool winners. */
  place: string;
  markName: string;
  team: string;
  points: string | null;
  isViewer: boolean;
};

export type TournamentTableCard = ShareCardBase & {
  kind: "table";
  title: string;
  rows: TournamentTableCardRow[];
};

export type TournamentShareCard = TournamentPlacingCard | TournamentTableCard;

const TABLE_CARD_ROWS = 6;

function placingCard(
  game: FinishedGame,
  base: Omit<ShareCardBase, "imageLabel" | "message">,
  subject: FinishedPodiumRow & { place: number },
  name: string,
  locale: Locale,
): TournamentPlacingCard {
  const m = messagesFor(locale).tournamentRounds.shareCard;
  const knockout = hasKnockout(game.format, game.tournamentShape);
  // A Knockout finalist's place is not a Pool place, so it has no record.
  const pool =
    knockout && subject.pool == null
      ? null
      : findPoolOf(game, subject.gameTeamId);
  const placingNote = subject.pool
    ? m.inPool(subject.pool)
    : subject.place === 1
      ? knockout
        ? m.champion
        : m.wonTheDay
      : m.ofTeams(
          !knockout && pool ? pool.pool.rows.length : drawnTeamCount(game),
        );
  const team = teamNames(game, subject.gameTeamId, pool?.row.name ?? "");
  const placing = m.ordinal(subject.place);
  const placingLine = m.placingLine(placing, placingNote);
  return {
    ...base,
    kind: "placing",
    placing,
    placingNote,
    markName: subject.markName,
    team,
    record: pool ? m.record(teamRecord(pool.row)) : null,
    results:
      subject.results.length > 0
        ? subject.results
        : pool
          ? poolTeamResults(pool.pool, subject.gameTeamId)
          : [],
    imageLabel: m.imageLabel(placingLine, team),
    message: m.message(name, placingLine, team),
  };
}

function tableRows(
  game: FinishedGame,
  locale: Locale,
): { title: string; rows: TournamentTableCardRow[] } {
  const m = messagesFor(locale).tournamentRounds.shareCard;
  if (hasKnockout(game.format, game.tournamentShape)) {
    const finalists = knockoutFinalists(game.knockout);
    const teams = [finalists?.champion, finalists?.runnerUp].filter(
      (team): team is KnockoutViewTeam => team != null,
    );
    return {
      title: m.finalTitle,
      rows: teams.map((team, index) => ({
        place: String(index + 1),
        markName: markName(game, team.gameTeamId, team.name),
        team: teamNames(game, team.gameTeamId, team.name),
        points: null,
        isViewer: team.isViewer,
      })),
    };
  }
  const pools = game.poolTables?.pools ?? [];
  const row = (entry: PoolTableRow, place: string) => ({
    place,
    markName: markName(game, entry.gameTeamId, entry.name),
    team: teamNames(game, entry.gameTeamId, entry.name),
    points: m.points(entry.points ?? 0),
    isViewer: entry.isViewer,
  });
  if (pools.length > 1) {
    return {
      title: m.poolWinnersTitle,
      rows: pools.flatMap((pool) =>
        pool.rows[0] ? [row(pool.rows[0], poolLetter(pool.poolIndex))] : [],
      ),
    };
  }
  return {
    title: m.tableTitle,
    rows: (pools[0]?.rows ?? [])
      .slice(0, TABLE_CARD_ROWS)
      .map((entry) => row(entry, String(entry.position))),
  };
}

/**
 * The square card a finished tournament shares: the viewer's placing, or the
 * final table (see `shareKindOf`).
 */
export function tournamentShareCard(
  game: FinishedGame,
  locale: Locale,
): TournamentShareCard | null {
  if (!isTournamentFinished(game)) {
    return null;
  }
  const m = messagesFor(locale).tournamentRounds.shareCard;
  const podium = tournamentFinishedPodium(game, locale);
  const name = game.name ?? tournamentFallbackName(locale);
  const base = {
    tag: m.tag,
    eyebrow: m.eyebrow(
      name,
      game.windowStart ? formatGameDay(game.windowStart, locale) : null,
      game.venue?.name ?? null,
    ),
  };
  if (shareKindOf(game, podium) === "placing") {
    const subject = podium.find(
      (row): row is FinishedPodiumRow & { place: number } =>
        row.isViewer && row.place != null,
    );
    if (subject) {
      return placingCard(game, base, subject, name, locale);
    }
  }
  const table = tableRows(game, locale);
  if (table.rows.length === 0) {
    return null;
  }
  return {
    ...base,
    kind: "table",
    title: table.title,
    rows: table.rows,
    imageLabel: m.tableImageLabel(name, table.title),
    message: m.tableMessage(
      name,
      table.title,
      table.rows
        .map((row) => m.tableLine(row.place, row.team, row.points))
        .join("\n"),
    ),
  };
}

/** Matches whose score both teams agreed, across every Round. */
export function confirmedMatchCount(
  rounds: readonly { matches: readonly { state: string }[] }[],
) {
  return rounds.reduce(
    (count, round) =>
      count +
      round.matches.filter((match) => match.state === "confirmed").length,
    0,
  );
}
