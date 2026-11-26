import { messagesFor } from "@repo/i18n/messages";
import type { Locale } from "@repo/i18n/locale";

import {
  balanceFootballSides,
  DEFAULT_FOOTBALL_BIBS,
  footballBibName,
  footballPositionCode,
  footballSidesProblem,
  footballSlotCode,
  keeperSeatsLeft,
  KEEPERS_PER_GAME,
  keepersInLine,
  type FootballBalanceOn,
  type FootballBib,
  type FootballPosition,
  type FootballRole,
  type FootballTeamsMethod,
} from "./football-lineup";
import { formatOvr } from "./football-ovr";
import {
  formatGameDay,
  formatWeekday,
  formatWindowDuration,
} from "./format-game-start";
import { gameDayStart } from "./game-day";
import { sideSizeLabel } from "./game-shape";
import type { GroupMemberTierData } from "./group-data";
import {
  formatTierPoints,
  tierPointsCount,
  groupMemberTierView,
  type GroupMemberTierCell,
} from "./group-members-table";
import { formatHomeKickoff } from "./home-countdown";
import {
  displayLabelFromStoredBand,
  LEVEL_BANDS,
  type LevelBand,
} from "./level-bands";
import type { MemberNicknameData } from "./member-nickname";
import { nameInitial } from "./player-name";
import type { TierBand } from "./tier-bands";

export type Side = 1 | 2;

/** What a pair keyed by slot holds for a side. */
export function ofSide<Value>(
  pair: { slot1: Value; slot2: Value },
  side: Side,
): Value {
  return side === 1 ? pair.slot1 : pair.slot2;
}

export type BoardPlayer = {
  userId: string;
  name: string;
  /** The Member nickname on a private Group Game, when the viewer may see it. */
  nickname?: MemberNicknameData | null;
  image: string | null;
  role: FootballRole | null;
  position: FootballPosition | null;
  levelBand: LevelBand | null;
  sideIndex: Side | null;
  goals: number;
  isViewer: boolean;
  unclaimed?: boolean;
  guest?: boolean;
  phoneMasked?: string | null;
  /** E.164, sent only to a Group approver for a current member (ADR-0078). */
  phoneNumber?: string | null;
  /**
   * What Make teams balances on: Tier points, or the start hint while
   * Provisional, in a tier Group; the OVR elsewhere. Null for a viewer who
   * cannot make teams.
   */
  balanceStrength?: number | null;
  /** The whole-number OVR; null without a football Rating. */
  ovr?: number | null;
  /** The football Rating is still Provisional. */
  ovrProvisional?: boolean;
  /** The player's Group Tier on a tier Group's Game; null elsewhere. */
  tier?: GroupMemberTierData | null;
};

export type Bibs = { slot1: FootballBib; slot2: FootballBib };

export function levelLabel(band: LevelBand | null) {
  return band ? displayLabelFromStoredBand(band) : "–";
}

/** What a football line-up row shows where the Level sits: the whole OVR, a dash without one. */
export function ovrLabel(player: Pick<BoardPlayer, "ovr">) {
  return player.ovr == null ? "–" : formatOvr(player.ovr);
}

/** How a screen reader says a line-up row's OVR, "OVR 72"; nothing without one. */
export function ovrSpoken(player: Pick<BoardPlayer, "ovr">, locale: Locale) {
  return player.ovr == null
    ? null
    : messagesFor(locale).level.ovr(formatOvr(player.ovr));
}

export function slotCode(
  player: Pick<BoardPlayer, "role" | "position">,
  locale: Locale,
) {
  return footballSlotCode(player.role, player.position, locale);
}

export function shortName(name: string) {
  const [first, ...rest] = name.trim().split(/\s+/);
  const last = rest[rest.length - 1];
  return last ? `${first} ${nameInitial(last) ?? ""}` : (first ?? name);
}

const TILE_NAME_LIMIT = 10;

/**
 * A name on a line-up tile: "Abdulla S.", or the first name alone when that
 * passes ten characters, so "Abdulrahman Al-Mahmood" reads "Abdulrahman".
 */
export function tileShortName(name: string, locale: Locale) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const first = parts[0];
  if (!first) {
    return name;
  }
  const initial = parts.length > 1 ? nameInitial(parts.at(-1)!) : undefined;
  if (!initial) {
    return first;
  }
  const short = messagesFor(locale).football.board.tileName(
    first,
    initial.toUpperCase(),
  );
  return Array.from(short).length > TILE_NAME_LIMIT ? first : short;
}

/**
 * A player's name on a line-up and how a screen reader says it: "You" for
 * the viewer, else the Member nickname in full, else the short Temba name.
 */
export function lineupName(
  player: Pick<BoardPlayer, "name" | "nickname" | "isViewer">,
  locale: Locale,
) {
  return nameOnLineup(player, locale, shortName);
}

/** `lineupName` for a pool tile, whose short name is `tileShortName`. */
export function poolTileName(
  player: Pick<BoardPlayer, "name" | "nickname" | "isViewer">,
  locale: Locale,
) {
  return nameOnLineup(player, locale, (name) => tileShortName(name, locale));
}

/**
 * `lineupName` as plain text, for a player the roster may no longer hold:
 * null without one.
 */
export function lineupPlayerName(
  player:
    | Pick<BoardPlayer, "name" | "nickname" | "isViewer">
    | null
    | undefined,
  locale: Locale,
) {
  return player ? lineupName(player, locale).name : null;
}

function nameOnLineup(
  player: Pick<BoardPlayer, "name" | "nickname" | "isViewer">,
  locale: Locale,
  shorten: (name: string) => string,
) {
  const m = messagesFor(locale);
  if (player.isViewer) {
    return { name: m.common.you, spoken: m.common.you, isNickname: false };
  }
  const nickname = player.nickname?.name;
  if (nickname) {
    return {
      name: nickname,
      spoken: m.group.nickname.spoken(nickname, player.name),
      isNickname: true,
    };
  }
  const name = shorten(player.name);
  return { name, spoken: name, isNickname: false };
}

/**
 * Every registration is a seat up to players allowed: substitutes register
 * like anyone else and the teams are made from everyone.
 */
export function poolLayout<Player>(
  players: readonly Player[],
  sideSize: number | null,
  playersAllowed: number | null,
) {
  const seats = playersAllowed ?? (sideSize ?? 5) * 2;
  return {
    seats,
    pool: players,
    openSeats: Math.max(0, seats - players.length),
  };
}

export function keepersIn(players: readonly Pick<BoardPlayer, "role">[]) {
  return players.filter((player) => player.role === "keeper").length;
}

/**
 * The pool reads in two blocks: Keepers, then Players. Keeper seats are not
 * carved out of the total, so the hatched keeper cells never exceed the
 * seats still open.
 */
export function poolSections<Player extends Pick<BoardPlayer, "role">>(
  pool: readonly Player[],
  seats: number,
  locale: Locale,
) {
  const keepers = pool.filter((player) => player.role === "keeper");
  const outfield = pool.filter((player) => player.role !== "keeper");
  const openSeats = Math.max(0, seats - pool.length);
  const keeperOpenSeats = Math.min(keeperSeatsLeft(keepers.length), openSeats);
  const outfieldSeats = seats - keepers.length - keeperOpenSeats;
  return {
    keepers,
    outfield,
    keeperOpenSeats,
    outfieldOpenSeats: openSeats - keeperOpenSeats,
    keepersLine: keepersInLine(keepers.length, locale),
    outfieldLine: messagesFor(locale).football.board.outfieldLine(
      outfield.length,
      Math.max(outfieldSeats, outfield.length),
    ),
  };
}

/** A player as the join choice reads them: the viewer is left out. */
export type JoinPlayer = Pick<BoardPlayer, "name" | "role" | "position"> & {
  isViewer?: boolean;
};

export function keeperNote(
  players: readonly Pick<JoinPlayer, "name" | "role">[],
  locale: Locale,
) {
  const m = messagesFor(locale).football.board;
  const first = players.find((player) => player.role === "keeper");
  return first
    ? m.keeperNoteClaimed(KEEPERS_PER_GAME, shortName(first.name))
    : m.keeperNoteUnclaimed(KEEPERS_PER_GAME);
}

export function keeperSub(
  players: readonly Pick<BoardPlayer, "role">[],
  locale: Locale,
) {
  const m = messagesFor(locale).football.board;
  const left = keeperSeatsLeft(keepersIn(players));
  if (left === 0) {
    return m.keeperSeatsBothTaken;
  }
  return m.keeperSeatsLeft(left);
}

export function seatSummary(
  role: FootballRole,
  position: FootballPosition,
  locale: Locale,
) {
  const m = messagesFor(locale).football.board;
  return role === "keeper"
    ? m.seatKeeper
    : m.seatPlayerPrefers(footballPositionCode(position, locale));
}

export function joinActionLabel(
  role: FootballRole,
  position: FootballPosition,
  price: string | null,
  locale: Locale,
) {
  const m = messagesFor(locale).football.board;
  const lead =
    role === "keeper"
      ? m.joinAsKeeper
      : m.joinAsPosition(footballPositionCode(position, locale));
  const free = messagesFor(locale).createGame.price.free;
  return price && price !== free ? m.joinWithPrice(lead, price) : lead;
}

/** The line under the join choice reached from an Invite link. */
export function footballInviteJoinSubtitle(
  football: {
    players: readonly unknown[];
    sideSize: number | null;
    playersAllowed: number | null;
  },
  locale: Locale,
) {
  const { openSeats } = poolLayout(
    football.players,
    football.sideSize,
    football.playersAllowed,
  );
  return [
    football.sideSize ? sideSizeLabel(football.sideSize, locale) : null,
    messagesFor(locale).football.board.seatsOpen(openSeats),
  ]
    .filter(Boolean)
    .join(messagesFor(locale).common.listSeparator);
}

export function bibNames(bibs: Bibs, locale: Locale) {
  return {
    slot1: footballBibName(bibs.slot1, 1, locale),
    slot2: footballBibName(bibs.slot2, 2, locale),
  };
}

/** Each side's Side captain by User (ADR-0108), or none. */
export type SideCaptains = { slot1: string | null; slot2: string | null };

export const NO_SIDE_CAPTAINS: SideCaptains = { slot1: null, slot2: null };

export type TeamsDraft = {
  method: FootballTeamsMethod;
  bibs: Bibs;
  sides: Record<string, Side>;
  captains: SideCaptains;
};

/** Each placed player's side, from the two sides' players. */
export function sidesFromSplit(split: {
  slot1: readonly string[];
  slot2: readonly string[];
}) {
  const sides: Record<string, Side> = {};
  for (const userId of split.slot1) {
    sides[userId] = 1;
  }
  for (const userId of split.slot2) {
    sides[userId] = 2;
  }
  return sides;
}

/** A Side captain stays named only while they are on that side. */
export function captainsOnTheirSides(
  captains: SideCaptains,
  sides: Record<string, Side>,
): SideCaptains {
  return {
    slot1:
      captains.slot1 != null && sides[captains.slot1] === 1
        ? captains.slot1
        : null,
    slot2:
      captains.slot2 != null && sides[captains.slot2] === 2
        ? captains.slot2
        : null,
  };
}

function withSides(draft: TeamsDraft, sides: Record<string, Side>): TeamsDraft {
  return {
    ...draft,
    sides,
    captains: captainsOnTheirSides(draft.captains, sides),
  };
}

/**
 * Who may be named a Side captain: a player with an account. A Guest player
 * or an Unclaimed player cannot open the draft.
 */
export function mayBeSideCaptain(
  player: Pick<BoardPlayer, "guest" | "unclaimed">,
) {
  return !player.guest && !player.unclaimed;
}

export function balancedSides(
  players: readonly BoardPlayer[],
  random?: () => number,
) {
  return sidesFromSplit(
    balanceFootballSides(
      players.map((player) => ({
        userId: player.userId,
        role: player.role,
        levelBand: player.levelBand,
        strength: player.balanceStrength ?? null,
      })),
      random,
    ),
  );
}

function byHand(method: FootballTeamsMethod): FootballTeamsMethod {
  return method === "captain_pick" ? "manual" : method;
}

/**
 * Where the Make teams screen starts: the saved Draft line-up when there is
 * one, else the published split, otherwise a balanced split. The Side
 * captains come with the draft or the published teams. Teams a Captain pick
 * made are edited by hand: Captain pick only ever starts from the toggle.
 */
export function initialTeamsDraft(
  players: readonly BoardPlayer[],
  teams: {
    method: FootballTeamsMethod | null;
    bibs: Bibs;
    captains: SideCaptains;
  } | null,
  saved: {
    method: FootballTeamsMethod;
    bibs: Bibs;
    sides: { slot1: readonly string[]; slot2: readonly string[] };
    captains: SideCaptains;
  } | null,
): TeamsDraft {
  if (saved) {
    const roster = new Set(players.map((player) => player.userId));
    const sides = sidesFromSplit({
      slot1: saved.sides.slot1.filter((userId) => roster.has(userId)),
      slot2: saved.sides.slot2.filter((userId) => roster.has(userId)),
    });
    return {
      method: byHand(saved.method),
      bibs: saved.bibs,
      sides,
      captains: captainsOnTheirSides(saved.captains, sides),
    };
  }
  if (teams) {
    const sides: Record<string, Side> = {};
    for (const player of players) {
      if (player.sideIndex) {
        sides[player.userId] = player.sideIndex;
      }
    }
    return {
      method: byHand(teams.method ?? "manual"),
      bibs: teams.bibs,
      sides,
      captains: captainsOnTheirSides(teams.captains, sides),
    };
  }
  return {
    method: "level",
    bibs: DEFAULT_FOOTBALL_BIBS,
    sides: balancedSides(players),
    captains: NO_SIDE_CAPTAINS,
  };
}

/** Moving a Side captain to the other team clears the pick. */
export function moveAcross(draft: TeamsDraft, userId: string): TeamsDraft {
  const current = draft.sides[userId];
  if (!current) {
    return draft;
  }
  return withSides(draft, {
    ...draft.sides,
    [userId]: current === 1 ? 2 : 1,
  });
}

/**
 * Tapping a side's swatch places a player there; tapping it again unplaces.
 * A Side captain moved or unplaced is no longer the captain.
 */
export function placeOn(
  draft: TeamsDraft,
  userId: string,
  side: Side,
): TeamsDraft {
  const sides = { ...draft.sides };
  if (sides[userId] === side) {
    delete sides[userId];
  } else {
    sides[userId] = side;
  }
  return withSides(draft, sides);
}

/**
 * By level and Manual start from different places: a fresh split or empty.
 * Either way both Side captains are cleared.
 */
export function switchMethod(
  draft: TeamsDraft,
  method: FootballTeamsMethod,
  players: readonly BoardPlayer[],
): TeamsDraft {
  if (method === draft.method) {
    return draft;
  }
  return {
    ...draft,
    method,
    sides: method === "level" ? balancedSides(players) : {},
    captains: NO_SIDE_CAPTAINS,
  };
}

/** Shuffle deals a fresh balanced split and clears both Side captains. */
export function shuffleSides(
  draft: TeamsDraft,
  players: readonly BoardPlayer[],
  random?: () => number,
): TeamsDraft {
  return {
    ...draft,
    sides: balancedSides(players, random),
    captains: NO_SIDE_CAPTAINS,
  };
}

/** Clear unplaces everyone, so no Side captain is left. */
export function clearSides(draft: TeamsDraft): TeamsDraft {
  return { ...draft, sides: {}, captains: NO_SIDE_CAPTAINS };
}

/**
 * Names a side's Side captain, or none with null. Only a player on that side
 * can be named; anyone else leaves the draft as it is.
 */
export function setSideCaptain(
  draft: TeamsDraft,
  side: Side,
  userId: string | null,
): TeamsDraft {
  if (userId != null && draft.sides[userId] !== side) {
    return draft;
  }
  return {
    ...draft,
    captains: { ...draft.captains, [side === 1 ? "slot1" : "slot2"]: userId },
  };
}

/**
 * Names a side's Side captain for a Captain pick, from anyone on the roster
 * (ADR-0109): the two captains are seated on their sides and everyone else
 * waits to be picked. Naming the other side's captain moves them across;
 * null leaves the side without one.
 */
export function setPickCaptain(
  draft: TeamsDraft,
  side: Side,
  userId: string | null,
): TeamsDraft {
  const captains: SideCaptains =
    side === 1
      ? {
          slot1: userId,
          slot2: draft.captains.slot2 === userId ? null : draft.captains.slot2,
        }
      : {
          slot1: draft.captains.slot1 === userId ? null : draft.captains.slot1,
          slot2: userId,
        };
  const sides: Record<string, Side> = {};
  if (captains.slot1 != null) {
    sides[captains.slot1] = 1;
  }
  if (captains.slot2 != null) {
    sides[captains.slot2] = 2;
  }
  return { ...draft, sides, captains };
}

/** Keepers first, then strongest down: the order teams read in. */
export function byKeeperThenLevel(a: BoardPlayer, b: BoardPlayer) {
  const keeper = Number(b.role === "keeper") - Number(a.role === "keeper");
  if (keeper !== 0) {
    return keeper;
  }
  const strength = (player: BoardPlayer) =>
    player.levelBand ? LEVEL_BANDS.indexOf(player.levelBand) : -1;
  return strength(b) - strength(a);
}

/**
 * Keepers first, then strongest down by what Make teams balances on: the
 * balance strength when every player has one, otherwise the Level.
 */
function byKeeperThenBalance(players: readonly BoardPlayer[]) {
  if (!players.every((player) => player.balanceStrength != null)) {
    return byKeeperThenLevel;
  }
  return (a: BoardPlayer, b: BoardPlayer) =>
    Number(b.role === "keeper") - Number(a.role === "keeper") ||
    (b.balanceStrength ?? 0) - (a.balanceStrength ?? 0);
}

export function draftSummary(
  draft: TeamsDraft,
  players: readonly BoardPlayer[],
  locale: Locale,
  balanceOn: FootballBalanceOn = "tierPoints",
) {
  const order = byKeeperThenBalance(players);
  const slot1 = players
    .filter((player) => draft.sides[player.userId] === 1)
    .sort(order);
  const slot2 = players
    .filter((player) => draft.sides[player.userId] === 2)
    .sort(order);
  const unplaced = players
    .filter((player) => !draft.sides[player.userId])
    .sort(order);
  const names = bibNames(draft.bibs, locale);
  const problem = footballSidesProblem(
    {
      slot1: slot1.map((player) => player.userId),
      slot2: slot2.map((player) => player.userId),
      unplaced: unplaced.length,
    },
    names,
    locale,
  );
  const teamSize = Math.ceil(players.length / 2);
  return {
    slot1,
    slot2,
    unplaced,
    names,
    teamSize,
    balanceOn,
    problem,
    note:
      problem ??
      messagesFor(locale).football.board.everyonePlaced(
        names.slot1,
        teamsSideAverage(slot1, locale, balanceOn),
        names.slot2,
        teamsSideAverage(slot2, locale, balanceOn),
      ),
  };
}

/**
 * A side's mean as Make teams reads it when every player has a balance
 * strength: mean Tier points in a tier Group, the mean OVR elsewhere.
 * Otherwise the mean OVR of the players who have one.
 */
export function teamsSideAverage(
  players: readonly Pick<BoardPlayer, "ovr" | "balanceStrength">[],
  locale: Locale,
  balanceOn: FootballBalanceOn = "tierPoints",
) {
  const strengths = players.flatMap((player) =>
    player.balanceStrength == null ? [] : [player.balanceStrength],
  );
  if (strengths.length === 0 || strengths.length < players.length) {
    return sideOvrAverage(players, locale);
  }
  const mean =
    strengths.reduce((sum, strength) => sum + strength, 0) / strengths.length;
  const m = messagesFor(locale).rating;
  return balanceOn === "ovr"
    ? m.ovr.value(formatOvr(mean))
    : m.tier.points(formatTierPoints(mean), tierPointsCount(mean));
}

/** The fish, place or Provisional slot beside a player in a tier Group. */
export function boardTierCell(
  player: Pick<BoardPlayer, "tier">,
  locale: Locale,
): GroupMemberTierCell | null {
  return (
    groupMemberTierView(
      { tier: player.tier ?? null, isOrganizer: false },
      locale,
    )?.cell ?? null
  );
}

export type PoolTileTier = {
  /** A fish, the hatched "not yet" badge, or no mark. */
  mark: { kind: "fish"; band: TierBand } | { kind: "hatch" } | null;
  label: string;
  /** How a screen reader says the line; null when it says nothing. */
  spoken: string | null;
};

/**
 * The line under a name on a pool tile. In a tier Group, the fish and its
 * band, or the place, or Provisional with the hatched badge. Elsewhere the
 * OVR, keeping the hatched badge while the football Rating is Provisional.
 * A guest has no tier and reads Guest.
 */
export function poolTileTier(
  player: Pick<BoardPlayer, "tier" | "ovr" | "ovrProvisional" | "guest">,
  locale: Locale,
): PoolTileTier {
  const m = messagesFor(locale);
  if (player.guest) {
    const label = m.group.addPlayer.guest.tag;
    return { mark: null, label, spoken: label };
  }
  const cell = boardTierCell(player, locale);
  if (cell) {
    const mark =
      cell.kind === "fish"
        ? { kind: "fish" as const, band: cell.band }
        : cell.kind === "provisional"
          ? { kind: "hatch" as const }
          : null;
    return { mark, label: cell.label, spoken: cell.label };
  }
  if (player.ovr == null) {
    return { mark: null, label: ovrLabel(player), spoken: null };
  }
  const label = m.level.ovr(formatOvr(player.ovr));
  if (!player.ovrProvisional) {
    return { mark: null, label, spoken: label };
  }
  return {
    mark: { kind: "hatch" },
    label,
    spoken: [label, m.rating.provisional].join(m.common.listSeparator),
  };
}

/**
 * A side's mean OVR, "OVR 72", over its players with a football Rating; a
 * dash when none has one.
 */
export function sideOvrAverage(
  players: readonly Pick<BoardPlayer, "ovr">[],
  locale: Locale,
) {
  const known = players.flatMap((player) =>
    player.ovr == null ? [] : [player.ovr],
  );
  if (known.length === 0) {
    return "–";
  }
  const mean = known.reduce((sum, ovr) => sum + ovr, 0) / known.length;
  return messagesFor(locale).rating.ovr.value(formatOvr(mean));
}

export function keeperWord(
  players: readonly Pick<BoardPlayer, "role">[],
  locale: Locale,
) {
  return messagesFor(locale).football.board.keeperCount(keepersIn(players));
}

export function confirmationLine(
  confirmed: { slot1: boolean; slot2: boolean },
  names: { slot1: string; slot2: string },
  completed: boolean,
  locale: Locale,
  organizerSides: readonly { slot: Side }[] = [],
) {
  const m = messagesFor(locale).football.board;
  if (completed) {
    return confirmed.slot1 && confirmed.slot2
      ? m.bothSidesConfirmed
      : m.confirmedByOrganizer;
  }
  const byOrganizer = (slot: Side) =>
    organizerSides.some((side) => side.slot === slot);
  const waitingOn = (slot: Side) => {
    const name = slot === 1 ? names.slot1 : names.slot2;
    return byOrganizer(slot)
      ? m.waitingOrganizerFor(name)
      : m.waitingPlayerFrom(name);
  };
  if (confirmed.slot1 && !confirmed.slot2) {
    return m.waitingFor(waitingOn(2));
  }
  if (confirmed.slot2 && !confirmed.slot1) {
    return m.waitingFor(waitingOn(1));
  }
  if (byOrganizer(1) && byOrganizer(2)) {
    return m.waitingOrganizerBoth;
  }
  if (byOrganizer(1) || byOrganizer(2)) {
    return m.waitingForBoth(waitingOn(1), waitingOn(2));
  }
  return m.waitingEachSide;
}

export function viewerSideLine(
  viewer: { sideIndex: Side | null },
  players: readonly BoardPlayer[],
  names: { slot1: string; slot2: string },
  locale: Locale,
) {
  if (!viewer.sideIndex) {
    return null;
  }
  const m = messagesFor(locale).football.board;
  const you = players.find((player) => player.isViewer);
  const code = you ? slotCode(you, locale) : null;
  const team = viewer.sideIndex === 1 ? names.slot1 : names.slot2;
  return code ? m.youPlayInAs(team, code) : m.youPlayIn(team);
}

export type HeroLinesInput = {
  windowStart: Date | null;
  windowEnd: Date | null;
  cancelledAt: Date | null;
  sideSize: number | null;
  venueName: string | null;
  pitchName: string | null;
  teamsSet: boolean;
  scored: boolean;
  /** The viewer reads a saved Draft line-up (ADR-0107). */
  draftSaved?: boolean;
  /** The team the viewer captains on that draft, by name (ADR-0108). */
  draftSideCaptainOf?: string | null;
};

/** The words around the kick-off time at the top of a football Game. */
export function footballHeroLines(
  input: HeroLinesInput,
  now: Date,
  locale: Locale,
) {
  const { common } = messagesFor(locale);
  const m = messagesFor(locale).football.status;
  const start = input.windowStart;
  const played =
    input.windowEnd != null && input.windowEnd.getTime() < now.getTime();
  const live = start != null && start.getTime() <= now.getTime();
  const weekday = start
    ? formatWeekday(gameDayStart(start), "long", locale)
    : null;
  const status = input.cancelledAt
    ? m.cancelled
    : played
      ? input.scored
        ? m.played
        : m.playedScoreMissing
      : live
        ? messagesFor(locale).dates.countdown.liveNow
        : input.draftSaved
          ? input.draftSideCaptainOf
            ? messagesFor(locale).football.draft.statusCaptain(
                input.draftSideCaptainOf,
              )
            : messagesFor(locale).football.draft.status
          : input.teamsSet
            ? weekday
              ? m.teamsSetOn(weekday)
              : m.teamsSet
            : weekday
              ? m.upcomingOn(weekday)
              : m.upcoming;
  const kickoff = start ? formatHomeKickoff(start, locale) : null;
  const day = start ? formatGameDay(start, locale, { weekday: "short" }) : null;
  const duration = formatWindowDuration(
    input.windowStart,
    input.windowEnd,
    locale,
  );
  return {
    status,
    sizeTag: input.sideSize
      ? sideSizeLabel(input.sideSize, locale).toUpperCase()
      : null,
    time: kickoff?.time ?? null,
    meridiem: kickoff?.meridiem ?? null,
    dayLine:
      [day, input.venueName ? common.isolate(input.venueName) : null]
        .filter(Boolean)
        .join(common.listSeparator) || null,
    subLine:
      [input.pitchName ? common.isolate(input.pitchName) : null, duration]
        .filter(Boolean)
        .join(common.listSeparator) || null,
  };
}
