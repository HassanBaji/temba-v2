/**
 * Match slot resolution: which of a Match's two slots a User sat on, and what
 * a Match result means for that slot. Shared because `listMyMatchHistory`
 * reads it from the viewer's Game teams while the Group derivations read it
 * from the Users seated on each slot — one exclusivity rule, two lookups.
 */

/** A Match's two slots, as the Users seated on each. */
export type MatchSlotOccupants = {
  slot1UserIds: readonly string[];
  slot2UserIds: readonly string[];
};

/** A User sat on the Match only when they sat on exactly one of its slots. */
function exclusiveSlot(onSlot1: boolean, onSlot2: boolean): 1 | 2 | null {
  if (onSlot1 === onSlot2) {
    return null;
  }
  return onSlot1 ? 1 : 2;
}

/** The slot a User's Game teams put them on. */
export function userSlotOnMatch(
  match: {
    slot1GameTeamId: string | null;
    slot2GameTeamId: string | null;
  },
  myGameTeamIds: ReadonlySet<string>,
): 1 | 2 | null {
  return exclusiveSlot(
    match.slot1GameTeamId != null && myGameTeamIds.has(match.slot1GameTeamId),
    match.slot2GameTeamId != null && myGameTeamIds.has(match.slot2GameTeamId),
  );
}

/** The slot a seated User occupies, read from the slot rosters. */
export function seatedUserSlotOnMatch(
  match: MatchSlotOccupants,
  userId: string,
): 1 | 2 | null {
  return exclusiveSlot(
    match.slot1UserIds.includes(userId),
    match.slot2UserIds.includes(userId),
  );
}

/**
 * A Match result read from one slot. `null` when the Match has no result yet
 * — no scored Set, so nothing was won, lost, or drawn.
 */
export function outcomeForSlot(
  slot: 1 | 2,
  result: "slot1" | "slot2" | "draw" | "none",
): "won" | "lost" | "draw" | null {
  if (result === "none") {
    return null;
  }
  if (result === "draw") {
    return "draw";
  }
  if (slot === 1) {
    return result === "slot1" ? "won" : "lost";
  }
  return result === "slot2" ? "won" : "lost";
}

/** A User seated on a Match slot, as the cards that read a slot render them. */
export type MatchSlotMember = {
  id: string;
  name: string;
  image: string | null;
  /** Marks the signed-in User's own seat, so cards can label it "You". */
  isViewer: boolean;
};

/** A slot's Game team with its seated Users — `null` before the draw. */
export type MatchSlotTeam = {
  players: readonly {
    position: string | null;
    gamePlayer: {
      user: { id: string; name: string; image: string | null } | null;
    } | null;
  }[];
} | null;

/**
 * The Users on one slot, left seat first, then right, then anyone unseated.
 * Shared by the Games hub History card and the Group Played rows, which read
 * the same slot rosters off the same Match.
 */
export function slotMembers(
  team: MatchSlotTeam,
  viewerUserId: string | null,
): MatchSlotMember[] {
  const players = [...(team?.players ?? [])].sort((left, right) => {
    const rank = (position: string | null) =>
      position === "left" ? 0 : position === "right" ? 1 : 2;
    return rank(left.position) - rank(right.position);
  });
  const members: MatchSlotMember[] = [];
  for (const link of players) {
    const occupant = link.gamePlayer?.user;
    if (!occupant) {
      continue;
    }
    members.push({
      id: occupant.id,
      name: occupant.name,
      image: occupant.image,
      isViewer: occupant.id === viewerUserId,
    });
  }
  return members;
}

/** A Match's Sets that carry a score, in the order they were read. */
export function scoredSetsFromMatch(
  sets: readonly {
    slot1GamesWon: number | null;
    slot2GamesWon: number | null;
  }[],
): { slot1GamesWon: number; slot2GamesWon: number }[] {
  const scored: { slot1GamesWon: number; slot2GamesWon: number }[] = [];
  for (const set of sets) {
    if (set.slot1GamesWon == null || set.slot2GamesWon == null) {
      continue;
    }
    scored.push({
      slot1GamesWon: set.slot1GamesWon,
      slot2GamesWon: set.slot2GamesWon,
    });
  }
  return scored;
}
