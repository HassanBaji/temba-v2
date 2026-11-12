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
    "format" | "tournamentShape" | "drawPostedAt" | "cancelledAt"
  > & {
    poolTables: { finished: boolean } | null;
    knockout: FinishedGame["knockout"];
  },
): boolean {
  if (game.drawPostedAt == null || game.cancelledAt != null) {
    return false;
  }
  if (hasKnockout(game.format, game.tournamentShape)) {
    return finalOf(game.knockout)?.through != null;
  }
  return Boolean(game.poolTables?.finished);
}

export type FinishedPodiumRow = {
  gameTeamId: string;
  place: number;
  /** The name the initials mark is drawn from. */
  markName: string;
  isViewer: boolean;
  eyebrow: string;
  title: string;
  meta: string | null;
  /** The team's Matches in Round order; empty when there is nothing to draw. */
  results: ResultMarkVariant[];
  resultsLabel: string | null;
};

export type FinishedGamesTotals = {
  count: number;
  scored: number;
  conceded: number;
};

export type TournamentFinishedView = {
  dateLine: string | null;
  name: string;
  summary: string;
  podiumLabel: string;
  podium: FinishedPodiumRow[];
  /** The viewer's own Matches, for the Your games heading. */
  viewerGames: FinishedGamesTotals | null;
  /** "Share your day" for a player, "Share the final table" otherwise. */
  shareLabel: string;
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

function finalOf(knockout: FinishedGame["knockout"]) {
  const final = knockout?.at(-1)?.places[0];
  if (final?.kind !== "match") {
    return null;
  }
  return { place: final, through: final.winner ?? final.walkover };
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

export function poolTeamResults(
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

export function poolTeamGames(
  pool: ComputedPoolTable,
  gameTeamId: string,
): FinishedGamesTotals {
  const matches = poolMatchesOf(pool, gameTeamId).filter(
    (match) => !match.cancelled,
  );
  let scored = 0;
  let conceded = 0;
  for (const match of matches) {
    const first = match.slot1GameTeamId === gameTeamId;
    for (const set of match.sets) {
      scored += (first ? set.slot1GamesWon : set.slot2GamesWon) ?? 0;
      conceded += (first ? set.slot2GamesWon : set.slot1GamesWon) ?? 0;
    }
  }
  return { count: matches.length, scored, conceded };
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

function stat(value: number | null) {
  return value ?? 0;
}

function poolPodiumRow(
  game: FinishedGame,
  entry: { row: PoolTableRow; pool: ComputedPoolTable },
  multiplePools: boolean,
  locale: Locale,
): FinishedPodiumRow {
  const m = messagesFor(locale).tournamentRounds.finished;
  const { row, pool } = entry;
  const placeText = multiplePools
    ? m.placeInPool(m.place(row.position), poolName(pool, locale))
    : m.place(row.position);
  const winnerText = multiplePools
    ? m.wonPool(poolName(pool, locale))
    : m.wonTheDay;
  const points = stat(row.points);
  const record = m.record(
    stat(row.won),
    stat(row.drawn),
    stat(row.lost),
    points,
  );
  const base = {
    gameTeamId: row.gameTeamId,
    place: row.position,
    markName: markName(game, row.gameTeamId, row.name),
    isViewer: row.isViewer,
  };
  if (!row.isViewer) {
    return {
      ...base,
      eyebrow: row.position === 1 ? winnerText : placeText,
      title: teamNames(game, row.gameTeamId, row.name),
      meta: record,
      results: [],
      resultsLabel: null,
    };
  }
  const leaderPoints = stat(pool.rows[0]?.points ?? null);
  const behind = leaderPoints - points;
  const results = poolTeamResults(pool, row.gameTeamId);
  return {
    ...base,
    eyebrow: m.you(viewerPartner(game, row.gameTeamId)),
    title:
      row.position === 1 ? winnerText : m.placeWithPoints(placeText, points),
    meta: row.position > 1 && behind > 0 ? m.behind(record, behind) : record,
    results,
    resultsLabel: resultsLabel(results, locale),
  };
}

function poolPodium(game: FinishedGame, locale: Locale): FinishedPodiumRow[] {
  const tables = game.poolTables;
  if (!tables || tables.pools.length === 0) {
    return [];
  }
  const multiplePools = tables.pools.length > 1;
  const entries = multiplePools
    ? tables.pools.flatMap((pool) =>
        pool.rows[0] ? [{ row: pool.rows[0], pool }] : [],
      )
    : (() => {
        const pool = tables.pools[0]!;
        return pool.rows.slice(0, 3).map((row) => ({ row, pool }));
      })();
  const viewerPool = tables.pools.find(
    (pool) => pool.poolIndex === tables.viewerPoolIndex,
  );
  const viewerRow = viewerPool?.rows.find((row) => row.isViewer);
  if (
    viewerPool &&
    viewerRow &&
    !entries.some((entry) => entry.row.gameTeamId === viewerRow.gameTeamId)
  ) {
    entries.push({ row: viewerRow, pool: viewerPool });
  }
  return entries.map((entry) =>
    poolPodiumRow(game, entry, multiplePools, locale),
  );
}

function knockoutPodium(
  game: FinishedGame,
  locale: Locale,
): FinishedPodiumRow[] {
  const m = messagesFor(locale).tournamentRounds.finished;
  const final = finalOf(game.knockout);
  if (final?.through == null) {
    return [];
  }
  const { place, through } = final;
  const sides =
    through === 1 ? [place.slot1, place.slot2] : [place.slot2, place.slot1];
  return sides.flatMap((side, index) => {
    if (side.kind !== "team") {
      return [];
    }
    const { team } = side;
    const finish = index === 0 ? m.wonTheDay : m.runnerUp;
    const names = teamNames(game, team.gameTeamId, team.name);
    return [
      {
        gameTeamId: team.gameTeamId,
        place: index + 1,
        markName: markName(game, team.gameTeamId, team.name),
        isViewer: team.isViewer,
        eyebrow: team.isViewer
          ? m.you(viewerPartner(game, team.gameTeamId))
          : finish,
        title: team.isViewer ? finish : names,
        meta: index === 0 ? m.wonTheFinal : null,
        results: [],
        resultsLabel: null,
      },
    ];
  });
}

function drawnTeamCount(game: FinishedGame) {
  const drawn = game.gameTeams.filter(
    (team) =>
      team.members.length > 0 &&
      (team.poolIndex != null || team.knockoutSeed != null),
  ).length;
  return drawn > 0 ? drawn : (game.teamsAllowed ?? game.gameTeams.length);
}

function viewerPool(game: FinishedGame) {
  const tables = game.poolTables;
  return (
    tables?.pools.find((pool) => pool.poolIndex === tables.viewerPoolIndex) ??
    null
  );
}

function viewerGameTeamId(game: FinishedGame) {
  return (
    game.gameTeams.find((team) =>
      team.members.some((member) => member.id === game.viewerUserId),
    )?.id ?? null
  );
}

export function tournamentFinishedPodium(
  game: FinishedGame,
  locale: Locale,
): FinishedPodiumRow[] {
  return hasKnockout(game.format, game.tournamentShape)
    ? knockoutPodium(game, locale)
    : poolPodium(game, locale);
}

/** The finished hero, top of the table and share label; null until it is over. */
export function tournamentFinishedView(
  game: FinishedGame,
  locale: Locale,
): TournamentFinishedView | null {
  if (!isTournamentFinished(game)) {
    return null;
  }
  const m = messagesFor(locale).tournamentRounds.finished;
  const knockoutOnly = isKnockoutOnly(game.format, game.tournamentShape);
  const pool = viewerPool(game);
  const teamId = viewerGameTeamId(game);
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
    podium: tournamentFinishedPodium(game, locale),
    viewerGames: pool && teamId ? poolTeamGames(pool, teamId) : null,
    shareLabel: teamId ? m.shareYourDay : m.shareTable,
  };
}

export type TournamentShareCard = {
  tag: string;
  eyebrow: string;
  placing: string;
  placingNote: string;
  markName: string;
  team: string;
  record: string | null;
  results: ResultMarkVariant[];
  imageLabel: string;
  message: string;
};

function shareSubject(podium: FinishedPodiumRow[]) {
  return podium.find((row) => row.isViewer) ?? podium[0] ?? null;
}

/**
 * The square card a finished tournament shares: the viewer's placing when they
 * played and have one, otherwise the winner's.
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
  const subject = shareSubject(podium);
  if (!subject) {
    return null;
  }
  const knockout = hasKnockout(game.format, game.tournamentShape);
  const pool = knockout
    ? null
    : (game.poolTables?.pools.find((entry) =>
        entry.rows.some((row) => row.gameTeamId === subject.gameTeamId),
      ) ?? null);
  const row = pool?.rows.find(
    (entry) => entry.gameTeamId === subject.gameTeamId,
  );
  const multiplePools = (game.poolTables?.pools.length ?? 0) > 1;
  const placingNote =
    pool && multiplePools
      ? m.inPool(poolName(pool, locale))
      : subject.place === 1
        ? m.wonTheDay
        : m.ofTeams(pool ? pool.rows.length : drawnTeamCount(game));
  const team = teamNames(game, subject.gameTeamId, row?.name ?? "");
  const placing = m.ordinal(subject.place);
  const name = game.name ?? tournamentFallbackName(locale);
  return {
    tag: m.tag,
    eyebrow: m.eyebrow(
      name,
      game.windowStart ? formatGameDay(game.windowStart, locale) : null,
      game.venue?.name ?? null,
    ),
    placing,
    placingNote,
    markName: markName(game, subject.gameTeamId, team),
    team,
    record: row
      ? m.record(
          stat(row.won),
          stat(row.drawn),
          stat(row.lost),
          stat(row.points),
        )
      : null,
    results: pool ? poolTeamResults(pool, subject.gameTeamId) : [],
    imageLabel: m.imageLabel(`${placing} ${placingNote}`, team),
    message: m.message(name, placing, team),
  };
}
