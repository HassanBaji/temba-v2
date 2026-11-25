import { type SeriesWinWith } from "@repo/domain/series-copy";

import { type SeriesEdition } from "#src/series/load-series-editions";

/** The player's own win of this Edition, or undefined when they did not win it. */
export function playerWinOf(edition: SeriesEdition, playerId: string) {
  return edition.result.state === "won"
    ? edition.winners.find((winner) => winner.userId === playerId)
    : undefined;
}

function sumGames(
  sets: NonNullable<SeriesEdition["score"]>["sets"],
  slot: "slot1GamesWon" | "slot2GamesWon",
) {
  return sets.reduce((total, set) => total + (set[slot] ?? 0), 0);
}

function scoreFor(edition: SeriesEdition, gameTeamId: string | null) {
  const score = edition.score;
  if (!score || !gameTeamId || score.sets.length === 0) {
    return null;
  }
  const slot1 = sumGames(score.sets, "slot1GamesWon");
  const slot2 = sumGames(score.sets, "slot2GamesWon");
  if (score.slot1GameTeamId === gameTeamId) {
    return { mine: slot1, theirs: slot2 };
  }
  if (score.slot2GameTeamId === gameTeamId) {
    return { mine: slot2, theirs: slot1 };
  }
  return null;
}

/**
 * Who the player won an Edition with: the one partner on a two-player team;
 * on a football Game, their side's Bib and the score from their side.
 */
export function playerWinWith(
  edition: SeriesEdition,
  playerId: string,
): SeriesWinWith {
  const mine = playerWinOf(edition, playerId);
  const gameTeamId = mine?.gameTeamId ?? null;
  if (edition.game.sport === "football") {
    return {
      names: [],
      bib: edition.winnerBib,
      score: scoreFor(edition, gameTeamId),
    };
  }
  const team = gameTeamId
    ? edition.winners.filter((winner) => winner.gameTeamId === gameTeamId)
    : [];
  const partner =
    team.length === 2
      ? team.find((winner) => winner.userId !== playerId)
      : undefined;
  return { names: partner ? [partner.name] : [], bib: null, score: null };
}

/** When a win happened: the Edition's decision, else its day. */
export function playerWinTimes(edition: SeriesEdition) {
  const wonAt = edition.decidedAt ?? edition.game.windowStart;
  const playedAt = edition.game.windowStart ?? edition.decidedAt;
  return wonAt && playedAt ? { wonAt, playedAt } : null;
}
