import type { Locale } from "@repo/i18n/locale";
import { messagesFor } from "@repo/i18n/messages";

import { firstName, joinNames } from "./game-album";
import { formatGameSideLabel } from "./game-side-label";
import type { LevelBand } from "./level-bands";

export type EditTeamsPosition = "left" | "right";

export type EditTeamsSpot = { sideIndex: number; position: EditTeamsPosition };

export type EditTeamsPlayer = {
  userId: string;
  name: string;
  image: string | null;
  levelBand: LevelBand | null;
};

export type EditTeamsSide = {
  sideIndex: number;
  /** Played a completed Match: its two players stay together. */
  locked: boolean;
  left: EditTeamsPlayer | null;
  right: EditTeamsPlayer | null;
};

export type EditTeamsRules = {
  /** Every non-empty side must end with two players (a partner-required tournament). */
  fullSidesOnly: boolean;
  /** No side may gain or lose a player, only swaps (a tournament after its draw). */
  fixedSides: boolean;
};

export type EditTeamsRefusal = "locked" | "half_side" | "fixed_sides";

export type EditTeamsTapResult = {
  sides: EditTeamsSide[];
  selected: EditTeamsSpot | null;
  refused: EditTeamsRefusal | null;
};

export type EditTeamsMove = {
  player: EditTeamsPlayer;
  from: EditTeamsSpot;
  to: EditTeamsSpot;
  teamChanged: boolean;
};

type SourceSide = {
  sideIndex: number;
  gameTeamId: string | null;
  left: EditTeamsPlayer | null;
  right: EditTeamsPlayer | null;
};

type SourceMatch = {
  status: string | null;
  slot1GameTeamId: string | null;
  slot2GameTeamId: string | null;
};

const POSITIONS: readonly EditTeamsPosition[] = ["left", "right"];

/** Game teams that played a completed Match. Their result belongs to the pair. */
export function playedGameTeamIds(matches: readonly SourceMatch[]) {
  const ids = new Set<string>();
  for (const match of matches) {
    if (match.status !== "completed") {
      continue;
    }
    if (match.slot1GameTeamId) {
      ids.add(match.slot1GameTeamId);
    }
    if (match.slot2GameTeamId) {
      ids.add(match.slot2GameTeamId);
    }
  }
  return ids;
}

function playerOf(occupant: EditTeamsPlayer | null): EditTeamsPlayer | null {
  return occupant
    ? {
        userId: occupant.userId,
        name: occupant.name,
        image: occupant.image,
        levelBand: occupant.levelBand,
      }
    : null;
}

export function editTeamsSides(
  sides: readonly SourceSide[],
  matches: readonly SourceMatch[] = [],
): EditTeamsSide[] {
  const played = playedGameTeamIds(matches);
  return sides.map((side) => ({
    sideIndex: side.sideIndex,
    locked: side.gameTeamId != null && played.has(side.gameTeamId),
    left: playerOf(side.left),
    right: playerOf(side.right),
  }));
}

export function sameSpot(a: EditTeamsSpot | null, b: EditTeamsSpot | null) {
  if (!a || !b) {
    return false;
  }
  return a.sideIndex === b.sideIndex && a.position === b.position;
}

function occupantAt(sides: readonly EditTeamsSide[], spot: EditTeamsSpot) {
  return (
    sides.find((side) => side.sideIndex === spot.sideIndex)?.[spot.position] ??
    null
  );
}

function withSpot(
  sides: readonly EditTeamsSide[],
  spot: EditTeamsSpot,
  player: EditTeamsPlayer | null,
): EditTeamsSide[] {
  return sides.map((side) =>
    side.sideIndex === spot.sideIndex
      ? { ...side, [spot.position]: player }
      : side,
  );
}

function seatedCount(side: EditTeamsSide) {
  return (side.left ? 1 : 0) + (side.right ? 1 : 0);
}

function refusalFor(
  before: readonly EditTeamsSide[],
  after: readonly EditTeamsSide[],
  from: EditTeamsSpot,
  to: EditTeamsSpot,
  rules: EditTeamsRules,
): EditTeamsRefusal | null {
  if (from.sideIndex === to.sideIndex) {
    return null;
  }
  const touched = before.filter(
    (side) =>
      side.sideIndex === from.sideIndex || side.sideIndex === to.sideIndex,
  );
  if (touched.some((side) => side.locked)) {
    return "locked";
  }
  const touchedAfter = after.filter(
    (side) =>
      side.sideIndex === from.sideIndex || side.sideIndex === to.sideIndex,
  );
  const countChanged = touchedAfter.some(
    (side) =>
      seatedCount(side) !==
      seatedCount(before.find((row) => row.sideIndex === side.sideIndex)!),
  );
  if (rules.fixedSides && countChanged) {
    return "fixed_sides";
  }
  if (
    rules.fullSidesOnly &&
    touchedAfter.some((side) => seatedCount(side) === 1)
  ) {
    return "half_side";
  }
  return null;
}

/**
 * One tap on the Edit teams board. The first tap picks a player; the second
 * swaps them with the player tapped, or moves them to the open spot tapped.
 * Tapping the picked player again drops the pick.
 */
export function editTeamsTap(
  sides: readonly EditTeamsSide[],
  selected: EditTeamsSpot | null,
  tapped: EditTeamsSpot,
  rules: EditTeamsRules,
): EditTeamsTapResult {
  const unchanged = [...sides];
  const tappedPlayer = occupantAt(sides, tapped);
  if (!selected) {
    return {
      sides: unchanged,
      selected: tappedPlayer ? tapped : null,
      refused: null,
    };
  }
  if (sameSpot(selected, tapped)) {
    return { sides: unchanged, selected: null, refused: null };
  }
  const picked = occupantAt(sides, selected);
  if (!picked) {
    return {
      sides: unchanged,
      selected: tappedPlayer ? tapped : null,
      refused: null,
    };
  }
  const next = withSpot(
    withSpot(sides, selected, tappedPlayer),
    tapped,
    picked,
  );
  const refused = refusalFor(sides, next, selected, tapped, rules);
  if (refused) {
    return { sides: unchanged, selected: null, refused };
  }
  return { sides: next, selected: null, refused: null };
}

/** Swaps left and right on one side. Allowed on a locked side. */
export function editTeamsSwapSides(
  sides: readonly EditTeamsSide[],
  sideIndex: number,
): EditTeamsSide[] {
  return sides.map((side) =>
    side.sideIndex === sideIndex
      ? { ...side, left: side.right, right: side.left }
      : side,
  );
}

function spotsByUser(sides: readonly EditTeamsSide[]) {
  const spots = new Map<
    string,
    { player: EditTeamsPlayer; spot: EditTeamsSpot }
  >();
  for (const side of sides) {
    for (const position of POSITIONS) {
      const player = side[position];
      if (player) {
        spots.set(player.userId, {
          player,
          spot: { sideIndex: side.sideIndex, position },
        });
      }
    }
  }
  return spots;
}

/** Every player whose spot differs between the two boards, in board order. */
export function editTeamsMoves(
  original: readonly EditTeamsSide[],
  edited: readonly EditTeamsSide[],
): EditTeamsMove[] {
  const before = spotsByUser(original);
  const moves: EditTeamsMove[] = [];
  for (const [userId, { player, spot }] of spotsByUser(edited)) {
    const from = before.get(userId)?.spot;
    if (!from || sameSpot(from, spot)) {
      continue;
    }
    moves.push({
      player,
      from,
      to: spot,
      teamChanged: from.sideIndex !== spot.sideIndex,
    });
  }
  return moves;
}

/** The line-up `games.editTeams` saves: every seated player and their spot. */
export function editTeamsSeats(sides: readonly EditTeamsSide[]) {
  return [...spotsByUser(sides).entries()].map(([userId, { spot }]) => ({
    userId,
    sideIndex: spot.sideIndex,
    position: spot.position,
  }));
}

export function editTeamsSpotLabel(
  format: string,
  spot: EditTeamsSpot,
  locale: Locale,
) {
  const m = messagesFor(locale).editTeams;
  return m.spot(
    formatGameSideLabel(format, spot.sideIndex, locale),
    spot.position === "left" ? m.left : m.right,
  );
}

export function editTeamsSummary(
  moves: readonly EditTeamsMove[],
  locale: Locale,
) {
  const teamChangeCount = moves.filter((move) => move.teamChanged).length;
  return messagesFor(locale).editTeams.summary(
    teamChangeCount,
    moves.length - teamChangeCount,
  );
}

/** Who "Tell the players" reaches: everyone moved except the Organizer. */
export function editTeamsNotified(
  moves: readonly EditTeamsMove[],
  organizerUserId: string,
) {
  return moves
    .map((move) => move.player)
    .filter((player) => player.userId !== organizerUserId);
}

export function editTeamsNotifyCopy(
  moves: readonly EditTeamsMove[],
  organizerUserId: string,
  locale: Locale,
) {
  const m = messagesFor(locale).editTeams;
  const notified = editTeamsNotified(moves, organizerUserId);
  if (notified.length === 0) {
    return m.notifyNobody;
  }
  return m.notifyCopy(
    joinNames(
      notified.map((player) => firstName(player.name)),
      locale,
    ),
    notified.length,
  );
}

export function editTeamsRefusalMessage(
  refusal: EditTeamsRefusal,
  locale: Locale,
) {
  const m = messagesFor(locale).editTeams.refused;
  if (refusal === "locked") {
    return m.locked;
  }
  if (refusal === "half_side") {
    return m.halfSide;
  }
  return m.fixedSides;
}

/**
 * The Organizer may edit a padel Friendly game's teams until a score goes in,
 * and a Friendly tournament's while it is not cancelled and has two players.
 */
export function canEditTeams(game: {
  isOrganizer: boolean;
  cancelledAt: Date | string | null;
  format: string;
  sport: string | null;
  registrationMode: string;
  sides: readonly { left: unknown; right: unknown }[];
  matches: readonly {
    status: string | null;
    sets: readonly {
      slot1GamesWon: number | null;
      slot2GamesWon: number | null;
    }[];
  }[];
}) {
  if (!game.isOrganizer || game.cancelledAt) {
    return false;
  }
  if (game.registrationMode !== "individual" || game.sport === "football") {
    return false;
  }
  const seated = game.sides.reduce(
    (count, side) => count + (side.left ? 1 : 0) + (side.right ? 1 : 0),
    0,
  );
  if (seated < 2) {
    return false;
  }
  if (game.format === "friendly_tournament") {
    return true;
  }
  if (game.format !== "friendly_game") {
    return false;
  }
  return !game.matches.some(
    (match) =>
      match.status === "completed" ||
      match.sets.some(
        (set) => set.slot1GamesWon != null || set.slot2GamesWon != null,
      ),
  );
}
