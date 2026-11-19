import type { Locale } from "@repo/i18n/locale";
import { messagesFor } from "@repo/i18n/messages";

import { formatPadelLevel } from "./level";
import { TOURNAMENT_TEAM_MIN } from "./tournament-sizing";

export type AloneSide = "left" | "right";

export type AlonePlayer = {
  id: string;
  /** The continuous padel Level; null without a Rating. */
  level: number | null;
  /** The side the player asked for; null is Either. */
  preferredSide: AloneSide | null;
};

export type AlonePair = { left: string; right: string };

export type AloneTeams = {
  pairs: AlonePair[];
  /** The odd player out: the last to sign up, left on the list. */
  unplaced: string | null;
};

/** Four Game teams, the fewest any Social draws. */
export const ALONE_TEAMS_MIN_PAIRS = TOURNAMENT_TEAM_MIN;
export const ALONE_TEAMS_MIN_PLAYERS = ALONE_TEAMS_MIN_PAIRS * 2;

export type AloneTeamsShape = {
  organizerMakesTeams?: boolean | null;
  teamsPostedAt?: Date | string | null;
};

/** The Social takes a list of players: it is Alone only and its teams are not posted yet. */
export function awaitsOrganizerTeams(game: AloneTeamsShape) {
  return game.organizerMakesTeams === true && game.teamsPostedAt == null;
}

function mean(values: readonly number[]) {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

/** A player with no Rating counts as the field's average, so they neither help nor hurt a pair. */
function standInLevel(players: readonly AlonePlayer[]) {
  const known = players.flatMap((player) =>
    player.level == null ? [] : [player.level],
  );
  return known.length > 0 ? mean(known) : 3;
}

function levelOf(player: AlonePlayer | undefined, standIn: number): number {
  return player?.level ?? standIn;
}

/**
 * Who plays Left: the one who asked for it, or the other one who asked for
 * Right. Both or neither asking for the same side puts the stronger on the
 * Left.
 */
function sidedPair(
  first: AlonePlayer,
  second: AlonePlayer,
  standIn: number,
): AlonePair {
  const firstSide = first.preferredSide;
  const secondSide = second.preferredSide;
  if (firstSide !== secondSide) {
    if (firstSide === "left" || secondSide === "right") {
      return { left: first.id, right: second.id };
    }
    if (secondSide === "left" || firstSide === "right") {
      return { left: second.id, right: first.id };
    }
  }
  return levelOf(first, standIn) >= levelOf(second, standIn)
    ? { left: first.id, right: second.id }
    : { left: second.id, right: first.id };
}

function splitOddPlayer(players: readonly AlonePlayer[]) {
  if (players.length % 2 === 0) {
    return { field: [...players], unplaced: null };
  }
  return {
    field: players.slice(0, -1),
    unplaced: players[players.length - 1]?.id ?? null,
  };
}

function sameSideConflict(
  first: AlonePlayer,
  second: AlonePlayer,
): AloneSide | null {
  return first.preferredSide != null &&
    first.preferredSide === second.preferredSide
    ? first.preferredSide
    : null;
}

type Couple = [AlonePlayer, AlonePlayer];

function coupleAverage(couple: Couple, standIn: number) {
  return (levelOf(couple[0], standIn) + levelOf(couple[1], standIn)) / 2;
}

function spreadOf(couples: readonly Couple[], standIn: number) {
  if (couples.length === 0) {
    return 0;
  }
  const averages = couples.map((couple) => coupleAverage(couple, standIn));
  return Math.max(...averages) - Math.min(...averages);
}

/**
 * A pair who both asked for Left and a pair who both asked for Right trade one
 * player each, so both pairs get a left and a right. Of the four trades the one
 * that keeps the field closest in level wins.
 */
function resolveSideConflicts(couples: Couple[], standIn: number) {
  for (let first = 0; first < couples.length; first += 1) {
    const a = couples[first];
    if (!a || sameSideConflict(a[0], a[1]) == null) {
      continue;
    }
    for (let second = first + 1; second < couples.length; second += 1) {
      const b = couples[second];
      if (!b) {
        continue;
      }
      const bSide = sameSideConflict(b[0], b[1]);
      if (bSide == null || bSide === sameSideConflict(a[0], a[1])) {
        continue;
      }
      let best: { a: Couple; b: Couple; spread: number } | null = null;
      for (const keepA of [0, 1] as const) {
        for (const keepB of [0, 1] as const) {
          const nextA: Couple = [a[keepA], b[keepB === 0 ? 1 : 0]];
          const nextB: Couple = [b[keepB], a[keepA === 0 ? 1 : 0]];
          const trial = couples.map((couple, index) =>
            index === first ? nextA : index === second ? nextB : couple,
          );
          const spread = spreadOf(trial, standIn);
          if (!best || spread < best.spread) {
            best = { a: nextA, b: nextB, spread };
          }
        }
      }
      if (best) {
        couples[first] = best.a;
        couples[second] = best.b;
      }
      break;
    }
  }
}

/**
 * The opening line-up of Make teams: strongest with weakest, then a left with
 * a right where two same-side pairs can trade. Players come in sign-up order;
 * with an odd number the last to sign up is left out.
 */
export function balanceAloneTeams(players: readonly AlonePlayer[]): AloneTeams {
  const { field, unplaced } = splitOddPlayer(players);
  const standIn = standInLevel(field);
  const ranked = [...field].sort(
    (left, right) =>
      levelOf(right, standIn) - levelOf(left, standIn) ||
      left.id.localeCompare(right.id),
  );
  const couples: Couple[] = [];
  for (let index = 0; index < ranked.length / 2; index += 1) {
    const strong = ranked[index];
    const weak = ranked[ranked.length - 1 - index];
    if (strong && weak) {
      couples.push([strong, weak]);
    }
  }
  resolveSideConflicts(couples, standIn);
  return {
    pairs: couples.map(([first, second]) => sidedPair(first, second, standIn)),
    unplaced,
  };
}

/** Shuffle: a random order paired two by two, each pair sided as Balance sides it. */
export function shuffleAloneTeams(
  players: readonly AlonePlayer[],
  random: () => number = Math.random,
): AloneTeams {
  const { field, unplaced } = splitOddPlayer(players);
  const standIn = standInLevel(field);
  const order = [...field];
  for (let index = order.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(random() * (index + 1));
    const current = order[index];
    const other = order[swap];
    if (current && other) {
      order[index] = other;
      order[swap] = current;
    }
  }
  const pairs: AlonePair[] = [];
  for (let index = 0; index + 1 < order.length; index += 2) {
    const first = order[index];
    const second = order[index + 1];
    if (first && second) {
      pairs.push(sidedPair(first, second, standIn));
    }
  }
  return { pairs, unplaced };
}

export type AloneSlot = { pairIndex: number; side: AloneSide };

/** Tap two players to swap them: the two slots trade players, in one pair or across two. */
export function swapAloneSlots(
  pairs: readonly AlonePair[],
  first: AloneSlot,
  second: AloneSlot,
): AlonePair[] {
  const next = pairs.map((pair) => ({ ...pair }));
  const a = next[first.pairIndex];
  const b = next[second.pairIndex];
  if (!a || !b) {
    return next;
  }
  const held = a[first.side];
  a[first.side] = b[second.side];
  b[second.side] = held;
  return next;
}

/** A pair's Level: the mean of the players who hold one; null when neither does. */
export function alonePairAverage(
  levels: readonly (number | null)[],
): number | null {
  const known = levels.filter((level): level is number => level != null);
  return known.length > 0 ? mean(known) : null;
}

/** The side both players of a pair asked for, for the "2 L" or "2 R" mark. */
export function alonePairSameSide(
  pair: AlonePair,
  playerById: ReadonlyMap<string, AlonePlayer>,
): AloneSide | null {
  const left = playerById.get(pair.left);
  const right = playerById.get(pair.right);
  return left && right ? sameSideConflict(left, right) : null;
}

/** How far apart the pairs are in Level, the widest gap between two pair averages. */
export function aloneTeamsSpread(
  pairs: readonly AlonePair[],
  playerById: ReadonlyMap<string, AlonePlayer>,
): number {
  const averages = pairs.flatMap((pair) => {
    const average = alonePairAverage([
      playerById.get(pair.left)?.level ?? null,
      playerById.get(pair.right)?.level ?? null,
    ]);
    return average == null ? [] : [average];
  });
  return averages.length > 1
    ? Math.max(...averages) - Math.min(...averages)
    : 0;
}

/** Every pair has a left and a right: nobody in a pair asked for the same side as their partner. */
export function aloneTeamsSidesMatch(
  pairs: readonly AlonePair[],
  playerById: ReadonlyMap<string, AlonePlayer>,
) {
  return pairs.every((pair) => alonePairSameSide(pair, playerById) == null);
}

export function formatAloneLevel(level: number | null, locale: Locale) {
  return level == null
    ? messagesFor(locale).aloneTeams.make.noLevel
    : formatPadelLevel(level, 2);
}

export type AloneTeamsProblem =
  | "too_few_pairs"
  | "too_many_pairs"
  | "player_twice"
  | "not_on_game"
  | "left_out";

/**
 * Whether a set of pairs may be posted: every player on the Game once, at
 * least four pairs, no more than the Social holds, and nobody left out but one
 * odd player.
 */
export function aloneTeamsProblem(args: {
  pairs: readonly AlonePair[];
  playerIds: readonly string[];
  teamsAllowed: number | null;
}): AloneTeamsProblem | null {
  const placed = args.pairs.flatMap((pair) => [pair.left, pair.right]);
  if (new Set(placed).size !== placed.length) {
    return "player_twice";
  }
  const onGame = new Set(args.playerIds);
  if (placed.some((id) => !onGame.has(id))) {
    return "not_on_game";
  }
  if (args.pairs.length < ALONE_TEAMS_MIN_PAIRS) {
    return "too_few_pairs";
  }
  if (args.teamsAllowed != null && args.pairs.length > args.teamsAllowed) {
    return "too_many_pairs";
  }
  if (onGame.size - placed.length > 1) {
    return "left_out";
  }
  return null;
}

export type AloneTeamsShareTeam = {
  leftName: string;
  rightName: string;
  average: number | null;
};

/** The Text tab of Share teams: a numbered list for the group chat. */
export function aloneTeamsShareText(
  args: {
    gameName: string;
    detailLines: readonly string[];
    teams: readonly AloneTeamsShareTeam[];
    showLevels: boolean;
  },
  locale: Locale,
): string {
  const m = messagesFor(locale).aloneTeams.share;
  const lines = args.teams.map((team, index) =>
    args.showLevels && team.average != null
      ? m.textLineLevel(
          index + 1,
          team.leftName,
          team.rightName,
          formatPadelLevel(team.average, 2),
        )
      : m.textLine(index + 1, team.leftName, team.rightName),
  );
  return [m.textTitle(args.gameName), ...args.detailLines, "", ...lines]
    .join("\n")
    .trim();
}
