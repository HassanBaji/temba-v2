import {
  ALONE_TEAMS_MIN_PAIRS,
  aloneTeamsProblem,
  aloneTeamsSidesMatch,
  aloneTeamsSpread,
  alonePairAverage,
  balanceAloneTeams,
  shuffleAloneTeams,
  swapAloneSlots,
  type AlonePair,
  type AlonePlayer,
  type AloneSide,
  type AloneSlot,
} from "@repo/domain/alone-teams";
import type { TournamentDetailsSide } from "@repo/domain/tournament-details";
import type { Locale } from "@repo/i18n/locale";
import { messagesFor } from "@repo/i18n/messages";

export type SheetPlayer = {
  userId: string;
  name: string;
  image: string | null;
  level: number | null;
  levelBand: string | null;
  preferredSide: AloneSide | null;
};

export type SheetTeam = {
  gameTeamId: string;
  sideIndex: number | null;
  left: string | null;
  right: string | null;
};

export type AloneTeamsSheet = {
  players: readonly SheetPlayer[];
  teams: readonly SheetTeam[];
  teamsPostedAt: Date | string | null;
};

/** How the line-up on Make teams came about, for the note under the buttons. */
export type MakeTeamsMode = "balanced" | "shuffled" | "edited" | "posted";

export type MakeTeamsDraft = {
  pairs: AlonePair[];
  unplaced: string | null;
  mode: MakeTeamsMode;
};

/** A seat on Make teams: a side of a pair, or the odd player out. */
export type MakeTeamsSlot = AloneSlot | "unplaced";

export function alonePlayers(players: readonly SheetPlayer[]): AlonePlayer[] {
  return players.map((player) => ({
    id: player.userId,
    level: player.level,
    preferredSide: player.preferredSide,
  }));
}

export function alonePlayerMap(players: readonly SheetPlayer[]) {
  return new Map(alonePlayers(players).map((player) => [player.id, player]));
}

function bySide(teams: readonly SheetTeam[]) {
  return [...teams].sort(
    (first, second) =>
      (first.sideIndex ?? Number.MAX_SAFE_INTEGER) -
      (second.sideIndex ?? Number.MAX_SAFE_INTEGER),
  );
}

/** The posted pairs, in side order, when every Game team is full and on the list. */
function postedPairs(sheet: AloneTeamsSheet) {
  if (sheet.teamsPostedAt == null || sheet.teams.length === 0) {
    return null;
  }
  const onList = new Set(sheet.players.map((player) => player.userId));
  const pairs: AlonePair[] = [];
  for (const team of bySide(sheet.teams)) {
    if (!team.left || !team.right) {
      return null;
    }
    if (!onList.has(team.left) || !onList.has(team.right)) {
      return null;
    }
    pairs.push({ left: team.left, right: team.right });
  }
  const placed = new Set(pairs.flatMap((pair) => [pair.left, pair.right]));
  const waiting = sheet.players.filter((player) => !placed.has(player.userId));
  if (waiting.length > 1) {
    return null;
  }
  return { pairs, unplaced: waiting[0]?.userId ?? null };
}

/**
 * Make teams opens on the posted pairs while they still hold everyone, and
 * otherwise on the balance by level.
 */
export function openingMakeTeamsDraft(sheet: AloneTeamsSheet): MakeTeamsDraft {
  const posted = postedPairs(sheet);
  if (posted) {
    return { ...posted, mode: "posted" };
  }
  return {
    ...balanceAloneTeams(alonePlayers(sheet.players)),
    mode: "balanced",
  };
}

export function balancedDraft(players: readonly SheetPlayer[]): MakeTeamsDraft {
  return { ...balanceAloneTeams(alonePlayers(players)), mode: "balanced" };
}

export function shuffledDraft(
  players: readonly SheetPlayer[],
  random: () => number = Math.random,
): MakeTeamsDraft {
  return {
    ...shuffleAloneTeams(alonePlayers(players), random),
    mode: "shuffled",
  };
}

export function sameSlot(first: MakeTeamsSlot, second: MakeTeamsSlot) {
  if (first === "unplaced" || second === "unplaced") {
    return first === second;
  }
  return first.pairIndex === second.pairIndex && first.side === second.side;
}

export function slotUserId(
  draft: MakeTeamsDraft,
  slot: MakeTeamsSlot,
): string | null {
  if (slot === "unplaced") {
    return draft.unplaced;
  }
  return draft.pairs[slot.pairIndex]?.[slot.side] ?? null;
}

/** Two taps trade the players in two seats; the odd player out can trade in too. */
export function swapMakeTeamsSlots(
  draft: MakeTeamsDraft,
  first: MakeTeamsSlot,
  second: MakeTeamsSlot,
): MakeTeamsDraft {
  if (sameSlot(first, second)) {
    return draft;
  }
  if (first === "unplaced" || second === "unplaced") {
    const slot = first === "unplaced" ? second : first;
    if (slot === "unplaced" || draft.unplaced == null) {
      return draft;
    }
    const pairs = draft.pairs.map((pair) => ({ ...pair }));
    const pair = pairs[slot.pairIndex];
    if (!pair) {
      return draft;
    }
    const out = pair[slot.side];
    pair[slot.side] = draft.unplaced;
    return { pairs, unplaced: out, mode: "edited" };
  }
  return {
    ...draft,
    pairs: swapAloneSlots(draft.pairs, first, second),
    mode: "edited",
  };
}

/** The line under Balance and Shuffle: how even the teams are, or how they came about. */
export function makeTeamsNote(
  draft: MakeTeamsDraft,
  playerById: ReadonlyMap<string, AlonePlayer>,
  locale: Locale,
): string {
  const m = messagesFor(locale).aloneTeams.make;
  switch (draft.mode) {
    case "balanced": {
      const spread = aloneTeamsSpread(draft.pairs, playerById).toFixed(2);
      const note = m.balancedNote(spread);
      return aloneTeamsSidesMatch(draft.pairs, playerById)
        ? `${note} ${m.sidesNote}`
        : note;
    }
    case "shuffled":
      return m.shuffledNote;
    case "edited":
      return m.editedNote;
    case "posted":
      return m.swapHint;
  }
}

export function pairAverage(
  pair: AlonePair,
  playerById: ReadonlyMap<string, AlonePlayer>,
) {
  return alonePairAverage([
    playerById.get(pair.left)?.level ?? null,
    playerById.get(pair.right)?.level ?? null,
  ]);
}

export function sideShort(side: AloneSide | null, locale: Locale) {
  const m = messagesFor(locale).aloneTeams.make;
  if (side === "left") {
    return m.sideShortLeft;
  }
  return side === "right" ? m.sideShortRight : null;
}

/** "Khalid Janahi" -> "Khalid", for a sentence that names a partner twice. */
export function firstName(name: string) {
  const [first] = name.trim().split(/\s+/);
  return first && first.length > 0 ? first : name;
}

/** The first card of a posted Social: which draw the Organizer opens next. */
export function postedOrganizerTitle(
  view: { knockoutOnly: boolean; kingOfTheCourt: boolean },
  locale: Locale,
) {
  const m = messagesFor(locale).aloneTeams.posted;
  if (view.kingOfTheCourt) {
    return m.organizerTitleKing;
  }
  return view.knockoutOnly ? m.organizerTitleKnockout : m.organizerTitle;
}

export type ViewerPairing = {
  side: AloneSide;
  partner: NonNullable<TournamentDetailsSide["left"]> | null;
};

export function viewerPairing(
  side: TournamentDetailsSide | null,
  viewerUserId: string,
): ViewerPairing | null {
  if (!side) {
    return null;
  }
  if (side.left?.userId === viewerUserId) {
    return { side: "left", partner: side.right };
  }
  if (side.right?.userId === viewerUserId) {
    return { side: "right", partner: side.left };
  }
  return null;
}

/** The copy on a player's card once the teams are posted. */
export function postedPlayerCard(
  pairing: ViewerPairing | null,
  locale: Locale,
): { title: string; body: string; waiting: boolean } {
  const m = messagesFor(locale).aloneTeams.posted;
  if (!pairing?.partner) {
    return {
      title: m.playerWaitingTitle,
      body: m.playerWaitingBody,
      waiting: true,
    };
  }
  return {
    title: m.playerTitle(pairing.partner.name),
    body: m.playerBody(pairing.side, firstName(pairing.partner.name)),
    waiting: false,
  };
}

export type ShareTeam = {
  gameTeamId: string;
  left: SheetPlayer;
  right: SheetPlayer;
  average: number | null;
};

/** The posted teams with both players, in side order, for Share teams. */
export function postedShareTeams(sheet: AloneTeamsSheet): ShareTeam[] {
  const byId = new Map(sheet.players.map((player) => [player.userId, player]));
  return bySide(sheet.teams).flatMap((team) => {
    const left = team.left ? byId.get(team.left) : undefined;
    const right = team.right ? byId.get(team.right) : undefined;
    if (!left || !right) {
      return [];
    }
    return [
      {
        gameTeamId: team.gameTeamId,
        left,
        right,
        average: alonePairAverage([left.level, right.level]),
      },
    ];
  });
}

/** Why the line-up cannot be posted, in the words the server would use; null when it can. */
export function makeTeamsProblem(
  draft: MakeTeamsDraft,
  sheet: { players: readonly SheetPlayer[]; teamsAllowed: number | null },
  locale: Locale,
): string | null {
  const m = messagesFor(locale).aloneTeams.errors;
  const problem = aloneTeamsProblem({
    pairs: draft.pairs,
    playerIds: sheet.players.map((player) => player.userId),
    teamsAllowed: sheet.teamsAllowed,
  });
  switch (problem) {
    case null:
      return null;
    case "too_few_pairs":
      return m.tooFewPairs(ALONE_TEAMS_MIN_PAIRS);
    case "too_many_pairs":
      return m.tooManyPairs(sheet.teamsAllowed ?? ALONE_TEAMS_MIN_PAIRS);
    case "player_twice":
      return m.playerTwice;
    case "not_on_game":
      return m.notOnGame;
    case "left_out":
      return m.leftOut;
  }
}

export function openSeatCount(count: number, cap: number | null) {
  return Math.max((cap ?? count) - count, 0);
}
